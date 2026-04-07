'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'

import { formatDate } from '@/lib/utils'
import { ExecutionModal } from '@/components/execution/ExecutionModal'

interface WorkOrder {
  id: string
  internalId?: string
  title: string
  description?: string
  priority: string
  status: string
  dueDate?: string
  beforePhotoUrl?: string
  afterPhotoUrl?: string
  executionNotes?: string
  createdAt: string
}

interface Request {
  id: string
  title: string
  description?: string
  priority: string
  status: string
  convertToWorkOrder: boolean
  executionStartedAt?: string
  executionCompletedAt?: string
  beforePhotoUrl?: string
  afterPhotoUrl?: string
  executionNotes?: string
  createdAt: string
}

type TabType = 'workorders' | 'requests'

export default function MyTasksPage() {
  const [activeTab, setActiveTab] = useState<TabType>('workorders')
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [selectedType, setSelectedType] = useState<'workorder' | 'request' | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'workorders') {
        const res = await fetch('/api/work-orders/my-assignments')
        const data = await res.json()
        setWorkOrders(data.data || [])
      } else {
        const res = await fetch('/api/requests/my-assignments')
        const data = await res.json()
        setRequests(data.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (item: any, type: 'workorder' | 'request') => {
    setSelectedItem(item)
    setSelectedType(type)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedItem(null)
    setSelectedType(null)
  }

  const handleExecutionSuccess = () => {
    handleCloseModal()
    loadData()
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      CRITICAL: 'bg-on-surface-variant',
      HIGH: 'bg-on-surface-variant',
      MEDIUM: 'bg-on-surface-variant',
      LOW: 'bg-on-surface-variant',
      NONE: 'bg-on-surface-variant'
    }
    return <Badge className={colors[priority as keyof typeof colors] || colors.NONE}>{priority}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      OPEN: 'bg-on-surface-variant',
      IN_PROGRESS: 'bg-on-surface-variant',
      ON_HOLD: 'bg-on-surface-variant',
      COMPLETE: 'bg-on-surface-variant',
      APPROVED: 'bg-on-surface-variant'
    }
    return <Badge className={colors[status as keyof typeof colors] || 'bg-on-surface-variant'}>{status}</Badge>
  }

  const getExecutionStatus = (item: Request) => {
    if (item.executionCompletedAt) {
      return <Badge className="bg-on-surface-variant">Concluída</Badge>
    }
    if (item.executionStartedAt) {
      return <Badge className="bg-on-surface-variant">Em Execução</Badge>
    }
    return <Badge className="bg-on-surface-variant">Não Iniciada</Badge>
  }

  const renderWorkOrdersTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-surface">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Prioridade</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fotos</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Criada em</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {workOrders.map((wo) => (
            <tr key={wo.id} className="hover:bg-surface">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                {wo.internalId || wo.id.slice(0, 8)}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-foreground">{wo.title}</div>
                {wo.description && (
                  <div className="text-sm text-muted-foreground truncate max-w-xs">{wo.description}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getPriorityBadge(wo.priority)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(wo.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex gap-1">
                  {wo.beforePhotoUrl && (
                    <span title="Foto antes">
                      <Icon name="image" className="text-base text-muted-foreground" />
                    </span>
                  )}
                  {wo.afterPhotoUrl && (
                    <span title="Foto depois">
                      <Icon name="image" className="text-base text-muted-foreground" />
                    </span>
                  )}
                  {!wo.beforePhotoUrl && !wo.afterPhotoUrl && (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {formatDate(wo.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  size="sm"
                  onClick={() => handleOpenModal(wo, 'workorder')}
                  className="bg-primary hover:bg-primary-graphite"
                >
                  {wo.status === 'COMPLETE' ? (
                    <>
                      <Icon name="visibility" className="text-base mr-1" />
                      Ver
                    </>
                  ) : (
                    <>
                      <Icon name="play_arrow" className="text-base mr-1" />
                      Executar
                    </>
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {workOrders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="construction" className="text-5xl mx-auto mb-4 text-muted-foreground" />
          <p>Nenhuma ordem de serviço atribuída</p>
        </div>
      )}
    </div>
  )

  const renderRequestsTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-surface">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Prioridade</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status Execução</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fotos</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Criada em</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-surface">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-foreground">{req.title}</div>
                {req.description && (
                  <div className="text-sm text-muted-foreground truncate max-w-xs">{req.description}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getPriorityBadge(req.priority)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getExecutionStatus(req)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex gap-1">
                  {req.beforePhotoUrl && (
                    <span title="Foto antes">
                      <Icon name="image" className="text-base text-muted-foreground" />
                    </span>
                  )}
                  {req.afterPhotoUrl && (
                    <span title="Foto depois">
                      <Icon name="image" className="text-base text-muted-foreground" />
                    </span>
                  )}
                  {!req.beforePhotoUrl && !req.afterPhotoUrl && (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {formatDate(req.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  size="sm"
                  onClick={() => handleOpenModal(req, 'request')}
                  className="bg-primary hover:bg-primary-graphite"
                >
                  {req.executionCompletedAt ? (
                    <>
                      <Icon name="visibility" className="text-base mr-1" />
                      Ver
                    </>
                  ) : (
                    <>
                      <Icon name="play_arrow" className="text-base mr-1" />
                      Executar
                    </>
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="description" className="text-5xl mx-auto mb-4 text-muted-foreground" />
          <p>Nenhuma solicitação atribuída</p>
        </div>
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Minhas Tarefas</h1>
          <p className="text-muted-foreground mt-1">Ordens de serviço e solicitações atribuídas a você</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('workorders')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'workorders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }
              `}
            >
              <Icon name="construction" className="text-xl inline mr-2" />
              Ordens de Serviço
              {activeTab === 'workorders' && ` (${workOrders.length})`}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'requests'
                  ? 'border-on-surface-variant text-success'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }
              `}
            >
              <Icon name="description" className="text-xl inline mr-2" />
              Solicitações
              {activeTab === 'requests' && ` (${requests.length})`}
            </button>
          </nav>
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-surface-variant mx-auto"></div>
                <p className="text-muted-foreground mt-4">Carregando...</p>
              </div>
            ) : (
              <>
                {activeTab === 'workorders' && renderWorkOrdersTable()}
                {activeTab === 'requests' && renderRequestsTable()}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Execução */}
      {showModal && selectedItem && selectedType && (
        <ExecutionModal
          item={selectedItem}
          type={selectedType}
          onClose={handleCloseModal}
          onSuccess={handleExecutionSuccess}
        />
      )}
    </AppLayout>
  )
}
