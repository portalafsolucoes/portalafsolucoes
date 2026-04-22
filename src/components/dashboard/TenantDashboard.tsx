'use client'

import { useCallback, useEffect, useState } from 'react'
import { KPICard } from './KPICard'
import { DashboardFilters, type DashboardPeriod } from './DashboardFilters'
import { WorkOrderTypeChart } from './WorkOrderTypeChart'
import { WorkOrderStatusChart } from './WorkOrderStatusChart'
import { PMCTrendChart } from './PMCTrendChart'
import { CostTrendChart } from './CostTrendChart'
import { CostBreakdownChart } from './CostBreakdownChart'
import { CorrectivePreventiveTrend } from './CorrectivePreventiveTrend'
import { TopAssetsChart } from './TopAssetsChart'
import { GUTDistributionChart } from './GUTDistributionChart'
import { AlertsPanel } from './AlertsPanel'
import { RafActionPanel } from './RafActionPanel'
import { formatBRL, formatNumber } from './dashboardPalette'

interface OverviewResponse {
  period: DashboardPeriod
  range: { start: string; end: string; bucketKind: 'month' | 'week' }
  kpis: Record<string, { value: number; delta: number | null }>
  series: Array<{
    key: string; label: string
    mtbf: number; mttr: number; availability: number; pmc: number
    cost: number; wosCompleted: number; correctives: number; preventives: number
  }>
  woByStatus: Array<{ status: string; label: string; count: number }>
  woByType: Array<{ key: string; label: string; count: number }>
  costBreakdown: { labor: number; parts: number; thirdParty: number; tools: number }
  topAssets: Array<{ id: string; name: string; tag: string; count: number; totalCost: number }>
  gutBuckets: { critical: number; high: number; medium: number; low: number }
  alerts: {
    overdueWos: number; rescheduledWos: number; pendingRequests: number
    overdueRafActions: number; downAssets: number; openRafs: number; finalizedRafs: number
  }
  requestsBreakdown: { total: number; pending: number; approved: number; rejected: number; completed: number }
  assets: { total: number; operational: number; down: number }
}

export function TenantDashboard({ readOnly = false }: { readOnly?: boolean }) {
  const [period, setPeriod] = useState<DashboardPeriod>('90d')
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: DashboardPeriod) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/overview?period=${p}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Erro ao carregar dashboard')
      }
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(period)
  }, [period, load])

  const handlePeriod = (p: DashboardPeriod) => setPeriod(p)
  const handleRefresh = () => load(period)

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-[4px] border border-danger/30 bg-danger-light p-6 text-center">
        <p className="text-sm font-semibold text-danger mb-1">Não foi possível carregar o dashboard</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const k = data.kpis

  return (
    <div className="space-y-6">
      {/* Barra de filtros */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Período: {new Date(data.range.start).toLocaleDateString('pt-BR')} — {new Date(data.range.end).toLocaleDateString('pt-BR')}
          {readOnly && <span className="ml-2 px-2 py-0.5 rounded-[4px] bg-surface-container text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visualização</span>}
        </p>
        <DashboardFilters period={period} onPeriodChange={handlePeriod} loading={loading} onRefresh={handleRefresh} />
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        <KPICard label="MTBF" value={formatNumber(k.mtbf.value)} unit="h" delta={k.mtbf.delta} icon="schedule" hint="Tempo médio entre falhas" />
        <KPICard label="MTTR" value={formatNumber(k.mttr.value)} unit="h" delta={k.mttr.delta} deltaInvert icon="build" hint="Tempo médio de reparo" />
        <KPICard label="Disponibilidade" value={formatNumber(k.availability.value)} unit="%" delta={k.availability.delta} icon="bolt" hint="MTBF / (MTBF+MTTR)" />
        <KPICard label="PMC" value={formatNumber(k.pmc.value)} unit="%" delta={k.pmc.delta} icon="task_alt" hint="Plano cumprido — meta 90%" />
        <KPICard label="Reprogramação" value={formatNumber(k.reschedulingRate.value)} unit="%" delta={k.reschedulingRate.delta} deltaInvert icon="history" hint="Taxa — meta < 10%" />
        <KPICard label="Backlog" value={formatNumber(k.backlogWeeks.value)} unit="sem" delta={k.backlogWeeks.delta} deltaInvert icon="inbox" hint="Semanas de trabalho pendente" />
      </div>

      {/* KPIs de volume e custo */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-4">
        <KPICard label="OS concluídas" value={k.completedWos.value} delta={k.completedWos.delta} icon="done_all" hint={`${k.totalWos.value} criadas no período`} />
        <KPICard label="Custo total" value={formatBRL(k.totalCost.value)} delta={k.totalCost.delta} deltaInvert icon="payments" hint="OS concluídas" />
        <KPICard label="Ativos ativos" value={data.assets.operational} delta={null} icon="inventory_2" hint={`${data.assets.total} total · ${data.assets.down} parados`} />
      </div>

      {/* Gráficos — linha 1: tipo + status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <WorkOrderTypeChart data={data.woByType} />
        <WorkOrderStatusChart data={data.woByStatus} />
      </div>

      {/* Gráficos — linha 2: tendência OS e PMC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <CorrectivePreventiveTrend data={data.series} />
        <PMCTrendChart data={data.series} />
      </div>

      {/* Gráficos — linha 3: custos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <CostTrendChart data={data.series} />
        <CostBreakdownChart data={data.costBreakdown} />
      </div>

      {/* Operacional — linha 4: alertas, RAFs, GUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <AlertsPanel data={data.alerts} />
        <RafActionPanel data={{ openRafs: data.alerts.openRafs, finalizedRafs: data.alerts.finalizedRafs, overdueRafActions: data.alerts.overdueRafActions }} />
        <GUTDistributionChart data={data.gutBuckets} />
      </div>

      {/* Top ativos */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <TopAssetsChart data={data.topAssets} />
      </div>
    </div>
  )
}
