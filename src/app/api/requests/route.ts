import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeUserRole } from '@/lib/user-roles'
import { sanitizeLimit } from '@/lib/pagination'
import { normalizeTextPayload } from '@/lib/textNormalizer'

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
    const limit = sanitizeLimit(searchParams.get('limit'))
    const skip = (page - 1) * limit
    const canonicalRole = normalizeUserRole(session)
    const idsParam = searchParams.get('ids')

    const permError = checkApiPermission(session, 'requests', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    // Modo batch para impressão em lote
    if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
      if (ids.length === 0) {
        return NextResponse.json({ data: [] })
      }
      if (ids.length > 50) {
        return NextResponse.json(
          { error: 'Máximo de 50 IDs por requisição' },
          { status: 400 }
        )
      }

      let batchQuery = supabase
        .from('Request')
        .select(`
          *,
          createdBy:User!createdById(id, firstName, lastName, email),
          team:Team(id, name),
          files:File(id, name, url, type, size, createdAt),
          generatedWorkOrder:WorkOrder(id, title, status),
          asset:Asset(id, name, protheusCode, tag, parentAssetId),
          maintenanceArea:MaintenanceArea(id, name, code)
        `)
        .in('id', ids)
        .eq('companyId', session.companyId)

      const unitIdParamBatch = searchParams.get('unitId')
      const effectiveUnitIdBatch = getEffectiveUnitId(session, unitIdParamBatch)
      if (effectiveUnitIdBatch) batchQuery = batchQuery.eq('unitId', effectiveUnitIdBatch)
      if (canonicalRole === 'MANUTENTOR') batchQuery = batchQuery.eq('createdById', session.id)

      const { data: batchData, error: batchError } = await batchQuery
      if (batchError) {
        console.error('Batch requests error:', batchError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      const byId = new Map<string, unknown>()
      for (const row of batchData || []) {
        byId.set((row as { id: string }).id, row)
      }
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean)
      return NextResponse.json({ data: ordered })
    }

    let query = supabase
      .from('Request')
      .select(summary
        ? `
            id, requestNumber, title, description, priority, status, dueDate, teamApprovalStatus, createdAt, assetId, maintenanceAreaId,
            createdBy:User!createdById(id, firstName, lastName),
            team:Team(id, name),
            files:File(id),
            asset:Asset(id, name, protheusCode, tag),
            maintenanceArea:MaintenanceArea(id, name, code)
          `
        : `
            *,
            createdBy:User!createdById(id, firstName, lastName, email),
            team:Team(id, name),
            files:File(id, name, url, type, size, createdAt),
            generatedWorkOrder:WorkOrder(id, title, status),
            asset:Asset(id, name, protheusCode, tag, parentAssetId),
            maintenanceArea:MaintenanceArea(id, name, code)
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

    const assetId = searchParams.get('assetId')
    if (assetId) query = query.eq('assetId', assetId)

    if (canonicalRole === 'MANUTENTOR') query = query.eq('createdById', session.id)

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
    const permError = checkApiPermission(session, 'requests', 'POST')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = normalizeTextPayload(await request.json())
    const { title, description, priority, dueDate, teamId, assetId, maintenanceAreaId, files = [] } = body
    const now = new Date().toISOString()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!maintenanceAreaId) {
      return NextResponse.json(
        { error: 'Área de manutenção é obrigatória' },
        { status: 400 }
      )
    }

    // Validar que a área pertence à empresa ativa
    const { data: areaCheck } = await supabase
      .from('MaintenanceArea')
      .select('id')
      .eq('id', maintenanceAreaId)
      .eq('companyId', session.companyId)
      .maybeSingle()

    if (!areaCheck) {
      return NextResponse.json(
        { error: 'Área de manutenção inválida para esta empresa' },
        { status: 400 }
      )
    }

    // Gerar próximo número sequencial SS-XXXXXX
    const { data: lastRequest } = await supabase
      .from('Request')
      .select('requestNumber')
      .not('requestNumber', 'is', null)
      .order('requestNumber', { ascending: false })
      .limit(1)
      .single()

    let nextNum = 1
    if (lastRequest?.requestNumber) {
      const num = parseInt(lastRequest.requestNumber.replace('SS-', ''))
      if (!isNaN(num)) nextNum = num + 1
    }
    const requestNumber = `SS-${nextNum.toString().padStart(6, '0')}`

    const { data: maintenanceRequest, error: createError } = await supabase
      .from('Request')
      .insert({
        id: generateId(),
        requestNumber,
        title,
        description,
        priority: priority || 'NONE',
        status: 'PENDING',
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        teamId: teamId || null,
        assetId: assetId || null,
        maintenanceAreaId,
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
      type RequestFileRow = { name: string; url: string; type?: string | null; size?: number | null }
      const fileInserts = (files as RequestFileRow[]).map((file) => ({
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
