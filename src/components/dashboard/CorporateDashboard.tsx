'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { CHART_COLORS } from './dashboardPalette'
import { ChartCard } from './ChartCard'

interface UnitSummary {
  unit: { id: string; name: string; code?: string }
  assets: number
  users: number
  pendingRequests: number
  workOrders: {
    total: number; completed: number; pending: number; inProgress: number
    correctives: number; preventives: number
  }
}

interface CorporateData {
  totals: {
    units: number; assets: number; users: number
    workOrders: number; completedWOs: number; pendingWOs: number; pendingRequests: number
  }
  units: UnitSummary[]
}

export function CorporateDashboard() {
  const [data, setData] = useState<CorporateData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/corporate')
      .then(r => r.json())
      .then(d => { setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-muted-foreground text-center py-8">Erro ao carregar dashboard corporativo.</p>
  }

  // Agregados para gráficos
  const totalCorrectives = data.units.reduce((s, u) => s + u.workOrders.correctives, 0)
  const totalPreventives = data.units.reduce((s, u) => s + u.workOrders.preventives, 0)
  const totalOther = Math.max(0, data.totals.workOrders - totalCorrectives - totalPreventives)
  const typeBreakdown = [
    { key: 'PREVENTIVE', label: 'Preventivas', value: totalPreventives, color: CHART_COLORS.success },
    { key: 'CORRECTIVE', label: 'Corretivas', value: totalCorrectives, color: CHART_COLORS.danger },
    { key: 'OTHER', label: 'Outras', value: totalOther, color: CHART_COLORS.muted },
  ]

  const volumeByUnit = data.units
    .map(u => ({
      label: (u.unit.code || u.unit.name).slice(0, 18),
      preventives: u.workOrders.preventives,
      correctives: u.workOrders.correctives,
      total: u.workOrders.total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Totais Corporativos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <TotalTile icon="business" value={data.totals.units} label="Unidades" />
        <TotalTile icon="inventory_2" value={data.totals.assets} label="Ativos" />
        <TotalTile icon="group" value={data.totals.users} label="Usuários" />
        <TotalTile icon="construction" value={data.totals.workOrders} label="Total OSs" />
        <TotalTile icon="trending_up" value={data.totals.completedWOs} label="Concluídas" />
        <TotalTile icon="pending_actions" value={data.totals.pendingWOs} label="OSs Pendentes" />
        <TotalTile icon="assignment" value={data.totals.pendingRequests} label="SSs Pendentes" />
      </div>

      {/* Gráficos corporativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <ChartCard
          title="OS por tipo — todas as unidades"
          description="Distribuição consolidada"
          icon="category"
          empty={data.totals.workOrders === 0}
        >
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeBreakdown} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="85%" stroke="none">
                    {typeBreakdown.map(r => <Cell key={r.key} fill={r.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #e4e9ea' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {typeBreakdown.map(r => {
                const pct = data.totals.workOrders > 0 ? (r.value / data.totals.workOrders) * 100 : 0
                return (
                  <div key={r.key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="text-xs text-muted-foreground flex-1 truncate">{r.label}</span>
                    <span className="text-xs font-semibold text-on-surface">{r.value}</span>
                    <span className="text-[11px] text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Top unidades por volume de OS"
          description="Preventivas vs corretivas"
          icon="bar_chart"
          empty={volumeByUnit.length === 0}
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByUnit} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebeeef" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5a6061' }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: '#5a6061' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #e4e9ea' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="preventives" name="Preventivas" stackId="a" fill={CHART_COLORS.success} />
                <Bar dataKey="correctives" name="Corretivas" stackId="a" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Comparativo por Unidade */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Comparativo por Unidade</h2>
        {data.units.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 rounded-[4px] bg-card">Nenhuma unidade cadastrada.</p>
        ) : (
          <div className="overflow-x-auto rounded-[4px] bg-card ambient-shadow">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">Unidade</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">Ativos</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">Usuários</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">Total OSs</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">Concluídas</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">Pendentes</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">Em Progresso</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">Preventivas</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">Corretivas</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">SSs Pend.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.units.map(u => (
                  <tr key={u.unit.id} className="odd:bg-gray-50 even:bg-white hover:bg-secondary">
                    <td className="px-4 py-3 font-medium">
                      {u.unit.name}
                      {u.unit.code && <span className="text-xs text-muted-foreground ml-2">({u.unit.code})</span>}
                    </td>
                    <td className="px-4 py-3 text-center">{u.assets}</td>
                    <td className="px-4 py-3 text-center">{u.users}</td>
                    <td className="px-4 py-3 text-center font-semibold">{u.workOrders.total}</td>
                    <td className="px-4 py-3 text-center">{u.workOrders.completed}</td>
                    <td className="px-4 py-3 text-center">{u.workOrders.pending}</td>
                    <td className="px-4 py-3 text-center">{u.workOrders.inProgress}</td>
                    <td className="px-4 py-3 text-center">{u.workOrders.preventives}</td>
                    <td className="px-4 py-3 text-center">{u.workOrders.correctives}</td>
                    <td className="px-4 py-3 text-center">{u.pendingRequests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function TotalTile({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="p-4 bg-card rounded-[4px] text-center ambient-shadow">
      <Icon name={icon} className="text-xl mx-auto mb-1 text-primary-graphite" />
      <p className="text-2xl font-black text-on-surface">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
