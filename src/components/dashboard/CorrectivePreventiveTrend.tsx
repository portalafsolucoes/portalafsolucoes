'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CHART_COLORS } from './dashboardPalette'
import { ChartCard } from './ChartCard'
import { ChartPatterns } from './ChartPatterns'

interface TrendDatum {
  label: string
  correctives: number
  preventives: number
}

export function CorrectivePreventiveTrend({ data }: { data: TrendDatum[] }) {
  const empty = data.every(d => d.correctives === 0 && d.preventives === 0)

  return (
    <ChartCard
      title="Corretiva × Preventiva"
      description="Volume de OS criadas por período"
      icon="bar_chart"
      empty={empty}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
            <ChartPatterns />
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.surface} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} />
            <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 4, border: `1px solid ${CHART_COLORS.surface}` }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="preventives" name="Preventivas" stackId="a" fill="url(#pattern-diagonal)" stroke={CHART_COLORS.primary} strokeWidth={1} radius={[0, 0, 0, 0]} />
            <Bar dataKey="correctives" name="Corretivas" stackId="a" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
