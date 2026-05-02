// Unidade canonica do sistema: HORAS DECIMAIS com 2 casas (Decimal(10,2)).
// Toda duracao no banco e em APIs internas e gravada e lida em horas.
// Conversao para sistemas externos (ex: TOTVS) acontece exclusivamente
// em src/lib/integration/<sistema>/timeAdapter.ts, nunca em handlers de negocio.

const round2 = (value: number) => Math.round(value * 100) / 100

export function minutesToHours(min: number | null | undefined): number | null {
  if (min == null || Number.isNaN(min)) return null
  return round2(Number(min) / 60)
}

export function hoursToMinutes(hours: number | null | undefined): number | null {
  if (hours == null || Number.isNaN(hours)) return null
  return Math.round(Number(hours) * 60)
}

export function toDecimalHours(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value)
  if (Number.isNaN(n) || n < 0) return null
  return round2(n)
}

export function formatHours(hours: number | string | null | undefined): string {
  if (hours === null || hours === undefined || hours === '') return '-'
  const n = typeof hours === 'string' ? Number(hours) : hours
  if (Number.isNaN(n)) return '-'
  return `${n.toFixed(2)} h`
}

export function sumHours(values: Array<number | string | null | undefined>): number {
  let total = 0
  for (const v of values) {
    const n = toDecimalHours(v)
    if (n != null) total += n
  }
  return round2(total)
}

export function diffHours(start: Date | string, end: Date | string): number {
  const s = start instanceof Date ? start.getTime() : new Date(start).getTime()
  const e = end instanceof Date ? end.getTime() : new Date(end).getTime()
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0
  return round2((e - s) / 3_600_000)
}
