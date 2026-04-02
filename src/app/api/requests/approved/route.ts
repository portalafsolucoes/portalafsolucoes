import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se usuário pode ver aprovações
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
      return NextResponse.json(
        { error: 'Apenas administradores podem ver aprovações' },
        { status: 403 }
      )
    }

    const { data: requests, error, count: total } = await supabase
      .from('Request')
      .select(`
        *,
        createdBy:User!Request_createdById_fkey(id, firstName, lastName, email),
        approvedBy:User!Request_approvedById_fkey(id, firstName, lastName, email),
        assignedTo:User!Request_assignedToId_fkey(id, firstName, lastName, email),
        team:Team(id, name),
        asset:Asset(id, name),
        location:Location(id, name),
        generatedWorkOrder:WorkOrder(id, internalId, status),
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
