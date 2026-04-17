'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

import dynamic from 'next/dynamic'
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import { usePermissions } from '@/hooks/usePermissions'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath } from '@/lib/user-roles'

// Lazy load: modais so carregam quando necessario
const WorkOrderDetailModal = dynamic(() => import('@/components/work-orders/WorkOrderDetailModal').then(m => ({ default: m.WorkOrderDetailModal })), { ssr: false })
const WorkOrderEditModal = dynamic(() => import('@/components/work-orders/WorkOrderEditModal').then(m => ({ default: m.WorkOrderEditModal })), { ssr: false })
const WorkOrderExecuteModal = dynamic(() => import('@/components/work-orders/WorkOrderExecuteModal').then(m => ({ default: m.WorkOrderExecuteModal })), { ssr: false })
const FinalizeWorkOrderModal = dynamic(() => import('@/components/work-orders/FinalizeWorkOrderModal').then(m => ({ default: m.FinalizeWorkOrderModal })), { ssr: false })
const WorkOrderFormModal = dynamic(() => import('@/components/work-orders/WorkOrderFormModal').then(m => ({ default: m.WorkOrderFormModal })), { ssr: false })
const WorkOrderPrintView = dynamic(() => import('@/components/work-orders/WorkOrderPrintView').then(m => ({ default: m.WorkOrderPrintView })), { ssr: false })

interface WorkOrder {
  id: string
  customId?: string | null
  externalId?: string | null
  internalId?: string | null
  systemStatus: string
  title: string
  description?: string | null
  priority: string
  status: string
  dueDate?: string | null
  rescheduledDate?: string | null
  rescheduleCount?: number | null
  dueMeterReading?: number | null
  asset?: { name: string; tag?: string; protheusCode?: string }
  location?: { name: string }
  maintenancePlanExec?: { planNumber: number; trackingType?: string }
  assetMaintenancePlan?: { trackingType?: string; maintenanceTime?: number; timeUnit?: string }
  createdAt: string
}

type SortField = 'displayId' | 'planNumber' | 'title' | 'status' | 'priority' | 'protheusCode' | 'assetName' | 'dueDate' | 'createdAt'
type SortDirection = 'asc' | 'desc'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  RELEASED: 'Programada',
  IN_PROGRESS: 'Em Progresso',
  ON_HOLD: 'Em Espera',
  COMPLETE: 'Completa',
  REPROGRAMMED: 'Reprogramada',
}

const PRIORITY_LABELS: Record<string, string> = {
  NONE: 'Nenhuma',
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

const translateStatus = (value: string) => STATUS_LABELS[value] ?? value
const translatePriority = (value: string) => PRIORITY_LABELS[value] ?? value

export default function WorkOrdersPage() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [systemStatusFilter, _setSystemStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<string>('')
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [workOrderToExecute, setWorkOrderToExecute] = useState<WorkOrder | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrder | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { user: currentUser } = useAuth()
  const { canCreate: canCreateWO } = usePermissions()
  const { isPhone } = useResponsiveLayout()
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [workOrderToFinalize, setWorkOrderToFinalize] = useState<WorkOrder | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createInitialValues, setCreateInitialValues] = useState<import('@/components/work-orders/WorkOrderFormModal').WorkOrderFormInitialValues | undefined>(undefined)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [workOrderToPrint, setWorkOrderToPrint] = useState<WorkOrder | null>(null)
  const [sortField, setSortField] = useState<SortField>('displayId')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    if (!currentUser) return
    if (!hasPermission(currentUser, 'work-orders', 'view')) {
      router.replace(getDefaultCmmsPath(currentUser))
    }
  }, [currentUser, router])

  const loadWorkOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (systemStatusFilter) params.append('systemStatus', systemStatusFilter)

      const url = params.toString()
        ? `/api/work-orders?summary=true&${params.toString()}`
        : '/api/work-orders?summary=true'

      const res = await fetch(url)
      const data = await res.json()
      setWorkOrders(data.data || [])
    } catch (error) {
      console.error('Error loading work orders:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, systemStatusFilter])

  useEffect(() => {
    if (!currentUser || !hasPermission(currentUser, 'work-orders', 'view')) {
      return
    }

    void loadWorkOrders()
  }, [currentUser, loadWorkOrders])

  const handleView = (workOrderId: string) => {
    setSelectedWorkOrderId(workOrderId)
  }

  const handleEdit = (workOrder: { id: string }) => {
    setEditingWorkOrderId(workOrder.id)
    setShowEditModal(true)
  }

  const handlePrint = (workOrder: { id: string }) => {
    setWorkOrderToPrint(workOrder as WorkOrder)
    setShowPrintModal(true)
  }

  const handleFinalize = (workOrder: { id: string }) => {
    setSelectedWorkOrderId('')
    setWorkOrderToFinalize(workOrder as unknown as WorkOrder)
    setShowFinalizeModal(true)
  }

  const openDeleteDialog = (workOrderId: string) => {
    const workOrder = workOrders.find((item) => item.id === workOrderId)
    if (!workOrder) {
      return
    }

    setWorkOrderToDelete(workOrder)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!workOrderToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/work-orders/${workOrderToDelete.id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        if (selectedWorkOrderId === workOrderToDelete.id) {
          setSelectedWorkOrderId('')
        }
        setShowDeleteDialog(false)
        setWorkOrderToDelete(null)
        loadWorkOrders()
      } else {
        alert('Erro ao excluir ordem de serviço')
      }
    } catch (error) {
      console.error('Error deleting work order:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setDeleting(false)
    }
  }

  const closeSidePanel = () => {
    setSelectedWorkOrderId('')
    setShowEditModal(false)
    setEditingWorkOrderId('')
    setShowExecuteModal(false)
    setWorkOrderToExecute(null)
    setShowFinalizeModal(false)
    setWorkOrderToFinalize(null)
    setShowCreateModal(false)
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

  const filteredWorkOrders = workOrders.filter(wo => {
    // Ocultar OSs Completas por padrão; só aparecem quando o usuário escolhe "Completa" no filtro de Status
    if (!statusFilter && wo.status === 'COMPLETE') return false
    return (
      wo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const sortedWorkOrders = [...filteredWorkOrders].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'displayId': {
        const idA = a.externalId || a.internalId || a.customId || a.id.slice(0, 8)
        const idB = b.externalId || b.internalId || b.customId || b.id.slice(0, 8)
        return idA.localeCompare(idB) * modifier
      }
      case 'planNumber':
        return ((a.maintenancePlanExec?.planNumber || 0) - (b.maintenancePlanExec?.planNumber || 0)) * modifier
      case 'title':
        return a.title.localeCompare(b.title) * modifier
      case 'status':
        return a.status.localeCompare(b.status) * modifier
      case 'priority':
        return a.priority.localeCompare(b.priority) * modifier
      case 'protheusCode':
        return (a.asset?.protheusCode || a.asset?.tag || '').localeCompare(b.asset?.protheusCode || b.asset?.tag || '') * modifier
      case 'assetName':
        return (a.asset?.name || '').localeCompare(b.asset?.name || '') * modifier
      case 'dueDate': {
        const dateA = a.dueDate || ''
        const dateB = b.dueDate || ''
        return dateA.localeCompare(dateB) * modifier
      }
      case 'createdAt':
        return a.createdAt.localeCompare(b.createdAt) * modifier
      default:
        return 0
    }
  })

  const showSidePanel = !!(selectedWorkOrderId || showEditModal || showExecuteModal || showFinalizeModal || showCreateModal)

  // Painel ativo (inPage — usado no desktop e dentro do sheet no compact)
  const activePanel = showCreateModal ? (
    <WorkOrderFormModal
      isOpen
      onClose={() => { setShowCreateModal(false); setCreateInitialValues(undefined) }}
      onSuccess={() => { loadWorkOrders(); setShowCreateModal(false); setCreateInitialValues(undefined) }}
      initialValues={createInitialValues}
      inPage
    />
  ) : showFinalizeModal && workOrderToFinalize ? (
    <FinalizeWorkOrderModal
      isOpen
      onClose={() => { setShowFinalizeModal(false); setWorkOrderToFinalize(null) }}
      workOrder={workOrderToFinalize}
      onFinalized={(result) => {
        loadWorkOrders()
        setShowFinalizeModal(false)
        setWorkOrderToFinalize(null)
        if (result?.generateCorrective && result.sourceWorkOrder) {
          const src = result.sourceWorkOrder
          setCreateInitialValues({
            description: `Originada da OS nº ${src.displayId}`,
            type: 'CORRECTIVE',
            assetId: src.assetId || undefined,
            locationId: src.locationId || undefined,
          })
          setShowCreateModal(true)
        }
      }}
      inPage
    />
  ) : showExecuteModal && workOrderToExecute ? (
    <WorkOrderExecuteModal
      isOpen
      onClose={() => { setShowExecuteModal(false); setWorkOrderToExecute(null) }}
      workOrder={workOrderToExecute}
      onSuccess={() => { loadWorkOrders(); setShowExecuteModal(false); setWorkOrderToExecute(null) }}
      inPage
    />
  ) : showEditModal && editingWorkOrderId ? (
    <WorkOrderEditModal
      isOpen
      onClose={() => { setShowEditModal(false); setEditingWorkOrderId('') }}
      workOrderId={editingWorkOrderId}
      onSuccess={() => { loadWorkOrders(); setShowEditModal(false); setEditingWorkOrderId('') }}
      inPage
    />
  ) : selectedWorkOrderId ? (
    <WorkOrderDetailModal
      isOpen
      onClose={() => setSelectedWorkOrderId('')}
      workOrderId={selectedWorkOrderId}
      onEdit={handleEdit}
      onDelete={openDeleteDialog}
      onPrint={handlePrint}
      onFinalize={handleFinalize}
      currentUserId={currentUser?.id}
      inPage
    />
  ) : null

  if (!currentUser || !hasPermission(currentUser, 'work-orders', 'view')) {
    return null
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Ordens de Serviço (OS)"
          description="Gerencie todas as ordens de manutenção"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Busca: full-width no phone, 48/64px no tablet/desktop */}
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar ordens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="hidden md:flex items-center bg-muted rounded-[4px] p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-background text-foreground ambient-shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visualização em Tabela"
                >
                  <Icon name="table" className="text-base" />
                  <span className="hidden md:inline">Tabela</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-background text-foreground ambient-shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visualização em Cartões"
                >
                  <Icon name="grid_view" className="text-base" />
                  <span className="hidden md:inline">Grade</span>
                </button>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
              >
                <option value="">Status</option>
                <option value="PENDING">Pendente</option>
                <option value="RELEASED">Programada</option>
                <option value="IN_PROGRESS">Em Progresso</option>
                <option value="ON_HOLD">Em Espera</option>
                <option value="COMPLETE">Completa</option>
              </select>

              <ExportButton data={filteredWorkOrders} entity="work-orders" />
              {canCreateWO('work-orders') && (
                <Button
                  onClick={() => {
                    setSelectedWorkOrderId('')
                    setShowEditModal(false)
                    setShowExecuteModal(false)
                    setShowFinalizeModal(false)
                    setShowCreateModal(true)
                  }}
                  className="whitespace-nowrap bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md"
                >
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-2">Nova Ordem</span>
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            showPanel={showSidePanel}
            panelTitle="Ordem de Serviço"
            onClosePanel={closeSidePanel}
            panel={activePanel}
            list={
              loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                    <p className="mt-2 text-muted-foreground">Carregando...</p>
                  </div>
                </div>
              ) : filteredWorkOrders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-12 text-center">
                  <div>
                    <Icon name="assignment" className="text-6xl text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma ordem de serviço encontrada</h3>
                    <p className="text-muted-foreground">Crie uma nova ordem de serviço para começar.</p>
                  </div>
                </div>
              ) : viewMode === 'grid' || isPhone ? (
                <div className="overflow-auto flex-1 p-4 md:p-6">
                  <div className="grid grid-cols-1 gap-3 md:gap-4">
                    {filteredWorkOrders.map((wo) => {
                      const displayId = wo.externalId || wo.internalId || wo.customId || wo.id.slice(0, 8)
                      return (
                        <div
                          key={wo.id}
                          onClick={() => handleView(wo.id)}
                          className="bg-card rounded-[4px] ambient-shadow p-4 md:p-6 hover:shadow-md hover:border-border transition-all duration-200 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 flex-wrap">
                            <h3 className="text-base md:text-lg font-bold text-foreground">{displayId}</h3>
                            <span className={`px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full ${getStatusColor(wo.status)}`}>
                              {translateStatus(wo.status)}
                            </span>
                            <span className={`px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full ${getPriorityColor(wo.priority)}`}>
                              {translatePriority(wo.priority)}
                            </span>
                          </div>
                          <p className="text-foreground font-semibold mb-2 text-sm md:text-base">{wo.title}</p>
                          {wo.description && (
                            <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-2">{wo.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                            {wo.asset && (
                              <span className="flex items-center gap-1 md:gap-1.5">
                                <Icon name="inventory_2" className="text-sm md:text-base" />
                                <span className="truncate max-w-[120px] md:max-w-none">Ativo: {wo.asset.name}</span>
                              </span>
                            )}
                            {wo.location && (
                              <span className="flex items-center gap-1 md:gap-1.5">
                                <Icon name="location_on" className="text-sm md:text-base" />
                                <span className="truncate max-w-[100px] md:max-w-none">Local: {wo.location.name}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 md:gap-1.5">
                              <Icon name="calendar_today" className="text-sm md:text-base" />
                              <span className="whitespace-nowrap">{formatDate(wo.createdAt)}</span>
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col bg-card overflow-hidden">
                  <div className="flex-1 overflow-auto min-h-0">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="sticky top-0 bg-secondary z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <button type="button" onClick={() => handleSort('displayId')} className="flex items-center gap-1">
                              <span>ID</span>
                              {renderSortIcon('displayId')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <button type="button" onClick={() => handleSort('planNumber')} className="flex items-center gap-1">
                              <span>Plano</span>
                              {renderSortIcon('planNumber')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <button type="button" onClick={() => handleSort('title')} className="flex items-center gap-1">
                              <span>Título</span>
                              {renderSortIcon('title')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <button type="button" onClick={() => handleSort('status')} className="flex items-center gap-1">
                              <span>Status</span>
                              {renderSortIcon('status')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <button type="button" onClick={() => handleSort('priority')} className="flex items-center gap-1">
                              <span>Prioridade</span>
                              {renderSortIcon('priority')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <button type="button" onClick={() => handleSort('protheusCode')} className="flex items-center gap-1">
                              <span>Cód. Bem</span>
                              {renderSortIcon('protheusCode')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <button type="button" onClick={() => handleSort('assetName')} className="flex items-center gap-1">
                              <span>Ativo</span>
                              {renderSortIcon('assetName')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <button type="button" onClick={() => handleSort('dueDate')} className="flex items-center gap-1">
                              <span>Vencimento</span>
                              {renderSortIcon('dueDate')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span>Atraso Original</span>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <button type="button" onClick={() => handleSort('createdAt')} className="flex items-center gap-1">
                              <span>Criado</span>
                              {renderSortIcon('createdAt')}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-gray-100">
                        {sortedWorkOrders.map((wo) => {
                          const displayId = wo.externalId || wo.internalId || wo.customId || wo.id.slice(0, 8)
                          return (
                            <tr key={wo.id} onClick={() => handleView(wo.id)} className="odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-semibold text-foreground">{displayId}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                {wo.maintenancePlanExec ? `#${wo.maintenancePlanExec.planNumber}` : '-'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-foreground max-w-xs truncate">{wo.title}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(wo.status)}`}>
                                    {translateStatus(wo.status)}
                                  </span>
                                  {(wo.rescheduleCount ?? 0) > 0 && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200"
                                      title={`Reprogramada ${wo.rescheduleCount}x`}
                                    >
                                      <Icon name="event_repeat" className="text-[12px]" />
                                      {wo.rescheduleCount}x
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(wo.priority)}`}>
                                  {translatePriority(wo.priority)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                                {wo.asset?.protheusCode || wo.asset?.tag || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                {wo.asset?.name || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                {wo.dueMeterReading
                                  ? `${wo.dueMeterReading.toLocaleString('pt-BR')} h`
                                  : wo.rescheduledDate
                                    ? formatDate(wo.rescheduledDate)
                                    : wo.dueDate
                                      ? formatDate(wo.dueDate)
                                      : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {wo.rescheduledDate && wo.dueDate ? (
                                  <span className="text-amber-700 font-medium" title="Data de vencimento original (antes da primeira reprogramacao)">
                                    {formatDate(wo.dueDate)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                {formatDate(wo.createdAt)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          />
        </div>
      </div>

      {/* Modal de Impressão A4 */}
      {showPrintModal && workOrderToPrint && (
        <WorkOrderPrintView
          workOrderId={workOrderToPrint.id}
          onClose={() => { setShowPrintModal(false); setWorkOrderToPrint(null) }}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => { setShowDeleteDialog(false); setWorkOrderToDelete(null) }}
        onConfirm={handleDelete}
        title="Excluir Ordem de Serviço"
        message={`Tem certeza que deseja excluir a ordem de serviço "${workOrderToDelete?.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Não, Cancelar"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  )
}
