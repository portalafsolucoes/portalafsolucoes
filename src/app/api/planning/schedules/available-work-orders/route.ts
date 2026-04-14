import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'

// GET - Listar OSs disponíveis para programação
// Retorna OSs com status PENDING que ainda não estão em uma programação ativa
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const unitIdParam = searchParams.get('unitId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const scheduleId = searchParams.get('scheduleId') // Para excluir OSs já na programação atual

    const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)

    // Buscar IDs de OSs que já estão em programações DRAFT ou CONFIRMED (não disponíveis)
    const excludeQuery = supabase
      .from('WorkOrderScheduleItem')
      .select('workOrderId, schedule:WorkOrderSchedule!scheduleId(id, status)')

    const { data: existingItems } = await excludeQuery

    // Filtrar: excluir OSs que estão em programações ativas (DRAFT/CONFIRMED)
    // mas permitir as que estão na programação atual sendo editada
    const excludedWoIds = new Set<string>()
    for (const item of (existingItems || [])) {
      const sched = item.schedule as unknown as { id: string; status: string } | null
      if (!sched) continue
      // Se a OS está numa programação ativa e não é a programação sendo editada
      if ((sched.status === 'DRAFT' || sched.status === 'CONFIRMED') && sched.id !== scheduleId) {
        excludedWoIds.add(item.workOrderId)
      }
    }

    // Buscar OSs PENDING da unidade
    let query = supabase
      .from('WorkOrder')
      .select(`
        id, externalId, internalId, title, status, priority, type,
        dueDate, plannedStartDate, estimatedDuration,
        asset:Asset!assetId(id, name, tag),
        serviceType:ServiceType!serviceTypeId(id, name)
      `)
      .eq('companyId', session.companyId)
      .eq('status', 'PENDING')
      .order('plannedStartDate', { ascending: true, nullsFirst: false })

    if (effectiveUnitId) query = query.eq('unitId', effectiveUnitId)

    // Filtrar por período se fornecido
    if (startDate) {
      query = query.or(`plannedStartDate.gte.${new Date(startDate).toISOString()},plannedStartDate.is.null`)
    }
    if (endDate) {
      query = query.or(`plannedStartDate.lte.${new Date(endDate).toISOString()},plannedStartDate.is.null`)
    }

    const { data: workOrders, error: woError } = await query

    if (woError) throw woError

    // Filtrar OSs que já estão em outras programações
    const available = (workOrders || []).filter(wo => !excludedWoIds.has(wo.id))

    return NextResponse.json({ data: available })
  } catch (error) {
    console.error('Error fetching available work orders:', error)
    return NextResponse.json({ error: 'Erro ao buscar OSs disponíveis' }, { status: 500 })
  }
}
