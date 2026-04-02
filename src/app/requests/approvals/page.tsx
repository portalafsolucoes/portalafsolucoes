'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle, XCircle, Clock, User, FileText, Eye } from 'lucide-react'
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
      CRITICAL: 'bg-gray-700',
      HIGH: 'bg-gray-500',
      MEDIUM: 'bg-gray-500',
      LOW: 'bg-gray-400',
      NONE: 'bg-gray-500'
    }
    return <Badge className={colors[priority as keyof typeof colors] || colors.NONE}>{priority}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-gray-500',
      APPROVED: 'bg-gray-400',
      REJECTED: 'bg-gray-700'
    }
    return <Badge className={colors[status as keyof typeof colors]}>{status}</Badge>
  }

  const renderPendingTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipe</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criado em</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{request.title}</div>
                {request.description && (
                  <div className="text-sm text-gray-500 truncate max-w-xs">{request.description}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getPriorityBadge(request.priority)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {request.createdBy?.firstName} {request.createdBy?.lastName}
                </div>
                <div className="text-sm text-gray-500">{request.createdBy?.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {request.team?.name || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(request.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  size="sm"
                  onClick={() => handleOpenModal(request)}
                  className="bg-primary hover:bg-gray-700"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Analisar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhuma solicitação pendente</p>
        </div>
      )}
    </div>
  )

  const renderApprovedTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status Execução</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aprovado por</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aprovado em</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{request.title}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {request.convertToWorkOrder ? (
                  <Badge className="bg-gray-600">
                    <FileText className="w-3 h-3 mr-1" />
                    OS: {request.generatedWorkOrder?.internalId}
                  </Badge>
                ) : (
                  <Badge className="bg-gray-500">SS Aprovada</Badge>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {request.assignedTo ? (
                  <div className="text-sm text-gray-900">
                    <User className="w-4 h-4 inline mr-1" />
                    {request.assignedTo.firstName} {request.assignedTo.lastName}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {request.executionCompletedAt ? (
                  <Badge className="bg-gray-400">Concluída</Badge>
                ) : request.executionStartedAt ? (
                  <Badge className="bg-gray-500">Em Execução</Badge>
                ) : (
                  <Badge className="bg-gray-500">Não Iniciada</Badge>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {request.approvedBy?.firstName} {request.approvedBy?.lastName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {request.approvedAt ? formatDate(request.approvedAt) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal(request)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Detalhes
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhuma solicitação aprovada</p>
        </div>
      )}
    </div>
  )

  const renderRejectedTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejeitado por</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{request.title}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {request.createdBy?.firstName} {request.createdBy?.lastName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {request.approvedBy?.firstName} {request.approvedBy?.lastName}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-md">
                  {request.rejectionReason || 'Sem justificativa'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal(request)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Detalhes
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhuma solicitação rejeitada</p>
        </div>
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Aprovações de Solicitações</h1>
          <p className="text-gray-600 mt-1">Gerencie aprovações, rejeições e acompanhe o status</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Clock className="w-5 h-5 inline mr-2" />
              Pendentes
              {activeTab === 'pending' && ` (${requests.length})`}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'approved'
                  ? 'border-gray-500 text-success'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <CheckCircle className="w-5 h-5 inline mr-2" />
              Aprovadas
              {activeTab === 'approved' && ` (${requests.length})`}
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'rejected'
                  ? 'border-gray-700 text-danger'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <XCircle className="w-5 h-5 inline mr-2" />
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando...</p>
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
