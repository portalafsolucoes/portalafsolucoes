// Paleta monocromatica + um accent alinhada com o design system do CMMS.
export const CHART_COLORS = {
  primary: '#2d3435',
  primaryDim: '#5f5e5e',
  muted: '#94a3b8',
  mutedLight: '#cbd5e1',
  surface: '#ebeeef',
  accent: '#f97316',
  accentLight: '#fed7aa',
  success: '#16a34a',
  successLight: '#bbf7d0',
  warning: '#f59e0b',
  warningLight: '#fde68a',
  danger: '#dc2626',
  dangerLight: '#fecaca',
} as const

export const STATUS_COLORS: Record<string, string> = {
  PENDING: CHART_COLORS.mutedLight,
  RELEASED: CHART_COLORS.muted,
  IN_PROGRESS: CHART_COLORS.accent,
  ON_HOLD: CHART_COLORS.warning,
  COMPLETE: CHART_COLORS.success,
  CANCELLED: CHART_COLORS.danger,
  REPROGRAMMED: CHART_COLORS.primaryDim,
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
