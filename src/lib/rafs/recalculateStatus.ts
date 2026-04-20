// Helper canonico para calcular o status derivado da RAF a partir do plano de acao.
// Fonte unica de verdade usada por TODAS as rotas que escrevem em FailureAnalysisReport.
// Regras:
//  - Sem actionPlan ou vazio -> ABERTA (precisa de PA)
//  - Todas as acoes com status === 'COMPLETED' -> FINALIZADA
//  - Qualquer outro caso -> ABERTA (reabertura automatica)
// Pura: recebe dados, devolve dados. Nao depende de supabase/prisma.

import type { ActionPlanItem, RafStatusValue } from '@/types/raf'

export interface RecalculatedStatus {
  status: RafStatusValue
  finalizedAt: string | null
  finalizedById: string | null
}

export function recalculateRafStatus(
  actionPlan: Array<Partial<ActionPlanItem>> | null | undefined,
  currentUserId?: string | null,
  now: Date = new Date()
): RecalculatedStatus {
  // RAF sem ações -> ABERTA (precisa de PA)
  if (!Array.isArray(actionPlan) || actionPlan.length === 0) {
    return { status: 'ABERTA', finalizedAt: null, finalizedById: null }
  }

  const allCompleted = actionPlan.every(
    (a) => String(a?.status || '').toUpperCase() === 'COMPLETED'
  )

  if (allCompleted) {
    return {
      status: 'FINALIZADA',
      finalizedAt: now.toISOString(),
      finalizedById: currentUserId || null,
    }
  }

  // Reabertura automatica: zera rastreio de finalizacao
  return { status: 'ABERTA', finalizedAt: null, finalizedById: null }
}
