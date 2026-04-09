'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath } from '@/lib/user-roles'

import { formatDate } from '@/lib/utils'
import { ApprovalModal } from '@/components/approvals/ApprovalModal'

interface Request {
  id: string
  title: string
  description?: string
  priority: string
  status: string
  createdBy?: { id: string; firstName: string; lastName: string; email: string }
  approvedBy?: { id: string; firstName: string; lastName: string; email: string }
  assignedTo?: { id: string; firstName: string; lastName: string; email: string }
  team?: { id: string; name: string }
  asset?: { id: string; name: string }
  location?: { id: string; name: string }
  generatedWorkOrder?: { id: string; internalId: string; status: string }
  approvedAt?: string
  rejectionReason?: string
  convertToWorkOrder: boolean
  executionStartedAt?: string
  executionCompletedAt?: string
  createdAt: string
}

type TabType = 'pending' | 'approved' | 'rejected'

export default function RequestApprovalsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(user, 'approvals', 'view')) {
      router.replace(getDefaultCmmsPath(user))
    }
  }, [authLoading, router, user])

  useEffect(() => {
    if (!user || !hasPermission(user, 'approvals', 'view')) return
    loadRequests()
  }, [activeTab, user])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const endpoint = 
        activeTab === 'pending' ? '/api/requests/pending' :
        activeTab === 'approved' ? '/api/requests/approved' :
        '/api/requests/rejected'
      
      const res = await fetch(endpoint)
      const data = await res.json()
      setRequests(data.data || [])
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (request: Request) => {
    setSelectedRequest(request)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedRequest(null)
  }

  const handleApprovalSuccess = () => {
    handleCloseModal()
    loadRequests()
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      CRITICAL: 'bg-primary-graphite',
      HIGH: 'bg-on-surface-variant',
      MEDIUM: 'bg-on-surface-variant',
      LOW: 'bg-on-surface-variant',
      NONE: 'bg-on-surface-variant'
    }
    return <Badge className={colors[priority as keyof typeof colors] || colors.NONE}>{priority}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-on-surface-variant',
      APPROVED: 'bg-on-surface-variant',
      REJECTED: 'bg-primary-graphite'
    }
    return <Badge className={colors[status as keyof typeof colors]}>{status}</Badge>
  }

  const renderPendingTable = () => (
    <>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="sticky top-0 bg-secondary z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridade</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Solicitante</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Equipe</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Criado em</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-secondary cursor-pointer">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">{request.title}</div>
                {request.description && (
                  <div className="text-sm text-muted-foreground truncate max-w-xs">{request.description}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getPriorityBadge(request.priority)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-foreground">
                  {request.createdBy?.firstName} {request.createdBy?.lastName}
                </div>
                <div className="text-sm text-muted-foreground">{request.createdBy?.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {request.team?.name || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {formatDate(request.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  size="sm"
                  onClick={() => handleOpenModal(request)}
                  className="bg-primary hover:bg-primary-graphite"
                >
                  <Icon name="visibility" className="text-base mr-1" />
                  Analisar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="schedule" className="text-5xl mx-auto mb-4 text-muted-foreground" />
          <p>Nenhuma solicitação pendente</p>
        </div>
      )}
    </>
  )

  const renderApprovedTable = () => (
    <>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="sticky top-0 bg-secondary z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Técnico</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Execução</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Aprovado por</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Aprovado em</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-secondary cursor-pointer">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">{request.title}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {request.convertToWorkOrder ? (
                  <Badge className="bg-primary-graphite">
                    <Icon name="description" className="text-sm mr-1" />
                    OS: {request.generatedWorkOrder?.internalId}
                  </Badge>
                ) : (
                  <Badge className="bg-on-surface-variant">SS Aprovada</Badge>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {request.assignedTo ? (
                  <div className="text-sm text-foreground">
                    <Icon name="person" className="text-base inline mr-1" />
                    {request.assignedTo.firstName} {request.assignedTo.lastName}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {request.executionCompletedAt ? (
                  <Badge className="bg-on-surface-variant">Concluída</Badge>
                ) : request.executionStartedAt ? (
                  <Badge className="bg-on-surface-variant">Em Execução</Badge>
                ) : (
                  <Badge className="bg-on-surface-variant">Não Iniciada</Badge>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {request.approvedBy?.firstName} {request.approvedBy?.lastName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {request.approvedAt ? formatDate(request.approvedAt) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal(request)}
                >
                  <Icon name="visibility" className="text-base mr-1" />
                  Ver Detalhes
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="check_circle" className="text-5xl mx-auto mb-4 text-muted-foreground" />
          <p>Nenhuma solicitação aprovada</p>
        </div>
      )}
    </>
  )

  const renderRejectedTable = () => (
    <>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="sticky top-0 bg-secondary z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Solicitante</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejeitado por</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Motivo</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-secondary cursor-pointer">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">{request.title}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {request.createdBy?.firstName} {request.createdBy?.lastName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {request.approvedBy?.firstName} {request.approvedBy?.lastName}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-foreground max-w-md">
                  {request.rejectionReason || 'Sem justificativa'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal(request)}
                >
                  <Icon name="visibility" className="text-base mr-1" />
                  Ver Detalhes
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="cancel" className="text-5xl mx-auto mb-4 text-muted-foreground" />
          <p>Nenhuma solicitação rejeitada</p>
        </div>
      )}
    </>
  )

  if (authLoading || !user || !hasPermission(user, 'approvals', 'view')) {
    return null
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Aprovações de Solicitações"
          description="Gerencie aprovações, rejeições e acompanhe o status"
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card flex-col">
          {/* Tabs */}
          <div className="border-b border-border flex-shrink-0">
            <nav className="-mb-px flex space-x-8 px-4 md:px-6">
              <button
                onClick={() => setActiveTab('pending')}
                className={`
                  py-3 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'pending'
                    ? 'border-on-surface text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                <Icon name="schedule" className="text-xl inline mr-2" />
                Pendentes
                {activeTab === 'pending' && ` (${requests.length})`}
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`
                  py-3 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'approved'
                    ? 'border-on-surface text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                <Icon name="check_circle" className="text-xl inline mr-2" />
                Aprovadas
                {activeTab === 'approved' && ` (${requests.length})`}
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`
                  py-3 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'rejected'
                    ? 'border-on-surface text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                <Icon name="cancel" className="text-xl inline mr-2" />
                Rejeitadas
                {activeTab === 'rejected' && ` (${requests.length})`}
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto min-h-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                <p className="text-muted-foreground mt-4">Carregando...</p>
              </div>
            ) : (
              <>
                {activeTab === 'pending' && renderPendingTable()}
                {activeTab === 'approved' && renderApprovedTable()}
                {activeTab === 'rejected' && renderRejectedTable()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedRequest && (
        <ApprovalModal
          request={selectedRequest}
          onClose={handleCloseModal}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </PageContainer>
  )
}
