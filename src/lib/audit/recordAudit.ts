import { supabase, generateId } from '@/lib/supabase'
import type { SessionUser } from '@/lib/session'
import { normalizeUserRole } from '@/lib/user-roles'
import { buildDiff, sanitizeSnapshot } from './fieldPolicy'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export interface RecordAuditInput {
  session: SessionUser | { id?: string; firstName?: string; lastName?: string; role?: string; canonicalRole?: string } | null
  /** Nome canonico da entidade afetada (ex: 'Request', 'WorkOrder', 'RAF', 'Asset', 'User'). */
  entity: string
  /** PK da entidade afetada. NAO e FK — sobrevive a hard delete. */
  entityId: string
  /** Identificador legivel (ex: 'SS-000123', 'MAN-000456', 'RAF-2025-0001'). */
  entityLabel?: string | null
  action: AuditAction
  /**
   * Estado anterior — obrigatorio para UPDATE/DELETE.
   * Para CREATE deve ser null/undefined.
   */
  before?: Record<string, unknown> | null
  /**
   * Estado novo — obrigatorio para CREATE/UPDATE.
   * Para DELETE deve ser null/undefined.
   */
  after?: Record<string, unknown> | null
  /**
   * Tenant da entidade afetada (NAO da sessao).
   * Quando SUPER_ADMIN cross-tenant atua, este e o companyId da entidade.
   */
  companyId?: string | null
  /** Unidade da entidade afetada quando aplicavel. */
  unitId?: string | null
  /** Contexto extra (motivo de exclusao, ip, etc.). */
  metadata?: Record<string, unknown> | null
}

/**
 * Registra uma entrada de auditoria. Falhas sao swallowed e logadas — auditoria
 * nunca pode quebrar o fluxo principal de negocio.
 *
 * Uso tipico:
 *   await recordAudit({ session, entity: 'Request', entityId: req.id, entityLabel: req.requestNumber,
 *                       action: 'UPDATE', before: prev, after: next, companyId: req.companyId, unitId: req.unitId })
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    const { session, entity, entityId, action } = input
    if (!entity || !entityId) return

    let diff: Record<string, unknown> | null = null
    if (action === 'CREATE') {
      const after = input.after ? sanitizeSnapshot(entity, input.after) : null
      diff = after ? { __create: after } : null
    } else if (action === 'DELETE') {
      const before = input.before ? sanitizeSnapshot(entity, input.before) : null
      diff = before ? { __delete: before } : null
    } else {
      diff = buildDiff(entity, input.before ?? null, input.after ?? null)
      // UPDATE sem mudancas relevantes -> nao registra
      if (!diff) return
    }

    const userId = session && 'id' in session && session.id ? String(session.id) : null
    const firstName = session && 'firstName' in session ? (session.firstName ?? '') : ''
    const lastName = session && 'lastName' in session ? (session.lastName ?? '') : ''
    const userName = `${firstName} ${lastName}`.trim() || null
    const userRole = session ? normalizeUserRole(session as { role?: string | null }) : null

    const row = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      companyId: input.companyId ?? null,
      unitId: input.unitId ?? null,
      userId,
      userName,
      userRole,
      entity,
      entityId,
      entityLabel: input.entityLabel ?? null,
      action,
      diff,
      metadata: input.metadata ?? null,
    }

    const { error } = await supabase.from('AuditLog').insert(row)
    if (error) {
      console.error('[audit] insert failed:', error.message, { entity, entityId, action })
    }
  } catch (err) {
    console.error('[audit] recordAudit threw:', err)
  }
}
