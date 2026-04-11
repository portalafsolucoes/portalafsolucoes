export function sanitizeLimit(
  requested: string | number | null | undefined,
  max = 100,
  defaultVal = 50
): number {
  const n = typeof requested === 'string' ? parseInt(requested, 10) : (requested ?? defaultVal)
  if (isNaN(n) || n < 1) return defaultVal
  return Math.min(n, max)
}
