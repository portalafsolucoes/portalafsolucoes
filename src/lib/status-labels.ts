// Mapeamentos canônicos de enums do Prisma para rótulos em português (PT-BR).
// Toda UI do CMMS deve consumir estes helpers em vez de renderizar o valor cru
// ou duplicar mapas locais.

export const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  RELEASED: 'Liberada',
  IN_PROGRESS: 'Em Progresso',
  ON_HOLD: 'Em Espera',
  COMPLETE: 'Concluída',
  OPEN: 'Aberta',
}

export const WORK_ORDER_PRIORITY_LABELS: Record<string, string> = {
  NONE: 'Nenhuma',
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const WORK_ORDER_TYPE_LABELS: Record<string, string> = {
  REACTIVE: 'Reativa',
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
  PREDICTIVE: 'Preditiva',
}

export const OS_TYPE_LABELS: Record<string, string> = {
  PREVENTIVE_MANUAL: 'Preventiva Manual',
  CORRECTIVE_PLANNED: 'Corretiva Planejada',
  CORRECTIVE_IMMEDIATE: 'Corretiva Imediata',
}

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
}

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
}

export const ASSET_STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operacional',
  DOWN: 'Parado',
}

export const SYSTEM_STATUS_LABELS: Record<string, string> = {
  IN_SYSTEM: 'No Sistema',
  OUT_OF_SYSTEM: 'Fora do Sistema',
}

export const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMI_ANNUAL: 'Semestral',
  ANNUAL: 'Anual',
  CUSTOM: 'Customizada',
}

export const PLAN_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em Progresso',
  COMPLETE: 'Concluída',
  CANCELLED: 'Cancelada',
}

function lookup(map: Record<string, string>, value?: string | null): string {
  if (!value) return '-'
  return map[value] ?? value
}

export const getWorkOrderStatusLabel = (v?: string | null) => lookup(WORK_ORDER_STATUS_LABELS, v)
export const getWorkOrderPriorityLabel = (v?: string | null) => lookup(WORK_ORDER_PRIORITY_LABELS, v)
export const getWorkOrderTypeLabel = (v?: string | null) => lookup(WORK_ORDER_TYPE_LABELS, v)
export const getOsTypeLabel = (v?: string | null) => lookup(OS_TYPE_LABELS, v)
export const getRequestStatusLabel = (v?: string | null) => lookup(REQUEST_STATUS_LABELS, v)
export const getApprovalStatusLabel = (v?: string | null) => lookup(APPROVAL_STATUS_LABELS, v)
export const getAssetStatusLabel = (v?: string | null) => lookup(ASSET_STATUS_LABELS, v)
export const getSystemStatusLabel = (v?: string | null) => lookup(SYSTEM_STATUS_LABELS, v)
export const getFrequencyLabel = (v?: string | null) => lookup(FREQUENCY_LABELS, v)
export const getPlanStatusLabel = (v?: string | null) => lookup(PLAN_STATUS_LABELS, v)
