import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { getCalendarsForResources } from '@/lib/calendarData'
import {
  validateTimeAgainstCalendar,
  calculateEffectiveHours,
} from '@/lib/calendarUtils'

// POST - Finalizar uma Ordem de Serviço com dados reais de execução
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params

    // Verificar se a OS existe e pertence à empresa
    const { data: wo, error: woError } = await supabase
      .from('WorkOrder')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (woError || !wo) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    if (wo.status === 'COMPLETE') {
      return NextResponse.json({ error: 'OS já finalizada' }, { status: 400 })
    }

    // Verificar se a OS é corretiva imediata e tem RAF com PA incompleto
    if (wo.osType === 'CORRECTIVE_IMMEDIATE') {
      const { data: raf } = await supabase
        .from('FailureAnalysisReport')
        .select('id, rafNumber, actionPlan')
        .eq('workOrderId', id)
        .single()

      if (raf) {
        const actionPlan = (raf.actionPlan as any[]) || []
        if (actionPlan.length > 0) {
          const pendingItems = actionPlan.filter(
            (item: any) => item.status !== 'COMPLETED'
          )
          if (pendingItems.length > 0) {
            return NextResponse.json({
              error: `A RAF ${raf.rafNumber} possui ${pendingItems.length} item(ns) do Plano de Ação ainda não concluído(s). Finalize todos os itens do PA antes de encerrar esta OS.`
            }, { status: 400 })
          }
        }
      }
    }

    const body = await request.json()
    const {
      executionResources,   // Array de { resourceId, resourceName, quantity, hours, memberName, startDate, startTime, endDate, endTime, observation }
      executionSteps,       // Array de { stepId, stepName, completed }
      executionNotes,       // Observação geral
      realMaintenanceStart, // Data/hora real início manutenção
      realMaintenanceEnd,   // Data/hora real fim manutenção
      realStopStart,        // Data/hora real início parada
      realStopEnd,          // Data/hora real fim parada
      generateCorrectiveOS, // Boolean - se deve gerar OS corretiva
      correctiveData,       // Dados da OS corretiva (se generateCorrectiveOS=true)
    } = body

    // Calcular custos reais
    let laborCost = 0
    let totalDuration = 0
    if (executionResources && Array.isArray(executionResources)) {
      for (const r of executionResources) {
        if (r.hours) {
          laborCost += (r.hours || 0) * (r.hourlyRate || 0)
          totalDuration += (r.hours || 0) * 60 // converter para minutos
        }
      }
    }

    // =========================================================================
    // VALIDAÇÃO DE CALENDÁRIO — Verificar disponibilidade dos recursos
    // =========================================================================
    const calendarWarnings: string[] = []
    const calendarDetails: any[] = []

    if (executionResources && Array.isArray(executionResources)) {
      // Coletar resourceIds válidos
      const resourceIds = executionResources
        .map((r: any) => r.resourceId)
        .filter((id: string) => !!id)

      if (resourceIds.length > 0) {
        const resourceCalendars = await getCalendarsForResources(resourceIds)

        for (const r of executionResources) {
          if (!r.resourceId || !resourceCalendars.has(r.resourceId)) continue

          const calInfo = resourceCalendars.get(r.resourceId)!
          if (!calInfo.workDays) continue

          const resourceLabel = r.memberName || r.resourceName || r.resourceId

          // Validar data/hora de início
          if (r.startDate) {
            const startDate = new Date(r.startDate + 'T12:00:00')
            const validation = validateTimeAgainstCalendar(
              calInfo.workDays,
              startDate,
              r.startTime || undefined,
              undefined
            )
            if (!validation.valid) {
              for (const w of validation.warnings) {
                calendarWarnings.push(`${resourceLabel}: ${w} (Calendário: ${calInfo.calendarName})`)
              }
            }
          }

          // Validar data/hora de fim
          if (r.endDate) {
            const endDate = new Date(r.endDate + 'T12:00:00')
            const validation = validateTimeAgainstCalendar(
              calInfo.workDays,
              endDate,
              undefined,
              r.endTime || undefined
            )
            if (!validation.valid) {
              for (const w of validation.warnings) {
                calendarWarnings.push(`${resourceLabel}: ${w} (Calendário: ${calInfo.calendarName})`)
              }
            }
          }

          // Calcular horas efetivas vs registradas
          if (r.startDate && r.endDate && r.startTime && r.endTime) {
            const effResult = calculateEffectiveHours(
              calInfo.workDays,
              new Date(r.startDate + 'T12:00:00'),
              r.startTime,
              new Date(r.endDate + 'T12:00:00'),
              r.endTime
            )

            calendarDetails.push({
              resource: resourceLabel,
              calendar: calInfo.calendarName,
              registeredHours: r.hours || effResult.totalRegisteredHours,
              effectiveHours: Math.round(effResult.effectiveHours * 100) / 100,
              efficiency: Math.round(effResult.efficiency) + '%',
            })
          }
        }
      }
    }

    // Atualizar a OS com dados de finalização
    const updateData: Record<string, any> = {
      status: 'COMPLETE',
      completedOn: new Date().toISOString(),
      completedById: session.id,
      executionNotes: executionNotes || null,
      executionResources: executionResources || null,
      executionSteps: executionSteps || null,
      generateCorrectiveOS: generateCorrectiveOS || false,
      laborCost,
      actualDuration: totalDuration > 0 ? Math.round(totalDuration) : null,
      updatedAt: new Date().toISOString(),
    }

    // Salvar avisos de calendário no campo de notas (informativo)
    if (calendarWarnings.length > 0) {
      const existingNotes = updateData.executionNotes || ''
      const calendarNote = `\n\n⚠️ Avisos de calendário:\n${calendarWarnings.map(w => `• ${w}`).join('\n')}`
      updateData.executionNotes = existingNotes + calendarNote
    }

    if (realMaintenanceStart) updateData.realMaintenanceStart = new Date(realMaintenanceStart).toISOString()
    if (realMaintenanceEnd) updateData.realMaintenanceEnd = new Date(realMaintenanceEnd).toISOString()
    if (realStopStart) updateData.realStopStart = new Date(realStopStart).toISOString()
    if (realStopEnd) updateData.realStopEnd = new Date(realStopEnd).toISOString()

    const { data: updatedWo, error: updateError } = await supabase
      .from('WorkOrder')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Finalizar a SS vinculada (se existir)
    if (wo.sourceRequestId) {
      const { data: linkedRequest } = await supabase
        .from('Request')
        .select('id, status')
        .eq('id', wo.sourceRequestId)
        .single()

      if (linkedRequest && linkedRequest.status === 'APPROVED') {
        await supabase
          .from('Request')
          .update({
            status: 'COMPLETED',
            updatedAt: new Date().toISOString()
          })
          .eq('id', wo.sourceRequestId)
      }
    }

    // Atualizar a data da última manutenção no plano do bem (se existir)
    if (wo.assetMaintenancePlanId) {
      await supabase
        .from('AssetMaintenancePlan')
        .update({ lastMaintenanceDate: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .eq('id', wo.assetMaintenancePlanId)
    }

    // Se solicitou gerar OS corretiva
    let correctiveWo = null
    if (generateCorrectiveOS && correctiveData) {
      const { data: newWo, error: newWoError } = await supabase
        .from('WorkOrder')
        .insert({
          id: generateId(),
          title: correctiveData.title || `OS Corretiva - ${wo.title}`,
          description: correctiveData.description || `Gerada a partir da finalização da OS ${wo.internalId || wo.id}`,
          type: 'CORRECTIVE',
          osType: correctiveData.osType || 'CORRECTIVE_PLANNED',
          status: 'PENDING',
          priority: correctiveData.priority || 'MEDIUM',
          assetId: wo.assetId,
          unitId: wo.unitId,
          companyId: session.companyId,
          createdById: session.id,
        })
        .select()
        .single()

      if (!newWoError) correctiveWo = newWo
    }

    // Registrar evento no histórico do ativo
    if (wo.assetId) {
      await supabase.from('AssetHistory').insert({
        id: generateId(),
        assetId: wo.assetId,
        eventType: 'WORK_ORDER_COMPLETED',
        title: `OS "${wo.title}" finalizada`,
        description: executionNotes || 'Ordem de Serviço concluída',
        metadata: {
          workOrderId: id,
          laborCost,
          duration: totalDuration,
          calendarWarnings: calendarWarnings.length > 0 ? calendarWarnings : undefined,
          calendarDetails: calendarDetails.length > 0 ? calendarDetails : undefined,
        },
        workOrderId: id,
        userId: session.id,
      })
    }

    return NextResponse.json({
      data: updatedWo,
      correctiveWorkOrder: correctiveWo,
      calendarWarnings: calendarWarnings.length > 0 ? calendarWarnings : undefined,
      calendarDetails: calendarDetails.length > 0 ? calendarDetails : undefined,
      message: correctiveWo
        ? 'OS finalizada e OS corretiva gerada com sucesso'
        : 'OS finalizada com sucesso',
    })
  } catch (error) {
    console.error('Error finalizing work order:', error)
    return NextResponse.json({ error: 'Erro ao finalizar OS' }, { status: 500 })
  }
}
