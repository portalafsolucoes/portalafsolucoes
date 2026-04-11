'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/lib/utils'

const ExecutionModal = dynamic(
  () => import('@/components/execution/ExecutionModal').then(m => ({ default: m.ExecutionModal })),
  { ssr: false }
)

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

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
  NONE: 'Sem prioridade',
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-danger text-white',
  HIGH: 'bg-warning text-foreground',
  MEDIUM: 'bg-primary/80 text-white',
  LOW: 'bg-secondary text-foreground',
  NONE: 'bg-muted text-muted-foreground',
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em andamento',
  ON_HOLD: 'Em espera',
  COMPLETE: 'Concluída',
  APPROVED: 'Aprovada',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-secondary text-foreground',
  IN_PROGRESS: 'bg-primary/80 text-white',
  ON_HOLD: 'bg-warning text-foreground',
  COMPLETE: 'bg-success text-white',
  APPROVED: 'bg-success text-white',
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge className={PRIORITY_COLORS[priority] || PRIORITY_COLORS.NONE}>
      {PRIORITY_LABELS[priority] || priority}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_COLORS[status] || 'bg-secondary text-foreground'}>
      {STATUS_LABELS[status] || status}
    </Badge>
  )
}

function ExecutionStatusBadge({ item }: { item: Request }) {
  if (item.executionCompletedAt) {
    return <Badge className="bg-success text-white">Concluída</Badge>
  }
  if (item.executionStartedAt) {
    return <Badge className="bg-primary/80 text-white">Em Execução</Badge>
  }
  return <Badge className="bg-secondary text-foreground">Não Iniciada</Badge>
}

// Simple read-only detail panel for a task
function TaskDetailPanel({
  item,
  type,
  onClose,
  onExecute,
}: {
  item: WorkOrder | Request
  type: 'workorder' | 'request'
  onClose: () => void
  onExecute: () => void
}) {
  const wo = type === 'workorder' ? (item as WorkOrder) : null
  const req = type === 'request' ? (item as Request) : null

  const isCompleted = wo
    ? wo.status === 'COMPLETE'
    : !!(req?.executionCompletedAt)

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground pr-2">{item.title}</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
        >
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action button */}
        <div className="p-4 border-b border-border">
          <button
            onClick={onExecute}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-900/90 transition-colors"
          >
            <Icon name={isCompleted ? 'visibility' : 'play_arrow'} className="text-base" />
            {isCompleted ? 'Ver execução' : 'Executar'}
          </button>
        </div>

        {/* Details */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Informações</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {wo && (
              <>
                {wo.internalId && (
                  <div>
                    <p className="text-xs text-muted-foreground">ID</p>
                    <p className="text-sm font-mono text-foreground">{wo.internalId}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                  <div className="mt-0.5"><PriorityBadge priority={wo.priority} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-0.5"><StatusBadge status={wo.status} /></div>
                </div>
                {wo.dueDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Prazo</p>
                    <p className="text-sm text-foreground">{formatDate(wo.dueDate)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Criada em</p>
                  <p className="text-sm text-foreground">{formatDate(wo.createdAt)}</p>
                </div>
              </>
            )}
            {req && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                  <div className="mt-0.5"><PriorityBadge priority={req.priority} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Execução</p>
                  <div className="mt-0.5"><ExecutionStatusBadge item={req} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Criada em</p>
                  <p className="text-sm text-foreground">{formatDate(req.createdAt)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {item.description && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Descrição</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {/* Photos */}
        {(item.beforePhotoUrl || item.afterPhotoUrl) && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Fotos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.beforePhotoUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Antes</p>
                  <img
                    src={item.beforePhotoUrl}
                    alt="Antes"
                    className="w-full h-32 object-cover rounded-[4px] border border-border"
                  />
                </div>
              )}
              {item.afterPhotoUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Depois</p>
                  <img
                    src={item.afterPhotoUrl}
                    alt="Depois"
                    className="w-full h-32 object-cover rounded-[4px] border border-border"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {item.executionNotes && (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Notas de execução</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">{item.executionNotes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyTasksPage() {
  const [activeTab, setActiveTab] = useState<TabType>('workorders')
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<WorkOrder | Request | null>(null)
  const [selectedType, setSelectedType] = useState<'workorder' | 'request' | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  const showSidePanel = selectedItem !== null

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

  const handleSelectItem = (item: WorkOrder | Request, type: 'workorder' | 'request') => {
    setIsExecuting(false)
    setSelectedItem(item)
    setSelectedType(type)
  }

  const handleClosePanel = () => {
    setSelectedItem(null)
    setSelectedType(null)
    setIsExecuting(false)
  }

  const handleOpenExecute = () => {
    setIsExecuting(true)
  }

  const handleCloseExecute = () => {
    setIsExecuting(false)
  }

  const handleExecutionSuccess = () => {
    setIsExecuting(false)
    setSelectedItem(null)
    setSelectedType(null)
    loadData()
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSelectedItem(null)
    setSelectedType(null)
    setIsExecuting(false)
  }

  const renderWorkOrdersTable = () => (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fotos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Criada em</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {workOrders.map((wo) => (
              <tr
                key={wo.id}
                onClick={() => handleSelectItem(wo, 'workorder')}
                className={`odd:bg-gray-50 even:bg-white hover:bg-accent-orange-light cursor-pointer transition-colors ${selectedItem?.id === wo.id ? 'bg-secondary' : ''}`}
              >
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
                  <PriorityBadge priority={wo.priority} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={wo.status} />
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
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(wo.createdAt)}
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
    </div>
  )

  const renderRequestsTable = () => (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Execução</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fotos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Criada em</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {requests.map((req) => (
              <tr
                key={req.id}
                onClick={() => handleSelectItem(req, 'request')}
                className={`odd:bg-gray-50 even:bg-white hover:bg-accent-orange-light cursor-pointer transition-colors ${selectedItem?.id === req.id ? 'bg-secondary' : ''}`}
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-foreground">{req.title}</div>
                  {req.description && (
                    <div className="text-sm text-muted-foreground truncate max-w-xs">{req.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <PriorityBadge priority={req.priority} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <ExecutionStatusBadge item={req} />
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
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(req.createdAt)}
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
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Minhas Tarefas"
          description="Ordens de serviço e solicitações atribuídas a você"
          className="mb-0"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-4 md:px-6 flex-shrink-0 bg-card">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('workorders')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'workorders'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon name="construction" className="text-base inline mr-2" />
            Ordens de Serviço
            {activeTab === 'workorders' && ` (${workOrders.length})`}
          </button>
          <button
            onClick={() => handleTabChange('requests')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'requests'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon name="description" className="text-base inline mr-2" />
            Solicitações
            {activeTab === 'requests' && ` (${requests.length})`}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                  <p className="mt-2 text-muted-foreground">Carregando...</p>
                </div>
              </div>
            ) : (
              activeTab === 'workorders' ? renderWorkOrdersTable() : renderRequestsTable()
            )}
            panel={selectedItem && selectedType ? (
              isExecuting ? (
                <ExecutionModal
                  item={selectedItem}
                  type={selectedType}
                  onClose={handleCloseExecute}
                  onSuccess={handleExecutionSuccess}
                  inPage
                />
              ) : (
                <TaskDetailPanel
                  item={selectedItem}
                  type={selectedType}
                  onClose={handleClosePanel}
                  onExecute={handleOpenExecute}
                />
              )
            ) : null}
            showPanel={showSidePanel}
            panelTitle="Tarefa"
            onClosePanel={handleClosePanel}
          />
        </div>
      </div>
    </PageContainer>
  )
}
