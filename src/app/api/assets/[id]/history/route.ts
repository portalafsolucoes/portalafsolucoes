import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import type { WorkOrderFullDetail, RequestFullDetail } from '@/types/assetHistory'

// GET - Buscar histórico do ativo
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const eventType = searchParams.get('eventType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sourceFilter = searchParams.get('source') // 'os', 'ss', or null/empty for all
    const includeDetails = searchParams.get('include') === 'details'

    // Verificar se o ativo existe e pertence à empresa
    const { data: asset, error: assetError } = await supabase
      .from('Asset')
      .select('id, name')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Buscar histórico do ativo
    let query = supabase
      .from('AssetHistory')
      .select('*', { count: 'exact' })
      .eq('assetId', id)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1)

    if (eventType) {
      query = query.eq('eventType', eventType)
    }

    // Filtro por data
    if (startDate) {
      query = query.gte('createdAt', new Date(startDate).toISOString())
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query = query.lte('createdAt', end.toISOString())
    }

    // Filtro por origem (OS, SS ou ambos)
    const osEventTypes = ['WORK_ORDER_CREATED', 'WORK_ORDER_STARTED', 'WORK_ORDER_COMPLETED']
    const ssEventTypes = ['REQUEST_CREATED', 'REQUEST_APPROVED', 'REQUEST_REJECTED']
    if (sourceFilter === 'os') {
      query = query.in('eventType', osEventTypes)
    } else if (sourceFilter === 'ss') {
      query = query.in('eventType', ssEventTypes)
    }

    const { data: history, error: historyError, count } = await query

    if (historyError) {
      console.error('History fetch error:', historyError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Batch fetch de usuarios para evitar N+1
    const userIds = [...new Set((history || []).map(e => e.userId).filter(Boolean))]
    const usersMap = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('User')
        .select('id, firstName, lastName')
        .in('id', userIds)
      for (const u of users || []) {
        usersMap.set(u.id, `${u.firstName} ${u.lastName}`)
      }
    }

    // Batch fetch de detalhes de OS e SS (apenas quando include=details)
    const workOrdersMap = new Map<string, WorkOrderFullDetail>()
    const requestsMap = new Map<string, RequestFullDetail>()

    if (includeDetails) {
      const workOrderIds = [
        ...new Set((history || []).map(e => e.workOrderId).filter(Boolean))
      ] as string[]
      const requestIds = [
        ...new Set((history || []).map(e => e.requestId).filter(Boolean))
      ] as string[]

      // Batch fetch de OS
      if (workOrderIds.length > 0) {
        const { data: workOrders } = await supabase
          .from('WorkOrder')
          .select(`
            id, title, type, status, sequenceNumber, internalId, externalId,
            executionNotes, laborCost, partsCost, thirdPartyCost, toolsCost,
            createdAt, completedOn,
            serviceType:ServiceType(id, name, code),
            maintenanceArea:MaintenanceArea(id, name, code),
            assetMaintenancePlan:AssetMaintenancePlan(id, name, sequence),
            maintenancePlanExec:MaintenancePlanExec(id, planNumber),
            woResources:WoResource(
              id, resourceType, quantity, hours, unit,
              resource:Resource(id, name),
              jobTitle:JobTitle(id, name),
              user:User(id, firstName, lastName)
            )
          `)
          .in('id', workOrderIds)
          .eq('companyId', session.companyId)

        for (const wo of workOrders || []) {
          workOrdersMap.set(wo.id, wo as unknown as WorkOrderFullDetail)
        }
      }

      // Batch fetch de SS
      if (requestIds.length > 0) {
        const { data: requests } = await supabase
          .from('Request')
          .select(`
            id, requestNumber, title, status, failureDescription, rejectionReason, createdAt,
            maintenanceArea:MaintenanceArea(id, name, code),
            requester:User!Request_requesterId_fkey(id, firstName, lastName),
            failureAnalysisReport:FailureAnalysisReport(id, rafNumber)
          `)
          .in('id', requestIds)
          .eq('companyId', session.companyId)

        for (const req of requests || []) {
          requestsMap.set(req.id, req as unknown as RequestFullDetail)
        }
      }
    }

    const enrichedHistory = (history || []).map(event => ({
      ...event,
      userName: event.userId ? usersMap.get(event.userId) || null : null,
      ...(includeDetails ? {
        workOrder: event.workOrderId ? workOrdersMap.get(event.workOrderId) || null : null,
        request: event.requestId ? requestsMap.get(event.requestId) || null : null,
      } : {}),
    }))

    return NextResponse.json({
      data: enrichedHistory,
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Get asset history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Adicionar evento ao histórico
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = normalizeTextPayload(await request.json())
    const { eventType, title, description, metadata, workOrderId, requestId, fileId } = body

    // Verificar se o ativo existe e pertence à empresa
    const { data: asset, error: assetError } = await supabase
      .from('Asset')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Validar eventType
    const validEventTypes = [
      'ASSET_CREATED', 'ASSET_UPDATED', 'ASSET_STATUS_CHANGED',
      'WORK_ORDER_CREATED', 'WORK_ORDER_STARTED', 'WORK_ORDER_COMPLETED',
      'REQUEST_CREATED', 'REQUEST_APPROVED', 'REQUEST_REJECTED',
      'FILE_UPLOADED', 'FILE_DELETED', 'PART_ADDED', 'PART_REMOVED',
      'DOWNTIME_STARTED', 'DOWNTIME_ENDED', 'METER_READING',
      'CHECKLIST_COMPLETED', 'MAINTENANCE_SCHEDULED', 'NOTE_ADDED',
      'ATTACHMENT_ADDED', 'ATTACHMENT_REMOVED', 'TECHNICAL_INFO_ADDED', 'TIP_ADDED',
      'CUSTOM'
    ]

    if (!eventType || !validEventTypes.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Criar evento no histórico
    const { data: historyEvent, error: insertError } = await supabase
      .from('AssetHistory')
      .insert({
        id: generateId(),
        eventType,
        title,
        description: description || null,
        metadata: metadata || null,
        assetId: id,
        workOrderId: workOrderId || null,
        requestId: requestId || null,
        fileId: fileId || null,
        userId: session.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert history error:', insertError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      data: historyEvent,
      message: 'History event created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create asset history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
