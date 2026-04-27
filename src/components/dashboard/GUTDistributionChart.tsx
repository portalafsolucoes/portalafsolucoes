'use client'

import { CHART_COLORS } from './dashboardPalette'
import { ChartCard } from './ChartCard'

interface GUTBuckets {
  critical: number
  high: number
  medium: number
  low: number
}

export function GUTDistributionChart({ data }: { data: GUTBuckets }) {
  const total = data.critical + data.high + data.medium + data.low
  const empty = total === 0

  // Hierarquia monocromatica: escuro = mais critico, claro = menos critico
  const rows = [
    { key: 'critical', label: 'Crítico (100+)', value: data.critical, color: CHART_COLORS.primary, pattern: `repeating-linear-gradient(45deg, ${CHART_COLORS.primary} 0 4px, ${CHART_COLORS.primaryDim} 4px 8px)`, hint: 'G×U×T ≥ 100' },
    { key: 'high', label: 'Alto (50–99)', value: data.high, color: CHART_COLORS.primaryDim, pattern: null, hint: 'G×U×T 50–99' },
    { key: 'medium', label: 'Médio (25–49)', value: data.medium, color: CHART_COLORS.muted, pattern: null, hint: 'G×U×T 25–49' },
    { key: 'low', label: 'Baixo (<25)', value: data.low, color: CHART_COLORS.mutedLight, pattern: null, hint: 'G×U×T < 25' },
  ]

  return (
    <ChartCard
      title="Criticidade GUT"
      description="Distribuição de ativos por faixa de criticidade"
      icon="crisis_alert"
      empty={empty}
      emptyLabel="Nenhum ativo com GUT informado."
    >
      <div className="space-y-2">
        {rows.map(r => {
          const pct = total > 0 ? (r.value / total) * 100 : 0
          const barStyle: React.CSSProperties = r.pattern
            ? { width: `${Math.max(pct, r.value > 0 ? 3 : 0)}%`, backgroundImage: r.pattern, backgroundSize: '11.3px 11.3px' }
            : { width: `${Math.max(pct, r.value > 0 ? 3 : 0)}%`, backgroundColor: r.color }
          return (
            <div key={r.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-on-surface">{r.label}</span>
                <span className="text-xs text-muted-foreground">
                  {r.value} ativo{r.value === 1 ? '' : 's'} · {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={barStyle} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{r.hint}</p>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}
