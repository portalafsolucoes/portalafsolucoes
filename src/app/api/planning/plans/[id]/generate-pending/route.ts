import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { generateSequentialId, getPriorityFromGut } from '@/lib/workOrderUtils'
import { copyPlanResourcesToWorkOrder, copyPlanTasksToWorkOrder } from '@/lib/woResourceCopy'
import { normalizeTextPayload } from '@/lib/textNormalizer'

// POST - Gerar OSs para ativos selecionados manualmente (sem dailyVariation)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'plans', 'POST')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id: planId } = await params
    const body = normalizeTextPayload(await request.json())
    const { assetMaintenancePlanIds } = body

    if (!Array.isArray(assetMaintenancePlanIds) || assetMaintenancePlanIds.length === 0) {
      return NextResponse.json({ error: 'Nenhuma manutenção selecionada' }, { status: 400 })
    }

    // Verificar se o plano existe e pertence à empresa
    const { data: plan, error: planError } = await supabase
      .from('MaintenancePlanExecution')
      .select('id, planNumber, unitId, companyId, startDate, endDate')
      .eq('id', planId)
      .eq('companyId', session.companyId)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    // Buscar as manutenções selecionadas (inclui GUT do ativo para auto-priorização)
    const { data: assetPlans, error: apError } = await supabase
      .from('AssetMaintenancePlan')
      .select('*, asset:Asset!assetId(id, name, tag, unitId, gutGravity, gutUrgency, gutTendency, counterPosition, counterLimit, dailyVariation, hasCounter)')
      .in('id', assetMaintenancePlanIds)
      .eq('companyId', session.companyId)
      .eq('isActive', true)

    if (apError) throw apError

    let generatedCount = 0
    const planStart = new Date(plan.startDate)

    for (const ap of (assetPlans || [])) {
      if (ap.asset?.unitId !== plan.unitId) continue

      const plannedDate = planStart
      const externalId = await generateSequentialId()

      // Auto-priorização por GUT do ativo
      const priority = ap.asset
        ? getPriorityFromGut(ap.asset.gutGravity, ap.asset.gutUrgency, ap.asset.gutTendency)
        : 'LOW'

      // Calcular dueDate baseado no trackingType e tempo de manutenção
      let dueDate: string | null = null
      let dueMeterReading: number | null = null

      if (ap.trackingType === 'TIME' && ap.maintenanceTime && ap.timeUnit) {
        const due = new Date(plannedDate)
        switch (ap.timeUnit) {
          case 'DAYS': due.setDate(due.getDate() + ap.maintenanceTime); break
          case 'WEEKS': due.setDate(due.getDate() + ap.maintenanceTime * 7); break
          case 'MONTHS': due.setMonth(due.getMonth() + ap.maintenanceTime); break
          case 'YEARS': due.setFullYear(due.getFullYear() + ap.maintenanceTime); break
          default: due.setDate(due.getDate() + ap.maintenanceTime)
        }
        if (ap.toleranceDays) due.setDate(due.getDate() + ap.toleranceDays)
        dueDate = due.toISOString()
      } else if (ap.trackingType === 'METER' && ap.asset?.hasCounter) {
        // Horímetro: vencimento = posição atual + intervalo de manutenção
        const currentPos = ap.asset.counterPosition || 0
        dueMeterReading = currentPos + (ap.maintenanceTime || 0)
      }

      const woId = generateId()
      const { error: woError } = await supabase
        .from('WorkOrder')
        .insert({
          id: woId,
          externalId,
          internalId: null,
          systemStatus: 'IN_SYSTEM',
          title: ap.name || `Manutenção Preventiva - ${ap.asset?.name}`,
          description: `OS gerada pelo Plano #${plan.planNumber} (seleção manual)`,
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
          unitId: plan.unitId,
          companyId: session.companyId,
          updatedAt: new Date().toISOString(),
        })

      if (!woError) {
        generatedCount++
        // Copiar recursos e tarefas do plano de manutenção para a OS
        await copyPlanResourcesToWorkOrder(ap.id, woId)
        await copyPlanTasksToWorkOrder(ap.id, woId)
      }
    }

    return NextResponse.json({
      message: `${generatedCount} OS(s) gerada(s) para ativos selecionados`,
      generatedCount,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao gerar OSs pendentes' }, { status: 500 })
  }
}
