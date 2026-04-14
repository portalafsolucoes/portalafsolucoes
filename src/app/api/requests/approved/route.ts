import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { isAdminRole } from '@/lib/user-roles'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se usuário pode ver aprovações
    if (!isAdminRole(session)) {
      return NextResponse.json(
        { error: 'Apenas administradores podem ver aprovações' },
        { status: 403 }
      )
    }

    const { data: requests, error, count: total } = await supabase
      .from('Request')
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        approvedBy:User!approvedById(id, firstName, lastName, email),
        assignedTo:User!assignedToId(id, firstName, lastName, email),
        team:Team(id, name),
        asset:Asset(id, name),
        location:Location!locationId(id, name),
        generatedWorkOrder:WorkOrder!workOrderId(id, internalId, status),
        files:File(*)
      `, { count: 'exact' })
      .eq('companyId', session.companyId)
      .eq('status', 'APPROVED')
      .order('approvedAt', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const workOrderIds = (requests || [])
      .map((request) => request.workOrderId)
      .filter((workOrderId): workOrderId is string => Boolean(workOrderId))

    let workOrderMap = new Map<string, { id: string; internalId: string | null; status: string }>()

    if (workOrderIds.length > 0) {
      const { data: workOrders, error: workOrdersError } = await supabase
        .from('WorkOrder')
        .select('id, internalId, status')
        .in('id', workOrderIds)

      if (workOrdersError) {
        console.error('Supabase work order enrichment error:', workOrdersError)
      } else {
        workOrderMap = new Map(
          (workOrders || []).map((workOrder) => [workOrder.id, workOrder])
        )
      }
    }

    const enrichedRequests = (requests || []).map((request) => {
      const normalizedGeneratedWorkOrder = Array.isArray(request.generatedWorkOrder)
        ? request.generatedWorkOrder[0] || null
        : request.generatedWorkOrder || null

      return {
        ...request,
        generatedWorkOrder:
          normalizedGeneratedWorkOrder ||
          (request.workOrderId ? workOrderMap.get(request.workOrderId) || null : null),
      }
    })

    return NextResponse.json({
      data: enrichedRequests,
      total: total || 0
    })
  } catch (error) {
    console.error('Get approved requests error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
