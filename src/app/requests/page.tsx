'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, FileText, Calendar, Users, Paperclip, LayoutGrid, Table, Eye, Edit, Trash2, Search } from 'lucide-react'
import { formatDate, getStatusColor } from '@/lib/utils'
import { RequestFormModal } from '@/components/requests/RequestFormModal'
import { RequestDetailModal } from '@/components/requests/RequestDetailModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ExportButton } from '@/components/ui/ExportButton'

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

type ViewMode = 'grid' | 'table'

export default function RequestsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showNewModal, setShowNewModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string>('')
  const [editingRequest, setEditingRequest] = useState<Request | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Função para verificar se pode excluir (apenas próprias e não aprovadas)
  const canDeleteRequest = (request: Request) => {
    if (!currentUser?.id) return false
    const isOwner = request.createdBy?.id === currentUser.id
    const isApproved = request.teamApprovalStatus === 'APPROVED'
    return isOwner && !isApproved
  }

  useEffect(() => {
    loadCurrentUser()
    loadRequests()
  }, [])

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
      }
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/requests')
      const data = await res.json()
      setRequests(data.data || [])
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    loadRequests()
    setEditingRequest(null)
  }

  const handleView = (requestId: string) => {
    setSelectedRequestId(requestId)
    setShowDetailModal(true)
  }

  const handleEdit = (request: Request) => {
    setEditingRequest(request)
    setShowDetailModal(false)
  }

  const openDeleteDialog = (request: Request) => {
    setRequestToDelete(request)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!requestToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/requests/${requestToDelete.id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setShowDeleteDialog(false)
        setRequestToDelete(null)
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
    <AppLayout>
      <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        {/* Se modal está aberto, mostrar apenas ele */}
        {showDetailModal && selectedRequestId ? (
          <div 
            className="fixed top-16 left-0 right-0 bottom-0 backdrop-blur-md bg-background/40 z-40 overflow-y-auto lg:left-64"
            onClick={() => setShowDetailModal(false)}
          >
            <div className="w-full max-w-6xl mx-auto p-4" onClick={(e) => e.stopPropagation()}>
              <RequestDetailModal
                isOpen={true}
                onClose={() => setShowDetailModal(false)}
                requestId={selectedRequestId}
                onEdit={handleEdit}
                onDelete={(requestId: string) => {
                  const request = requests.find(r => r.id === requestId)
                  if (request) openDeleteDialog(request)
                }}
                inPage={true}
              />
            </div>
          </div>
        ) : (
          <>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
              <FileText className="w-6 h-6 md:w-8 md:h-8" />
              <span className="text-lg md:text-2xl">Solicitações de Serviço (SC)</span>
            </h1>
            <p className="mt-1 text-xs md:text-sm text-muted-foreground">
              Gerencie solicitações de manutenção e serviços
            </p>
          </div>
          <div className="flex gap-2 md:gap-3 flex-wrap">
            <div className="hidden md:flex gap-1 border rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/10'
                }`}
                title="Visualização em Tabela"
              >
                <Table className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/10'
                }`}
                title="Visualização em Cartões"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
            <ExportButton data={filteredRequests} entity="requests" />
            <Button onClick={() => setShowNewModal(true)} className="flex-1 md:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              Nova Solicitação
            </Button>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar solicitações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-600 border-r-transparent"></div>
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma solicitação encontrada.</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' || window.innerWidth < 768 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredRequests.map((request) => (
              <div 
                key={request.id} 
                className="bg-card rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-4">
                  <div onClick={() => handleView(request.id)} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 flex-wrap">
                      <h3 className="text-base md:text-lg font-bold text-gray-900">{request.title}</h3>
                      <span className={`px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      {request.priority !== 'NONE' && (
                        <span className="px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full">
                          {getPriorityLabel(request.priority)}
                        </span>
                      )}
                    </div>

                    {request.description && (
                      <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4 line-clamp-2">{request.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
                      {request.createdBy && (
                        <span className="flex items-center gap-1 md:gap-1.5">
                          <Users className="h-3 w-3 md:h-4 md:w-4" />
                          <span className="truncate max-w-[120px] md:max-w-none">{request.createdBy.firstName} {request.createdBy.lastName}</span>
                        </span>
                      )}
                      {request.team && (
                        <span className="flex items-center gap-1 md:gap-1.5">
                          <Users className="h-3 w-3 md:h-4 md:w-4" />
                          <span className="truncate max-w-[100px] md:max-w-none">Equipe: {request.team.name}</span>
                        </span>
                      )}
                      {request.dueDate && (
                        <span className="flex items-center gap-1 md:gap-1.5">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                          <span className="whitespace-nowrap">{formatDate(request.dueDate)}</span>
                        </span>
                      )}
                      {request.files && request.files.length > 0 && (
                        <span className="flex items-center gap-1 md:gap-1.5">
                          <Paperclip className="h-3 w-3 md:h-4 md:w-4" />
                          <span>{request.files.length} arquivo(s)</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 md:gap-2 flex-shrink-0 justify-end md:justify-start">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleView(request.id)
                      }}
                      className="p-1.5 md:p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(request)
                      }}
                      className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                    {canDeleteRequest(request) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteDialog(request)
                        }}
                        className="p-1.5 md:p-2 text-danger hover:bg-danger-light rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Solicitação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status/Prioridade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Solicitante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Equipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Anexos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{request.title}</div>
                        {request.description && (
                          <div className="text-sm text-gray-600 truncate max-w-xs">{request.description}</div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {request.createdBy ? (
                          `${request.createdBy.firstName} ${request.createdBy.lastName}`
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {request.team?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {request.dueDate ? formatDate(request.dueDate) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {request.files && request.files.length > 0 ? (
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-4 h-4" />
                            {request.files.length}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleView(request.id)}
                            className="p-1.5 text-primary hover:bg-primary/5 rounded transition-colors"
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(request)}
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {canDeleteRequest(request) && (
                            <button
                              onClick={() => openDeleteDialog(request)}
                              className="p-1.5 text-danger hover:bg-danger-light rounded transition-colors"
                              title="Excluir (apenas suas solicitações não aprovadas)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* Modais sempre renderizados */}
      {false && showDetailModal && selectedRequestId && (
        <RequestDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          requestId={selectedRequestId}
          onEdit={handleEdit}
          onDelete={(requestId: string) => {
            const request = requests.find(r => r.id === requestId)
            if (request) openDeleteDialog(request)
          }}
        />
      )}

      {/* Modal de criação/edição */}
      <RequestFormModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={handleSuccess}
      />
      
      {editingRequest && (
        <RequestFormModal
          isOpen={!!editingRequest}
          onClose={() => setEditingRequest(null)}
          onSuccess={handleSuccess}
          request={editingRequest}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
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
    </AppLayout>
  )
}
