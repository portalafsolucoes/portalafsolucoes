'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Icon } from '@/components/ui/Icon'

import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'

interface KpiData {
  summary: { totalWorkOrders: number; completed: number; pending: number; correctives: number; preventives: number }
  reliability: Record<string, { value: number; unit: string; label: string; description: string }>
  process: Record<string, { value: number; unit: string; label: string; description: string }>
  cost: Record<string, { value: number; unit: string; label: string; description: string }>
  reference: { text: string }
}

function KpiCard({ label, value, unit, description, highlight }: {
  label: string; value: number; unit: string; description: string; highlight?: boolean
}) {
  const displayValue = unit === 'R$' ? formatCurrency(value) : `${value}${unit}`
  return (
    <div className={`p-4 border rounded-[4px] ${highlight ? 'border-foreground/30 bg-muted/30' : 'border-border bg-card'}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{displayValue}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

export default function KpiPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, unitId: authUnitId } = useAuth()
  const role = user?.role ?? ''
  const isAdmin = role === 'SUPER_ADMIN' || role === 'GESTOR'
  const [kpiData, setKpiData] = useState<KpiData | null>(null)
  const [units, setUnits] = useState<any[]>([])
  const [selectedUnit, setSelectedUnit] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Redirect if not authenticated or no permission
  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'kpi', 'view')) { router.push('/dashboard'); return }
  }, [authLoading, user, role])

  useEffect(() => {
    if (!authLoading && user && isAdmin) loadUnits()
  }, [authLoading, user, isAdmin])

  useEffect(() => {
    if (!authLoading && user) loadKpis()
  }, [selectedUnit, startDate, endDate, authLoading, user])

  const loadUnits = async () => {
    const res = await fetch('/api/units')
    const data = await res.json()
    setUnits(data.data || [])
  }

  const loadKpis = async () => {
    const params = new URLSearchParams()
    // Admin pode escolher unidade; non-admin usa a da session (backend força via getEffectiveUnitId)
    if (isAdmin && selectedUnit) params.append('unitId', selectedUnit)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const url = `/api/kpi${params.toString() ? '?' + params.toString() : ''}`
    const res = await fetch(url)
    const data = await res.json()
    setKpiData(data.data || null)
  }

  if (authLoading || !user) {
    return <AppLayout><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" /></div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Icon name="trending_up" className="text-2xl text-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">KPI - Indicadores Chave de Performance</h1>
            <p className="text-sm text-muted-foreground">Confiabilidade, Processo e Custo</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 p-4 bg-card rounded-[4px]">
          {isAdmin && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Unidade</label>
              <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
                className="px-3 py-2 text-sm rounded-[4px] bg-card">
                <option value="">Todas</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Data Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-[4px] bg-card" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Data Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-[4px] bg-card" />
          </div>
        </div>

        {/* Resumo */}
        {kpiData && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-card rounded-[4px] text-center">
              <p className="text-2xl font-bold">{kpiData.summary.totalWorkOrders}</p>
              <p className="text-xs text-muted-foreground">Total OSs</p>
            </div>
            <div className="p-3 bg-card rounded-[4px] text-center">
              <p className="text-2xl font-bold">{kpiData.summary.completed}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
            <div className="p-3 bg-card rounded-[4px] text-center">
              <p className="text-2xl font-bold">{kpiData.summary.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <div className="p-3 bg-card rounded-[4px] text-center">
              <p className="text-2xl font-bold">{kpiData.summary.preventives}</p>
              <p className="text-xs text-muted-foreground">Preventivas</p>
            </div>
            <div className="p-3 bg-card rounded-[4px] text-center">
              <p className="text-2xl font-bold">{kpiData.summary.correctives}</p>
              <p className="text-xs text-muted-foreground">Corretivas</p>
            </div>
          </div>
        )}

        {/* Grupo 1: Confiabilidade e Desempenho */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="monitoring" className="text-xl" /> Confiabilidade e Desempenho
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiData && Object.values(kpiData.reliability).map((kpi, i) => (
              <KpiCard key={i} {...kpi} highlight={kpi.label.includes('Disponibilidade')} />
            ))}
          </div>
        </div>

        {/* Grupo 2: Processo e Planejamento */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="bar_chart" className="text-xl" /> Processo e Planejamento
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiData && Object.values(kpiData.process).map((kpi, i) => (
              <KpiCard key={i} {...kpi} highlight={kpi.label.includes('PMC')} />
            ))}
          </div>
        </div>

        {/* Grupo 3: Custo e Qualidade */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="attach_money" className="text-xl" /> Custo e Qualidade
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kpiData && Object.values(kpiData.cost).map((kpi, i) => (
              <KpiCard key={i} {...kpi} />
            ))}
          </div>
        </div>

        {/* Referência de boa gestão */}
        {kpiData && (
          <div className="p-4 bg-muted/50 rounded-[4px] flex items-start gap-3">
            <Icon name="info" className="text-xl text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Parâmetros de Referência</p>
              <p className="text-sm text-muted-foreground">{kpiData.reference.text}</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
