// Parser defensivo para `deadline` das acoes do plano de acao.
// Aceita ISO (YYYY-MM-DD) e legado (dd/mm/yyyy). Retorna null para vazio/invalido.

export function parseDeadline(value: string | null | undefined): Date | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // ISO YYYY-MM-DD (ou com hora)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return isNaN(date.getTime()) ? null : date
  }

  // Legado dd/mm/yyyy
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const [, d, m, y] = brMatch
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return isNaN(date.getTime()) ? null : date
  }

  return null
}

// Normaliza para ISO (YYYY-MM-DD). Retorna string original se nao conseguir parsear.
export function toIsoDeadline(value: string | null | undefined): string | null {
  if (!value) return null
  const date = parseDeadline(value)
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Uma acao esta "vencida" quando deadline < hoje E status nao COMPLETED.
// Acoes sem prazo NAO sao consideradas vencidas.
export function isOverdue(
  deadline: string | null | undefined,
  status: string | null | undefined,
  today: Date = new Date()
): boolean {
  if (status === 'COMPLETED') return false
  const date = parseDeadline(deadline)
  if (!date) return false
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return date.getTime() < t.getTime()
}
