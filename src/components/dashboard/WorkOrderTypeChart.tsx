'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_COLORS } from './dashboardPalette'
import { ChartCard } from './ChartCard'

interface WOTypeDatum {
  key: string
  label: string
  count: number
  [extra: string]: unknown
}

const TYPE_COLORS: Record<string, string> = {
  PREVENTIVE: CHART_COLORS.success,
  CORRECTIVE: CHART_COLORS.danger,
  OTHER: CHART_COLORS.muted,
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
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                innerRadius="55%"
                outerRadius="85%"
                stroke="none"
              >
                {data.map(d => (
                  <Cell key={d.key} fill={TYPE_COLORS[d.key] || CHART_COLORS.muted} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #e4e9ea' }}
                formatter={(value: number) => [value, 'OS']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.map(d => {
            const pct = total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0
            return (
              <div key={d.key} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[d.key] || CHART_COLORS.muted }}
                />
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
