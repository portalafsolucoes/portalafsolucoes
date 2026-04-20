'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const StandardPlanDetailPanel = dynamic(() => import('@/components/standard-plans/StandardPlanDetailPanel'), { ssr: false })
const StandardPlanFormPanel = dynamic(() => import('@/components/standard-plans/StandardPlanFormPanel'), { ssr: false })

type SortField = 'family' | 'familyModel' | 'sequence' | 'serviceType' | 'name' | 'frequency' | 'trackingType' | 'period'
type SortDirection = 'asc' | 'desc'

export default function StandardMaintenancePlanPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const role = user?.role ?? ''

  // --- dados da listagem ---
  const [standardPlans, setStandardPlans] = useState<Record<string, unknown>[]>([])
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('family')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // --- painel de detalhe ---
  const [selectedPlan, setSelectedPlan] = useState<Record<string, unknown> | null>(null)
  const { isPhone } = useResponsiveLayout()
  const [loadingDetail, setLoadingDetail] = useState(false)

  // --- painel de criação/edição ---
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const showSidePanel = !!(selectedPlan !== null || isCreating || editingId !== null)

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'maintenance-plan', 'view')) {
      router.push('/dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, role])

  useEffect(() => {
    if (role) loadData()
  }, [role])

  const loadData = async () => {
    const res = await fetch('/api/maintenance-plans/standard')
    const data = await res.json()
    setStandardPlans(data.data || [])
  }

  const handleSelectPlan = async (planId: string) => {
    setIsCreating(false)
    setEditingId(null)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/maintenance-plans/standard/${planId}`)
      const json = await res.json()
      if (res.ok) setSelectedPlan(json.data)
    } catch { /* silent */ }
    setLoadingDetail(false)
  }

  const openCreate = () => {
    setSelectedPlan(null)
    setEditingId(null)
    setIsCreating(true)
  }

  const openEdit = (planId: string) => {
    setSelectedPlan(null)
    setIsCreating(false)
    setEditingId(planId)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este plano?')) return
    await fetch(`/api/maintenance-plans/standard/${id}`, { method: 'DELETE' })
    if (selectedPlan?.id === id) setSelectedPlan(null)
    if (editingId === id) setEditingId(null)
    loadData()
  }

  const closeSidePanel = () => {
    setSelectedPlan(null)
    setIsCreating(false)
    setEditingId(null)
  }

  const canEdit = role && hasPermission(role as UserRole, 'maintenance-plan', 'create')

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

  const filteredStandard = standardPlans.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.family?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const sortedStandard = [...filteredStandard].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'family':
        return (a.family?.name || '').localeCompare(b.family?.name || '') * modifier
      case 'familyModel':
        return (a.familyModel?.name || '').localeCompare(b.familyModel?.name || '') * modifier
      case 'sequence':
        return ((a.sequence || 0) - (b.sequence || 0)) * modifier
      case 'serviceType':
        return (a.serviceType?.name || '').localeCompare(b.serviceType?.name || '') * modifier
      case 'name':
        return (a.name || '').localeCompare(b.name || '') * modifier
      case 'frequency':
        return ((a.maintenanceTime || 0) - (b.maintenanceTime || 0)) * modifier
      case 'trackingType':
        return (a.trackingType || '').localeCompare(b.trackingType || '') * modifier
      case 'period':
        return (a.period || '').localeCompare(b.period || '') * modifier
      default:
        return 0
    }
  })

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex items-center justify-center flex-1">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </PageContainer>
    )
  }

  const activePanel = isCreating ? (
    <StandardPlanFormPanel
      inPage
      editingId={null}
      onClose={() => setIsCreating(false)}
      onSuccess={() => { setIsCreating(false); loadData() }}
    />
  ) : editingId ? (
    <StandardPlanFormPanel
      inPage
      editingId={editingId}
      onClose={() => setEditingId(null)}
      onSuccess={() => { setEditingId(null); loadData() }}
    />
  ) : selectedPlan ? (
    loadingDetail ? (
      <div className="h-full flex items-center justify-center bg-card border-l border-border">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    ) : (
      <StandardPlanDetailPanel
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onEdit={(planId) => openEdit(planId)}
        onDelete={(planId) => { setSelectedPlan(null); handleDelete(planId) }}
        canEdit={!!canEdit}
      />
    )
  ) : null

  const listContent = isPhone ? (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="overflow-auto flex-1 p-4">
        {sortedStandard.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum plano padrão cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sortedStandard.map(p => (
              <div
                key={p.id}
                onClick={() => handleSelectPlan(p.id)}
                className={`bg-card rounded-[4px] ambient-shadow p-4 cursor-pointer transition-all ${selectedPlan?.id === p.id || editingId === p.id ? 'ring-2 ring-primary' : ''}`}
              >
                <h3 className="text-sm font-bold text-foreground mb-1">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  {p.family?.code} - {p.family?.name}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {p.serviceType?.name && <span>Serv.: <span className="text-foreground">{p.serviceType.name}</span></span>}
                  <span>Freq.: <span className="text-foreground">{p.maintenanceTime} {p.timeUnit}</span></span>
                  <span>Controle: <span className="text-foreground">{p.trackingType === 'HORIMETER' ? 'Horímetro' : 'Tempo'}</span></span>
                  <span>Período: <span className="text-foreground">{p.period}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="flex-1 overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="sticky top-0 bg-secondary z-10">
          <tr>
            <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <button type="button" onClick={() => handleSort('family')} className="flex items-center gap-1">
                <span>Família</span>
                {renderSortIcon('family')}
              </button>
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <button type="button" onClick={() => handleSort('familyModel')} className="flex items-center gap-1">
                <span>Tipo Modelo</span>
                {renderSortIcon('familyModel')}
              </button>
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <button type="button" onClick={() => handleSort('sequence')} className="flex items-center gap-1">
                <span>Seq.</span>
                {renderSortIcon('sequence')}
              </button>
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <button type="button" onClick={() => handleSort('serviceType')} className="flex items-center gap-1">
                <span>Tipo Serviço</span>
                {renderSortIcon('serviceType')}
              </button>
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1">
                <span>Nome da Manutenção</span>
                {renderSortIcon('name')}
              </button>
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <button type="button" onClick={() => handleSort('frequency')} className="flex items-center gap-1">
                <span>Frequência</span>
                {renderSortIcon('frequency')}
              </button>
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <button type="button" onClick={() => handleSort('trackingType')} className="flex items-center gap-1">
                <span>Tipo de Controle</span>
                {renderSortIcon('trackingType')}
              </button>
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <button type="button" onClick={() => handleSort('period')} className="flex items-center gap-1">
                <span>Período</span>
                {renderSortIcon('period')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-100">
          {sortedStandard.length === 0 ? (
            <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Nenhum plano padrão cadastrado.</td></tr>
          ) : sortedStandard.map(p => (
            <tr
              key={p.id}
              className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selectedPlan?.id === p.id || editingId === p.id ? 'bg-secondary' : ''}`}
              onClick={() => handleSelectPlan(p.id)}
            >
              <td className="px-6 py-3 text-sm">{p.family?.code} - {p.family?.name}</td>
              <td className="px-6 py-3 text-sm">{p.familyModel?.name || '-'}</td>
              <td className="px-6 py-3 text-sm">{p.sequence}</td>
              <td className="px-6 py-3 text-sm">{p.serviceType?.name}</td>
              <td className="px-6 py-3 text-sm font-medium">{p.name}</td>
              <td className="px-6 py-3 text-sm">{p.maintenanceTime} {p.timeUnit}</td>
              <td className="px-6 py-3 text-sm">{p.trackingType === 'HORIMETER' ? 'HORIMETRO' : 'TEMPO'}</td>
              <td className="px-6 py-3 text-sm">{p.period === 'REPETITIVA' ? 'REPETITIVA' : 'UNICA'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Manutenção Padrão"
          description="Planos de manutenção padrão por família"
          actions={
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {canEdit && (
                <Button onClick={openCreate} className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-1">Novo Plano Padrão</span>
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Tabela + Painel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle="Plano Padrão"
            onClosePanel={closeSidePanel}
          />
        </div>
      </div>
    </PageContainer>
  )
}
