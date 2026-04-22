export const PRESERVED_FIELDS = new Set<string>([
  'email',
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'username',
  'website',
  'logo',
  'avatarUrl',
  'imageUrl',
  'photoUrl',
  'photoBefore',
  'photoAfter',
  'attachmentUrl',
  'fileUrl',
  'description',
  'notes',
  'observation',
  'observacao',
  'feedback',
  'rejectionReason',
  'executionNotes',
  'failureDescription',
  'immediateAction',
  'message',
  'token',
  'apiKey',
  'secret',
  'hash',
  'workDays',
])

const URL_SUFFIXES = ['Url', 'Link', 'Href', 'Src']

function isPreservedKey(key: string): boolean {
  if (PRESERVED_FIELDS.has(key)) return true
  if (key === 'id') return true
  if (key.endsWith('Id') || key.endsWith('Ids')) return true
  if (URL_SUFFIXES.some((suffix) => key.endsWith(suffix))) return true
  if (key.toLowerCase().includes('password')) return true
  return false
}

export function toUpperNoAccent(value: string): string
export function toUpperNoAccent(value: string | null): string | null
export function toUpperNoAccent(value: string | null | undefined): string | null | undefined
export function toUpperNoAccent(value: string | null | undefined): string | null | undefined {
  if (value == null) return value
  if (typeof value !== 'string') return value
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function normalizeValue(key: string, value: unknown): unknown {
  if (value == null) return value
  if (isPreservedKey(key)) return value

  if (typeof value === 'string') {
    return toUpperNoAccent(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return toUpperNoAccent(item)
      if (item && typeof item === 'object') return normalizeTextPayload(item as Record<string, unknown>)
      return item
    })
  }

  if (typeof value === 'object') {
    return normalizeTextPayload(value as Record<string, unknown>)
  }

  return value
}

export function normalizeTextPayload<T extends Record<string, unknown>>(payload: T): T {
  if (payload == null || typeof payload !== 'object') return payload
  const result: Record<string, unknown> = { ...(payload as Record<string, unknown>) }
  for (const [key, value] of Object.entries(payload)) {
    result[key] = normalizeValue(key, value)
  }
  return result as T
}
