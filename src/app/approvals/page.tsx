'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/Icon'

import { formatDate, getStatusColor } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { ApproveRequestModal } from '@/components/approvals/ApproveRequestModal'

interface Request {
  id: string
  title: string
  description?: string
  priority: string
  status: string
  dueDate?: string
  createdBy?: { firstName: string; lastName: string; email: string }
  team?: { id: string; name: string }
  files?: Array<{ id: string; name: string; url: string }>
  createdAt: string
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    loadPendingRequests()
  }, [])

  const loadPendingRequests = async () => {
    try {
      const res = await fetch('/api/requests/pending')
      const data = await res.json()
      
      if (res.ok) {
        setRequests(data.data || [])
        setUserRole(data.userRole || '')
      } else {
        alert(data.error || 'Erro ao carregar solicitações')
      }
    } catch (error) {
      console.error('Error loading requests:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (assignedToId?: string) => {
    if (!selectedRequest) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Solicitação aprovada! Ordem de Serviço criada com sucesso.')
        setShowApproveModal(false)
        setSelectedRequest(null)
        loadPendingRequests()
      } else {
        alert(data.error || 'Erro ao aprovar solicitação')
      }
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setProcessing(false)
    }
  }

  const openApproveModal = (request: Request) => {
    setSelectedRequest(request)
    setShowApproveModal(true)
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    if (!rejectionReason.trim()) {
      alert('Por favor, informe o motivo da rejeição')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Solicitação rejeitada com sucesso.')
        setShowRejectModal(false)
        setSelectedRequest(null)
        setRejectionReason('')
        loadPendingRequests()
      } else {
        alert(data.error || 'Erro ao rejeitar solicitação')
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setProcessing(false)
    }
  }

  const openRejectModal = (request: Request) => {
    setSelectedRequest(request)
    setShowRejectModal(true)
    setRejectionReason('')
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '🔴 Alta'
      case 'MEDIUM': return '🟡 Média'
      case 'LOW': return '🟢 Baixa'
      default: return 'Nenhuma'
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="check_circle" className="text-3xl text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Aprovações de Solicitações
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {userRole === 'SUPER_ADMIN' 
              ? 'Você pode ver e aprovar TODAS as solicitações pendentes' 
              : 'Você pode ver e aprovar solicitações atribuídas à sua equipe'}
          </p>
          {requests.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Icon name="error" className="text-xl text-orange-600" />
              <span className="text-sm font-medium text-orange-600">
                {requests.length} solicitação(ões) aguardando aprovação
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Icon name="check_circle" className="text-6xl text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground mb-2">
                Nenhuma solicitação pendente
              </p>
              <p className="text-muted-foreground">
                Todas as solicitações foram processadas!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {requests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Icon name="description" className="text-2xl text-primary" />
                        <h3 className="text-xl font-semibold text-foreground">
                          {request.title}
                        </h3>
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                          {request.priority !== 'NONE' && (
                            <Badge className="bg-orange-100 text-orange-800">
                              {getPriorityLabel(request.priority)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {request.description && (
                        <p className="text-muted-foreground mb-4">
                          {request.description}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        {request.createdBy && (
                          <div className="flex items-center gap-2">
                            <Icon name="group" className="text-base" />
                            <div>
                              <p className="font-medium text-foreground">Solicitado por:</p>
                              <p>{request.createdBy.firstName} {request.createdBy.lastName}</p>
                              <p className="text-xs">{request.createdBy.email}</p>
                            </div>
                          </div>
                        )}
                        
                        {request.team && (
                          <div className="flex items-center gap-2">
                            <Icon name="group" className="text-base" />
                            <div>
                              <p className="font-medium text-foreground">Equipe:</p>
                              <p>{request.team.name}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Icon name="calendar_today" className="text-base" />
                          <div>
                            <p className="font-medium text-foreground">Criado em:</p>
                            <p>{formatDate(request.createdAt)}</p>
                            {request.dueDate && (
                              <p className="text-xs text-orange-600">Desejado: {formatDate(request.dueDate)}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {request.files && request.files.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <Icon name="attach_file" className="text-base" />
                          <span>{request.files.length} arquivo(s) anexado(s)</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => openApproveModal(request)}
                        disabled={processing}
                        className="bg-success hover:bg-green-700 text-white flex items-center gap-2"
                      >
                        <Icon name="check_circle" className="text-base" />
                        Aprovar
                      </Button>
                      <Button
                        onClick={() => openRejectModal(request)}
                        disabled={processing}
                        variant="outline"
                        className="border-red-600 text-danger hover:bg-danger-light flex items-center gap-2"
                      >
                        <Icon name="cancel" className="text-base" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Aprovação */}
      <ApproveRequestModal
        isOpen={showApproveModal}
        onClose={() => {
          if (!processing) {
            setShowApproveModal(false)
            setSelectedRequest(null)
          }
        }}
        request={selectedRequest}
        onApprove={handleApprove}
        processing={processing}
      />

      {/* Modal de Rejeição */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          if (!processing) {
            setShowRejectModal(false)
            setSelectedRequest(null)
            setRejectionReason('')
          }
        }}
        title="Rejeitar Solicitação"
      >
        <div className="space-y-4">
          <div>
            <p className="text-foreground mb-2">
              Você está prestes a rejeitar a solicitação:
            </p>
            <p className="font-semibold text-foreground">
              {selectedRequest?.title}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Motivo da rejeição *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="Explique o motivo da rejeição..."
              disabled={processing}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false)
                setSelectedRequest(null)
                setRejectionReason('')
              }}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
              className="bg-danger hover:bg-red-700 text-white"
            >
              {processing ? 'Processando...' : 'Confirmar Rejeição'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
