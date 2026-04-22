'use client'

import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { STATUS_COLORS, CHART_COLORS } from './dashboardPalette'
import { ChartCard } from './ChartCard'

interface StatusDatum {
  status: string
  label: string
  count: number
}

export function WorkOrderStatusChart({ data }: { data: StatusDatum[] }) {
  const ordered = [...data].sort((a, b) => b.count - a.count)
  const empty = ordered.reduce((s, d) => s + d.count, 0) === 0

  return (
    <ChartCard
      title="OS por status"
      description="Distribuição no período"
      icon="stacked_bar_chart"
      empty={empty}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ordered} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ebeeef" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#5a6061' }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#5a6061' }} width={110} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #e4e9ea' }}
              formatter={(value: number) => [value, 'OS']}
              labelFormatter={() => ''}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {ordered.map(d => (
                <Cell key={d.status} fill={STATUS_COLORS[d.status] || CHART_COLORS.muted} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
