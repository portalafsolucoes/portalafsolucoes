'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_COLORS, formatBRL } from './dashboardPalette'
import { ChartCard } from './ChartCard'
import { ChartPatterns } from './ChartPatterns'

interface BreakdownProps {
  labor: number
  parts: number
  thirdParty: number
  tools: number
}

export function CostBreakdownChart({ data }: { data: BreakdownProps }) {
  // Hierarquia monocromatica + patterns para diferenciar 4 categorias
  const rows = [
    { key: 'labor', label: 'Mão de obra', value: data.labor, fill: CHART_COLORS.primary, legendStyle: { backgroundColor: CHART_COLORS.primary } },
    { key: 'parts', label: 'Peças', value: data.parts, fill: 'url(#pattern-diagonal)', legendStyle: { backgroundColor: CHART_COLORS.surface, backgroundImage: `repeating-linear-gradient(45deg, ${CHART_COLORS.primary} 0 2px, transparent 2px 6px)` } },
    { key: 'thirdParty', label: 'Terceiros', value: data.thirdParty, fill: 'url(#pattern-dots)', legendStyle: { backgroundColor: CHART_COLORS.surface, backgroundImage: `radial-gradient(${CHART_COLORS.primary} 1px, transparent 1.5px)`, backgroundSize: '4px 4px' } },
    { key: 'tools', label: 'Ferramentas', value: data.tools, fill: CHART_COLORS.mutedLight, legendStyle: { backgroundColor: CHART_COLORS.mutedLight } },
  ]
  const total = rows.reduce((s, r) => s + r.value, 0)
  const empty = total === 0

  return (
    <ChartCard
      title="Custo por categoria"
      description="OS concluídas no período"
      icon="pie_chart"
      empty={empty}
    >
      <div className="flex items-center gap-4">
        <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartPatterns />
              <Pie
                data={rows}
                dataKey="value"
                nameKey="label"
                innerRadius="55%"
                outerRadius="85%"
                stroke={CHART_COLORS.primary}
                strokeWidth={0.5}
              >
                {rows.map(r => (
                  <Cell key={r.key} fill={r.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 4, border: `1px solid ${CHART_COLORS.surface}` }}
                formatter={(value: number) => [formatBRL(value), 'Custo']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {rows.map(r => {
            const pct = total > 0 ? Math.round((r.value / total) * 1000) / 10 : 0
            return (
              <div key={r.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 border border-gray-400" style={r.legendStyle} />
                <span className="text-xs text-muted-foreground flex-1 truncate">{r.label}</span>
                <span className="text-xs font-semibold text-on-surface">{formatBRL(r.value)}</span>
                <span className="text-[11px] text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </ChartCard>
  )
}
