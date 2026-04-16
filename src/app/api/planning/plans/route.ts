import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { generateSequentialId, getPriorityFromGut } from '@/lib/workOrderUtils'
import { copyPlanResourcesToWorkOrder, copyPlanTasksToWorkOrder } from '@/lib/woResourceCopy'
import { getCalendarsForPlans } from '@/lib/calendarData'
import { getAvailabilityInRange, estimateWorkingDaysForHours } from '@/lib/calendarUtils'

// GET - Listar planos de manutenção emitidos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const unitIdParam = searchParams.get('unitId')
    const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)

    let query = supabase
      .from('MaintenancePlanExecution')
      .select('*')
      .eq('companyId', session.companyId)
      .order('planNumber', { ascending: false })

    if (effectiveUnitId) query = query.eq('unitId', effectiveUnitId)

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar planos' }, { status: 500 })
  }
}

// POST - Criar plano e emitir OSs
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'plans', 'POST')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = await request.json()
    const {
      description, startDate, endDate, unitId: unitIdBody,
      trackingType, toleranceDays: bodyToleranceDays,
      // Filtros multi-seleção (arrays de IDs)
      costCenterIds, workCenterIds, serviceTypeIds, maintenanceAreaIds,
      // Filtros legados range (mantidos para compatibilidade)
      costCenterFrom, costCenterTo, workCenterFrom, workCenterTo,
      serviceTypeFrom, serviceTypeTo, areaFrom, areaTo, familyFrom, familyTo,
    } = body

    const unitId = getEffectiveUnitId(session, unitIdBody)
    const effectiveTrackingType = trackingType || 'TIME'
    const toleranceDays = Number(bodyToleranceDays) || 0

    if (!description || !startDate || !endDate || !unitId) {
      return NextResponse.json({ error: 'description, startDate, endDate e unitId são obrigatórios' }, { status: 400 })
    }

    // Criar o plano
    const { data: plan, error: planError } = await supabase
      .from('MaintenancePlanExecution')
      .insert({
        id: generateId(),
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status: 'OPEN',
        isFinished: false,
        trackingType: effectiveTrackingType,
        currentHorimeter: null,
        toleranceDays,
        costCenterFrom, costCenterTo, workCenterFrom, workCenterTo,
        serviceTypeFrom, serviceTypeTo, areaFrom, areaTo, familyFrom, familyTo,
        userId: session.id,
        companyId: session.companyId,
        unitId,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (planError) throw planError

    // Buscar manutenções do bem filtradas por trackingType
    let assetPlansQuery = supabase
      .from('AssetMaintenancePlan')
      .select('*, asset:Asset!assetId(id, name, tag, unitId, costCenterId, workCenterId, dailyVariation, gutGravity, gutUrgency, gutTendency, hasCounter, counterPosition)')
      .eq('companyId', session.companyId)
      .eq('isActive', true)
      .eq('considerPlanning', true)
      .eq('trackingType', effectiveTrackingType)

    // Aplicar filtro por tipo de serviço
    if (Array.isArray(serviceTypeIds) && serviceTypeIds.length > 0) {
      assetPlansQuery = assetPlansQuery.in('serviceTypeId', serviceTypeIds)
    }

    // Aplicar filtro por área de manutenção
    if (Array.isArray(maintenanceAreaIds) && maintenanceAreaIds.length > 0) {
      assetPlansQuery = assetPlansQuery.in('maintenanceAreaId', maintenanceAreaIds)
    }

    const { data: assetPlans, error: apError } = await assetPlansQuery
    if (apError) throw apError

    const start = new Date(startDate)
    const end = new Date(endDate)
    let generatedCount = 0

    // Sets para filtros baseados no Asset
    const costCenterSet = Array.isArray(costCenterIds) && costCenterIds.length > 0
      ? new Set(costCenterIds) : null
    const workCenterSet = Array.isArray(workCenterIds) && workCenterIds.length > 0
      ? new Set(workCenterIds) : null

    // Ativos pendentes (horímetro sem calendário)
    const pendingAssets: Array<{
      id: string
      assetMaintenancePlanId: string
      assetName: string
      assetTag: string
      maintenanceName: string
      maintenanceTime: number
      timeUnit: string
      reason?: string
    }> = []

    // Buscar calendários em batch para planos por horímetro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let calendarsMap: Map<string, { calendarId: string; calendarName: string; workDays: any }> = new Map()
    if (effectiveTrackingType === 'HORIMETER' && assetPlans && assetPlans.length > 0) {
      const planIds = assetPlans.map((ap: { id: string }) => ap.id)
      calendarsMap = await getCalendarsForPlans(planIds)
    }

    for (const ap of (assetPlans || [])) {
      // Verificar se o ativo pertence à unidade
      if (ap.asset?.unitId !== unitId) continue

      // Aplicar filtros do Asset
      if (costCenterSet && !costCenterSet.has(ap.asset?.costCenterId)) continue
      if (workCenterSet && !workCenterSet.has(ap.asset?.workCenterId)) continue

      // Verificar campos básicos de frequência
      if (!ap.maintenanceTime || !ap.timeUnit) continue

      if (effectiveTrackingType === 'TIME') {
        // ========== LÓGICA POR TEMPO (sem mudança) ==========
        const baseDate = ap.lastMaintenanceDate || startDate
        let nextDate = calculateNextDateByTime(baseDate, ap.maintenanceTime, ap.timeUnit)
        let loopCount = 0
        while (nextDate && nextDate <= end) {
          loopCount++
          if (nextDate >= start) {
            const woResult = await createWorkOrder(supabase, {
              ap, plan, unitId, companyId: session.companyId, plannedDate: nextDate,
              toleranceDays,
            })
            if (woResult.success) generatedCount++
          }
          nextDate = calculateNextDateByTime(nextDate.toISOString(), ap.maintenanceTime, ap.timeUnit)
          if (loopCount > 100) break
        }
      } else {
        // ========== LÓGICA POR HORÍMETRO (por equipamento) ==========

        // Calendário é obrigatório para horímetro
        const calData = calendarsMap.get(ap.id)
        if (!calData?.workDays) {
          pendingAssets.push({
            id: ap.asset?.id || '',
            assetMaintenancePlanId: ap.id,
            assetName: ap.asset?.name || 'Ativo sem nome',
            assetTag: ap.asset?.tag || '—',
            maintenanceName: ap.name || 'Manutenção',
            maintenanceTime: ap.maintenanceTime,
            timeUnit: ap.timeUnit,
            reason: 'Sem calendário vinculado no Plano do Bem',
          })
          continue
        }

        if (!ap.lastMaintenanceDate) continue

        // Horímetro atual do equipamento (Asset.counterPosition)
        const assetHorimeter = ap.asset?.counterPosition
        if (assetHorimeter == null || assetHorimeter <= 0) {
          pendingAssets.push({
            id: ap.asset?.id || '',
            assetMaintenancePlanId: ap.id,
            assetName: ap.asset?.name || 'Ativo sem nome',
            assetTag: ap.asset?.tag || '—',
            maintenanceName: ap.name || 'Manutenção',
            maintenanceTime: ap.maintenanceTime,
            timeUnit: ap.timeUnit,
            reason: 'Sem horímetro atual cadastrado no ativo (Posição do Contador)',
          })
          continue
        }

        const workDays = calData.workDays
        const maintenanceTimeHours = ap.maintenanceTime // periodicidade em horas

        // Passo 1: Calcular horas operadas desde a última manutenção até o início do plano
        const horasOperadas = getAvailabilityInRange(
          workDays,
          new Date(ap.lastMaintenanceDate),
          start
        ).totalHours

        // Passo 2: Estimar horímetro na última manutenção
        const horimeterNaUltimaManutenção = assetHorimeter - horasOperadas

        // Passo 3: Projetar ciclos de manutenção
        let proximoHorimetro = horimeterNaUltimaManutenção + maintenanceTimeHours
        let loopSafety = 0

        // Passo 4: Gerar OSs para ciclos já vencidos (atrasados)
        while (proximoHorimetro <= assetHorimeter && loopSafety < 200) {
          loopSafety++
          const woResult = await createWorkOrder(supabase, {
            ap, plan, unitId, companyId: session.companyId,
            plannedDate: start,
            overrideDueMeterReading: proximoHorimetro,
            overridePriority: 'CRITICAL',
            isOverdue: true,
            toleranceDays,
          })
          if (woResult.success) generatedCount++
          proximoHorimetro += maintenanceTimeHours
        }

        // Passo 5: Gerar OSs futuras dentro do período
        while (loopSafety < 200) {
          loopSafety++
          const horasRestantes = proximoHorimetro - assetHorimeter
          const { endDate: projectedDate } = estimateWorkingDaysForHours(workDays, horasRestantes, start)

          if (projectedDate > end) break

          const woResult = await createWorkOrder(supabase, {
            ap, plan, unitId, companyId: session.companyId,
            plannedDate: projectedDate,
            overrideDueMeterReading: proximoHorimetro,
            toleranceDays,
          })
          if (woResult.success) generatedCount++
          proximoHorimetro += maintenanceTimeHours
        }
      }
    }

    return NextResponse.json({
      data: plan,
      message: `Plano criado com ${generatedCount} OS(s) gerada(s)`,
      generatedCount,
      pendingAssets: effectiveTrackingType === 'HORIMETER' ? pendingAssets : [],
    }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao criar plano' }, { status: 500 })
  }
}

// Calcular próxima data baseada na frequência em tempo
function calculateNextDateByTime(lastMaintenanceDate: string, maintenanceTime: number, timeUnit: string): Date | null {
  const lastDate = new Date(lastMaintenanceDate)
  const nextDate = new Date(lastDate)

  switch (timeUnit) {
    case 'Dia(s)': nextDate.setDate(nextDate.getDate() + maintenanceTime); break
    case 'Semana(s)': nextDate.setDate(nextDate.getDate() + maintenanceTime * 7); break
    case 'Mês(es)': nextDate.setMonth(nextDate.getMonth() + maintenanceTime); break
    case 'Hora(s)': nextDate.setHours(nextDate.getHours() + maintenanceTime); break
    default: nextDate.setDate(nextDate.getDate() + maintenanceTime)
  }

  return nextDate
}

// Criar WorkOrder a partir de um AssetMaintenancePlan
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createWorkOrder(db: any, params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ap: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any
  unitId: string
  companyId: string
  plannedDate: Date
  overrideDueMeterReading?: number
  overridePriority?: string
  isOverdue?: boolean
  toleranceDays?: number
}): Promise<{ success: boolean }> {
  const {
    ap, plan, unitId, companyId, plannedDate,
    overrideDueMeterReading, overridePriority, isOverdue, toleranceDays,
  } = params
  const externalId = await generateSequentialId()

  // Auto-priorização por GUT do ativo (pode ser sobrescrita)
  const gutPriority = ap.asset
    ? getPriorityFromGut(ap.asset.gutGravity, ap.asset.gutUrgency, ap.asset.gutTendency)
    : 'LOW'
  const priority = overridePriority || gutPriority

  // Descrição
  const descSuffix = isOverdue ? ' (ATRASADA — manutenção vencida)' : ''
  const description = `OS gerada pelo Plano #${plan.planNumber}${descSuffix}`

  // Calcular vencimento
  let dueDate: string | null = null
  let dueMeterReading: number | null = overrideDueMeterReading ?? null

  if (overrideDueMeterReading != null) {
    // Horímetro com dueMeterReading fornecido: dueDate = plannedDate + tolerância
    const due = new Date(plannedDate)
    if (toleranceDays && toleranceDays > 0) {
      due.setDate(due.getDate() + toleranceDays)
    }
    dueDate = due.toISOString()
  } else if (ap.trackingType === 'TIME' && ap.maintenanceTime && ap.timeUnit) {
    const due = new Date(plannedDate)
    switch (ap.timeUnit) {
      case 'Dia(s)': due.setDate(due.getDate() + ap.maintenanceTime); break
      case 'Semana(s)': due.setDate(due.getDate() + ap.maintenanceTime * 7); break
      case 'Mês(es)': due.setMonth(due.getMonth() + ap.maintenanceTime); break
      case 'Hora(s)': due.setHours(due.getHours() + ap.maintenanceTime); break
      default: due.setDate(due.getDate() + ap.maintenanceTime)
    }
    if (ap.toleranceDays) due.setDate(due.getDate() + ap.toleranceDays)
    if (toleranceDays && toleranceDays > 0) due.setDate(due.getDate() + toleranceDays)
    dueDate = due.toISOString()
  } else if ((ap.trackingType === 'METER' || ap.trackingType === 'HORIMETER') && ap.asset?.hasCounter) {
    const currentPos = ap.asset.counterPosition || 0
    dueMeterReading = currentPos + (ap.maintenanceTime || 0)
  }

  const woId = generateId()
  const { error } = await db
    .from('WorkOrder')
    .insert({
      id: woId,
      externalId,
      internalId: null,
      systemStatus: 'IN_SYSTEM',
      title: ap.name || `Manutenção Preventiva - ${ap.asset?.name}`,
      description,
      type: 'PREVENTIVE',
      status: 'PENDING',
      priority,
      plannedStartDate: plannedDate.toISOString(),
      dueDate,
      dueMeterReading,
      assetId: ap.asset?.id,
      serviceTypeId: ap.serviceTypeId,
      assetMaintenancePlanId: ap.id,
      maintenancePlanExecId: plan.id,
      unitId,
      companyId,
      updatedAt: new Date().toISOString(),
    })
  if (error) {
    console.error('[createWO] Error:', error.message)
  } else {
    await copyPlanResourcesToWorkOrder(ap.id, woId)
    await copyPlanTasksToWorkOrder(ap.id, woId)
  }
  return { success: !error }
}
