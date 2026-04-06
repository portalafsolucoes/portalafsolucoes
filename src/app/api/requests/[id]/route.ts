import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: maintenanceRequest, error } = await supabase
      .from('Request')
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        team:Team(id, name),
        files:File(*),
        generatedWorkOrder:WorkOrder(id, title, status)
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (error || !maintenanceRequest) {
      console.error('Get request error:', error)
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    return NextResponse.json({ data: maintenanceRequest })
  } catch (error) {
    console.error('Get request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, priority, dueDate, teamId, files = [] } = body
    const now = new Date().toISOString()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Verificar se existe
    const { data: existingRequest } = await supabase
      .from('Request')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Atualizar request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('Request')
      .update({
        title,
        description,
        priority: priority || 'NONE',
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        teamId: teamId || null
      })
      .eq('id', id)
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        team:Team(id, name),
        files:File(*)
      `)
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    // Deletar arquivos antigos e inserir novos
    if (files.length > 0) {
      await supabase.from('File').delete().eq('requestId', id)
      const fileInserts = files.map((file: any) => ({
        id: generateId(),
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size,
        requestId: id,
        createdAt: now,
        updatedAt: now
      }))
      await supabase.from('File').insert(fileInserts).select()
    }

    return NextResponse.json(
      { data: updatedRequest, message: 'Request updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificar se existe
    const { data: maintenanceRequest } = await supabase
      .from('Request')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (!maintenanceRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('Request')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Request deleted successfully'
    })
  } catch (error) {
    console.error('Delete request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
