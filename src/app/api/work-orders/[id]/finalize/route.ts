import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

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
        assetId: wo.assetId,
        eventType: 'WORK_ORDER_COMPLETED',
        title: `OS "${wo.title}" finalizada`,
        description: executionNotes || 'Ordem de Serviço concluída',
        metadata: { workOrderId: id, laborCost, duration: totalDuration },
        workOrderId: id,
        userId: session.id,
      })
    }

    return NextResponse.json({
      data: updatedWo,
      correctiveWorkOrder: correctiveWo,
      message: correctiveWo
        ? 'OS finalizada e OS corretiva gerada com sucesso'
        : 'OS finalizada com sucesso',
    })
  } catch (error) {
    console.error('Error finalizing work order:', error)
    return NextResponse.json({ error: 'Erro ao finalizar OS' }, { status: 500 })
  }
}
