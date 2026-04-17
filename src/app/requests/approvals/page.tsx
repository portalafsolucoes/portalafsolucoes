'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
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
type SortField = 'title' | 'priority' | 'createdBy' | 'team' | 'createdAt' | 'type' | 'technician' | 'approvedBy' | 'approvedAt' | 'rejectedBy'
type SortDirection = 'asc' | 'desc'

export default function RequestApprovalsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const { isPhone } = useResponsiveLayout()
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const showSidePanel = selectedRequest !== null

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const sortedRequests = [...requests].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'title':
        return modifier * (a.title || '').localeCompare(b.title || '')
      case 'priority':
        return modifier * (a.priority || '').localeCompare(b.priority || '')
      case 'createdBy': {
        const aName = `${a.createdBy?.firstName || ''} ${a.createdBy?.lastName || ''}`.trim()
        const bName = `${b.createdBy?.firstName || ''} ${b.createdBy?.lastName || ''}`.trim()
        return modifier * aName.localeCompare(bName)
      }
      case 'team':
        return modifier * (a.team?.name || '').localeCompare(b.team?.name || '')
      case 'createdAt':
        return modifier * (a.createdAt || '').localeCompare(b.createdAt || '')
      case 'type': {
        const aType = a.convertToWorkOrder ? 'OS' : 'SS'
        const bType = b.convertToWorkOrder ? 'OS' : 'SS'
        return modifier * aType.localeCompare(bType)
      }
      case 'technician': {
        const aTech = `${a.assignedTo?.firstName || ''} ${a.assignedTo?.lastName || ''}`.trim()
        const bTech = `${b.assignedTo?.firstName || ''} ${b.assignedTo?.lastName || ''}`.trim()
        return modifier * aTech.localeCompare(bTech)
      }
      case 'approvedBy': {
        const aApprover = `${a.approvedBy?.firstName || ''} ${a.approvedBy?.lastName || ''}`.trim()
        const bApprover = `${b.approvedBy?.firstName || ''} ${b.approvedBy?.lastName || ''}`.trim()
        return modifier * aApprover.localeCompare(bApprover)
      }
      case 'approvedAt':
        return modifier * (a.approvedAt || '').localeCompare(b.approvedAt || '')
      case 'rejectedBy': {
        const aRej = `${a.approvedBy?.firstName || ''} ${a.approvedBy?.lastName || ''}`.trim()
        const bRej = `${b.approvedBy?.firstName || ''} ${b.approvedBy?.lastName || ''}`.trim()
        return modifier * aRej.localeCompare(bRej)
      }
      default:
        return 0
    }
  })

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

  const renderMobileCards = (variant: 'pending' | 'approved' | 'rejected') => (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="overflow-auto flex-1 p-4">
        {sortedRequests.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
            <Icon name={variant === 'pending' ? 'schedule' : variant === 'approved' ? 'check_circle' : 'cancel'} className="text-4xl" />
            <p className="text-sm">
              {variant === 'pending' ? 'Nenhuma solicitação pendente' : variant === 'approved' ? 'Nenhuma solicitação aprovada' : 'Nenhuma solicitação rejeitada'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sortedRequests.map((request) => (
              <div
                key={request.id}
                onClick={() => handleSelectRequest(request)}
                className={`bg-card rounded-[4px] ambient-shadow p-4 cursor-pointer transition-all ${selectedRequest?.id === request.id ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold text-foreground min-w-0 truncate">{request.title}</h3>
                  {variant === 'pending' && getPriorityBadge(request.priority)}
                </div>
                {request.description && variant === 'pending' && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{request.description}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {variant === 'pending' && (
                    <>
                      {request.createdBy && <span>Solicitante: <span className="text-foreground">{request.createdBy.firstName} {request.createdBy.lastName}</span></span>}
                      {request.team?.name && <span>Equipe: <span className="text-foreground">{request.team.name}</span></span>}
                      <span>Criado: <span className="text-foreground">{formatDate(request.createdAt)}</span></span>
                    </>
                  )}
                  {variant === 'approved' && (
                    <>
                      {request.assignedTo && <span>Técnico: <span className="text-foreground">{request.assignedTo.firstName} {request.assignedTo.lastName}</span></span>}
                      {request.approvedBy && <span>Aprov. por: <span className="text-foreground">{request.approvedBy.firstName} {request.approvedBy.lastName}</span></span>}
                      {request.approvedAt && <span>Em: <span className="text-foreground">{formatDate(request.approvedAt)}</span></span>}
                    </>
                  )}
                  {variant === 'rejected' && (
                    <>
                      {request.createdBy && <span>Solicitante: <span className="text-foreground">{request.createdBy.firstName} {request.createdBy.lastName}</span></span>}
                      {request.approvedBy && <span>Rejeit. por: <span className="text-foreground">{request.approvedBy.firstName} {request.approvedBy.lastName}</span></span>}
                    </>
                  )}
                </div>
                {variant === 'rejected' && request.rejectionReason && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{request.rejectionReason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderPendingTable = () => (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('title')} className="flex items-center gap-1">
                  <span>Título</span>
                  {renderSortIcon('title')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('priority')} className="flex items-center gap-1">
                  <span>Prioridade</span>
                  {renderSortIcon('priority')}
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
                <button type="button" onClick={() => handleSort('createdAt')} className="flex items-center gap-1">
                  <span>Criado em</span>
                  {renderSortIcon('createdAt')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-100">
            {sortedRequests.map((request) => (
              <tr
                key={request.id}
                onClick={() => handleSelectRequest(request)}
                className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selectedRequest?.id === request.id ? 'bg-secondary' : ''}`}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('title')} className="flex items-center gap-1">
                  <span>Título</span>
                  {renderSortIcon('title')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('type')} className="flex items-center gap-1">
                  <span>Tipo</span>
                  {renderSortIcon('type')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('technician')} className="flex items-center gap-1">
                  <span>Técnico</span>
                  {renderSortIcon('technician')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Execução</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('approvedBy')} className="flex items-center gap-1">
                  <span>Aprovado por</span>
                  {renderSortIcon('approvedBy')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('approvedAt')} className="flex items-center gap-1">
                  <span>Aprovado em</span>
                  {renderSortIcon('approvedAt')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-100">
            {sortedRequests.map((request) => (
              <tr
                key={request.id}
                onClick={() => handleSelectRequest(request)}
                className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selectedRequest?.id === request.id ? 'bg-secondary' : ''}`}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('title')} className="flex items-center gap-1">
                  <span>Título</span>
                  {renderSortIcon('title')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('createdBy')} className="flex items-center gap-1">
                  <span>Solicitante</span>
                  {renderSortIcon('createdBy')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('rejectedBy')} className="flex items-center gap-1">
                  <span>Rejeitado por</span>
                  {renderSortIcon('rejectedBy')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Motivo</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-100">
            {sortedRequests.map((request) => (
              <tr
                key={request.id}
                onClick={() => handleSelectRequest(request)}
                className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selectedRequest?.id === request.id ? 'bg-secondary' : ''}`}
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

  const activePanel = selectedRequest ? (
    <ApprovalModal
      inPage
      request={selectedRequest}
      onClose={handleClosePanel}
      onSuccess={handleApprovalSuccess}
    />
  ) : null

  const listContent = (
    <div className="flex flex-col h-full overflow-hidden">
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
            {activeTab === 'pending' && (isPhone ? renderMobileCards('pending') : renderPendingTable())}
            {activeTab === 'approved' && (isPhone ? renderMobileCards('approved') : renderApprovedTable())}
            {activeTab === 'rejected' && (isPhone ? renderMobileCards('rejected') : renderRejectedTable())}
          </>
        )}
      </div>
    </div>
  )

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
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle="Solicitação"
            onClosePanel={handleClosePanel}
          />
        </div>
      </div>
    </PageContainer>
  )
}
