'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/lib/utils'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useIsMobile } from '@/hooks/useMediaQuery'

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
  createdAt?: string
  updatedAt?: string
}

export default function PlansPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { canCreate, canDelete } = usePermissions()
  const isMobile = useIsMobile()
  const role = user?.role ?? ''

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      // generatedCount available for future toast/feedback
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

  const filteredPlans = plans.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (p.planNumber && String(p.planNumber).toLowerCase().includes(s)) ||
      (p.description && p.description.toLowerCase().includes(s)) ||
      (p.status && p.status.toLowerCase().includes(s))
    )
  })

  const hasSidePanel = !isMobile && (selectedPlan !== null || isCreating)

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
              <div className="relative w-64">
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
                <Button onClick={handleCreate}>
                  <Icon name="add" className="mr-2 text-base" />
                  Novo Plano
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                <p className="mt-2 text-muted-foreground">Carregando...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Left: table */}
              <div className={`${hasSidePanel ? 'w-1/2 min-w-0' : 'w-full'} transition-all overflow-hidden`}>
                <div className="h-full flex flex-col bg-card overflow-hidden">
                  <div className="flex-1 overflow-auto min-h-0">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="sticky top-0 bg-secondary z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Plano</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Início</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Fim</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Terminado?</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-gray-200">
                        {filteredPlans.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <Icon name="assignment" className="text-4xl text-muted-foreground" />
                                <h3 className="text-sm font-medium text-foreground">Nenhum plano encontrado</h3>
                                <p className="text-sm text-muted-foreground">Nenhum plano emitido ainda.</p>
                              </div>
                            </td>
                          </tr>
                        ) : filteredPlans.map(p => (
                          <tr
                            key={p.id}
                            onClick={() => handleSelectPlan(p)}
                            className={`hover:bg-secondary cursor-pointer transition-colors ${selectedPlan?.id === p.id ? 'bg-secondary' : ''}`}
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
              </div>

              {/* Right: panel (desktop only) */}
              {!isMobile && isCreating && (
                <div className="w-1/2 min-w-0">
                  <PlanFormPanel
                    onClose={handleClosePanel}
                    onSaved={handleSaved}
                    inPage
                  />
                </div>
              )}
              {!isMobile && !isCreating && selectedPlan && (
                <div className="w-1/2 min-w-0">
                  <PlanDetailPanel
                    plan={selectedPlan}
                    onClose={handleClosePanel}
                    onDelete={() => setDeleteId(selectedPlan.id)}
                    canDelete={canDelete('planning')}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile modals */}
      {isMobile && isCreating && (
        <Modal isOpen onClose={handleClosePanel} title="Novo Plano de Manutenção" hideHeader noPadding>
          <PlanFormPanel
            onClose={handleClosePanel}
            onSaved={handleSaved}
          />
        </Modal>
      )}
      {isMobile && selectedPlan && !isCreating && (
        <Modal
          isOpen
          onClose={handleClosePanel}
          title={selectedPlan.planNumber ? `#${selectedPlan.planNumber}` : 'Plano'}
          hideHeader
          noPadding
        >
          <PlanDetailPanel
            plan={selectedPlan}
            onClose={handleClosePanel}
            onDelete={() => setDeleteId(selectedPlan.id)}
            canDelete={canDelete('planning')}
          />
        </Modal>
      )}

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
