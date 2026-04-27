// Definicoes SVG de padroes (hachuras) para diferenciar series em graficos
// monocromaticos com 3+ categorias. Usar via <ChartPatterns /> dentro do
// componente Recharts e referenciar com fill={`url(#pattern-<id>)`}.
import { CHART_COLORS } from './dashboardPalette'

export function ChartPatterns() {
  return (
    <defs>
      <pattern id="pattern-diagonal" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <rect width="6" height="6" fill={CHART_COLORS.surface} />
        <line x1="0" y1="0" x2="0" y2="6" stroke={CHART_COLORS.primary} strokeWidth="2" />
      </pattern>
      <pattern id="pattern-dots" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill={CHART_COLORS.surface} />
        <circle cx="3" cy="3" r="1.2" fill={CHART_COLORS.primary} />
      </pattern>
      <pattern id="pattern-horizontal" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill={CHART_COLORS.surface} />
        <line x1="0" y1="3" x2="6" y2="3" stroke={CHART_COLORS.primary} strokeWidth="1.5" />
      </pattern>
      <pattern id="pattern-crosshatch" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill={CHART_COLORS.surface} />
        <path d="M0,0 L8,8 M0,8 L8,0" stroke={CHART_COLORS.primary} strokeWidth="1" />
      </pattern>
    </defs>
  )
}
