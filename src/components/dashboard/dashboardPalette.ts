// Paleta estritamente monocromatica (branco, cinzas, preto) para o dashboard.
// Hierarquia: escuro = mais critico/relevante; claro = menos critico.
// Diferenciacao de series em graficos com 3+ categorias deve usar tambem PATTERNS (hachuras).
export const CHART_COLORS = {
  primary: '#111827',
  primaryDim: '#374151',
  muted: '#6b7280',
  mutedLight: '#9ca3af',
  surface: '#f3f4f6',
  // Aliases semanticos mantidos por compatibilidade, todos em escala de cinza.
  // Hierarquia: escuro = critico; claro = saudavel.
  accent: '#374151',
  accentLight: '#d1d5db',
  success: '#9ca3af',
  successLight: '#e5e7eb',
  warning: '#6b7280',
  warningLight: '#d1d5db',
  danger: '#111827',
  dangerLight: '#e5e7eb',
} as const

// Patterns SVG usados para diferenciar series em graficos com 3+ categorias.
// Consumidos via <defs><pattern/></defs> + fill={`url(#${id})`} em Recharts.
export const CHART_PATTERNS = {
  solid: 'solid',
  diagonal: 'diagonal',
  dots: 'dots',
  horizontal: 'horizontal',
  crosshatch: 'crosshatch',
} as const
export type ChartPatternId = keyof typeof CHART_PATTERNS

export const STATUS_COLORS: Record<string, string> = {
  PENDING: CHART_COLORS.mutedLight,
  RELEASED: CHART_COLORS.muted,
  IN_PROGRESS: CHART_COLORS.primaryDim,
  ON_HOLD: CHART_COLORS.muted,
  COMPLETE: CHART_COLORS.mutedLight,
  CANCELLED: CHART_COLORS.primary,
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
