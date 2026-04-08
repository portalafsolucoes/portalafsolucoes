import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const summary = searchParams.get('summary') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    let query = supabase
      .from('Request')
      .select(summary
        ? `
            id, title, description, priority, status, dueDate, teamApprovalStatus, createdAt,
            createdBy:User!createdById(id, firstName, lastName),
            team:Team(id, name),
            files:File(id)
          `
        : `
            *,
            createdBy:User!createdById(id, firstName, lastName, email),
            team:Team(id, name),
            files:File(id, name, url, type, size, createdAt),
            generatedWorkOrder:WorkOrder(id, title, status)
          `,
        { count: summary ? undefined : 'exact' }
      )
      .eq('companyId', session.companyId)
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1)

    // Filtrar por unidade ativa da session
    const unitIdParam = searchParams.get('unitId')
    const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)
    if (effectiveUnitId) query = query.eq('unitId', effectiveUnitId)

    if (status) query = query.eq('status', status)

    const { data: requests, error, count: total } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      data: requests || [],
      pagination: summary ? undefined : {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Get requests error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permissão de criação
    const permError = checkApiPermission(session.role, 'requests', 'POST')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, priority, dueDate, teamId, files = [] } = body
    const now = new Date().toISOString()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const { data: maintenanceRequest, error: createError } = await supabase
      .from('Request')
      .insert({
        id: generateId(),
        title,
        description,
        priority: priority || 'NONE',
        status: 'PENDING',
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        teamId: teamId || null,
        teamApprovalStatus: 'PENDING',
        convertToWorkOrder: false,
        companyId: session.companyId,
        unitId: session.unitId || null,
        createdById: session.id,
        createdAt: now,
        updatedAt: now
      })
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        team:Team(id, name),
        files:File(*)
      `)
      .single()

    if (createError || !maintenanceRequest) {
      console.error('Create request error:', createError)
      console.error('Error details:', JSON.stringify(createError, null, 2))
      return NextResponse.json({ 
        error: 'Database error', 
        details: createError?.message || 'No data returned'
      }, { status: 500 })
    }

    // Insert files separately if provided
    if (files.length > 0 && maintenanceRequest) {
      const fileInserts = files.map((file: any) => ({
        id: generateId(),
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size,
        requestId: maintenanceRequest.id,
        createdAt: now,
        updatedAt: now
      }))
      
      const { error: fileError } = await supabase.from('File').insert(fileInserts).select()
      if (fileError) {
        console.error('Insert files error:', fileError)
      }
    }

    return NextResponse.json(
      { data: maintenanceRequest, message: 'Request created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
