// Tipos canonicos da RAF (Relatorio de Analise de Falha)
// Ampliados para suportar a tela "PA das RAFs" e o status persistido da RAF.

export type RafStatusValue = 'ABERTA' | 'FINALIZADA'

export type ActionPlanStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface ActionPlanItem {
  item: number
  subject: string
  // ISO YYYY-MM-DD preferencial; tolerar dd/mm/yyyy legado via parseDeadline()
  deadline: string
  actionDescription: string
  status: ActionPlanStatus
  linkedWorkOrderId?: string
  linkedWorkOrderNumber?: string
  // Campos novos (v2)
  responsibleUserId?: string
  responsibleName?: string
  completedAt?: string
}

export interface FinalizedByUser {
  id: string
  firstName?: string | null
  lastName?: string | null
}

export interface RafActionPlanStats {
  openRafs: number
  finalizedRafs: number
  onTimeActions: number
  overdueActions: number
}
