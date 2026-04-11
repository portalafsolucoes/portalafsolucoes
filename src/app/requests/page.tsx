'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { formatDate, getStatusColor } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ExportButton } from '@/components/ui/ExportButton'
import { usePermissions } from '@/hooks/usePermissions'
import { useIsMobile } from '@/hooks/useMediaQuery'

const RequestDetailModal = dynamic(
  () => import('@/components/requests/RequestDetailModal').then(m => ({ default: m.RequestDetailModal })),
  { ssr: false }
)
const RequestFormModal = dynamic(
  () => import('@/components/requests/RequestFormModal').then(m => ({ default: m.RequestFormModal })),
  { ssr: false }
)

interface Request {
  id: string
  title: string
  description?: string
  priority: string
  status: string
  dueDate?: string
  teamApprovalStatus?: string
  createdBy?: { id: string; firstName: string; lastName: string }
  team?: { id: string; name: string }
  files?: Array<{ id: string; name: string; url: string }>
  createdAt: string
}

type ViewMode = 'table' | 'grid'

export default function RequestsPage() {
  const { canCreate: canCreateReq } = usePermissions()
  const isMobile = useIsMobile()

  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null)
  const [deleting, setDeleting] = useState(false)

  const hasSidePanel = !isMobile && (selectedRequest !== null || isCreating)

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
  }

  const handleSuccess = () => {
    loadRequests()
    setIsCreating(false)
    setIsEditing(false)
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

  const filteredRequests = requests.filter(req =>
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Solicitações de Serviço (SC)"
          description="Gerencie solicitações de manutenção e serviços"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-64">
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
                  <Icon name="add" className="mr-2 text-base" />
                  Nova Solicitação
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Main Content */}
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
              {/* Left panel — table or grid */}
              <div className={`${hasSidePanel ? 'w-1/2 min-w-0' : 'w-full'} transition-all overflow-hidden`}>
                {filteredRequests.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center p-12 text-center h-full">
                    <div>
                      <Icon name="assignment" className="text-6xl text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma solicitação encontrada</h3>
                      <p className="text-muted-foreground">Crie uma nova solicitação para começar.</p>
                    </div>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="overflow-auto flex-1 h-full p-4">
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
                              {request.status}
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
                              Solicitação
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Status / Prioridade
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Solicitante
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Equipe
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Data
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Anexos
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-gray-200">
                          {filteredRequests.map((request) => (
                            <tr
                              key={request.id}
                              onClick={() => handleRowClick(request)}
                              className={`odd:bg-gray-50 even:bg-white hover:bg-accent-orange-light cursor-pointer transition-colors ${
                                selectedRequest?.id === request.id ? 'bg-secondary' : ''
                              }`}
                            >
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-foreground">{request.title}</div>
                                {request.description && (
                                  <div className="text-sm text-muted-foreground truncate max-w-xs">{request.description}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <Badge className={getStatusColor(request.status) + ' text-xs w-fit'}>
                                    {request.status}
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

              {/* Right panel — desktop only */}
              {hasSidePanel && !isMobile && (
                <div className="w-1/2 min-w-0">
                  {isCreating ? (
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
                      inPage
                    />
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile overlays */}
      {isMobile && selectedRequest && !isEditing && (
        <RequestDetailModal
          isOpen={true}
          onClose={handleClosePanel}
          requestId={selectedRequest.id}
          onEdit={handleEdit}
          onDelete={(requestId) => {
            const req = requests.find(r => r.id === requestId)
            if (req) openDeleteDialog(req)
          }}
        />
      )}

      {isMobile && isCreating && (
        <RequestFormModal
          isOpen={true}
          onClose={handleClosePanel}
          onSuccess={handleSuccess}
        />
      )}

      {isMobile && isEditing && selectedRequest && (
        <RequestFormModal
          isOpen={true}
          onClose={() => setIsEditing(false)}
          onSuccess={handleSuccess}
          request={selectedRequest}
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
