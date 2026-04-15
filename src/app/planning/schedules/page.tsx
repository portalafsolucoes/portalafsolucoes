'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ScheduleConfirmDialog } from '@/components/planning/ScheduleConfirmDialog'
import { formatDate } from '@/lib/utils'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

const ScheduleDetailPanel = dynamic(
  () => import('@/components/planning/ScheduleDetailPanel').then(m => ({ default: m.ScheduleDetailPanel })),
  { ssr: false }
)
const ScheduleFormPanel = dynamic(
  () => import('@/components/planning/ScheduleFormPanel').then(m => ({ default: m.ScheduleFormPanel })),
  { ssr: false }
)
const ScheduleWorkspace = dynamic(
  () => import('@/components/planning/ScheduleWorkspace').then(m => ({ default: m.ScheduleWorkspace })),
  { ssr: false }
)

interface Schedule {
  id: string
  scheduleNumber?: number
  description?: string
  scheduleDate?: string
  startDate?: string
  endDate?: string
  status?: string
  createdBy?: { firstName?: string; lastName?: string }
  createdAt?: string
  updatedAt?: string
}

type SortField = 'scheduleNumber' | 'description' | 'scheduleDate' | 'period' | 'createdBy' | 'status'
type SortDirection = 'asc' | 'desc'

type PageMode = 'list' | 'workspace'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  CONFIRMED: 'Confirmada',
  REPROGRAMMING: 'Reprogramação',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  CONFIRMED: 'bg-success-light text-success-light-foreground',
  REPROGRAMMING: 'bg-amber-100 text-amber-700',
}

interface ResourceWarning {
  workOrderId: string
  workOrderTitle: string
  type: string
  message: string
}

interface FeedbackBanner {
  type: 'success' | 'error'
  message: string
}

export default function SchedulesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { canCreate } = usePermissions()
  const role = user?.role ?? ''

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Modo da página: lista ou workspace
  const [mode, setMode] = useState<PageMode>('list')
  const [workspaceScheduleId, setWorkspaceScheduleId] = useState<string | null>(null)

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null)
  const [confirmDialogWarnings, setConfirmDialogWarnings] = useState<ResourceWarning[]>([])
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('')
  const [confirmDialogCount, setConfirmDialogCount] = useState(0)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [reprogramDialogOpen, setReprogramDialogOpen] = useState(false)
  const [reprogramDialogId, setReprogramDialogId] = useState<string | null>(null)
  const [reprogramLoading, setReprogramLoading] = useState(false)

  const [feedback, setFeedback] = useState<FeedbackBanner | null>(null)
  const [sortField, setSortField] = useState<SortField>('scheduleDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Auto-dismiss feedback
  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 5000)
    return () => clearTimeout(t)
  }, [feedback])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/planning/schedules')
      const data = await res.json()
      setSchedules(data.data || [])
    } catch {
      setSchedules([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'planning', 'view')) {
      router.push('/dashboard')
      return
    }
    loadData()
  }, [authLoading, user, role, router, loadData])

  // ==========================================
  // List mode handlers
  // ==========================================

  const handleSelectSchedule = (schedule: Schedule) => {
    setIsCreating(false)
    setSelectedSchedule(schedule)
  }

  const handleClosePanel = () => {
    setSelectedSchedule(null)
    setIsCreating(false)
  }

  const handleCreate = () => {
    setSelectedSchedule(null)
    setIsCreating(true)
  }

  const handleSaved = (newScheduleId?: string) => {
    setIsCreating(false)
    loadData()
    // Se criou uma nova programação, entrar no workspace
    if (newScheduleId) {
      setWorkspaceScheduleId(newScheduleId)
      setMode('workspace')
    }
  }

  const handleEdit = () => {
    // Abrir workspace para a programação selecionada
    if (selectedSchedule) {
      setWorkspaceScheduleId(selectedSchedule.id)
      setSelectedSchedule(null)
      setMode('workspace')
    }
  }

  // ---- Delete flow ----
  const handleDeleteClick = () => {
    if (!selectedSchedule) return
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedSchedule) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/planning/schedules/${selectedSchedule.id}`, { method: 'DELETE' })
      if (res.ok) {
        setSelectedSchedule(null)
        setFeedback({ type: 'success', message: 'Programação excluída com sucesso' })
        loadData()
      } else {
        const data = await res.json()
        setFeedback({ type: 'error', message: data.error || 'Erro ao excluir' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão' })
    }
    setDeleteLoading(false)
    setDeleteDialogOpen(false)
  }

  // ---- Confirm flow (two-step with resource validation) ----
  const handleConfirm = useCallback(async (id: string) => {
    setConfirmDialogId(id)
    setConfirmLoading(true)
    
    setConfirmDialogWarnings([])
    setConfirmDialogMessage('')
    setConfirmDialogCount(0)

    try {
      const res = await fetch(`/api/planning/schedules/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()

      if (data.requiresConfirmation) {
        // Show warnings dialog — user must decide
        setConfirmDialogWarnings(data.warnings || [])
        setConfirmDialogMessage(data.message || 'Há avisos de recursos. Deseja continuar?')
        setConfirmDialogCount(data.scheduledCount || 0)
        
        setConfirmLoading(false)
        setConfirmDialogOpen(true)
        return
      }

      if (res.ok) {
        // Direct success (no warnings)
        setFeedback({ type: 'success', message: data.message || 'Programação confirmada com sucesso' })
        if (mode === 'workspace') {
          setMode('list')
          setWorkspaceScheduleId(null)
        }
        if (selectedSchedule?.id === id) {
          setSelectedSchedule({ ...selectedSchedule, status: 'CONFIRMED' })
        }
        loadData()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao confirmar' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão' })
    }
    setConfirmLoading(false)
  }, [mode, selectedSchedule, loadData])

  const handleConfirmForce = async () => {
    if (!confirmDialogId) return
    setConfirmLoading(true)

    try {
      const res = await fetch(`/api/planning/schedules/${confirmDialogId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      const data = await res.json()

      if (res.ok) {
        setFeedback({ type: 'success', message: data.message || 'Programação confirmada com sucesso' })
        if (mode === 'workspace') {
          setMode('list')
          setWorkspaceScheduleId(null)
        }
        if (selectedSchedule?.id === confirmDialogId) {
          setSelectedSchedule({ ...selectedSchedule, status: 'CONFIRMED' })
        }
        loadData()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao confirmar' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão' })
    }
    setConfirmLoading(false)
    setConfirmDialogOpen(false)
  }

  // ---- Reprogram flow ----
  const handleReprogramClick = (id: string) => {
    setReprogramDialogId(id)
    setReprogramDialogOpen(true)
  }

  const handleReprogramConfirm = async () => {
    if (!reprogramDialogId) return
    setReprogramLoading(true)

    try {
      const res = await fetch(`/api/planning/schedules/${reprogramDialogId}/reprogram`, { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setFeedback({ type: 'success', message: data.message || 'Programação em reprogramação' })
        setSelectedSchedule(null)
        setWorkspaceScheduleId(reprogramDialogId)
        setMode('workspace')
        loadData()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao reprogramar' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão' })
    }
    setReprogramLoading(false)
    setReprogramDialogOpen(false)
  }

  // ==========================================
  // Workspace mode handlers
  // ==========================================

  const handleBackToList = () => {
    setMode('list')
    setWorkspaceScheduleId(null)
    loadData()
  }

  // ==========================================
  // Render
  // ==========================================

  const canEdit = !!role && hasPermission(role as UserRole, 'planning', 'create')

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </PageContainer>
    )
  }

  // ==========================================
  // Workspace Mode
  // ==========================================
  if (mode === 'workspace' && workspaceScheduleId) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <ScheduleWorkspace
          scheduleId={workspaceScheduleId}
          onBack={handleBackToList}
          onConfirm={handleConfirm}
        />

        {/* Feedback banner */}
        {feedback && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-[4px] shadow-lg text-sm font-medium ${
            feedback.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'
          }`}>
            <Icon name={feedback.type === 'success' ? 'check_circle' : 'error'} className="text-base" />
            {feedback.message}
            <button onClick={() => setFeedback(null)} className="ml-2 hover:opacity-80">
              <Icon name="close" className="text-base" />
            </button>
          </div>
        )}

        {/* Confirm schedule dialog (with resource warnings) */}
        <ScheduleConfirmDialog
          isOpen={confirmDialogOpen}
          onClose={() => { setConfirmDialogOpen(false) }}
          onConfirm={handleConfirmForce}
          title="Confirmar Programação"
          message={confirmDialogMessage || 'Deseja confirmar esta programação? As OSs serão liberadas para execução.'}
          warnings={confirmDialogWarnings}
          scheduledCount={confirmDialogCount}
          loading={confirmLoading}
          variant="confirm"
        />
      </PageContainer>
    )
  }

  // ==========================================
  // List Mode
  // ==========================================

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

  const filteredSchedules = schedules.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (s.scheduleNumber && String(s.scheduleNumber).toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.status && s.status.toLowerCase().includes(q))
    )
  })

  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'scheduleNumber':
        return ((a.scheduleNumber || 0) - (b.scheduleNumber || 0)) * modifier
      case 'description':
        return (a.description || '').localeCompare(b.description || '') * modifier
      case 'scheduleDate':
        return (a.scheduleDate || '').localeCompare(b.scheduleDate || '') * modifier
      case 'period':
        return (a.startDate || '').localeCompare(b.startDate || '') * modifier
      case 'createdBy': {
        const nameA = a.createdBy ? `${a.createdBy.firstName || ''} ${a.createdBy.lastName || ''}`.trim() : ''
        const nameB = b.createdBy ? `${b.createdBy.firstName || ''} ${b.createdBy.lastName || ''}`.trim() : ''
        return nameA.localeCompare(nameB) * modifier
      }
      case 'status':
        return (a.status || '').localeCompare(b.status || '') * modifier
      default:
        return 0
    }
  })

  const showSidePanel = !!(selectedSchedule !== null || isCreating)

  const activePanel = isCreating ? (
    <ScheduleFormPanel
      onClose={handleClosePanel}
      onSaved={handleSaved}
      inPage
    />
  ) : selectedSchedule ? (
    <ScheduleDetailPanel
      schedule={selectedSchedule}
      onClose={handleClosePanel}
      onEdit={handleEdit}
      onDelete={handleDeleteClick}
      onConfirm={handleConfirm}
      onReprogram={handleReprogramClick}
      canEdit={canEdit}
    />
  ) : null

  const listContent = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('scheduleNumber')} className="flex items-center gap-1">
                  <span>Prog.</span>
                  {renderSortIcon('scheduleNumber')}
                </button>
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('description')} className="flex items-center gap-1">
                  <span>Descrição</span>
                  {renderSortIcon('description')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                <button type="button" onClick={() => handleSort('scheduleDate')} className="flex items-center gap-1">
                  <span>Data</span>
                  {renderSortIcon('scheduleDate')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                <button type="button" onClick={() => handleSort('period')} className="flex items-center gap-1">
                  <span>Período</span>
                  {renderSortIcon('period')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                <button type="button" onClick={() => handleSort('createdBy')} className="flex items-center gap-1">
                  <span>Usuário</span>
                  {renderSortIcon('createdBy')}
                </button>
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('status')} className="flex items-center gap-1">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-100">
            {sortedSchedules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="calendar_month" className="text-4xl text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Nenhuma programação encontrada</h3>
                    <p className="text-sm text-muted-foreground">Nenhuma programação criada ainda.</p>
                  </div>
                </td>
              </tr>
            ) : sortedSchedules.map(s => (
              <tr
                key={s.id}
                onClick={() => handleSelectSchedule(s)}
                className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selectedSchedule?.id === s.id ? 'bg-secondary' : ''}`}
              >
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">#{s.scheduleNumber}</td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium max-w-[200px] truncate">{s.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground hidden md:table-cell">{formatDate(s.scheduleDate || '')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground hidden lg:table-cell">
                  {formatDate(s.startDate || '')} - {formatDate(s.endDate || '')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground hidden xl:table-cell">
                  {s.createdBy ? `${s.createdBy.firstName || ''} ${s.createdBy.lastName || ''}`.trim() : '—'}
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[s.status || ''] || 'bg-muted text-muted-foreground'}`}>
                    {STATUS_LABELS[s.status || ''] || s.status || '—'}
                  </span>
                </td>
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
          title="Programação de OSs"
          description="Programação e confirmação de ordens de serviço"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar programações..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Add button */}
              {canCreate('planning') && (
                <Button onClick={handleCreate} className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-1">Nova Programação</span>
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle="Programação"
            onClosePanel={handleClosePanel}
          />
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-[4px] shadow-lg text-sm font-medium transition-all ${
          feedback.type === 'success'
            ? 'bg-success text-white'
            : 'bg-danger text-white'
        }`}>
          <Icon name={feedback.type === 'success' ? 'check_circle' : 'error'} className="text-base" />
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-2 hover:opacity-80">
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Programação"
        message="Excluir esta programação? Todas as OSs associadas serão desvinculadas. Esta ação não pode ser desfeita."
        confirmText="Sim, Excluir"
        cancelText="Não, Cancelar"
        variant="danger"
        loading={deleteLoading}
      />

      {/* Confirm schedule dialog (with resource warnings) */}
      <ScheduleConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => { setConfirmDialogOpen(false) }}
        onConfirm={handleConfirmForce}
        title="Confirmar Programação"
        message={confirmDialogMessage || 'Deseja confirmar esta programação? As OSs serão liberadas para execução.'}
        warnings={confirmDialogWarnings}
        scheduledCount={confirmDialogCount}
        loading={confirmLoading}
        variant="confirm"
      />

      {/* Reprogram confirmation dialog */}
      <ScheduleConfirmDialog
        isOpen={reprogramDialogOpen}
        onClose={() => setReprogramDialogOpen(false)}
        onConfirm={handleReprogramConfirm}
        title="Reprogramar"
        message="As OSs liberadas serão revertidas para pendente e a programação voltará ao modo de edição."
        loading={reprogramLoading}
        variant="reprogram"
      />
    </PageContainer>
  )
}
