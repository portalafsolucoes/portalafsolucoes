'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, XCircle, User, FileText, Users, Calendar, Clock, MapPin, Box, Paperclip, Download } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ImageViewerModal } from '../ui/ImageViewerModal'
import { formatDate } from '@/lib/utils'

interface Request {
  id: string
  title: string
  description?: string
  priority: string
  status: string
  createdBy?: { id: string; firstName: string; lastName: string; email: string }
  team?: { id: string; name: string }
  asset?: { id: string; name: string }
  location?: { id: string; name: string }
  dueDate?: string
  rejectionReason?: string
  files?: Array<{ id: string; name: string; url: string; type?: string }>
  createdAt: string
}

interface Technician {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface ApprovalModalProps {
  request: Request
  onClose: () => void
  onSuccess: () => void
}

export function ApprovalModal({ request, onClose, onSuccess }: ApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [convertToWorkOrder, setConvertToWorkOrder] = useState(false)
  const [assignedToId, setAssignedToId] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTechs, setLoadingTechs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestDetails, setRequestDetails] = useState<Request | null>(null)
  const [imageViewer, setImageViewer] = useState<{url: string; name: string} | null>(null)

  useEffect(() => {
    loadTechnicians()
    loadRequestDetails()
  }, [])

  const loadRequestDetails = async () => {
    try {
      const res = await fetch(`/api/requests/${request.id}`)
      const data = await res.json()
      if (data.data) {
        setRequestDetails(data.data)
      }
    } catch (error) {
      console.error('Error loading request details:', error)
    }
  }

  const loadTechnicians = async () => {
    setLoadingTechs(true)
    try {
      const res = await fetch('/api/users?role=MECANICO,ELETRICISTA,OPERADOR,CONSTRUTOR_CIVIL')
      const data = await res.json()
      setTechnicians(data.data || [])
    } catch (error) {
      console.error('Error loading technicians:', error)
    } finally {
      setLoadingTechs(false)
    }
  }

  const handleSubmit = async () => {
    if (!action) return

    setError(null)

    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Por favor, informe o motivo da rejeição')
      return
    }

    if (action === 'approve' && !convertToWorkOrder && !assignedToId) {
      setError('Por favor, atribua um técnico para executar esta solicitação')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: action === 'approve',
          convertToWorkOrder,
          assignedToId: assignedToId || undefined,
          rejectionReason: action === 'reject' ? rejectionReason : undefined
        })
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao processar solicitação')
      }
    } catch (error) {
      setError('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-danger-light text-danger-light-foreground'
      case 'MEDIUM': return 'bg-warning-light text-warning-light-foreground'
      case 'LOW': return 'bg-success-light text-success-light-foreground'
      default: return 'bg-muted text-foreground'
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

  return (
    <Modal isOpen={true} onClose={onClose} size="xl" hideHeader>
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-border">
          <div className="flex-1 w-full">
            <div className="flex items-start gap-3 mb-3">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-primary flex-shrink-0 mt-1" />
              <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight break-words">{request.title}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                {getPriorityLabel(request.priority)}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-blue-800">
                {request.status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors self-start sm:self-auto"
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-6 px-1 space-y-8">
          {/* Descrição */}
          {request.description && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Descrição</h3>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed bg-secondary p-4 rounded-lg border border-border">{request.description}</p>
            </div>
          )}

          {/* Informações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {request.createdBy && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Solicitado por</p>
                  <p className="text-sm text-muted-foreground">
                    {request.createdBy.firstName} {request.createdBy.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{request.createdBy.email}</p>
                </div>
              </div>
            )}

            {request.team && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Equipe Atribuída</p>
                  <p className="text-sm text-muted-foreground">{request.team.name}</p>
                </div>
              </div>
            )}

            {requestDetails?.asset && (
              <div className="flex items-start gap-3">
                <Box className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Ativo</p>
                  <p className="text-sm text-muted-foreground">{requestDetails.asset.name}</p>
                </div>
              </div>
            )}

            {requestDetails?.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Localização</p>
                  <p className="text-sm text-muted-foreground">{requestDetails.location.name}</p>
                </div>
              </div>
            )}

            {request.dueDate && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Data Desejada</p>
                  <p className="text-sm text-muted-foreground">{formatDate(request.dueDate)}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Criado em</p>
                <p className="text-sm text-muted-foreground">{formatDate(request.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Imagens e Anexos */}
          {requestDetails?.files && requestDetails.files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Anexos ({requestDetails.files.length})</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {requestDetails.files.map((file) => (
                  <div key={file.id} className="relative group">
                    {file.type?.startsWith('image/') ? (
                      <div className="relative">
                        <img 
                          src={file.url} 
                          alt={file.name}
                          className="w-full h-32 object-cover rounded-lg border-2 border-input cursor-pointer hover:border-primary transition-all"
                          onClick={() => setImageViewer({url: file.url, name: file.name})}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg truncate">
                          {file.name}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg border border-border hover:border-blue-400 transition-all">
                        <FileText className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                        </div>
                        <button 
                          onClick={() => window.open(file.url, '_blank')}
                          className="p-1.5 text-primary hover:bg-primary/5 rounded transition-colors"
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divisor */}
          <div className="border-t border-border pt-8 space-y-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Decisão de Aprovação</h3>
            
            {/* Erro */}
            {error && (
              <div className="p-4 bg-danger-light border border-red-200 rounded-lg">
                <p className="text-sm text-danger font-medium">{error}</p>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <button
                onClick={() => {
                  setAction('approve')
                  setRejectionReason('')
                  setError(null)
                }}
                className={`p-8 sm:p-6 border-2 rounded-xl transition-all shadow-sm hover:shadow-md ${
                  action === 'approve'
                    ? 'border-green-500 bg-success-light shadow-green-100'
                    : 'border-input hover:border-green-400 hover:bg-success-light/30'
                }`}
              >
                <CheckCircle className={`w-14 h-14 sm:w-12 sm:h-12 mx-auto mb-4 transition-colors ${
                  action === 'approve' ? 'text-success' : 'text-muted-foreground'
                }`} />
                <p className={`font-semibold text-center text-base sm:text-sm ${
                  action === 'approve' ? 'text-success' : 'text-foreground'
                }`}>
                  Aprovar Solicitação
                </p>
              </button>
              <button
                onClick={() => {
                  setAction('reject')
                  setConvertToWorkOrder(false)
                  setAssignedToId('')
                  setError(null)
                }}
                className={`p-8 sm:p-6 border-2 rounded-xl transition-all shadow-sm hover:shadow-md ${
                  action === 'reject'
                    ? 'border-red-500 bg-danger-light shadow-red-100'
                    : 'border-input hover:border-red-400 hover:bg-danger-light/30'
                }`}
              >
                <XCircle className={`w-14 h-14 sm:w-12 sm:h-12 mx-auto mb-4 transition-colors ${
                  action === 'reject' ? 'text-danger' : 'text-muted-foreground'
                }`} />
                <p className={`font-semibold text-center text-base sm:text-sm ${
                  action === 'reject' ? 'text-danger' : 'text-foreground'
                }`}>
                  Rejeitar Solicitação
                </p>
              </button>
            </div>

            {/* Opções de Aprovação */}
            {action === 'approve' && (
              <div className="space-y-5 p-5 sm:p-6 bg-success-light border-2 border-green-200 rounded-xl">
                <div>
                  <label className="flex items-start space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={convertToWorkOrder}
                      onChange={(e) => {
                        setConvertToWorkOrder(e.target.checked)
                        if (e.target.checked) {
                          setAssignedToId('')
                        }
                      }}
                      className="w-5 h-5 mt-0.5 text-success rounded focus:ring-green-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-foreground group-hover:text-success transition-colors flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Converter em Ordem de Serviço (OS)
                      </span>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        Ao marcar esta opção, uma OS será criada automaticamente
                      </p>
                    </div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {convertToWorkOrder ? 'Atribuir Técnico à OS (opcional)' : 'Atribuir Técnico *'}
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-card text-foreground"
                    disabled={loadingTechs}
                  >
                    <option value="">{convertToWorkOrder ? 'Atribuir depois...' : 'Selecione um técnico...'}</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.firstName} {tech.lastName} - {tech.email}
                      </option>
                    ))}
                  </select>
                  {!convertToWorkOrder && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Técnico responsável por executar esta solicitação
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Motivo de Rejeição */}
            {action === 'reject' && (
              <div className="space-y-3 p-5 sm:p-6 bg-danger-light border-2 border-red-200 rounded-xl">
                <label className="block text-sm font-semibold text-foreground">
                  Motivo da Rejeição *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-all bg-card text-foreground"
                  placeholder="Descreva o motivo da rejeição..."
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Explique de forma clara o motivo da rejeição desta solicitação
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!action || loading}
            className={`w-full sm:w-auto px-6 py-3 font-semibold ${
              action === 'approve'
                ? 'bg-success hover:bg-green-700 text-white'
                : action === 'reject'
                ? 'bg-danger hover:bg-red-700 text-white'
                : ''
            }`}
          >
            {loading ? 'Processando...' : action === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
          </Button>
        </div>
      </div>
      
      {imageViewer && (
        <ImageViewerModal
          isOpen={!!imageViewer}
          onClose={() => setImageViewer(null)}
          imageUrl={imageViewer.url}
          imageName={imageViewer.name}
        />
      )}
    </Modal>
  )
}
