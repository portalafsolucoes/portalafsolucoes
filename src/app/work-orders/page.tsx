'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import { usePermissions } from '@/hooks/usePermissions'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { WorkOrderDetailModal } from '@/components/work-orders/WorkOrderDetailModal'
import { WorkOrderEditModal } from '@/components/work-orders/WorkOrderEditModal'
import { WorkOrderExecuteModal } from '@/components/work-orders/WorkOrderExecuteModal'
import { FinalizeWorkOrderModal } from '@/components/work-orders/FinalizeWorkOrderModal'
import { WorkOrderFormModal } from '@/components/work-orders/WorkOrderFormModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath } from '@/lib/user-roles'

interface WorkOrder {
  id: string
  customId?: string
  externalId?: string
  internalId?: string
  systemStatus: string
  title: string
  description?: string
  priority: string
  status: string
  dueDate?: string
  asset?: { name: string }
  location?: { name: string }
  createdAt: string
}

export default function WorkOrdersPage() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [systemStatusFilter, setSystemStatusFilter] = useState('')
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
  const isMobile = useIsMobile()
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [workOrderToFinalize, setWorkOrderToFinalize] = useState<WorkOrder | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    if (!hasPermission(currentUser, 'work-orders', 'view')) {
      router.replace(getDefaultCmmsPath(currentUser))
    }
  }, [currentUser, router])

  useEffect(() => {
    if (!currentUser || !hasPermission(currentUser, 'work-orders', 'view')) {
      return
    }
    loadWorkOrders()
  }, [currentUser, statusFilter, systemStatusFilter])

  const loadWorkOrders = async () => {
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
  }

  const handleView = (workOrderId: string) => {
    setSelectedWorkOrderId(workOrderId)
  }

  const handleEdit = (workOrder: WorkOrder) => {
    setEditingWorkOrderId(workOrder.id)
    setShowEditModal(true)
  }

  const handleDelete = async () => {
    if (!workOrderToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/work-orders/${workOrderToDelete.id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
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

  const filteredWorkOrders = workOrders.filter(wo =>
    wo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const showSidePanel = !isMobile && (!!selectedWorkOrderId || showEditModal || showExecuteModal || showFinalizeModal || showCreateModal)

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
                <div className="relative w-64">
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
                  className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Status</option>
                  <option value="PENDING">Pendente</option>
                  <option value="RELEASED">Liberada</option>
                  <option value="IN_PROGRESS">Em Progresso</option>
                  <option value="ON_HOLD">Em Espera</option>
                  <option value="COMPLETE">Completa</option>
                </select>

                <select
                  value={systemStatusFilter}
                  onChange={(e) => setSystemStatusFilter(e.target.value)}
                  className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sistema</option>
                  <option value="IN_SYSTEM">Sistema</option>
                  <option value="OUT_OF_SYSTEM">Fora</option>
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
                    className="whitespace-nowrap"
                  >
                    <Icon name="add" className="mr-2 text-base" />
                    Nova Ordem
                  </Button>
                )}
              </div>
            }
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
            {/* Left: table/grid */}
            <div className={`${showSidePanel ? 'w-1/2 min-w-0' : 'w-full'} transition-all overflow-hidden flex flex-col`}>
              {loading ? (
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
              ) : viewMode === 'grid' || isMobile ? (
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
                            {wo.systemStatus === 'IN_SYSTEM' ? (
                              <span className="px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full bg-success-light text-success-light-foreground">
                                Sistema
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full bg-surface-high text-foreground">
                                Fora
                              </span>
                            )}
                            <span className={`px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full ${getStatusColor(wo.status)}`}>
                              {wo.status}
                            </span>
                            <span className={`px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full ${getPriorityColor(wo.priority)}`}>
                              {wo.priority}
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Sistema</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridade</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ativo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Criado</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-gray-200">
                        {filteredWorkOrders.map((wo) => {
                          const displayId = wo.externalId || wo.internalId || wo.customId || wo.id.slice(0, 8)
                          return (
                            <tr key={wo.id} onClick={() => handleView(wo.id)} className="hover:bg-secondary cursor-pointer transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-semibold text-foreground">{displayId}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {wo.systemStatus === 'IN_SYSTEM' ? (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success-light text-success-light-foreground">
                                    No Sistema
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-surface-high text-foreground">
                                    Fora
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-foreground max-w-xs truncate">{wo.title}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(wo.status)}`}>
                                  {wo.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(wo.priority)}`}>
                                  {wo.priority}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                {wo.asset?.name || '-'}
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
              )}
            </div>

            {/* Right: split panel (desktop only) */}
            {!isMobile && (selectedWorkOrderId || showEditModal || showExecuteModal || showFinalizeModal || showCreateModal) && (
              <div className="w-1/2 min-w-0">
                {showCreateModal ? (
                  <WorkOrderFormModal
                    isOpen={true}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                      loadWorkOrders()
                      setShowCreateModal(false)
                    }}
                    inPage
                  />
                ) : showFinalizeModal && workOrderToFinalize ? (
                  <FinalizeWorkOrderModal
                    isOpen={true}
                    onClose={() => {
                      setShowFinalizeModal(false)
                      setWorkOrderToFinalize(null)
                    }}
                    workOrder={workOrderToFinalize}
                    onFinalized={() => {
                      loadWorkOrders()
                      setShowFinalizeModal(false)
                      setWorkOrderToFinalize(null)
                    }}
                    inPage
                  />
                ) : showExecuteModal && workOrderToExecute ? (
                  <WorkOrderExecuteModal
                    isOpen={true}
                    onClose={() => {
                      setShowExecuteModal(false)
                      setWorkOrderToExecute(null)
                    }}
                    workOrder={workOrderToExecute}
                    onSuccess={() => {
                      loadWorkOrders()
                      setShowExecuteModal(false)
                      setWorkOrderToExecute(null)
                    }}
                    inPage
                  />
                ) : showEditModal && editingWorkOrderId ? (
                  <WorkOrderEditModal
                    isOpen={true}
                    onClose={() => {
                      setShowEditModal(false)
                      setEditingWorkOrderId('')
                    }}
                    workOrderId={editingWorkOrderId}
                    onSuccess={() => {
                      loadWorkOrders()
                      setShowEditModal(false)
                      setEditingWorkOrderId('')
                    }}
                    inPage
                  />
                ) : selectedWorkOrderId ? (
                  <WorkOrderDetailModal
                    isOpen={true}
                    onClose={() => setSelectedWorkOrderId('')}
                    workOrderId={selectedWorkOrderId}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    currentUserId={currentUser?.id}
                    inPage
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Mobile: overlay modals */}
        {isMobile && selectedWorkOrderId && (
          <WorkOrderDetailModal
            isOpen={!!selectedWorkOrderId}
            onClose={() => setSelectedWorkOrderId('')}
            workOrderId={selectedWorkOrderId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            currentUserId={currentUser?.id}
          />
        )}

        {isMobile && showEditModal && editingWorkOrderId && (
          <WorkOrderEditModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false)
              setEditingWorkOrderId('')
            }}
            workOrderId={editingWorkOrderId}
            onSuccess={() => {
              loadWorkOrders()
              setShowEditModal(false)
              setEditingWorkOrderId('')
            }}
          />
        )}

        {isMobile && showExecuteModal && workOrderToExecute && (
          <WorkOrderExecuteModal
            isOpen={showExecuteModal}
            onClose={() => {
              setShowExecuteModal(false)
              setWorkOrderToExecute(null)
            }}
            workOrder={workOrderToExecute}
            onSuccess={() => {
              loadWorkOrders()
              setShowExecuteModal(false)
              setWorkOrderToExecute(null)
            }}
          />
        )}

        {isMobile && showFinalizeModal && workOrderToFinalize && (
          <FinalizeWorkOrderModal
            isOpen={showFinalizeModal}
            onClose={() => {
              setShowFinalizeModal(false)
              setWorkOrderToFinalize(null)
            }}
            workOrder={workOrderToFinalize}
            onFinalized={() => {
              loadWorkOrders()
              setShowFinalizeModal(false)
              setWorkOrderToFinalize(null)
            }}
          />
        )}

        {isMobile && showCreateModal && (
          <WorkOrderFormModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              loadWorkOrders()
              setShowCreateModal(false)
            }}
          />
        )}

        {/* Dialog de Confirmação de Exclusão */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false)
            setWorkOrderToDelete(null)
          }}
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
