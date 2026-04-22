'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, formatBRL } from './dashboardPalette'
import { ChartCard } from './ChartCard'

interface CostDatum {
  label: string
  cost: number
}

export function CostTrendChart({ data }: { data: CostDatum[] }) {
  const empty = data.every(d => d.cost === 0)

  return (
    <ChartCard
      title="Custo de manutenção"
      description="Total por período (OS concluídas)"
      icon="payments"
      empty={empty}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ebeeef" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5a6061' }} />
            <YAxis
              tick={{ fontSize: 11, fill: '#5a6061' }}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #e4e9ea' }}
              formatter={(value: number) => [formatBRL(value), 'Custo']}
            />
            <Bar dataKey="cost" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
