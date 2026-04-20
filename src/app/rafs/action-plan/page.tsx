'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useAuth } from '@/hooks/useAuth'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
import { ExportButton } from '@/components/ui/ExportButton'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath } from '@/lib/user-roles'
import { isOverdue, toIsoDeadline } from '@/lib/rafs/deadline'
import type {
  ActionPlanItem,
  ActionPlanStatus,
  RafStatusValue,
} from '@/types/raf'
import {
  ActionPlanTable,
  ActionPlanCards,
  type ActionPlanRow,
} from '@/components/rafs/ActionPlanTable'
import { ActionPlanDashboardCards } from '@/components/rafs/ActionPlanDashboardCards'
import {
  ActionPlanFilters,
  type ActionPlanFiltersState,
} from '@/components/rafs/ActionPlanFilters'
import { ActionPlanLegend } from '@/components/rafs/ActionPlanLegend'

const RAFViewModal = dynamic(
  () => import('@/components/rafs/RAFViewModal').then((m) => ({ default: m.RAFViewModal })),
  { ssr: false }
)

interface LinkedWorkOrder {
  id: string
  internalId?: string | null
  status?: string | null
}

interface LinkedRequest {
  id: string
  requestNumber?: string | null
  status?: string | null
}

interface RafSummary {
  id: string
  rafNumber: string
  occurrenceDate: string | null
  status: RafStatusValue
  finalizedAt: string | null
  actionPlan: ActionPlanItem[] | null
  createdAt: string
  workOrder?: LinkedWorkOrder | null
  request?: LinkedRequest | null
}

export default function ActionPlanPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { isPhone } = useResponsiveLayout()

  const [rafs, setRafs] = useState<RafSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRafId, setSelectedRafId] = useState<string | null>(null)
  const [selectedRafDetail, setSelectedRafDetail] = useState<unknown>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [filters, setFilters] = useState<ActionPlanFiltersState>({
    search: '',
    actionStatus: 'ALL',
    rafStatus: 'ALL',
    responsibleId: 'ALL',
  })

  const hasAccess = !!user && hasPermission(user, 'rafs', 'view')
  const canEditStatus =
    !!user && (hasPermission(user, 'rafs', 'edit') || hasPermission(user, 'rafs', 'create'))

  // Redireciona usuarios sem acesso para o destino padrao do perfil.
  useEffect(() => {
    if (authLoading || !user) return
    if (!hasAccess) {
      router.push(getDefaultCmmsPath(user))
    }
  }, [authLoading, user, hasAccess, router])

  const loadRafs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/rafs?summary=true')
      if (!res.ok) throw new Error('Falha ao carregar RAFs')
      const json = await res.json()
      setRafs(Array.isArray(json.data) ? (json.data as RafSummary[]) : [])
    } catch (e) {
      console.error('loadRafs:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && hasAccess) loadRafs()
  }, [authLoading, hasAccess, loadRafs])

  const loadRafDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true)
      const res = await fetch(`/api/rafs/${id}`)
      if (!res.ok) throw new Error('Falha ao carregar RAF')
      const json = await res.json()
      setSelectedRafDetail(json.data ?? null)
    } catch (e) {
      console.error('loadRafDetail:', e)
      setSelectedRafDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedRafId) loadRafDetail(selectedRafId)
    else setSelectedRafDetail(null)
  }, [selectedRafId, loadRafDetail])

  // Flatten RAFs -> linhas de acao individuais.
  const allRows: ActionPlanRow[] = useMemo(() => {
    const out: ActionPlanRow[] = []
    const now = new Date()
    for (const raf of rafs) {
      const plan = Array.isArray(raf.actionPlan) ? raf.actionPlan : []
      plan.forEach((a, idx) => {
        const status: ActionPlanStatus =
          (String(a?.status || 'PENDING').toUpperCase() as ActionPlanStatus)
        const deadlineIso = toIsoDeadline(a?.deadline)
        out.push({
          rafId: raf.id,
          actionIndex: idx,
          rafNumber: raf.rafNumber,
          rafStatus: raf.status || 'ABERTA',
          rafCreatedAt: raf.createdAt,
          occurrenceDate: raf.occurrenceDate,
          item: a?.item ?? idx + 1,
          subject: a?.subject ?? '',
          actionDescription: a?.actionDescription ?? '',
          deadline: deadlineIso,
          status,
          overdue: isOverdue(a?.deadline, status, now),
          responsibleUserId: a?.responsibleUserId ?? null,
          responsibleName: a?.responsibleName ?? null,
          linkedWorkOrderId: a?.linkedWorkOrderId ?? raf.workOrder?.id ?? null,
          linkedWorkOrderNumber:
            a?.linkedWorkOrderNumber ?? raf.workOrder?.internalId ?? null,
          linkedRequestId: raf.request?.id ?? null,
          linkedRequestNumber: raf.request?.requestNumber ?? null,
        })
      })
    }
    return out
  }, [rafs])

  // Aplicar filtros.
  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return allRows.filter((r) => {
      if (q) {
        const hay = `${r.rafNumber} ${r.actionDescription} ${r.subject} ${r.responsibleName ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filters.actionStatus !== 'ALL') {
        if (filters.actionStatus === 'OVERDUE') {
          if (!r.overdue || r.status === 'COMPLETED') return false
        } else if (r.status !== filters.actionStatus) {
          return false
        }
      }
      if (filters.rafStatus !== 'ALL' && r.rafStatus !== filters.rafStatus) return false
      if (filters.responsibleId !== 'ALL') {
        const wanted = filters.responsibleId
        const actual = r.responsibleUserId ?? ''
        if (actual !== wanted) return false
      }
      return true
    })
  }, [allRows, filters])

  // Stats locais (o endpoint /stats e a fonte canonica, mas derivar daqui evita round-trip)
  const stats = useMemo(
    () => ({
      openRafs: rafs.filter((r) => r.status !== 'FINALIZADA').length,
      finalizedRafs: rafs.filter((r) => r.status === 'FINALIZADA').length,
      onTimeActions: allRows.filter((r) => r.status !== 'COMPLETED' && !r.overdue).length,
      overdueActions: allRows.filter((r) => r.status !== 'COMPLETED' && r.overdue).length,
    }),
    [rafs, allRows]
  )

  // Responsaveis disponiveis para o filtro (derivados dos dados carregados).
  const responsibles = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of allRows) {
      if (r.responsibleUserId && r.responsibleName) {
        map.set(r.responsibleUserId, r.responsibleName)
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [allRows])

  // Edicao inline do status: PUT /api/rafs/:id com o actionPlan atualizado.
  const changeStatus = useCallback(
    async (row: ActionPlanRow, next: ActionPlanStatus) => {
      const raf = rafs.find((r) => r.id === row.rafId)
      if (!raf || !Array.isArray(raf.actionPlan)) return
      const nextPlan = raf.actionPlan.map((a, idx) => {
        if (idx !== row.actionIndex) return a
        const patched: ActionPlanItem = { ...a, status: next }
        if (next === 'COMPLETED' && !a.completedAt) {
          patched.completedAt = new Date().toISOString()
        }
        if (next !== 'COMPLETED') {
          patched.completedAt = undefined
        }
        return patched
      })

      // Atualizacao otimista
      setRafs((prev) =>
        prev.map((r) => (r.id === raf.id ? { ...r, actionPlan: nextPlan } : r))
      )

      try {
        const res = await fetch(`/api/rafs/${raf.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionPlan: nextPlan }),
        })
        if (!res.ok) throw new Error('Falha ao atualizar status da acao')
        // Recarrega para pegar o status recalculado da RAF.
        await loadRafs()
      } catch (e) {
        console.error('changeStatus:', e)
        // Rollback
        await loadRafs()
      }
    },
    [rafs, loadRafs]
  )

  // Dados formatados para export.
  const exportData = useMemo(() => {
    return rows.map((r) => ({
      rafNumber: r.rafNumber,
      actionDescription: r.actionDescription || r.subject,
      responsibleName: r.responsibleName || '',
      rafCreatedAt: r.rafCreatedAt,
      occurrenceDate: r.occurrenceDate,
      deadline: r.deadline,
      linkedWorkOrderNumber: r.linkedWorkOrderNumber || '',
      linkedWorkOrderStatus:
        rafs.find((x) => x.id === r.rafId)?.workOrder?.status || '',
      linkedRequestNumber: r.linkedRequestNumber || '',
      linkedRequestStatus:
        rafs.find((x) => x.id === r.rafId)?.request?.status || '',
      actionStatusLabel:
        r.status === 'COMPLETED'
          ? 'Concluida'
          : r.status === 'IN_PROGRESS'
          ? 'Em andamento'
          : r.overdue
          ? 'Atrasada'
          : 'Pendente',
      rafStatus: r.rafStatus === 'FINALIZADA' ? 'Finalizada' : 'Aberta',
    }))
  }, [rows, rafs])

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        </div>
      </PageContainer>
    )
  }

  if (!hasAccess) return null

  const showSidePanel = !!selectedRafId

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="PA das RAFs"
          description="Plano de acao consolidado das Analises de Falha"
          className="mb-0"
          actions={
            <ExportButton
              entity="action-plan-items"
              data={exportData as unknown as Record<string, unknown>[]}
            />
          }
        />
      </div>

      <div className="px-4 md:px-6 py-3 flex flex-col gap-3 border-b border-border bg-card">
        <ActionPlanDashboardCards stats={stats} loading={loading} />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <ActionPlanFilters value={filters} onChange={setFilters} responsibles={responsibles} />
          <ActionPlanLegend />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={
              loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                    <p className="mt-2 text-muted-foreground">Carregando...</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col overflow-hidden">
                  {isPhone ? (
                    <div className="overflow-auto flex-1 p-4">
                      <ActionPlanCards
                        rows={rows}
                        onOpenRaf={(id) => setSelectedRafId(id)}
                        onChangeStatus={canEditStatus ? changeStatus : undefined}
                        canEditStatus={canEditStatus}
                      />
                    </div>
                  ) : (
                    <ActionPlanTable
                      rows={rows}
                      onOpenRaf={(id) => setSelectedRafId(id)}
                      onChangeStatus={canEditStatus ? changeStatus : undefined}
                      canEditStatus={canEditStatus}
                    />
                  )}
                </div>
              )
            }
            panel={
              showSidePanel ? (
                detailLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                  </div>
                ) : (
                  <RAFViewModal
                    isOpen={true}
                    onClose={() => setSelectedRafId(null)}
                    raf={selectedRafDetail as never}
                    inPage
                  />
                )
              ) : null
            }
            showPanel={showSidePanel}
            panelTitle="Detalhes da RAF"
            onClosePanel={() => setSelectedRafId(null)}
          />
        </div>
      </div>
    </PageContainer>
  )
}
