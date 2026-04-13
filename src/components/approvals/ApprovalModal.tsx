'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { Modal } from '../ui/Modal'
import { ModalSection } from '../ui/ModalSection'
import { Button } from '../ui/Button'
import { ImageViewerModal } from '../ui/ImageViewerModal'
import { formatDate } from '@/lib/utils'
import { getRequestStatusLabel, getWorkOrderPriorityLabel } from '@/lib/status-labels'

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
  inPage?: boolean
}

export function ApprovalModal({ request, onClose, onSuccess, inPage = false }: ApprovalModalProps) {
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

  const loadRequestDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${request.id}`)
      const data = await res.json()
      if (data.data) {
        setRequestDetails(data.data)
      }
    } catch {
      console.error('Error loading request details')
    }
  }, [request.id])

  const loadTechnicians = useCallback(async () => {
    setLoadingTechs(true)
    try {
      const res = await fetch('/api/users?role=MECANICO,ELETRICISTA,OPERADOR,CONSTRUTOR_CIVIL')
      const data = await res.json()
      setTechnicians(data.data || [])
    } catch {
      console.error('Error loading technicians')
    } finally {
      setLoadingTechs(false)
    }
  }, [])

  useEffect(() => {
    async function bootstrapModal() {
      await Promise.all([loadTechnicians(), loadRequestDetails()])
    }

    void bootstrapModal()
  }, [loadRequestDetails, loadTechnicians])

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
    } catch {
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

  const currentRequest = requestDetails || request

  const formContent = (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
      className={inPage ? 'flex flex-1 min-h-0 flex-col' : undefined}
    >
      <div className={inPage ? 'flex-1 overflow-y-auto p-4 space-y-3' : 'p-4 space-y-3'}>
        <ModalSection title="Identificação">
          <div className="space-y-3">
            <div className="rounded-[4px] border border-border bg-surface-low p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground">{request.title}</p>
                  {currentRequest.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {currentRequest.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${getPriorityColor(request.priority)}`}>
                    {getWorkOrderPriorityLabel(request.priority)}
                  </span>
                  <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-info-light-foreground">
                    {getRequestStatusLabel(request.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {request.createdBy && (
                <InfoCard
                  icon="person"
                  label="Solicitado por"
                  value={`${request.createdBy.firstName} ${request.createdBy.lastName}`}
                  extra={request.createdBy.email}
                />
              )}
              {request.team && (
                <InfoCard
                  icon="group"
                  label="Equipe atribuída"
                  value={request.team.name}
                />
              )}
              {currentRequest.asset && (
                <InfoCard
                  icon="inventory_2"
                  label="Ativo"
                  value={currentRequest.asset.name}
                />
              )}
              {currentRequest.location && (
                <InfoCard
                  icon="location_on"
                  label="Localização"
                  value={currentRequest.location.name}
                />
              )}
              {request.dueDate && (
                <InfoCard
                  icon="calendar_today"
                  label="Data desejada"
                  value={formatDate(request.dueDate)}
                />
              )}
              <InfoCard
                icon="schedule"
                label="Criado em"
                value={formatDate(request.createdAt)}
              />
            </div>
          </div>
        </ModalSection>

        {currentRequest.files && currentRequest.files.length > 0 && (
          <ModalSection title={`Anexos (${currentRequest.files.length})`} defaultOpen={false}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {currentRequest.files.map((file) => (
                <div key={file.id} className="rounded-[4px] border border-border bg-card p-3">
                  {file.type?.startsWith('image/') ? (
                    <button
                      type="button"
                      onClick={() => setImageViewer({ url: file.url, name: file.name })}
                      className="block w-full text-left"
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-32 w-full rounded-[4px] border border-input object-cover"
                      />
                      <p className="mt-2 truncate text-sm font-medium text-foreground">{file.name}</p>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Icon name="description" className="text-2xl text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.open(file.url, '_blank')}
                        className="rounded-[4px] p-1.5 text-primary transition-colors hover:bg-primary/5"
                        title="Baixar"
                      >
                        <Icon name="download" className="text-base" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ModalSection>
        )}

        <ModalSection title="Decisão">
          <div className="space-y-3">
            {error && (
              <div className="rounded-[4px] border border-red-200 bg-danger-light p-3 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="button"
                aria-pressed={action === 'approve'}
                onClick={() => {
                  setAction('approve')
                  setRejectionReason('')
                  setError(null)
                }}
                className={`rounded-[4px] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  action === 'approve'
                    ? 'border-success bg-success-light shadow-sm'
                    : 'border-green-200 bg-success-light/60 hover:border-success/40 hover:bg-success-light'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon name="check_circle" className={`text-2xl ${action === 'approve' ? 'text-success' : 'text-success/70'}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Aprovar solicitação</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Libera a solicitação e permite atribuir execução imediatamente.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                aria-pressed={action === 'reject'}
                onClick={() => {
                  setAction('reject')
                  setConvertToWorkOrder(false)
                  setAssignedToId('')
                  setError(null)
                }}
                className={`rounded-[4px] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  action === 'reject'
                    ? 'border-danger bg-danger-light shadow-sm'
                    : 'border-red-200 bg-danger-light/60 hover:border-danger/40 hover:bg-danger-light'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon name="cancel" className={`text-2xl ${action === 'reject' ? 'text-danger' : 'text-danger/70'}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Rejeitar solicitação</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Exige justificativa para encerrar a análise sem aprovação.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {action === 'approve' && (
              <div className="space-y-3 rounded-[4px] border border-green-200 bg-success-light p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={convertToWorkOrder}
                    onChange={(e) => {
                      setConvertToWorkOrder(e.target.checked)
                      if (e.target.checked) setAssignedToId('')
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-input text-success focus:ring-ring"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Converter em Ordem de Serviço (OS)</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ao marcar esta opção, o sistema cria automaticamente uma OS.
                    </p>
                  </div>
                </label>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {convertToWorkOrder ? 'Atribuir Técnico à OS (opcional)' : 'Atribuir Técnico *'}
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full rounded-[4px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={loadingTechs}
                  >
                    <option value="">{convertToWorkOrder ? 'Atribuir depois...' : 'Selecione um técnico...'}</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.firstName} {tech.lastName} - {tech.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {action === 'reject' && (
              <div className="space-y-3 rounded-[4px] border border-red-200 bg-danger-light p-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Motivo da Rejeição *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={5}
                    className="w-full rounded-[4px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Descreva o motivo da rejeição..."
                  />
                </div>
              </div>
            )}
          </div>
        </ModalSection>
      </div>

      <div className="flex gap-3 px-4 py-4 border-t border-gray-200 bg-gray-50">
        <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!action || loading}
          className={`flex-1 ${
            action === 'approve'
              ? 'bg-success text-white hover:bg-success/90'
              : action === 'reject'
              ? 'bg-danger text-white hover:bg-danger/90'
              : ''
          }`}
        >
          {loading ? 'Processando...' : action === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
        </Button>
      </div>
    </form>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-black text-gray-900">Analisar Solicitação</h2>
          <PanelCloseButton onClick={onClose} />
        </div>

        {formContent}

        {imageViewer && (
          <ImageViewerModal
            isOpen={!!imageViewer}
            onClose={() => setImageViewer(null)}
            imageUrl={imageViewer.url}
            imageName={imageViewer.name}
          />
        )}
      </div>
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Analisar Solicitação" size="wide">
      {formContent}

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

function InfoCard({
  icon,
  label,
  value,
  extra,
}: {
  icon: string
  label: string
  value: string
  extra?: string
}) {
  return (
    <div className="rounded-[4px] border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <Icon name={icon} className="mt-0.5 text-xl text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
          {extra && <p className="mt-1 text-xs text-muted-foreground">{extra}</p>}
        </div>
      </div>
    </div>
  )
}
