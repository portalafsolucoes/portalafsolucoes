'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'

import { hasPermission } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import { canSwitchUnits } from '@/lib/user-roles'

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
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900">{displayValue}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

export default function KpiPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, unitId: _authUnitId } = useAuth()
  const isAdmin = canSwitchUnits(user)
  const [kpiData, setKpiData] = useState<KpiData | null>(null)
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([])
  const [selectedUnit, setSelectedUnit] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Redirect if not authenticated or no permission
  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(user, 'kpi', 'view')) { router.push('/dashboard'); return }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!authLoading && user && isAdmin) loadUnits()
  }, [authLoading, user, isAdmin])

  useEffect(() => {
    if (!authLoading && user) loadKpis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex items-center justify-center flex-1">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="KPI - Indicadores Chave de Performance"
          description="Confiabilidade, Processo e Custo"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
                  className="px-3 py-2 text-sm rounded-[4px] border border-gray-300 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="">Todas as unidades</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-[4px] border border-gray-300 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-[4px] border border-gray-300 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <div className="w-full overflow-auto p-4 md:p-6">
            <div className="space-y-6">
              {/* Resumo */}
              {kpiData && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-card rounded-[4px] border border-border text-center">
                    <p className="text-2xl font-black text-gray-900">{kpiData.summary.totalWorkOrders}</p>
                    <p className="text-xs text-muted-foreground">Total OSs</p>
                  </div>
                  <div className="p-3 bg-card rounded-[4px] border border-border text-center">
                    <p className="text-2xl font-black text-gray-900">{kpiData.summary.completed}</p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </div>
                  <div className="p-3 bg-card rounded-[4px] border border-border text-center">
                    <p className="text-2xl font-black text-gray-900">{kpiData.summary.pending}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                  <div className="p-3 bg-card rounded-[4px] border border-border text-center">
                    <p className="text-2xl font-black text-gray-900">{kpiData.summary.preventives}</p>
                    <p className="text-xs text-muted-foreground">Preventivas</p>
                  </div>
                  <div className="p-3 bg-card rounded-[4px] border border-border text-center">
                    <p className="text-2xl font-black text-gray-900">{kpiData.summary.correctives}</p>
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
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
