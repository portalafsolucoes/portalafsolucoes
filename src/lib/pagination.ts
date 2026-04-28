export const ALL_MODE_CAP = 5000

export function sanitizeLimit(
  requested: string | number | null | undefined,
  max = 100,
  defaultVal = 50
): number {
  const n = typeof requested === 'string' ? parseInt(requested, 10) : (requested ?? defaultVal)
  if (isNaN(n) || n < 1) return defaultVal
  return Math.min(n, max)
}

export type ListParams =
  | { mode: 'all'; limit: number; page: 1; skip: 0 }
  | { mode: 'page'; page: number; limit: number; skip: number }

export function parseListParams(
  searchParams: URLSearchParams,
  opts?: { defaultLimit?: number; maxLimit?: number }
): ListParams {
  const allParam = searchParams.get('all')
  if (allParam === 'true' || allParam === '1') {
    return { mode: 'all', limit: ALL_MODE_CAP, page: 1, skip: 0 }
  }
  const limit = sanitizeLimit(searchParams.get('limit'), opts?.maxLimit, opts?.defaultLimit)
  const pageRaw = parseInt(searchParams.get('page') || '1', 10)
  const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw
  return { mode: 'page', page, limit, skip: (page - 1) * limit }
}

export function rangeFromParams(params: ListParams): [number, number] {
  if (params.mode === 'all') return [0, ALL_MODE_CAP - 1]
  return [params.skip, params.skip + params.limit - 1]
}
