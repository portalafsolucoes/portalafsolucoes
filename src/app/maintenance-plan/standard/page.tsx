'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile } from '@/hooks/useMediaQuery'

const StandardPlanDetailPanel = dynamic(() => import('@/components/standard-plans/StandardPlanDetailPanel'), { ssr: false })
const StandardPlanFormPanel = dynamic(() => import('@/components/standard-plans/StandardPlanFormPanel'), { ssr: false })

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

export default function StandardMaintenancePlanPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const isMobile = useIsMobile()
  const role = user?.role ?? ''

  // --- dados da listagem ---
  const [standardPlans, setStandardPlans] = useState<any[]>([])
  const [search, setSearch] = useState('')

  // --- painel de detalhe ---
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // --- painel de criação/edição ---
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const hasSidePanel = !isMobile && (selectedPlan !== null || isCreating || editingId !== null)

  /* ---------------------------------------------------------------- */
  /*  Auth guard                                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'maintenance-plan', 'view')) {
      router.push('/dashboard')
    }
  }, [authLoading, user, role])

  useEffect(() => {
    if (role) loadData()
  }, [role])

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                     */
  /* ---------------------------------------------------------------- */

  const loadData = async () => {
    const res = await fetch('/api/maintenance-plans/standard')
    const data = await res.json()
    setStandardPlans(data.data || [])
  }

  /* ---------------------------------------------------------------- */
  /*  Selecionar plano para detalhe                                    */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  Abrir criação / edição                                           */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  Delete                                                           */
  /* ---------------------------------------------------------------- */

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este plano?')) return
    await fetch(`/api/maintenance-plans/standard/${id}`, { method: 'DELETE' })
    if (selectedPlan?.id === id) setSelectedPlan(null)
    if (editingId === id) setEditingId(null)
    loadData()
  }

  /* ---------------------------------------------------------------- */
  /*  Derived                                                          */
  /* ---------------------------------------------------------------- */

  const canEdit = role && hasPermission(role as UserRole, 'maintenance-plan', 'create')

  const filteredStandard = standardPlans.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.family?.name?.toLowerCase().includes(search.toLowerCase())
  )

  /* ---------------------------------------------------------------- */
  /*  Loading                                                          */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

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
              <div className="relative w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {canEdit && (
                <Button onClick={openCreate} className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                  <Icon name="add" className="text-base mr-1" /> Novo Plano Padrão
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Tabela + Painel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          {/* Coluna esquerda: tabela */}
          <div className={`${hasSidePanel ? 'w-1/2 min-w-0' : 'w-full'} transition-all overflow-hidden flex flex-col`}>
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 bg-secondary z-10">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Família</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo Modelo</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Seq.</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo Serviço</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome da Manutenção</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Frequência</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo de Controle</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Período</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-gray-200">
                  {filteredStandard.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Nenhum plano padrão cadastrado.</td></tr>
                  ) : filteredStandard.map(p => (
                    <tr
                      key={p.id}
                      className={`odd:bg-gray-50 even:bg-white hover:bg-accent-orange-light cursor-pointer transition-colors ${selectedPlan?.id === p.id || editingId === p.id ? 'bg-secondary' : ''}`}
                      onClick={() => handleSelectPlan(p.id)}
                    >
                      <td className="px-6 py-3 text-sm">{p.family?.code} - {p.family?.name}</td>
                      <td className="px-6 py-3 text-sm">{p.familyModel?.name || '-'}</td>
                      <td className="px-6 py-3 text-sm">{p.sequence}</td>
                      <td className="px-6 py-3 text-sm">{p.serviceType?.name}</td>
                      <td className="px-6 py-3 text-sm font-medium">{p.name}</td>
                      <td className="px-6 py-3 text-sm">{p.maintenanceTime} {p.timeUnit}</td>
                      <td className="px-6 py-3 text-sm">{p.trackingType === 'HORIMETER' ? 'Horímetro' : 'Tempo'}</td>
                      <td className="px-6 py-3 text-sm">{p.period === 'Repetitiva' ? 'Repetitiva' : 'Única'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Coluna direita: painel lateral (desktop) */}
          {hasSidePanel && (
            <div className="w-1/2 min-w-0">
              {isCreating ? (
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
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: overlay modal */}
      {isMobile && isCreating && (
        <StandardPlanFormPanel
          editingId={null}
          onClose={() => setIsCreating(false)}
          onSuccess={() => { setIsCreating(false); loadData() }}
        />
      )}
      {isMobile && editingId && (
        <StandardPlanFormPanel
          editingId={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={() => { setEditingId(null); loadData() }}
        />
      )}
    </PageContainer>
  )
}
