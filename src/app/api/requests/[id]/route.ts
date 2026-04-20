import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeUserRole } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'

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
    const canonicalRole = normalizeUserRole(session)

    const permError = checkApiPermission(session, 'requests', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    let query = supabase
      .from('Request')
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        team:Team(id, name),
        files:File(*),
        asset:Asset(id, name, protheusCode, tag, parentAssetId),
        maintenanceArea:MaintenanceArea(id, name, code)
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
    if (canonicalRole === 'REQUESTER') query = query.eq('createdById', session.id)

    const { data: maintenanceRequest, error } = await query.single()

    if (error || !maintenanceRequest) {
      console.error('Get request error:', error)
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Buscar OS vinculada separadamente (evita retorno como array do Supabase)
    let generatedWorkOrder = null
    if (maintenanceRequest.workOrderId) {
      const { data: wo } = await supabase
        .from('WorkOrder')
        .select('id, title, status, externalId, internalId')
        .eq('id', maintenanceRequest.workOrderId)
        .single()
      generatedWorkOrder = wo
    }

    // Buscar RAF vinculada (FailureAnalysisReport.requestId aponta para esta SS)
    const { data: failureAnalysisReport } = await supabase
      .from('FailureAnalysisReport')
      .select('id, rafNumber')
      .eq('requestId', maintenanceRequest.id)
      .eq('companyId', session.companyId)
      .maybeSingle()

    return NextResponse.json({
      data: {
        ...maintenanceRequest,
        generatedWorkOrder,
        failureAnalysisReport: failureAnalysisReport ?? null,
      },
    })
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

    // Verificar permissão de edição
    const permError = checkApiPermission(session, 'requests', 'PUT')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = normalizeTextPayload(await request.json())
    const { title, description, priority, dueDate, teamId, assetId, maintenanceAreaId, files = [] } = body
    const now = new Date().toISOString()
    const canonicalRole = normalizeUserRole(session)

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

    // Verificar se existe
    let existingQuery = supabase
      .from('Request')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
    if (canonicalRole === 'REQUESTER') existingQuery = existingQuery.eq('createdById', session.id)
    const { data: existingRequest } = await existingQuery.single()

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
        teamId: teamId || null,
        assetId: assetId || null,
        maintenanceAreaId
      })
      .eq('id', id)
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        team:Team(id, name),
        files:File(*),
        asset:Asset(id, name, protheusCode, tag, parentAssetId),
        maintenanceArea:MaintenanceArea(id, name, code)
      `)
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    // Deletar arquivos antigos e inserir novos
    if (files.length > 0) {
      await supabase.from('File').delete().eq('requestId', id)
      type RequestFileRow = { name: string; url: string; type?: string | null; size?: number | null }
      const fileInserts = (files as RequestFileRow[]).map((file) => ({
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

    // Verificar permissão de exclusão
    const permError = checkApiPermission(session, 'requests', 'DELETE')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }
    const canonicalRole = normalizeUserRole(session)

    // Verificar se existe
    let existingQuery = supabase
      .from('Request')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
    if (canonicalRole === 'REQUESTER') existingQuery = existingQuery.eq('createdById', session.id)
    const { data: maintenanceRequest } = await existingQuery.single()

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
