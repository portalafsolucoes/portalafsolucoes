'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/Icon'

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
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [activeTab])

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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-surface">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Prioridade</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Solicitante</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Equipe</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Criado em</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-surface">
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
    </div>
  )

  const renderApprovedTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-surface">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Técnico</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status Execução</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Aprovado por</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Aprovado em</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-surface">
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
    </div>
  )

  const renderRejectedTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-surface">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Solicitante</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rejeitado por</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Motivo</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-surface">
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
    </div>
  )

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Aprovações de Solicitações</h1>
          <p className="text-muted-foreground mt-1">Gerencie aprovações, rejeições e acompanhe o status</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'pending'
                  ? 'border-primary text-primary'
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
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'approved'
                  ? 'border-on-surface-variant text-success'
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
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'rejected'
                  ? 'border-on-surface text-danger'
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
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-surface-variant mx-auto"></div>
                <p className="text-muted-foreground mt-4">Carregando...</p>
              </div>
            ) : (
              <>
                {activeTab === 'pending' && renderPendingTable()}
                {activeTab === 'approved' && renderApprovedTable()}
                {activeTab === 'rejected' && renderRejectedTable()}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {showModal && selectedRequest && (
        <ApprovalModal
          request={selectedRequest}
          onClose={handleCloseModal}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </AppLayout>
  )
}
