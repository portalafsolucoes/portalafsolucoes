import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { generateSequentialId, getPriorityFromGut } from '@/lib/workOrderUtils'
import { copyPlanResourcesToWorkOrder, copyPlanTasksToWorkOrder } from '@/lib/woResourceCopy'

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
      trackingType, currentHorimeter,
      // Filtros multi-seleção (arrays de IDs)
      costCenterIds, workCenterIds, serviceTypeIds, maintenanceAreaIds,
      // Filtros legados range (mantidos para compatibilidade)
      costCenterFrom, costCenterTo, workCenterFrom, workCenterTo,
      serviceTypeFrom, serviceTypeTo, areaFrom, areaTo, familyFrom, familyTo,
    } = body

    const unitId = getEffectiveUnitId(session, unitIdBody)
    const effectiveTrackingType = trackingType || 'TIME'

    if (!description || !startDate || !endDate || !unitId) {
      return NextResponse.json({ error: 'description, startDate, endDate e unitId são obrigatórios' }, { status: 400 })
    }

    if (effectiveTrackingType === 'HORIMETER' && (!currentHorimeter || currentHorimeter <= 0)) {
      return NextResponse.json({ error: 'Horímetro atual é obrigatório para planos por horímetro' }, { status: 400 })
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
        currentHorimeter: effectiveTrackingType === 'HORIMETER' ? currentHorimeter : null,
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

    // Ativos sem dailyVariation (apenas para HORIMETER)
    const pendingAssets: Array<{
      id: string
      assetMaintenancePlanId: string
      assetName: string
      assetTag: string
      maintenanceName: string
      maintenanceTime: number
      timeUnit: string
    }> = []

    for (const ap of (assetPlans || [])) {
      // Verificar se o ativo pertence à unidade
      if (ap.asset?.unitId !== unitId) continue

      // Aplicar filtros do Asset
      if (costCenterSet && !costCenterSet.has(ap.asset?.costCenterId)) continue
      if (workCenterSet && !workCenterSet.has(ap.asset?.workCenterId)) continue

      // Verificar campos básicos de frequência
      if (!ap.maintenanceTime || !ap.timeUnit) continue

      if (effectiveTrackingType === 'TIME') {
        // Lógica por TEMPO: gerar múltiplas OSs para cada ciclo dentro do período
        // Se lastMaintenanceDate vazio, usar startDate do plano como ponto de partida
        const baseDate = ap.lastMaintenanceDate || startDate
        let nextDate = calculateNextDateByTime(baseDate, ap.maintenanceTime, ap.timeUnit)
        let loopCount = 0
        while (nextDate && nextDate <= end) {
          loopCount++
          if (nextDate >= start) {
            const woResult = await createWorkOrder(supabase, {
              ap, plan, unitId, companyId: session.companyId, plannedDate: nextDate,
            })
            if (woResult.success) generatedCount++
          }
          // Avançar para o próximo ciclo
          nextDate = calculateNextDateByTime(nextDate.toISOString(), ap.maintenanceTime, ap.timeUnit)
          if (loopCount > 100) break
        }
      } else {
        // Para HORÍMETRO, lastMaintenanceDate é obrigatório
        if (!ap.lastMaintenanceDate) continue
        // Lógica por HORÍMETRO: projetar data usando dailyVariation
        const dailyVariation = ap.asset?.dailyVariation

        if (!dailyVariation || dailyVariation <= 0) {
          // Sem variação diária — incluir na lista para seleção manual
          pendingAssets.push({
            id: ap.asset?.id || '',
            assetMaintenancePlanId: ap.id,
            assetName: ap.asset?.name || 'Ativo sem nome',
            assetTag: ap.asset?.tag || '—',
            maintenanceName: ap.name || 'Manutenção',
            maintenanceTime: ap.maintenanceTime,
            timeUnit: ap.timeUnit,
          })
          continue
        }

        // Projetar: lastMaintenanceDate + (maintenanceTime / dailyVariation) dias
        const daysUntilNext = ap.maintenanceTime / dailyVariation
        const lastDate = new Date(ap.lastMaintenanceDate)
        const nextDate = new Date(lastDate)
        nextDate.setDate(nextDate.getDate() + Math.round(daysUntilNext))

        if (nextDate >= start && nextDate <= end) {
          const woResult = await createWorkOrder(supabase, {
            ap, plan, unitId, companyId: session.companyId, plannedDate: nextDate,
          })
          if (woResult.success) generatedCount++
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
}): Promise<{ success: boolean }> {
  const { ap, plan, unitId, companyId, plannedDate } = params
  const externalId = await generateSequentialId()

  // Auto-priorização por GUT do ativo
  const priority = ap.asset
    ? getPriorityFromGut(ap.asset.gutGravity, ap.asset.gutUrgency, ap.asset.gutTendency)
    : 'LOW'

  // Calcular vencimento conforme trackingType
  let dueDate: string | null = null
  let dueMeterReading: number | null = null

  if (ap.trackingType === 'TIME' && ap.maintenanceTime && ap.timeUnit) {
    const due = new Date(plannedDate)
    switch (ap.timeUnit) {
      case 'Dia(s)': due.setDate(due.getDate() + ap.maintenanceTime); break
      case 'Semana(s)': due.setDate(due.getDate() + ap.maintenanceTime * 7); break
      case 'Mês(es)': due.setMonth(due.getMonth() + ap.maintenanceTime); break
      case 'Hora(s)': due.setHours(due.getHours() + ap.maintenanceTime); break
      default: due.setDate(due.getDate() + ap.maintenanceTime)
    }
    if (ap.toleranceDays) due.setDate(due.getDate() + ap.toleranceDays)
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
      description: `OS gerada pelo Plano #${plan.planNumber}`,
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
