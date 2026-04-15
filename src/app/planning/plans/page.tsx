'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/lib/utils'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

const PlanDetailPanel = dynamic(
  () => import('@/components/planning/PlanDetailPanel').then(m => ({ default: m.PlanDetailPanel })),
  { ssr: false }
)
const PlanFormPanel = dynamic(
  () => import('@/components/planning/PlanFormPanel').then(m => ({ default: m.PlanFormPanel })),
  { ssr: false }
)

interface Plan {
  id: string
  planNumber?: number
  description?: string
  planDate?: string
  startDate?: string
  endDate?: string
  status?: string
  isFinished?: boolean
  trackingType?: string
  currentHorimeter?: number
  createdAt?: string
  updatedAt?: string
}

type SortField = 'planNumber' | 'description' | 'startDate' | 'endDate' | 'status' | 'isFinished'
type SortDirection = 'asc' | 'desc'

export default function PlansPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { canCreate, canDelete } = usePermissions()
  const role = user?.role ?? ''

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [sortField, setSortField] = useState<SortField>('planNumber')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'planning', 'view')) {
      router.push('/dashboard')
      return
    }
    loadData()
  }, [authLoading, user, role])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/planning/plans')
      const data = await res.json()
      setPlans(data.data || [])
    } catch {
      setPlans([])
    }
    setLoading(false)
  }

  const handleSelectPlan = (plan: Plan) => {
    setIsCreating(false)
    setSelectedPlan(plan)
  }

  const handleClosePanel = () => {
    setSelectedPlan(null)
    setIsCreating(false)
  }

  const handleCreate = () => {
    setSelectedPlan(null)
    setIsCreating(true)
  }

  const handleSaved = (generatedCount?: number) => {
    setIsCreating(false)
    loadData()
    if (generatedCount !== undefined) {
      setSuccessMsg(`Plano criado com sucesso! ${generatedCount} Ordem(ns) de Serviço gerada(s).`)
      setTimeout(() => setSuccessMsg(''), 8000)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/planning/plans/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao excluir plano')
        setDeleting(false)
        setDeleteId(null)
        return
      }
      if (selectedPlan?.id === deleteId) setSelectedPlan(null)
      setDeleteId(null)
      loadData()
    } catch {
      alert('Erro de conexão ao excluir plano')
    }
    setDeleting(false)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <Icon name="unfold_more" className="text-sm text-muted-foreground" />
    }
    return (
      <Icon
        name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
        className="text-sm text-accent-orange"
      />
    )
  }

  const filteredPlans = plans.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (p.planNumber && String(p.planNumber).toLowerCase().includes(s)) ||
      (p.description && p.description.toLowerCase().includes(s)) ||
      (p.status && p.status.toLowerCase().includes(s))
    )
  })

  const sortedPlans = [...filteredPlans].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'planNumber':
        return ((a.planNumber || 0) - (b.planNumber || 0)) * modifier
      case 'description':
        return (a.description || '').localeCompare(b.description || '') * modifier
      case 'startDate':
        return (a.startDate || '').localeCompare(b.startDate || '') * modifier
      case 'endDate':
        return (a.endDate || '').localeCompare(b.endDate || '') * modifier
      case 'status':
        return (a.status || '').localeCompare(b.status || '') * modifier
      case 'isFinished':
        return ((a.isFinished ? 1 : 0) - (b.isFinished ? 1 : 0)) * modifier
      default:
        return 0
    }
  })

  const showSidePanel = !!(selectedPlan !== null || isCreating)

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </PageContainer>
    )
  }

  const activePanel = isCreating ? (
    <PlanFormPanel
      onClose={handleClosePanel}
      onSaved={handleSaved}
      inPage
    />
  ) : selectedPlan ? (
    <PlanDetailPanel
      plan={selectedPlan}
      onClose={handleClosePanel}
      onDelete={() => setDeleteId(selectedPlan.id)}
      canDelete={canDelete('planning')}
    />
  ) : null

  const listContent = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('planNumber')} className="flex items-center gap-1">
                  <span>Plano</span>
                  {renderSortIcon('planNumber')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('description')} className="flex items-center gap-1">
                  <span>Descrição</span>
                  {renderSortIcon('description')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('startDate')} className="flex items-center gap-1">
                  <span>Data Início</span>
                  {renderSortIcon('startDate')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('endDate')} className="flex items-center gap-1">
                  <span>Data Fim</span>
                  {renderSortIcon('endDate')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('status')} className="flex items-center gap-1">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('isFinished')} className="flex items-center gap-1">
                  <span>Terminado?</span>
                  {renderSortIcon('isFinished')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-100">
            {sortedPlans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="assignment" className="text-4xl text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Nenhum plano encontrado</h3>
                    <p className="text-sm text-muted-foreground">Nenhum plano emitido ainda.</p>
                  </div>
                </td>
              </tr>
            ) : sortedPlans.map(p => (
              <tr
                key={p.id}
                onClick={() => handleSelectPlan(p)}
                className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selectedPlan?.id === p.id ? 'bg-secondary' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">#{p.planNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">{p.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatDate(p.startDate || '')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatDate(p.endDate || '')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{p.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{p.isFinished ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Plano de Manutenção"
          description="Emissão de planos de manutenção preventiva e preditiva"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar planos..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Add button */}
              {canCreate('planning') && (
                <Button onClick={handleCreate} className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-1">Novo Plano</span>
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Success feedback */}
      {successMsg && (
        <div className="mx-4 mt-2 md:mx-6 p-3 bg-green-50 border border-green-200 text-green-800 rounded-[4px] text-sm flex items-center gap-2">
          <Icon name="check_circle" className="text-base text-green-600" />
          {successMsg}
          <button onClick={() => setSuccessMsg('')} className="ml-auto p-0.5 hover:bg-green-100 rounded transition-colors">
            <Icon name="close" className="text-sm text-green-600" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle="Plano de Manutenção"
            onClosePanel={handleClosePanel}
          />
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Plano"
        message="Tem certeza que deseja excluir este plano? As OSs pendentes vinculadas também serão excluídas. Planos com OSs já liberadas para execução não podem ser excluídos."
        confirmText="Excluir"
        loading={deleting}
      />
    </PageContainer>
  )
}
