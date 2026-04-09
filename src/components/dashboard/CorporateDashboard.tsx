'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/layout/PageHeader'

interface UnitSummary {
  unit: { id: string; name: string; code: string }
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
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" /></div>
  }

  if (!data) return <p className="text-muted-foreground text-center py-8">Erro ao carregar dashboard corporativo.</p>

  return (
    <div className="space-y-6">
      <PageHeader icon="business" title="Dashboard Corporativo" description="Visão consolidada de todas as unidades" />

      {/* Totais Corporativos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-4 bg-card rounded-[4px] text-center">
          <Icon name="business" className="text-xl mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{data.totals.units}</p>
          <p className="text-xs text-muted-foreground">Unidades</p>
        </div>
        <div className="p-4 bg-card rounded-[4px] text-center">
          <Icon name="inventory_2" className="text-xl mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{data.totals.assets}</p>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </div>
        <div className="p-4 bg-card rounded-[4px] text-center">
          <Icon name="group" className="text-xl mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{data.totals.users}</p>
          <p className="text-xs text-muted-foreground">Usuários</p>
        </div>
        <div className="p-4 bg-card rounded-[4px] text-center">
          <Icon name="construction" className="text-xl mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{data.totals.workOrders}</p>
          <p className="text-xs text-muted-foreground">Total OSs</p>
        </div>
        <div className="p-4 bg-card rounded-[4px] text-center">
          <Icon name="trending_up" className="text-xl mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{data.totals.completedWOs}</p>
          <p className="text-xs text-muted-foreground">Concluídas</p>
        </div>
        <div className="p-4 bg-card rounded-[4px] text-center">
          <Icon name="construction" className="text-xl mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{data.totals.pendingWOs}</p>
          <p className="text-xs text-muted-foreground">OSs Pendentes</p>
        </div>
        <div className="p-4 bg-card rounded-[4px] text-center">
          <Icon name="assignment" className="text-xl mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{data.totals.pendingRequests}</p>
          <p className="text-xs text-muted-foreground">SSs Pendentes</p>
        </div>
      </div>

      {/* Comparativo por Unidade */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Comparativo por Unidade</h2>
        {data.units.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 rounded-[4px] bg-card">Nenhuma unidade cadastrada.</p>
        ) : (
          <div className="overflow-x-auto rounded-[4px]">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Unidade</th>
                  <th className="text-center px-4 py-3 font-medium">Ativos</th>
                  <th className="text-center px-4 py-3 font-medium">Usuários</th>
                  <th className="text-center px-4 py-3 font-medium">Total OSs</th>
                  <th className="text-center px-4 py-3 font-medium">Concluídas</th>
                  <th className="text-center px-4 py-3 font-medium">Pendentes</th>
                  <th className="text-center px-4 py-3 font-medium">Em Progresso</th>
                  <th className="text-center px-4 py-3 font-medium">Preventivas</th>
                  <th className="text-center px-4 py-3 font-medium">Corretivas</th>
                  <th className="text-center px-4 py-3 font-medium">SSs Pend.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.units.map(u => (
                  <tr key={u.unit.id} className="hover:bg-muted/50">
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
