'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { WorkOrderFormInitialValues } from '@/components/work-orders/WorkOrderFormModal'
import type { RAFFormInitialValues } from '@/components/rafs/RAFFormModal'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { formatDate, getStatusColor } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ExportButton } from '@/components/ui/ExportButton'
import { usePermissions } from '@/hooks/usePermissions'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'

const RequestDetailModal = dynamic(
  () => import('@/components/requests/RequestDetailModal').then(m => ({ default: m.RequestDetailModal })),
  { ssr: false }
)
const RequestFormModal = dynamic(
  () => import('@/components/requests/RequestFormModal').then(m => ({ default: m.RequestFormModal })),
  { ssr: false }
)
const RequestPrintView = dynamic(
  () => import('@/components/requests/RequestPrintView').then(m => ({ default: m.RequestPrintView })),
  { ssr: false }
)
const WorkOrderFormModal = dynamic(
  () => import('@/components/work-orders/WorkOrderFormModal').then(m => ({ default: m.WorkOrderFormModal })),
  { ssr: false }
)
const RAFFormModal = dynamic(
  () => import('@/components/rafs/RAFFormModal').then(m => ({ default: m.RAFFormModal })),
  { ssr: false }
)

interface Request {
  id: string
  requestNumber?: string | null
  title: string
  description?: string
  priority: string
  status: string
  dueDate?: string
  teamApprovalStatus?: string
  createdBy?: { id: string; firstName: string; lastName: string }
  team?: { id: string; name: string }
  asset?: { id: string; name: string; protheusCode?: string; tag?: string } | null
  assetId?: string
  files?: Array<{ id: string; name: string; url: string }>
  createdAt: string
}

type ViewMode = 'table' | 'grid'
type SortField = 'requestNumber' | 'title' | 'assetCode' | 'assetName' | 'status' | 'createdBy' | 'team' | 'dueDate'
type SortDirection = 'asc' | 'desc'

export default function RequestsPage() {
  const { canCreate: canCreateReq } = usePermissions()
  const { isPhone } = useResponsiveLayout()

  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortField, setSortField] = useState<SortField>('requestNumber')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [creatingWOFromRequest, setCreatingWOFromRequest] = useState<{
    initialValues: WorkOrderFormInitialValues
    sourceRequestId: string
  } | null>(null)
  const [creatingRafFromRequest, setCreatingRafFromRequest] = useState<{
    sourceRequestId: string
    initialValues: RAFFormInitialValues
  } | null>(null)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [printRequestId, setPrintRequestId] = useState<string | null>(null)

  const showSidePanel = !!(selectedRequest !== null || isCreating || creatingWOFromRequest || creatingRafFromRequest)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/requests?summary=true')
      const data = await res.json()
      setRequests(data.data || [])
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (request: Request) => {
    setIsCreating(false)
    setIsEditing(false)
    setSelectedRequest(request)
  }

  const handleAddNew = () => {
    setSelectedRequest(null)
    setIsEditing(false)
    setIsCreating(true)
  }

  const handleEdit = (request: Request) => {
    setSelectedRequest(request)
    setIsEditing(true)
    setIsCreating(false)
  }

  const handleClosePanel = () => {
    setSelectedRequest(null)
    setIsEditing(false)
    setIsCreating(false)
    setCreatingWOFromRequest(null)
    setCreatingRafFromRequest(null)
  }

  const handleSuccess = () => {
    loadRequests()
    setIsCreating(false)
    setIsEditing(false)
  }

  const handleWorkOrderCreated = () => {
    loadRequests()
    setCreatingWOFromRequest(null)
    setSelectedRequest(null)
  }

  const handleRafCreated = () => {
    loadRequests()
    setCreatingRafFromRequest(null)
    setSelectedRequest(null)
  }

  const openDeleteDialog = (request: Request) => {
    setRequestToDelete(request)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!requestToDelete) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/requests/${requestToDelete.id}`, { method: 'DELETE' })
      if (response.ok) {
        setShowDeleteDialog(false)
        setRequestToDelete(null)
        if (selectedRequest?.id === requestToDelete.id) handleClosePanel()
        loadRequests()
      } else {
        alert('Erro ao excluir solicitação')
      }
    } catch (error) {
      console.error('Error deleting request:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setDeleting(false)
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '🔴 Alta'
      case 'MEDIUM': return '🟡 Média'
      case 'LOW': return '🟢 Baixa'
      default: return 'Nenhuma'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente'
      case 'APPROVED': return 'Aprovada'
      case 'REJECTED': return 'Rejeitada'
      case 'CANCELLED': return 'Cancelada'
      case 'COMPLETED': return 'Finalizada'
      case 'IN_PROGRESS': return 'Em Andamento'
      default: return status
    }
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

  const filteredRequests = requests.filter(req =>
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'requestNumber':
        return (a.requestNumber || '').localeCompare(b.requestNumber || '') * modifier
      case 'title':
        return a.title.localeCompare(b.title) * modifier
      case 'assetCode':
        return (a.asset?.protheusCode || '').localeCompare(b.asset?.protheusCode || '') * modifier
      case 'assetName':
        return (a.asset?.name || '').localeCompare(b.asset?.name || '') * modifier
      case 'status':
        return a.status.localeCompare(b.status) * modifier
      case 'createdBy': {
        const nameA = a.createdBy ? `${a.createdBy.firstName} ${a.createdBy.lastName}` : ''
        const nameB = b.createdBy ? `${b.createdBy.firstName} ${b.createdBy.lastName}` : ''
        return nameA.localeCompare(nameB) * modifier
      }
      case 'team':
        return (a.team?.name || '').localeCompare(b.team?.name || '') * modifier
      case 'dueDate':
        return ((a.dueDate || '') > (b.dueDate || '') ? 1 : -1) * modifier
      default:
        return 0
    }
  })

  const activePanel = creatingRafFromRequest ? (
    <RAFFormModal
      isOpen={true}
      onClose={() => setCreatingRafFromRequest(null)}
      onSuccess={handleRafCreated}
      sourceRequestId={creatingRafFromRequest.sourceRequestId}
      initialValues={creatingRafFromRequest.initialValues}
      inPage
    />
  ) : creatingWOFromRequest ? (
    <WorkOrderFormModal
      isOpen={true}
      onClose={() => setCreatingWOFromRequest(null)}
      onSuccess={handleWorkOrderCreated}
      initialValues={creatingWOFromRequest.initialValues}
      sourceRequestId={creatingWOFromRequest.sourceRequestId}
      inPage
    />
  ) : isCreating ? (
    <RequestFormModal
      isOpen={true}
      onClose={handleClosePanel}
      onSuccess={handleSuccess}
      inPage
    />
  ) : isEditing && selectedRequest ? (
    <RequestFormModal
      isOpen={true}
      onClose={() => setIsEditing(false)}
      onSuccess={handleSuccess}
      request={selectedRequest}
      inPage
    />
  ) : selectedRequest ? (
    <RequestDetailModal
      isOpen={true}
      onClose={handleClosePanel}
      requestId={selectedRequest.id}
      onEdit={handleEdit}
      onDelete={(requestId) => {
        const req = requests.find(r => r.id === requestId)
        if (req) openDeleteDialog(req)
      }}
      onFinalize={() => {
        loadRequests()
        handleClosePanel()
      }}
      onGenerateWorkOrder={(payload) => {
        setCreatingWOFromRequest({
          sourceRequestId: payload.requestId,
          initialValues: {
            description: payload.description,
            priority: payload.priority,
            type: 'CORRECTIVE',
            assetId: payload.assetId || undefined,
            dueDate: payload.dueDate ? payload.dueDate.slice(0, 10) : undefined,
          },
        })
      }}
      onGenerateRaf={(payload) => {
        setCreatingRafFromRequest({
          sourceRequestId: payload.requestId,
          initialValues: {
            failureDescription: payload.failureDescription ?? null,
            occurrenceDate: payload.occurrenceDate ?? null,
            area: payload.area ?? null,
            equipment: payload.equipment ?? null,
          },
        })
      }}
      onPrint={(requestId) => setPrintRequestId(requestId)}
      inPage
    />
  ) : null

  const listContent = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : filteredRequests.length === 0 ? (
    <div className="flex-1 flex items-center justify-center p-12 text-center h-full">
      <div>
        <Icon name="assignment" className="text-6xl text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma solicitação encontrada</h3>
        <p className="text-muted-foreground">Crie uma nova solicitação para começar.</p>
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col overflow-hidden">
    {viewMode === 'grid' || isPhone ? (
    <div className="overflow-auto flex-1 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredRequests.map((request) => (
          <div
            key={request.id}
            onClick={() => handleRowClick(request)}
            className={`bg-card rounded-[4px] ambient-shadow p-4 hover:shadow-md hover:border-border transition-all duration-200 cursor-pointer ${
              selectedRequest?.id === request.id ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-base font-bold text-foreground">{request.title}</h3>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${getStatusColor(request.status)}`}>
                {getStatusLabel(request.status)}
              </span>
              {request.priority !== 'NONE' && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full">
                  {getPriorityLabel(request.priority)}
                </span>
              )}
            </div>
            {request.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{request.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {request.createdBy && (
                <span className="flex items-center gap-1">
                  <Icon name="person" className="text-sm" />
                  {request.createdBy.firstName} {request.createdBy.lastName}
                </span>
              )}
              {request.dueDate && (
                <span className="flex items-center gap-1">
                  <Icon name="calendar_today" className="text-sm" />
                  {formatDate(request.dueDate)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
    ) : (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('requestNumber')} className="flex items-center gap-1">
                  <span>Nº da SS</span>
                  {renderSortIcon('requestNumber')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('title')} className="flex items-center gap-1">
                  <span>Solicitação</span>
                  {renderSortIcon('title')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('assetCode')} className="flex items-center gap-1">
                  <span>Código do Bem</span>
                  {renderSortIcon('assetCode')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('assetName')} className="flex items-center gap-1">
                  <span>Nome do Bem</span>
                  {renderSortIcon('assetName')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('status')} className="flex items-center gap-1">
                  <span>Status / Prioridade</span>
                  {renderSortIcon('status')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('createdBy')} className="flex items-center gap-1">
                  <span>Solicitante</span>
                  {renderSortIcon('createdBy')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('team')} className="flex items-center gap-1">
                  <span>Equipe</span>
                  {renderSortIcon('team')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('dueDate')} className="flex items-center gap-1">
                  <span>Data</span>
                  {renderSortIcon('dueDate')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Anexos
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-100">
            {sortedRequests.map((request) => (
              <tr
                key={request.id}
                onClick={() => handleRowClick(request)}
                className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${
                  selectedRequest?.id === request.id ? 'bg-secondary' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-bold text-gray-900">{request.requestNumber || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-foreground">{request.title}</div>
                  {request.description && (
                    <div className="text-sm text-muted-foreground truncate max-w-xs">{request.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {request.asset?.protheusCode || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {request.asset?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(request.status) + ' text-xs w-fit'}>
                      {getStatusLabel(request.status)}
                    </Badge>
                    {request.priority !== 'NONE' && (
                      <Badge className="text-xs w-fit">
                        {getPriorityLabel(request.priority)}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {request.createdBy
                    ? `${request.createdBy.firstName} ${request.createdBy.lastName}`
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {request.team?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {request.dueDate ? formatDate(request.dueDate) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {request.files && request.files.length > 0 ? (
                    <span className="flex items-center gap-1">
                      <Icon name="attach_file" className="text-base" />
                      {request.files.length}
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    )}
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Solicitações de Serviço (SS)"
          description="Gerencie solicitações de manutenção e serviços"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar solicitações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* View Mode Toggle */}
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

              <ExportButton data={filteredRequests} entity="requests" />

              {canCreateReq('requests') && (
                <Button onClick={handleAddNew} className="flex-shrink-0 bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-1">Nova Solicitação</span>
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle="Solicitação"
            onClosePanel={handleClosePanel}
          />
        </div>
      </div>

      {/* Print view */}
      {printRequestId && (
        <RequestPrintView
          requestId={printRequestId}
          onClose={() => setPrintRequestId(null)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setRequestToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Excluir Solicitação"
        message={`Tem certeza que deseja excluir a solicitação "${requestToDelete?.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Não, Cancelar"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  )
}
