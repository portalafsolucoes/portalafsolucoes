import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Buscar equipe onde o usuário é líder
    const { data: team, error: teamError } = await supabase
      .from('Team')
      .select('*')
      .eq('leaderId', session.id)
      .eq('companyId', session.companyId)
      .limit(1)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ data: null })
    }

    // Buscar membros da equipe
    const { data: members, error: membersError } = await supabase
      .from('TeamMember')
      .select('*, user:User!userId(id, firstName, lastName, email)')
      .eq('teamId', team.id)

    if (membersError) throw membersError

    // Buscar IDs de work orders atribuídas à equipe (many-to-many via _TeamWorkOrders)
    const { data: teamWoLinks, error: woLinksError } = await supabase
      .from('_TeamWorkOrders')
      .select('A')
      .eq('B', team.id)

    if (woLinksError) throw woLinksError

    const woIds = (teamWoLinks || []).map((link: { A: string }) => link.A)

    type WorkOrderItem = {
      id: string
      title: string
      status: string
      priority: string | null
      type: string | null
      dueDate: string | null
      assignedToId: string | null
      assignedTo: { firstName?: string; lastName?: string } | null
    }
    let workOrders: WorkOrderItem[] = []
    if (woIds.length > 0) {
      // Buscar OS da equipe com status ativos
      const { data: wos, error: wosError } = await supabase
        .from('WorkOrder')
        .select('id, title, status, priority, type, dueDate, assignedToId, assignedTo:User!assignedToId(firstName, lastName)')
        .eq('companyId', session.companyId)
        .in('id', woIds)
        .in('status', ['PENDING', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD'])
        .order('createdAt', { ascending: false })
        .limit(10)

      if (wosError) throw wosError
      workOrders = (wos || []) as unknown as WorkOrderItem[]
    }

    // Buscar SS pendentes da equipe
    const { data: requests, error: reqError } = await supabase
      .from('Request')
      .select('id, title, priority, urgency, createdAt, createdBy:User!createdById(firstName, lastName)')
      .eq('companyId', session.companyId)
      .eq('teamId', team.id)
      .eq('status', 'PENDING')
      .order('createdAt', { ascending: false })

    if (reqError) throw reqError

    // Contar OS completadas no mês
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    let completedThisMonth = 0
    if (woIds.length > 0) {
      const { count, error: countError } = await supabase
        .from('WorkOrder')
        .select('*', { count: 'exact', head: true })
        .eq('companyId', session.companyId)
        .in('id', woIds)
        .eq('status', 'COMPLETE')
        .gte('completedOn', startOfMonth.toISOString())

      if (countError) throw countError
      completedThisMonth = count || 0
    }

    // Contar por status
    const openWorkOrders = workOrders.filter((wo) => wo.status === 'PENDING').length
    const inProgressWorkOrders = workOrders.filter((wo) => wo.status === 'IN_PROGRESS').length

    const dashboardData = {
      teamName: team.name,
      totalMembers: (members || []).length,
      openWorkOrders,
      inProgressWorkOrders,
      completedThisMonth,
      pendingRequests: (requests || []).length,
      workOrders: workOrders.map((wo) => ({
        id: wo.id,
        title: wo.title,
        status: wo.status,
        priority: wo.priority,
        type: wo.type,
        dueDate: wo.dueDate,
        assignedTo: wo.assignedTo
      })),
      requests: ((requests || []) as unknown as Array<{
        id: string
        title: string
        priority: string | null
        urgency: string | null
        createdAt: string
        createdBy: { firstName?: string; lastName?: string } | Array<{ firstName?: string; lastName?: string }> | null
      }>).map((req) => {
        const cb = Array.isArray(req.createdBy) ? (req.createdBy[0] ?? null) : req.createdBy
        return {
          id: req.id,
          title: req.title,
          priority: req.priority,
          urgency: req.urgency,
          createdBy: cb,
          createdAt: req.createdAt
        }
      })
    }

    return NextResponse.json({ data: dashboardData })
  } catch (error) {
    console.error('Team dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
