'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile } from '@/hooks/useMediaQuery'
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
  const isMobile = useIsMobile()
  const { user, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)

  const hasSidePanel = !isMobile && selectedRequest !== null

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(user, 'approvals', 'view')) {
      router.replace(getDefaultCmmsPath(user))
    }
  }, [authLoading, router, user])

  useEffect(() => {
    if (!user || !hasPermission(user, 'approvals', 'view')) return
    loadRequests()
    // Close panel when switching tabs
    setSelectedRequest(null)
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

  const handleSelectRequest = (request: Request) => {
    setSelectedRequest(request)
  }

  const handleClosePanel = () => {
    setSelectedRequest(null)
  }

  const handleApprovalSuccess = () => {
    handleClosePanel()
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

  const renderPendingTable = () => (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Solicitante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Equipe</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Criado em</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {requests.map((request) => (
              <tr
                key={request.id}
                onClick={() => handleSelectRequest(request)}
                className={`hover:bg-secondary cursor-pointer transition-colors ${selectedRequest?.id === request.id ? 'bg-secondary' : ''}`}
              >
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
    </div>
  )

  const renderApprovedTable = () => (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Técnico</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Execução</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Aprovado por</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Aprovado em</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {requests.map((request) => (
              <tr
                key={request.id}
                onClick={() => handleSelectRequest(request)}
                className={`hover:bg-secondary cursor-pointer transition-colors ${selectedRequest?.id === request.id ? 'bg-secondary' : ''}`}
              >
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
    </div>
  )

  const renderRejectedTable = () => (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Solicitante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejeitado por</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Motivo</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {requests.map((request) => (
              <tr
                key={request.id}
                onClick={() => handleSelectRequest(request)}
                className={`hover:bg-secondary cursor-pointer transition-colors ${selectedRequest?.id === request.id ? 'bg-secondary' : ''}`}
              >
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
    </div>
  )

  if (authLoading || !user || !hasPermission(user, 'approvals', 'view')) {
    return null
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Aprovações de Solicitações"
          description="Gerencie aprovações, rejeições e acompanhe o status"
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          {/* Left: tabs + table */}
          <div className={`${hasSidePanel ? 'w-1/2 min-w-0' : 'w-full'} flex flex-col overflow-hidden transition-all`}>
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

            {/* Table content */}
            <div className="flex-1 overflow-hidden min-h-0">
              {loading ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                    <p className="mt-2 text-muted-foreground">Carregando...</p>
                  </div>
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

          {/* Right: approval panel (desktop only) */}
          {hasSidePanel && !isMobile && (
            <div className="w-1/2 min-w-0">
              <ApprovalModal
                inPage
                request={selectedRequest}
                onClose={handleClosePanel}
                onSuccess={handleApprovalSuccess}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile: modal overlay */}
      {isMobile && selectedRequest && (
        <ApprovalModal
          request={selectedRequest}
          onClose={handleClosePanel}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </PageContainer>
  )
}
