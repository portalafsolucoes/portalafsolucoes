'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CHART_COLORS, formatBRL } from './dashboardPalette'
import { ChartCard } from './ChartCard'

interface TopAsset {
  id: string
  name: string
  tag: string
  count: number
  totalCost: number
}

export function TopAssetsChart({ data }: { data: TopAsset[] }) {
  const empty = data.length === 0
  const prepared = data.map(a => ({
    ...a,
    display: a.tag ? `${a.tag.slice(0, 14)}${a.tag.length > 14 ? '…' : ''}` : a.name.slice(0, 18),
  }))

  return (
    <ChartCard
      title="Top 10 ativos — consumo de manutenção"
      description="Ativos com mais OS no período"
      icon="precision_manufacturing"
      empty={empty}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={prepared} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ebeeef" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#5a6061' }} />
            <YAxis
              type="category"
              dataKey="display"
              tick={{ fontSize: 11, fill: '#5a6061' }}
              width={130}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #e4e9ea' }}
              formatter={(value: number) => [value, 'OS']}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as TopAsset | undefined
                if (!p) return ''
                return p.tag ? `${p.tag} — ${p.name}` : p.name
              }}
            />
            <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!empty && (
        <p className="text-[11px] text-muted-foreground mt-2">
          Custo total acumulado nestes ativos: {formatBRL(prepared.reduce((s, a) => s + a.totalCost, 0))}
        </p>
      )}
    </ChartCard>
  )
}
