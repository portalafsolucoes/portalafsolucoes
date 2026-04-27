// Tipos compartilhados entre o endpoint /api/audit e a tela /audit.

export type AuditEntryAction = 'CREATE' | 'UPDATE' | 'DELETE'

export type AuditSource =
  | 'audit_log'
  | 'asset_history'
  | 'wo_reschedule'
  | 'company_rejection'

export interface AuditEntry {
  id: string                          // composto quando vem de fonte legada (ex: 'ah_<id>')
  source: AuditSource
  createdAt: string                   // ISO
  action: AuditEntryAction
  entity: string                      // 'Request', 'WorkOrder', 'RAF', 'Asset', etc.
  entityId: string
  entityLabel: string | null

  userId: string | null
  userName: string | null
  userRole: string | null

  companyId: string | null
  unitId: string | null

  /**
   * Resumo legivel do evento (1-2 linhas).
   * - audit_log: derivado do diff (ex: "Alterou 3 campos: status, priority, dueDate")
   * - asset_history: usa AssetHistory.title
   * - wo_reschedule: "Reprogramou OS de DD/MM/YYYY para DD/MM/YYYY"
   * - company_rejection: "Rejeitou cadastro: {razaoSocial}"
   */
  summary: string

  /**
   * Detalhe estruturado do evento. Forma depende da fonte:
   * - audit_log: { kind: 'diff', diff: { [field]: { before, after } | { changed, lengthBefore, lengthAfter } } }
   *              | { kind: 'create', after: {...} } | { kind: 'delete', before: {...} }
   * - asset_history: { kind: 'asset_history', eventType, description, metadata }
   * - wo_reschedule: { kind: 'wo_reschedule', previousDate, newDate, previousStatus, wasOverdue, reason }
   * - company_rejection: { kind: 'company_rejection', cnpj, razaoSocial, originalEmail, rejectedReason }
   */
  detail: Record<string, unknown>
}

export interface AuditQueryFilters {
  source?: AuditSource | 'all'
  entity?: string
  action?: AuditEntryAction
  userId?: string
  unitId?: string
  dateFrom?: string                   // ISO
  dateTo?: string                     // ISO
  q?: string                          // busca em userName, entityLabel, summary
}

export interface AuditPageRequest extends AuditQueryFilters {
  page?: number                       // 1-based
  pageSize?: number                   // default 50, max 200
}

export interface AuditPageResponse {
  data: AuditEntry[]
  total: number                       // total ESTIMADO (folding usa amostragem)
  page: number
  pageSize: number
  /** True quando o resultado pode ter sido limitado por amostragem nas fontes legadas. */
  approximate: boolean
  /**
   * Mapa global { uuid -> rotulo legivel } para FKs resolvidas
   * (parentAssetId, locationId, companyId, userId, etc.).
   * A UI consulta esse mapa para mostrar o nome no lugar do UUID cru.
   */
  resolvedRefs?: Record<string, string>
}
