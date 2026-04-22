'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_COLORS, formatBRL } from './dashboardPalette'
import { ChartCard } from './ChartCard'

interface BreakdownProps {
  labor: number
  parts: number
  thirdParty: number
  tools: number
}

export function CostBreakdownChart({ data }: { data: BreakdownProps }) {
  const rows = [
    { key: 'labor', label: 'Mão de obra', value: data.labor, color: CHART_COLORS.primary },
    { key: 'parts', label: 'Peças', value: data.parts, color: CHART_COLORS.accent },
    { key: 'thirdParty', label: 'Terceiros', value: data.thirdParty, color: CHART_COLORS.warning },
    { key: 'tools', label: 'Ferramentas', value: data.tools, color: CHART_COLORS.muted },
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
              <Pie
                data={rows}
                dataKey="value"
                nameKey="label"
                innerRadius="55%"
                outerRadius="85%"
                stroke="none"
              >
                {rows.map(r => (
                  <Cell key={r.key} fill={r.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #e4e9ea' }}
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
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
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
