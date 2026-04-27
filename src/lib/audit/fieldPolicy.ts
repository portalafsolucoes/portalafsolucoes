// Politica de campos para auditoria.
// Onda 0 — fundacao: define apenas a denylist global (segredos, ruido) e o helper buildDiff.
// As ondas seguintes adicionam allowlist por entidade em ENTITY_ALLOWLISTS.

const SENSITIVE_FIELDS = new Set<string>([
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'tempPassword',
  'token',
  'secret',
  'apiKey',
  'hash',
  'emailVerificationToken',
])

const NOISY_FIELDS = new Set<string>([
  'updatedAt',
  'createdAt',
  'rescheduleCount',
])

const LONG_TEXT_THRESHOLD = 500

function isSensitiveKey(key: string): boolean {
  if (SENSITIVE_FIELDS.has(key)) return true
  const lower = key.toLowerCase()
  if (lower.endsWith('token')) return true
  if (lower.endsWith('secret')) return true
  if (lower.endsWith('passwordhash')) return true
  return false
}

// Allowlist por entidade. As ondas posteriores preencherao isso.
// Quando ausente, todos os campos sao auditados (exceto sensitive/noisy).
export const ENTITY_ALLOWLISTS: Record<string, ReadonlyArray<string>> = {}

export type DiffEntry =
  | { before: unknown; after: unknown }
  | { changed: true; lengthBefore: number; lengthAfter: number }

export type Diff = Record<string, DiffEntry>

function summarizeLong(value: unknown): { length: number; isLong: boolean } {
  const text = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value)
  return { length: text.length, isLong: text.length > LONG_TEXT_THRESHOLD }
}

function isShallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (a instanceof Date) return a.toISOString() === String(b)
  if (b instanceof Date) return String(a) === b.toISOString()
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return false
}

/**
 * Constroi o diff entre `before` e `after` aplicando a politica.
 * - Campos sensiveis sao removidos (nem before nem after entram).
 * - Campos ruidosos (timestamps automaticos, contadores denormalizados) sao removidos.
 * - Quando entity tem allowlist, apenas campos da allowlist entram.
 * - Strings/JSON acima do threshold viram { changed, lengthBefore, lengthAfter }.
 * - Retorna null quando nao ha diferenca.
 */
export function buildDiff(
  entity: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Diff | null {
  const allow = ENTITY_ALLOWLISTS[entity]
  const allowSet = allow ? new Set(allow) : null

  const keys = new Set<string>()
  if (before) for (const k of Object.keys(before)) keys.add(k)
  if (after) for (const k of Object.keys(after)) keys.add(k)

  const diff: Diff = {}
  for (const key of keys) {
    if (isSensitiveKey(key)) continue
    if (NOISY_FIELDS.has(key)) continue
    if (allowSet && !allowSet.has(key)) continue

    const b = before ? before[key] : undefined
    const a = after ? after[key] : undefined
    if (isShallowEqual(b, a)) continue

    const bSum = summarizeLong(b)
    const aSum = summarizeLong(a)
    if (bSum.isLong || aSum.isLong) {
      diff[key] = { changed: true, lengthBefore: bSum.length, lengthAfter: aSum.length }
    } else {
      diff[key] = { before: b ?? null, after: a ?? null }
    }
  }

  return Object.keys(diff).length === 0 ? null : diff
}

/**
 * Sanitiza um snapshot completo (CREATE -> after, DELETE -> before) removendo segredos/ruido
 * e respeitando a allowlist. Strings longas sao substituidas pelo marcador de tamanho.
 */
export function sanitizeSnapshot(
  entity: string,
  snapshot: Record<string, unknown>
): Record<string, unknown> {
  const allow = ENTITY_ALLOWLISTS[entity]
  const allowSet = allow ? new Set(allow) : null
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(snapshot)) {
    if (isSensitiveKey(key)) continue
    if (NOISY_FIELDS.has(key)) continue
    if (allowSet && !allowSet.has(key)) continue
    const sum = summarizeLong(value)
    if (sum.isLong) {
      out[key] = { changed: true, lengthBefore: 0, lengthAfter: sum.length }
    } else {
      out[key] = value ?? null
    }
  }
  return out
}
