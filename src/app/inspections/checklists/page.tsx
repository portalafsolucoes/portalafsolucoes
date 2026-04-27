'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'
import InspectionStatusBadge from '@/components/area-inspections/InspectionStatusBadge'
import type { InspectionDetail, InspectionListItem } from '@/components/area-inspections/types'

const InspectionFormPanel = dynamic(() => import('@/components/area-inspections/InspectionFormPanel'), { ssr: false })
const InspectionDetailPanel = dynamic(() => import('@/components/area-inspections/InspectionDetailPanel'), { ssr: false })
const InspectionExecutionPanel = dynamic(() => import('@/components/area-inspections/InspectionExecutionPanel'), { ssr: false })
const FinalizeModal = dynamic(() => import('@/components/area-inspections/FinalizeModal'), { ssr: false })
const InspectionPrintView = dynamic(() => import('@/components/area-inspections/InspectionPrintView'), { ssr: false })

type SortField = 'number' | 'description' | 'createdAt' | 'dueDate' | 'requestCount' | 'status'
type SortDirection = 'asc' | 'desc'

export default function InspectionChecklistsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const role = (user?.role ?? '') as UserRole | ''

  const [inspections, setInspections] = useState<InspectionListItem[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'RASCUNHO' | 'EM_REVISAO' | 'FINALIZADO' | 'overdue'>('active')
  const [sortField, setSortField] = useState<SortField>('dueDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [selected, setSelected] = useState<InspectionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [printingId, setPrintingId] = useState<string | null>(null)

  const { isPhone } = useResponsiveLayout()

  const showSidePanel = !!(selected || isCreating || executingId)

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'area-inspections', 'view')) {
      router.push('/dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, role])

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/inspections')
      const json = await res.json()
      setInspections((json.data || []) as InspectionListItem[])
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    if (role) void loadData()
  }, [role, loadData])

  const handleSelect = async (id: string) => {
    setIsCreating(false)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/inspections/${id}`)
      const json = await res.json()
      if (res.ok) setSelected(json.data as InspectionDetail)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDetail(false)
    }
  }

  const openCreate = () => {
    setSelected(null)
    setIsCreating(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta inspeção? Esta ação não pode ser desfeita.')) return
    const res = await fetch(`/api/inspections/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error || 'Erro ao excluir')
      return
    }
    if (selected?.id === id) setSelected(null)
    void loadData()
  }

  const closeSidePanel = () => {
    setSelected(null)
    setIsCreating(false)
    setExecutingId(null)
  }

  const openExecution = (id: string) => {
    setExecutingId(id)
  }

  const handleSubmitForReview = async (id: string) => {
    const res = await fetch(`/api/inspections/${id}/submit-for-review`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(json.error || 'Erro ao enviar para revisão')
      return
    }
    setExecutingId(null)
    void loadData()
    void handleSelect(id)
  }

  const handleReturnToDraft = async (id: string) => {
    if (!confirm('Devolver inspeção ao manutentor para ajustes?')) return
    const res = await fetch(`/api/inspections/${id}/return-to-draft`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(json.error || 'Erro ao devolver')
      return
    }
    void loadData()
    void handleSelect(id)
  }

  const handleReopen = async (id: string) => {
    if (!confirm('Reabrir esta inspeção? As SSs já criadas serão preservadas.')) return
    const res = await fetch(`/api/inspections/${id}/reopen`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(json.error || 'Erro ao reabrir')
      return
    }
    void loadData()
    void handleSelect(id)
  }

  const handleFinalize = (id: string) => {
    if (!selected || selected.id !== id) {
      void handleSelect(id).then(() => setFinalizeOpen(true))
      return
    }
    setFinalizeOpen(true)
  }

  const onFinalized = (count: number) => {
    setFinalizeOpen(false)
    if (selected) {
      alert(`Inspeção finalizada. ${count} SS(s) gerada(s).`)
      void loadData()
      void handleSelect(selected.id)
    }
  }

  const canCreate = !!role && hasPermission(role as UserRole, 'area-inspections', 'create')
  const canDelete = !!role && hasPermission(role as UserRole, 'area-inspections', 'delete')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <Icon name="unfold_more" className="text-sm text-muted-foreground" />
    return (
      <Icon
        name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
        className="text-sm text-accent-orange"
      />
    )
  }

  const filtered = inspections.filter((i) => {
    if (statusFilter === 'overdue' && !i.isOverdue) return false
    if (statusFilter === 'active' && i.status === 'FINALIZADO') return false
    if (
      statusFilter !== 'all' &&
      statusFilter !== 'active' &&
      statusFilter !== 'overdue' &&
      i.status !== statusFilter
    ) return false
    if (!search) return true
    const q = search.toLowerCase()
    const assigneeName = `${i.assignedTo?.firstName || ''} ${i.assignedTo?.lastName || ''}`.toLowerCase()
    return (
      (i.number || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.checklistName || '').toLowerCase().includes(q) ||
      (i.workCenterName || '').toLowerCase().includes(q) ||
      (i.serviceTypeName || '').toLowerCase().includes(q) ||
      assigneeName.includes(q)
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    const m = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'number':
        return (a.number || '').localeCompare(b.number || '') * m
      case 'description':
        return (a.description || '').localeCompare(b.description || '') * m
      case 'createdAt':
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * m
      case 'dueDate':
        return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * m
      case 'requestCount':
        return ((a.requestCount || 0) - (b.requestCount || 0)) * m
      case 'status':
        return (a.status || '').localeCompare(b.status || '') * m
      default:
        return 0
    }
  })

  const formatDate = (iso: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('pt-BR')
  }

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </PageContainer>
    )
  }

  const activePanel = isCreating ? (
    <InspectionFormPanel
      inPage
      onClose={() => setIsCreating(false)}
      onSuccess={(id) => {
        setIsCreating(false)
        void loadData()
        void handleSelect(id)
      }}
    />
  ) : executingId && selected && selected.id === executingId ? (
    <InspectionExecutionPanel
      inspection={selected}
      isReviewMode={selected.status === 'EM_REVISAO'}
      onClose={() => setExecutingId(null)}
      onSaved={(updated) => {
        setSelected(updated)
        void loadData()
      }}
      onSubmitForReview={handleSubmitForReview}
    />
  ) : selected ? (
    loadingDetail ? (
      <div className="h-full flex items-center justify-center bg-card border-l border-border">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    ) : (
      <InspectionDetailPanel
        inspection={selected}
        onClose={() => setSelected(null)}
        onDelete={(id) => handleDelete(id)}
        canDelete={canDelete}
        onOpenExecution={(id) => openExecution(id)}
        onSubmitForReview={handleSubmitForReview}
        onReturnToDraft={handleReturnToDraft}
        onFinalize={handleFinalize}
        onReopen={handleReopen}
        canFinalize={canCreate}
        onPrint={(id) => setPrintingId(id)}
      />
    )
  ) : null

  const listContent = (
    <div className="h-full flex flex-col overflow-hidden">
      {isPhone ? (
        <div className="overflow-auto flex-1 p-4">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma inspeção cadastrada.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {sorted.map((i) => (
                <div
                  key={i.id}
                  onClick={() => handleSelect(i.id)}
                  className={`bg-card rounded-[4px] ambient-shadow p-4 cursor-pointer transition-all ${selected?.id === i.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="text-sm font-bold text-foreground flex-1 truncate">
                      #{i.number} — {i.description}
                    </h3>
                    <InspectionStatusBadge status={i.status} isOverdue={i.isOverdue} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 truncate">
                    {i.checklistName} / {i.workCenterName}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      Vencimento: <span className="text-foreground">{formatDate(i.dueDate)}</span>
                    </span>
                    <span>
                      SSs: <span className="text-foreground">{i.requestCount || 0}</span>
                    </span>
                    <span>
                      Criado em: <span className="text-foreground">{formatDate(i.createdAt)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="h-full flex flex-col bg-card overflow-hidden">
          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-secondary z-10">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('number')} className="flex items-center gap-1">
                      <span>N°</span>
                      {renderSortIcon('number')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('description')} className="flex items-center gap-1">
                      <span>Descrição</span>
                      {renderSortIcon('description')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('createdAt')} className="flex items-center gap-1">
                      <span>Criado em</span>
                      {renderSortIcon('createdAt')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('dueDate')} className="flex items-center gap-1">
                      <span>Vencimento</span>
                      {renderSortIcon('dueDate')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('requestCount')} className="flex items-center gap-1">
                      <span>N° SSs</span>
                      {renderSortIcon('requestCount')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('status')} className="flex items-center gap-1">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-100">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      Nenhuma inspeção cadastrada.
                    </td>
                  </tr>
                ) : (
                  sorted.map((i) => (
                    <tr
                      key={i.id}
                      onClick={() => handleSelect(i.id)}
                      className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selected?.id === i.id ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">{i.number}</td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        <div className="max-w-md truncate">{i.description}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {i.checklistName} / {i.workCenterName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatDate(i.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatDate(i.dueDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{i.requestCount || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <InspectionStatusBadge status={i.status} isOverdue={i.isOverdue} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Check List"
          description="Inspeções de área criadas a partir dos check lists padrão"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full h-9 pl-9 pr-3 text-sm border border-input rounded-[4px] bg-background"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background w-full sm:w-auto"
              >
                <option value="active">Ativos (ocultar finalizados)</option>
                <option value="all">Todos</option>
                <option value="RASCUNHO">Em preenchimento</option>
                <option value="EM_REVISAO">Em revisão</option>
                <option value="FINALIZADO">Finalizado</option>
                <option value="overdue">Atrasado</option>
              </select>
              {canCreate && (
                <Button
                  type="button"
                  onClick={openCreate}
                  className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md"
                >
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-2">Novo Check List</span>
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle={isCreating ? 'Novo Check List' : selected ? `Inspeção #${selected.number}` : ''}
            onClosePanel={closeSidePanel}
          />
        </div>
      </div>

      {selected && finalizeOpen && (
        <FinalizeModal
          inspection={selected}
          isOpen={finalizeOpen}
          onClose={() => setFinalizeOpen(false)}
          onFinalized={onFinalized}
        />
      )}

      {printingId && (
        <InspectionPrintView inspectionId={printingId} onClose={() => setPrintingId(null)} />
      )}
    </PageContainer>
  )
}
