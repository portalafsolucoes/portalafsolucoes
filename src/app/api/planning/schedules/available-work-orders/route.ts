import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'

// GET - Listar OSs disponiveis para programacao
// Retorna todas as OSs em aberto (qualquer status diferente de COMPLETE),
// aplicando os filtros parametrizaveis do Q1 do workspace.
//
// Regra de disponibilidade:
// - OSs ja programadas em outras programacoes NAO sao excluidas. Elas
//   retornam com o metadado `inOtherSchedule` contendo scheduleId,
//   scheduleNumber, scheduleStatus, scheduledDate e isOverdue, para
//   que a UI exiba um badge informativo ("Em rascunho Prog. #X",
//   "Ja programada Prog. #X" ou "Atrasada Prog. #X").
// - OSs cuja referencia mais critica e' uma programacao COMPLETED ou
//   item MOVED/EXECUTED NAO recebem metadado (nao ha bloqueio ativo).
//
// Filtros suportados (todos opcionais, CSV ou parametro repetido):
// - maintenancePlanExecId   -> WorkOrder.maintenancePlanExecId in (...)
// - serviceTypeId           -> WorkOrder.serviceTypeId in (...)
// - maintenanceTypeId       -> WorkOrder.serviceType.maintenanceTypeId in (...)
// - maintenanceAreaId       -> WorkOrder.maintenanceAreaId in (...)
// - workCenterId            -> WorkOrder.asset.workCenterId in (...)
// - startDate / endDate     -> range de plannedStartDate (ou null)
// - includeAllOpen=true     -> ignora startDate/endDate e retorna todas
//                              as OSs abertas, sem recorte de periodo.
//
// Sem startDate/endDate explicitos e sem includeAllOpen, o endpoint usa o
// periodo da programacao atual como default. A client-side layer omite os
// filtros multi-valor quando o usuario marca todas as opcoes (semantica
// "todos marcados = sem filtro", incluindo OSs com campo NULL).

const OPEN_WO_STATUSES = ['PENDING', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD', 'REPROGRAMMED']
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const unitIdParam = searchParams.get('unitId')
    const scheduleId = searchParams.get('scheduleId') // Programacao atual sendo editada

    // Datas opcionais do filtro (sobrepoem o periodo da programacao).
    // Quando includeAllOpen=true, sao ignoradas (retorna todas as OSs abertas).
    const includeAllOpen = searchParams.get('includeAllOpen') === 'true'
    const startDate = includeAllOpen ? undefined : (searchParams.get('startDate') || undefined)
    const endDate = includeAllOpen ? undefined : (searchParams.get('endDate') || undefined)

    // Filtros multi-valor (aceitam CSV ou parametros repetidos)
    const parseMulti = (key: string): string[] => {
      const values: string[] = []
      for (const v of searchParams.getAll(key)) {
        if (!v) continue
        for (const part of v.split(',')) {
          const trimmed = part.trim()
          if (trimmed) values.push(trimmed)
        }
      }
      return values
    }
    const planIds = parseMulti('maintenancePlanExecId')
    const serviceTypeIds = parseMulti('serviceTypeId')
    const maintenanceTypeIds = parseMulti('maintenanceTypeId')
    const maintenanceAreaIds = parseMulti('maintenanceAreaId')
    const workCenterIds = parseMulti('workCenterId')

    const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)
    const todayISO = new Date().toISOString()

    // Buscar items de outras programacoes que impactam disponibilidade
    const { data: existingItems } = await supabase
      .from('WorkOrderScheduleItem')
      .select('workOrderId, scheduledDate, status, schedule:WorkOrderSchedule!scheduleId(id, status, scheduleNumber)')

    // Monta mapa de "ja programada em outra programacao" para exibir badge.
    // Prioridade de escolha quando a OS aparece em varias: atrasada primeiro,
    // depois menor scheduledDate.
    type OtherScheduleRef = {
      scheduleId: string
      scheduleNumber?: number
      scheduleStatus: string
      scheduledDate: string
      isOverdue: boolean
    }
    const inOtherScheduleMap = new Map<string, OtherScheduleRef>()

    const isMoreCritical = (next: OtherScheduleRef, current: OtherScheduleRef): boolean => {
      // Atrasada sempre tem precedencia
      if (next.isOverdue && !current.isOverdue) return true
      if (!next.isOverdue && current.isOverdue) return false
      // Mesmo nivel: prefere a data mais antiga
      return next.scheduledDate < current.scheduledDate
    }

    for (const item of existingItems || []) {
      const sched = item.schedule as unknown as { id: string; status: string; scheduleNumber?: number } | null
      if (!sched) continue
      // Ignorar items ja movidos ou executados (nao bloqueiam e nao sao referencias ativas)
      if (item.status === 'MOVED' || item.status === 'EXECUTED') continue
      // Ignorar a propria programacao sendo editada
      if (sched.id === scheduleId) continue
      // Ignorar programacoes ja finalizadas
      if (sched.status === 'COMPLETED') continue
      // So consideramos estados que representam ocupacao ativa
      if (
        sched.status !== 'DRAFT' &&
        sched.status !== 'REPROGRAMMING' &&
        sched.status !== 'CONFIRMED' &&
        sched.status !== 'PARTIALLY_EXECUTED'
      ) continue

      const scheduledISO = new Date(item.scheduledDate as string).toISOString()
      const isOverdue =
        (sched.status === 'CONFIRMED' || sched.status === 'PARTIALLY_EXECUTED') &&
        scheduledISO < todayISO

      const ref: OtherScheduleRef = {
        scheduleId: sched.id,
        scheduleNumber: sched.scheduleNumber,
        scheduleStatus: sched.status,
        scheduledDate: scheduledISO,
        isOverdue,
      }

      const existing = inOtherScheduleMap.get(item.workOrderId)
      if (!existing || isMoreCritical(ref, existing)) {
        inOtherScheduleMap.set(item.workOrderId, ref)
      }
    }

    // Query base de OSs disponiveis
    let query = supabase
      .from('WorkOrder')
      .select(`
        id, externalId, internalId, title, status, priority, type,
        dueDate, plannedStartDate, estimatedDuration,
        maintenancePlanExecId, maintenanceAreaId, serviceTypeId,
        asset:Asset!assetId(id, name, tag, workCenterId),
        serviceType:ServiceType!serviceTypeId(id, name, maintenanceTypeId),
        maintenancePlanExec:MaintenancePlanExecution!maintenancePlanExecId(id, planNumber),
        maintenanceArea:MaintenanceArea!maintenanceAreaId(id, name)
      `)
      .eq('companyId', session.companyId)
      .in('status', OPEN_WO_STATUSES)
      .order('plannedStartDate', { ascending: true, nullsFirst: false })

    if (effectiveUnitId) query = query.eq('unitId', effectiveUnitId)

    // Filtros escalares multi-valor
    if (planIds.length > 0) query = query.in('maintenancePlanExecId', planIds)
    if (serviceTypeIds.length > 0) query = query.in('serviceTypeId', serviceTypeIds)
    if (maintenanceAreaIds.length > 0) query = query.in('maintenanceAreaId', maintenanceAreaIds)

    // Filtro por periodo de plannedStartDate (inclui null para nao excluir OSs sem data)
    if (startDate) {
      query = query.or(`plannedStartDate.gte.${new Date(startDate).toISOString()},plannedStartDate.is.null`)
    }
    if (endDate) {
      query = query.or(`plannedStartDate.lte.${new Date(endDate).toISOString()},plannedStartDate.is.null`)
    }

    const { data: workOrders, error: woError } = await query
    if (woError) throw woError

    // Filtros indiretos (via relacionamentos) aplicados em memoria
    const pickOne = <T>(value: T | T[] | null | undefined): T | null => {
      if (!value) return null
      return Array.isArray(value) ? (value[0] ?? null) : value
    }

    const mtSet = maintenanceTypeIds.length > 0 ? new Set(maintenanceTypeIds) : null
    const wcSet = workCenterIds.length > 0 ? new Set(workCenterIds) : null

    const available = (workOrders || [])
      .filter(wo => {
        if (mtSet) {
          const st = pickOne(wo.serviceType) as { maintenanceTypeId?: string | null } | null
          if (!st?.maintenanceTypeId || !mtSet.has(st.maintenanceTypeId)) return false
        }
        if (wcSet) {
          const asset = pickOne(wo.asset) as { workCenterId?: string | null } | null
          if (!asset?.workCenterId || !wcSet.has(asset.workCenterId)) return false
        }
        return true
      })
      .map(wo => {
        const inOtherSchedule = inOtherScheduleMap.get(wo.id)
        return inOtherSchedule ? { ...wo, inOtherSchedule } : wo
      })

    return NextResponse.json({ data: available })
  } catch (error) {
    console.error('Error fetching available work orders:', error)
    return NextResponse.json({ error: 'Erro ao buscar OSs disponíveis' }, { status: 500 })
  }
}
