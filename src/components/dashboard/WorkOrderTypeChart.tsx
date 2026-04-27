'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_COLORS } from './dashboardPalette'
import { ChartCard } from './ChartCard'
import { ChartPatterns } from './ChartPatterns'

interface WOTypeDatum {
  key: string
  label: string
  count: number
  [extra: string]: unknown
}

// Hierarquia monocromatica + patterns para 3 categorias
const TYPE_STYLES: Record<string, { fill: string; legendStyle: React.CSSProperties }> = {
  PREVENTIVE: {
    fill: 'url(#pattern-diagonal)',
    legendStyle: { backgroundColor: CHART_COLORS.surface, backgroundImage: `repeating-linear-gradient(45deg, ${CHART_COLORS.primary} 0 2px, transparent 2px 6px)` },
  },
  CORRECTIVE: {
    fill: CHART_COLORS.primary,
    legendStyle: { backgroundColor: CHART_COLORS.primary },
  },
  OTHER: {
    fill: CHART_COLORS.mutedLight,
    legendStyle: { backgroundColor: CHART_COLORS.mutedLight },
  },
}

export function WorkOrderTypeChart({ data }: { data: WOTypeDatum[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const empty = total === 0

  return (
    <ChartCard
      title="OS por tipo"
      description="Meta: acima de 80% preventivas"
      icon="category"
      empty={empty}
    >
      <div className="flex items-center gap-4">
        <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartPatterns />
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                innerRadius="55%"
                outerRadius="85%"
                stroke={CHART_COLORS.primary}
                strokeWidth={0.5}
              >
                {data.map(d => (
                  <Cell key={d.key} fill={TYPE_STYLES[d.key]?.fill || CHART_COLORS.mutedLight} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 4, border: `1px solid ${CHART_COLORS.surface}` }}
                formatter={(value: number) => [value, 'OS']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.map(d => {
            const pct = total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0
            const style = TYPE_STYLES[d.key]?.legendStyle || { backgroundColor: CHART_COLORS.mutedLight }
            return (
              <div key={d.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 border border-gray-400" style={style} />
                <span className="text-xs text-muted-foreground flex-1 truncate">{d.label}</span>
                <span className="text-xs font-semibold text-on-surface">{d.count}</span>
                <span className="text-[11px] text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </ChartCard>
  )
}
