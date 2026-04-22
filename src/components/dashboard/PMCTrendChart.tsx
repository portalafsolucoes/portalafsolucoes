'use client'

import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts'
import { CHART_COLORS } from './dashboardPalette'
import { ChartCard } from './ChartCard'

interface PMCDatum {
  label: string
  pmc: number
  availability: number
}

export function PMCTrendChart({ data }: { data: PMCDatum[] }) {
  const empty = data.every(d => d.pmc === 0 && d.availability === 0)

  return (
    <ChartCard
      title="PMC × Disponibilidade"
      description="Meta PMC: 90% | Meta Disponibilidade: 85%"
      icon="show_chart"
      empty={empty}
    >
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="pmcFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.2} />
                <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ebeeef" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5a6061' }} />
            <YAxis tick={{ fontSize: 11, fill: '#5a6061' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #e4e9ea' }}
              formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === 'pmc' ? 'PMC' : 'Disponibilidade']}
            />
            <ReferenceLine y={90} stroke={CHART_COLORS.success} strokeDasharray="4 4" strokeWidth={1.5} />
            <Area type="monotone" dataKey="pmc" stroke={CHART_COLORS.accent} strokeWidth={2} fill="url(#pmcFill)" />
            <Line type="monotone" dataKey="availability" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-[11px] mt-2 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ backgroundColor: CHART_COLORS.accent }} />
          <span className="text-muted-foreground">PMC</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ backgroundColor: CHART_COLORS.primary }} />
          <span className="text-muted-foreground">Disponibilidade</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t border-dashed" style={{ borderColor: CHART_COLORS.success }} />
          <span className="text-muted-foreground">Meta PMC 90%</span>
        </span>
      </div>
    </ChartCard>
  )
}
