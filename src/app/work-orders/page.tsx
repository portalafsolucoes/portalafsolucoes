'use client'

import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'

import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import { usePermissions } from '@/hooks/usePermissions'
import { WorkOrderDetailModal } from '@/components/work-orders/WorkOrderDetailModal'
import { WorkOrderEditModal } from '@/components/work-orders/WorkOrderEditModal'
import { WorkOrderExecuteModal } from '@/components/work-orders/WorkOrderExecuteModal'
import { FinalizeWorkOrderModal } from '@/components/work-orders/FinalizeWorkOrderModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import Link from 'next/link'

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
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [systemStatusFilter, setSystemStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<string>('')
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [workOrderToExecute, setWorkOrderToExecute] = useState<any>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrder | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { user: currentUser } = useAuth()
  const { canCreate: canCreateWO, canEdit: canEditWO, canDelete: canDeleteWO } = usePermissions()
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [workOrderToFinalize, setWorkOrderToFinalize] = useState<any>(null)

  useEffect(() => {
    loadWorkOrders()
  }, [statusFilter, systemStatusFilter])

  const isTechnician = () => {
    return ['MECANICO', 'ELETRICISTA', 'OPERADOR', 'CONSTRUTOR_CIVIL'].includes(currentUser?.role ?? '')
  }

  const isAssignedExecutor = (workOrder: any) => {
    if (!currentUser?.id) return false
    return workOrder.assignedToId === currentUser.id
  }

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
    setShowDetailModal(true)
  }

  const handleEdit = (workOrder: any) => {
    setEditingWorkOrderId(workOrder.id)
    setShowEditModal(true)
  }

  const handleExecute = (workOrder: WorkOrder) => {
    setWorkOrderToExecute(workOrder)
    setShowExecuteModal(true)
  }

  const openDeleteDialog = (workOrder: WorkOrder) => {
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

  return (
    <PageContainer>
        {/* Se modal está aberto, mostrar apenas ele */}
        {showDetailModal && selectedWorkOrderId ? (
          <div
            className="fixed top-16 left-0 right-0 bottom-0 backdrop-blur-md bg-background/40 z-40 overflow-y-auto lg:left-64"
            onClick={() => setShowDetailModal(false)}
          >
            <div className="w-full max-w-6xl mx-auto p-4" onClick={(e) => e.stopPropagation()}>
              <WorkOrderDetailModal
                isOpen={true}
                onClose={() => setShowDetailModal(false)}
                workOrderId={selectedWorkOrderId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                currentUserId={currentUser?.id}
                inPage={true}
              />
            </div>
          </div>
        ) : (
          <>
        <PageHeader
          icon="engineering"
          title="Ordens de Serviço (OS)"
          description="Gerencie todas as ordens de manutenção"
          actions={
            <div className="flex gap-2 md:gap-3 flex-wrap">
              <div className="hidden md:flex gap-1 border rounded-[4px] p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/10'
                  }`}
                  title="Visualização em Tabela"
                >
                  <Icon name="table" className="text-xl" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/10'
                  }`}
                  title="Visualização em Cartões"
                >
                  <Icon name="grid_view" className="text-xl" />
                </button>
              </div>
              <ExportButton data={filteredWorkOrders} entity="work-orders" />
              {canCreateWO('work-orders') && (
                <Link href="/work-orders/new" className="flex-1 md:flex-none">
                  <Button className="w-full md:w-auto">
                    <Icon name="add" className="mr-2 text-base" />
                    <span className="text-sm md:text-base">Nova Ordem</span>
                  </Button>
                </Link>
              )}
            </div>
          }
        />

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:gap-4">
          <div className="flex-1 relative">
            <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base md: md:text-xl text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar ordens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-sm md:text-base bg-card rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 md:gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 md:flex-none px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base bg-card rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
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
              className="flex-1 md:flex-none px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base bg-card rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="">Sistema</option>
              <option value="IN_SYSTEM">✅ Sistema</option>
              <option value="OUT_OF_SYSTEM">📝 Fora</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent"></div>
          </div>
        ) : filteredWorkOrders.length === 0 ? (
          <div className="bg-card rounded-[4px] ambient-shadow p-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma ordem de serviço encontrada.
            </p>
          </div>
        ) : viewMode === 'grid' || window.innerWidth < 768 ? (
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {filteredWorkOrders.map((wo) => {
              const displayId = wo.externalId || wo.internalId || wo.customId || wo.id.slice(0, 8)
              return (
                <div key={wo.id} className="bg-card rounded-[4px] md:rounded-[4px] ambient-shadow p-4 md:p-6 hover:shadow-md hover:border-border transition-all duration-200">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-4">
                    <div onClick={() => handleView(wo.id)} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 flex-wrap">
                        <h3 className="text-base md:text-lg font-bold text-foreground">{displayId}</h3>
                        {wo.systemStatus === 'IN_SYSTEM' ? (
                          <span className="px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full bg-success-light text-success-light-foreground">
                            ✅ Sistema
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full bg-surface-high text-foreground">
                            📝 Fora
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
                            <Icon name="inventory_2" className="text-sm md: md:text-base" />
                            <span className="truncate max-w-[120px] md:max-w-none">Ativo: {wo.asset.name}</span>
                          </span>
                        )}
                        {wo.location && (
                          <span className="flex items-center gap-1 md:gap-1.5">
                            <Icon name="location_on" className="text-sm md: md:text-base" />
                            <span className="truncate max-w-[100px] md:max-w-none">Local: {wo.location.name}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 md:gap-1.5">
                          <Icon name="calendar_today" className="text-sm md: md:text-base" />
                          <span className="whitespace-nowrap">{formatDate(wo.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 md:gap-2 flex-shrink-0 justify-end md:justify-start">
                      <button
                        onClick={() => handleView(wo.id)}
                        className="p-1.5 md:p-2 text-primary hover:bg-primary/5 rounded-[4px] transition-colors"
                        title="Visualizar"
                      >
                        <Icon name="visibility" className="text-base md: md:text-xl" />
                      </button>
                      {isAssignedExecutor(wo) && wo.status !== 'COMPLETE' && (
                        <button
                          onClick={() => handleExecute(wo)}
                          className="p-1.5 md:p-2 text-success hover:bg-success-light rounded-[4px] transition-colors"
                          title="Executar"
                        >
                          <Icon name="play_arrow" className="text-base md: md:text-xl" />
                        </button>
                      )}
                      {canEditWO('work-orders') && wo.status !== 'COMPLETE' && (
                        <button
                          onClick={() => { setWorkOrderToFinalize(wo); setShowFinalizeModal(true); }}
                          className="p-1.5 md:p-2 text-foreground hover:bg-muted rounded-[4px] transition-colors"
                          title="Finalizar OS"
                        >
                          <Icon name="check_circle" className="text-base md: md:text-xl" />
                        </button>
                      )}
                      {canEditWO('work-orders') && (
                        <button
                          onClick={() => handleEdit(wo)}
                          className="p-1.5 md:p-2 text-muted-foreground hover:bg-surface rounded-[4px] transition-colors"
                          title="Editar"
                        >
                          <Icon name="edit" className="text-base md: md:text-xl" />
                        </button>
                      )}
                      {canDeleteWO('work-orders') && (
                        <button
                          onClick={() => openDeleteDialog(wo)}
                          className="p-1.5 md:p-2 text-danger hover:bg-danger-light rounded-[4px] transition-colors"
                          title="Excluir"
                        >
                          <Icon name="delete" className="text-base md: md:text-xl" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="hidden md:block bg-card rounded-[4px] ambient-shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Sistema</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Título</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Prioridade</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Ativo</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Criado</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-foreground uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredWorkOrders.map((wo) => {
                    const displayId = wo.externalId || wo.internalId || wo.customId || wo.id.slice(0, 8)
                    return (
                      <tr key={wo.id} className="hover:bg-surface transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-foreground">{displayId}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {wo.systemStatus === 'IN_SYSTEM' ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success-light text-success-light-foreground">
                              ✅ No Sistema
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-surface-high text-foreground">
                              📝 Fora
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(wo.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleView(wo.id)}
                              className="p-1.5 text-primary hover:bg-primary/5 rounded transition-colors"
                              title="Visualizar"
                            >
                              <Icon name="visibility" className="text-base" />
                            </button>
                            {isAssignedExecutor(wo) && (
                              <button
                                onClick={() => handleExecute(wo)}
                                className="p-1.5 text-success hover:bg-success-light rounded transition-colors"
                                title={wo.status === 'COMPLETE' ? 'Editar Execução' : 'Executar'}
                              >
                                <Icon name="play_arrow" className="text-base" />
                              </button>
                            )}
                            {canEditWO('work-orders') && (
                              <button
                                onClick={() => handleEdit(wo)}
                                className="p-1.5 text-muted-foreground hover:bg-surface rounded transition-colors"
                                title="Editar"
                              >
                                <Icon name="edit" className="text-base" />
                              </button>
                            )}
                            {canDeleteWO('work-orders') && (
                              <button
                                onClick={() => openDeleteDialog(wo)}
                                className="p-1.5 text-danger hover:bg-danger-light rounded transition-colors"
                                title="Excluir"
                              >
                                <Icon name="delete" className="text-base" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
        )}

        {/* Modais sempre renderizados mas podem estar ocultos */}
        {false && showDetailModal && selectedWorkOrderId && (
          <WorkOrderDetailModal
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            workOrderId={selectedWorkOrderId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            currentUserId={currentUser?.id}
          />
        )}

        {/* Modal de Edição */}
        {showEditModal && editingWorkOrderId && (
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

        {/* Modal de Execução */}
        {showExecuteModal && workOrderToExecute && (
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

        {/* Modal de Finalização */}
        {showFinalizeModal && workOrderToFinalize && (
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
