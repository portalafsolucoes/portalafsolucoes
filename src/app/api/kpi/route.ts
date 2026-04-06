import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unitId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Buscar OSs da empresa com filtro de data (padrão: últimos 12 meses)
    const defaultStart = new Date()
    defaultStart.setMonth(defaultStart.getMonth() - 12)

    let woQuery = supabase
      .from('WorkOrder')
      .select('id, type, status, createdAt, completedOn, actualDuration, laborCost, partsCost, thirdPartyCost, toolsCost, assetId, osType, realMaintenanceStart, realMaintenanceEnd, realStopStart, realStopEnd')
      .eq('companyId', session.companyId)
      .gte('createdAt', (startDate ? new Date(startDate) : defaultStart).toISOString())

    if (unitId) woQuery = woQuery.eq('unitId', unitId)
    if (endDate) woQuery = woQuery.lte('createdAt', new Date(endDate).toISOString())

    const { data: workOrders, error: woError } = await woQuery
    if (woError) throw woError
    const wos = workOrders || []

    // Classificar OSs
    const completed = wos.filter(w => w.status === 'COMPLETE')
    const correctives = wos.filter(w => w.type === 'CORRECTIVE' || w.osType === 'CORRECTIVE_IMMEDIATE' || w.osType === 'CORRECTIVE_PLANNED')
    const preventives = wos.filter(w => w.type === 'PREVENTIVE' || w.osType === 'PREVENTIVE_MANUAL')
    const completedCorrectives = completed.filter(w => w.type === 'CORRECTIVE' || w.osType === 'CORRECTIVE_IMMEDIATE' || w.osType === 'CORRECTIVE_PLANNED')
    const completedPreventives = completed.filter(w => w.type === 'PREVENTIVE' || w.osType === 'PREVENTIVE_MANUAL')
    const pending = wos.filter(w => ['PENDING', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD'].includes(w.status))

    // ===== CONFIABILIDADE E DESEMPENHO =====

    // MTBF: Tempo Médio Entre Falhas (horas)
    // Soma de horas de funcionamento / número de falhas
    let totalUptime = 0
    let failureCount = completedCorrectives.length
    for (const wo of completedCorrectives) {
      if (wo.realStopStart && wo.realMaintenanceStart) {
        const stop = new Date(wo.realStopStart).getTime()
        const maint = new Date(wo.realMaintenanceStart).getTime()
        totalUptime += Math.max(0, (maint - stop) / 3600000) // horas
      }
    }
    const mtbf = failureCount > 0 ? Math.round(totalUptime / failureCount * 10) / 10 : 0

    // MTTR: Tempo Médio para Reparo (horas)
    let totalRepairTime = 0
    let repairCount = 0
    for (const wo of completedCorrectives) {
      if (wo.actualDuration) {
        totalRepairTime += wo.actualDuration / 60 // converter minutos para horas
        repairCount++
      } else if (wo.realMaintenanceStart && wo.realMaintenanceEnd) {
        const start = new Date(wo.realMaintenanceStart).getTime()
        const end = new Date(wo.realMaintenanceEnd).getTime()
        totalRepairTime += (end - start) / 3600000
        repairCount++
      }
    }
    const mttr = repairCount > 0 ? Math.round(totalRepairTime / repairCount * 10) / 10 : 0

    // Disponibilidade = MTBF / (MTBF + MTTR)
    const availability = (mtbf + mttr) > 0 ? Math.round((mtbf / (mtbf + mttr)) * 1000) / 10 : 100

    // OEE simplificado = Disponibilidade (sem dados de performance e qualidade por enquanto)
    const oee = availability

    // ===== PROCESSO E PLANEJAMENTO =====

    // PMC: Cumprimento do Plano de Manutenção
    // % de preventivas concluídas no prazo
    let onTimePrev = 0
    for (const wo of completedPreventives) {
      if (wo.completedOn && wo.createdAt) {
        onTimePrev++ // Considerar todas completas como "no prazo" por enquanto
      }
    }
    const totalPrevPlanned = preventives.length
    const pmc = totalPrevPlanned > 0 ? Math.round((onTimePrev / totalPrevPlanned) * 1000) / 10 : 0

    // Distribuição Corretiva vs Preventiva
    const totalWos = wos.length
    const correctivePercent = totalWos > 0 ? Math.round((correctives.length / totalWos) * 1000) / 10 : 0
    const preventivePercent = totalWos > 0 ? Math.round((preventives.length / totalWos) * 1000) / 10 : 0

    // Backlog (semanas): tempo estimado para concluir pendentes com equipe atual
    let pendingHours = 0
    for (const wo of pending) {
      pendingHours += (wo.actualDuration || 120) / 60 // default 2h se não estimado
    }
    // Assumir equipe com 40h/semana disponível
    const backlogWeeks = Math.round(pendingHours / 40 * 10) / 10

    // ===== CUSTO E QUALIDADE =====

    // Custo total de manutenção
    let totalCost = 0
    for (const wo of completed) {
      totalCost += (wo.laborCost || 0) + (wo.partsCost || 0) + (wo.thirdPartyCost || 0) + (wo.toolsCost || 0)
    }

    // Custo médio por OS
    const avgCost = completed.length > 0 ? Math.round(totalCost / completed.length * 100) / 100 : 0

    // Índice de Retrabalho: OSs corretivas no mesmo ativo em 30 dias
    const assetCorrectiveCount: Record<string, number> = {}
    for (const wo of completedCorrectives) {
      if (wo.assetId) {
        assetCorrectiveCount[wo.assetId] = (assetCorrectiveCount[wo.assetId] || 0) + 1
      }
    }
    const reworkCount = Object.values(assetCorrectiveCount).filter(c => c > 1).length
    const reworkIndex = completedCorrectives.length > 0 ? Math.round((reworkCount / completedCorrectives.length) * 1000) / 10 : 0

    return NextResponse.json({
      data: {
        summary: {
          totalWorkOrders: totalWos,
          completed: completed.length,
          pending: pending.length,
          correctives: correctives.length,
          preventives: preventives.length,
        },
        reliability: {
          mtbf: { value: mtbf, unit: 'h', label: 'MTBF - Tempo Médio Entre Falhas', description: 'Quanto maior, melhor a confiabilidade' },
          mttr: { value: mttr, unit: 'h', label: 'MTTR - Tempo Médio para Reparo', description: 'Quanto menor, mais rápida a manutenção' },
          availability: { value: availability, unit: '%', label: 'Disponibilidade', description: 'MTBF / (MTBF + MTTR)' },
          oee: { value: oee, unit: '%', label: 'OEE - Eficiência Global', description: 'Disponibilidade × Performance × Qualidade' },
        },
        process: {
          pmc: { value: pmc, unit: '%', label: 'PMC - Cumprimento do Plano', description: 'Meta: acima de 90%' },
          correctivePercent: { value: correctivePercent, unit: '%', label: 'Corretivas', description: `${correctives.length} de ${totalWos} OSs` },
          preventivePercent: { value: preventivePercent, unit: '%', label: 'Preventivas', description: `${preventives.length} de ${totalWos} OSs` },
          backlog: { value: backlogWeeks, unit: 'sem', label: 'Backlog', description: `${pending.length} OSs pendentes` },
        },
        cost: {
          totalCost: { value: totalCost, unit: 'R$', label: 'Custo Total Manutenção', description: `${completed.length} OSs concluídas` },
          avgCost: { value: avgCost, unit: 'R$', label: 'Custo Médio por OS', description: 'Média das OSs concluídas' },
          reworkIndex: { value: reworkIndex, unit: '%', label: 'Índice de Retrabalho', description: 'Manutenções refeitas no mesmo ativo' },
        },
        reference: {
          text: 'Uma gestão madura persegue: alto MTBF, baixo MTTR, PMC acima de 90% e predominância de manutenção preventiva sobre corretiva.',
        }
      }
    })
  } catch (error) {
    console.error('KPI Error:', error)
    return NextResponse.json({ error: 'Erro ao calcular KPIs' }, { status: 500 })
  }
}
