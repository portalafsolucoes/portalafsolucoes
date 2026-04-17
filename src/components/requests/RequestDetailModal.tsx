'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ImageViewerModal } from '../ui/ImageViewerModal'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { PanelActionButtons } from '@/components/ui/PanelActionButtons'
import { formatDate, formatDateTime, getPriorityColor, getStatusColor } from '@/lib/utils'

interface BasicUser {
  id: string
  firstName: string
  lastName: string
  email?: string | null
}

interface RequestFile {
  id?: string
  name: string
  url: string
  type?: string | null
  size?: number | null
}

interface RequestTeam {
  id: string
  name: string
}

interface GeneratedWorkOrder {
  id: string
  title: string
  status: string
  externalId?: string | null
  internalId?: string | null
}

interface RequestAsset {
  id: string
  name: string
  protheusCode?: string | null
  tag?: string | null
  parentAssetId?: string | null
}

interface LinkedRaf {
  id: string
  rafNumber?: string | null
}

interface RequestDetail {
  id: string
  requestNumber?: string | null
  title: string
  description?: string | null
  priority: string
  status: string
  dueDate?: string | null
  createdAt?: string | null
  teamApprovalStatus?: string | null
  workOrderId?: string | null
  createdBy?: BasicUser | null
  team?: RequestTeam | null
  files?: RequestFile[]
  asset?: RequestAsset | null
  generatedWorkOrder?: GeneratedWorkOrder | null
  failureAnalysisReport?: LinkedRaf | null
  executionStartedAt?: string | null
  executionCompletedAt?: string | null
  executionNotes?: string | null
  beforePhotoUrl?: string | null
  afterPhotoUrl?: string | null
}

interface GenerateWorkOrderPayload {
  requestId: string
  description: string
  priority: string
  dueDate?: string | null
  assetId?: string | null
  title: string
}

interface GenerateRafPayload {
  requestId: string
  failureDescription?: string | null
  occurrenceDate?: string | null
  area?: string | null
  equipment?: string | null
}

interface RequestDetailModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit: (request: any) => void
  onDelete: (requestId: string) => void
  onFinalize?: () => void
  onGenerateWorkOrder?: (payload: GenerateWorkOrderPayload) => void
  onGenerateRaf?: (payload: GenerateRafPayload) => void
  onPrint?: (requestId: string) => void
  inPage?: boolean
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: ReactNode
}) {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="mb-4 flex items-center gap-3 rounded-md border border-gray-200 bg-gray-100 p-2.5 shadow-sm">
        <Icon name={icon} className="text-base text-gray-600" />
        <span className="font-bold text-[12px] uppercase tracking-wider text-gray-900">{title}</span>
      </div>
      {children}
    </div>
  )
}

function DetailField({
  label,
  value,
  className = '',
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="break-words text-[13px] font-medium text-gray-900">{value}</div>
    </div>
  )
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'HIGH':
      return 'Alta'
    case 'MEDIUM':
      return 'Média'
    case 'LOW':
      return 'Baixa'
    default:
      return 'Nenhuma'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pendente'
    case 'APPROVED':
      return 'Aprovada'
    case 'REJECTED':
      return 'Rejeitada'
    case 'CANCELLED':
      return 'Cancelada'
    case 'COMPLETED':
      return 'Finalizada'
    default:
      return status
  }
}

function getApprovalStatusLabel(status?: string | null): string {
  switch (status) {
    case 'PENDING':
      return 'Pendente'
    case 'APPROVED':
      return 'Aprovada'
    case 'REJECTED':
      return 'Rejeitada'
    default:
      return 'Nenhuma'
  }
}

function isImageFile(file: RequestFile): boolean {
  if (file.type?.startsWith('image/')) {
    return true
  }

  const lowerName = `${file.name || file.url}`.toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico'].some((ext) => lowerName.endsWith(ext))
}

export function RequestDetailModal({
  isOpen,
  onClose,
  requestId,
  onEdit,
  onDelete,
  onFinalize,
  onGenerateWorkOrder,
  onGenerateRaf,
  onPrint,
  inPage = false,
}: RequestDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageViewer, setImageViewer] = useState<{ url: string; name: string } | null>(null)
  const [finalizing, setFinalizing] = useState(false)

  const shouldLoad = inPage ? !!requestId : isOpen && !!requestId

  useEffect(() => {
    if (!shouldLoad) {
      return
    }

    const controller = new AbortController()
    let ignore = false

    const loadRequest = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/requests/${requestId}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          if (!ignore) {
            setRequest(null)
            setError(response.status === 404 ? 'Solicitação não encontrada.' : 'Erro ao carregar solicitação.')
          }
          return
        }

        const data = await response.json() as { data?: RequestDetail }

        if (!ignore) {
          if (data.data) {
            setRequest(data.data)
          } else {
            setRequest(null)
            setError('Solicitação não encontrada.')
          }
        }
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return
        }

        console.error('Error loading request:', loadError)
        if (!ignore) {
          setRequest(null)
          setError('Erro ao conectar ao servidor.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void loadRequest()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [requestId, shouldLoad])

  const handleEdit = () => {
    if (!request) {
      return
    }

    onEdit(request)
    if (!inPage) {
      onClose()
    }
  }

  const handleDelete = () => {
    if (!request) {
      return
    }

    onDelete(request.id)
    if (!inPage) {
      onClose()
    }
  }

  const handleFinalize = async () => {
    if (!request) return

    // Se tem OS vinculada não-finalizada, bloquear
    if (request.generatedWorkOrder && request.generatedWorkOrder.status !== 'COMPLETE') {
      alert('Não é possível finalizar a solicitação enquanto a OS vinculada estiver em aberto.')
      return
    }

    if (!confirm('Deseja finalizar esta solicitação?')) return

    setFinalizing(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/finalize`, { method: 'POST' })
      if (res.ok) {
        if (onFinalize) onFinalize()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao finalizar solicitação')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    } finally {
      setFinalizing(false)
    }
  }

  const handleGenerateWorkOrder = () => {
    if (!request || !onGenerateWorkOrder) return
    onGenerateWorkOrder({
      requestId: request.id,
      title: request.title,
      description: request.description || request.title,
      priority: request.priority,
      dueDate: request.dueDate ?? null,
      assetId: request.asset?.id ?? null,
    })
  }

  const handleGenerateRaf = () => {
    if (!request || !onGenerateRaf) return
    onGenerateRaf({
      requestId: request.id,
      failureDescription: request.description || request.title,
      occurrenceDate: request.createdAt ?? null,
      area: null,
      equipment: request.asset?.name ?? null,
    })
  }

  const handlePrint = () => {
    if (!request || !onPrint) return
    onPrint(request.id)
  }

  const files = useMemo(
    () => request?.files ?? [],
    [request?.files]
  )
  const imageFiles = useMemo(
    () => files.filter(isImageFile),
    [files]
  )
  const documentFiles = useMemo(
    () => files.filter((file) => !isImageFile(file)),
    [files]
  )

  const content = loading ? (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : error ? (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <Icon name="description" className="mx-auto mb-4 text-5xl text-muted-foreground" />
        <p className="mb-1 text-sm font-medium text-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">
          A solicitação pode ter sido excluída ou você não tem permissão para visualizá-la.
        </p>
        {!inPage && (
          <div className="mt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  ) : request ? (
    <div className="flex-1 overflow-y-auto">
      <PanelActionButtons
        onEdit={request.status !== 'COMPLETED' ? handleEdit : undefined}
        onPrint={handlePrint}
        onGenerateWorkOrder={request.status === 'APPROVED' && !request.workOrderId && !request.generatedWorkOrder ? handleGenerateWorkOrder : undefined}
        onGenerateRaf={onGenerateRaf && request.status === 'APPROVED' && !request.failureAnalysisReport ? handleGenerateRaf : undefined}
        onFinalize={request.status === 'APPROVED' && !finalizing ? handleFinalize : undefined}
        onDelete={request.status !== 'COMPLETED' ? handleDelete : undefined}
      />

      <DetailSection title="Resumo da Solicitação" icon="description">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 px-1">
            <span className={`rounded-md border border-gray-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide shadow-sm ${getPriorityColor(request.priority)}`}>
              {getPriorityLabel(request.priority)}
            </span>
            <span className={`rounded-md border border-gray-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide shadow-sm ${getStatusColor(request.status)}`}>
              {getStatusLabel(request.status)}
            </span>
            {request.teamApprovalStatus && (
              <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-900 shadow-sm">
                {getApprovalStatusLabel(request.teamApprovalStatus)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-1 sm:grid-cols-2">
            <DetailField
              label="Título"
              value={request.title}
              className="sm:col-span-2"
            />
            <DetailField
              label="Descrição"
              value={request.description || 'Sem descrição'}
              className="sm:col-span-2"
            />
            {request.createdBy && (
              <DetailField
                label="Solicitado por"
                value={`${request.createdBy.firstName} ${request.createdBy.lastName}`}
              />
            )}
            {request.team && (
              <DetailField
                label="Equipe Atribuída"
                value={request.team.name}
              />
            )}
            {request.dueDate && (
              <DetailField
                label="Data Desejada"
                value={formatDate(request.dueDate)}
              />
            )}
            {request.createdAt && (
              <DetailField
                label="Criado em"
                value={formatDateTime(request.createdAt)}
              />
            )}
            {request.generatedWorkOrder && (
              <DetailField
                label="OS Gerada"
                className="sm:col-span-2"
                value={
                  <span>
                    <span className="font-semibold">
                      {request.generatedWorkOrder.externalId || request.generatedWorkOrder.internalId || request.generatedWorkOrder.id.slice(0, 8)}
                    </span>
                    {' - '}
                    {request.generatedWorkOrder.title}
                    {' '}
                    <span className={`inline-block rounded-md border border-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusColor(request.generatedWorkOrder.status)}`}>
                      {getStatusLabel(request.generatedWorkOrder.status)}
                    </span>
                  </span>
                }
              />
            )}
            {request.failureAnalysisReport && (
              <DetailField
                label="RAF Vinculada"
                className="sm:col-span-2"
                value={
                  <span className="font-semibold text-amber-700">
                    {request.failureAnalysisReport.rafNumber || request.failureAnalysisReport.id.slice(0, 8)}
                  </span>
                }
              />
            )}
          </div>
        </div>
      </DetailSection>

      {request.asset && (
        <DetailSection title="Bem Associado" icon="inventory_2">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-1 sm:grid-cols-2">
            <DetailField
              label="Nome do Bem"
              value={request.asset.name}
              className="sm:col-span-2"
            />
            {request.asset.protheusCode && (
              <DetailField
                label="Código (Protheus)"
                value={request.asset.protheusCode}
              />
            )}
            {request.asset.tag && (
              <DetailField
                label="TAG"
                value={request.asset.tag}
              />
            )}
          </div>
        </DetailSection>
      )}

      {(request.executionStartedAt || request.executionCompletedAt || request.executionNotes || request.beforePhotoUrl || request.afterPhotoUrl) && (
        <DetailSection title="Execução / Finalização" icon="task_alt">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-1 sm:grid-cols-2">
              {request.executionStartedAt && (
                <DetailField
                  label="Início da Execução"
                  value={formatDateTime(request.executionStartedAt)}
                />
              )}
              {request.executionCompletedAt && (
                <DetailField
                  label="Conclusão da Execução"
                  value={formatDateTime(request.executionCompletedAt)}
                />
              )}
              {request.executionNotes && (
                <DetailField
                  label="Observações da Execução"
                  value={request.executionNotes}
                  className="sm:col-span-2"
                />
              )}
            </div>

            {(request.beforePhotoUrl || request.afterPhotoUrl) && (
              <div className="grid grid-cols-1 gap-3 px-1 sm:grid-cols-2">
                {request.beforePhotoUrl && (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Foto Antes</p>
                    <button
                      type="button"
                      onClick={() => setImageViewer({ url: request.beforePhotoUrl!, name: 'Foto Antes' })}
                      className="overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-sm transition-colors hover:border-gray-300 w-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={request.beforePhotoUrl}
                        alt="Foto antes da execução"
                        className="h-48 w-full object-cover"
                      />
                    </button>
                  </div>
                )}
                {request.afterPhotoUrl && (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Foto Depois</p>
                    <button
                      type="button"
                      onClick={() => setImageViewer({ url: request.afterPhotoUrl!, name: 'Foto Depois' })}
                      className="overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-sm transition-colors hover:border-gray-300 w-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={request.afterPhotoUrl}
                        alt="Foto depois da execução"
                        className="h-48 w-full object-cover"
                      />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DetailSection>
      )}

      {files.length > 0 && (
        <DetailSection title={`Anexos (${files.length})`} icon="attach_file">
          <div className="space-y-4 px-1">
            {imageFiles.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Imagens</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {imageFiles.map((file, index) => (
                    <button
                      key={`${file.id || file.url}-${index}`}
                      type="button"
                      onClick={() => setImageViewer({ url: file.url, name: file.name })}
                      className="overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-sm transition-colors hover:border-gray-300"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-48 w-full object-cover"
                      />
                      <div className="border-t border-gray-200 px-3 py-2">
                        <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {documentFiles.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Documentos</p>
                <div className="space-y-2">
                  {documentFiles.map((file, index) => (
                    <div
                      key={`${file.id || file.url}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon name="description" className="text-xl text-gray-500" />
                        <p className="truncate text-[13px] font-medium text-gray-900">{file.name}</p>
                      </div>
                      <a
                        href={file.url}
                        download={file.name}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Baixar
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DetailSection>
      )}
    </div>
  ) : (
    <div className="flex flex-1 items-center justify-center p-6">
      <p className="text-muted-foreground">Solicitação não encontrada.</p>
    </div>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between border-b border-gray-200 bg-gray-50 px-6 py-5">
          <div className="min-w-0">
            {request?.requestNumber && (
              <span className="inline-block mb-1 rounded bg-accent-orange px-2.5 py-0.5 text-xs font-black text-white tracking-wide">
                {request.requestNumber}
              </span>
            )}
            <h2 className="truncate text-lg font-black text-gray-900">{request?.title || 'Solicitação'}</h2>
          </div>
          <PanelCloseButton onClick={onClose} />
        </div>

        {content}

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={request?.requestNumber ? `${request.requestNumber} - ${request.title}` : (request?.title || 'Solicitação')}
      size="wide"
      noPadding
    >
      {content}

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
