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

interface WorkOrderFile {
  id: string
  name: string
  url: string
  type?: string | null
  size?: number | null
}

interface WorkOrderAsset {
  id?: string
  name: string
}

interface WorkOrderLocation {
  id?: string
  name: string
}

interface ExecutionStep {
  stepName: string
  completed?: boolean
  optionType?: string
  responseValue?: string | null
  selectedOption?: string | null
}

interface SourceRequest {
  id?: string
  title?: string | null
  description?: string | null
  createdAt?: string | null
  createdBy?: BasicUser | null
  files?: WorkOrderFile[]
}

interface WorkOrderDetail {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  systemStatus?: string | null
  externalId?: string | null
  internalId?: string | null
  customId?: string | null
  createdAt?: string | null
  dueDate?: string | null
  completedOn?: string | null
  actualDuration?: number | null
  executionNotes?: string | null
  beforePhotoUrl?: string | null
  afterPhotoUrl?: string | null
  assignedToId?: string | null
  asset?: WorkOrderAsset | null
  location?: WorkOrderLocation | null
  createdBy?: BasicUser | null
  sourceRequest?: SourceRequest | null
  files?: WorkOrderFile[]
  executionSteps?: ExecutionStep[]
}

interface WorkOrderDetailModalProps {
  isOpen: boolean
  onClose: () => void
  workOrderId: string
  onEdit: (workOrder: WorkOrderDetail) => void
  onDelete: (workOrderId: string) => void
  currentUserId?: string
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
      <div className="flex items-center gap-3 mb-4 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
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
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-[13px] font-medium text-gray-900 break-words">{value}</div>
    </div>
  )
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'CRITICAL': return 'Crítica'
    case 'HIGH': return 'Alta'
    case 'MEDIUM': return 'Média'
    case 'LOW': return 'Baixa'
    default: return 'Nenhuma'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Pendente'
    case 'RELEASED': return 'Liberada'
    case 'OPEN': return 'Aberta'
    case 'IN_PROGRESS': return 'Em Progresso'
    case 'ON_HOLD': return 'Em Espera'
    case 'COMPLETE': return 'Concluída'
    default: return status
  }
}

function getSystemStatusLabel(systemStatus?: string | null): string {
  return systemStatus === 'IN_SYSTEM' ? 'Sistema' : 'Fora do Sistema'
}

function isImageFile(file: WorkOrderFile): boolean {
  if (file.type?.startsWith('image/')) {
    return true
  }

  const lowerName = file.name.toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some(ext => lowerName.endsWith(ext))
}

export function WorkOrderDetailModal({
  isOpen,
  onClose,
  workOrderId,
  onEdit,
  onDelete,
  currentUserId,
  inPage = false,
}: WorkOrderDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageViewer, setImageViewer] = useState<{ url: string; name: string } | null>(null)

  const shouldLoad = inPage ? !!workOrderId : isOpen && !!workOrderId

  useEffect(() => {
    if (!shouldLoad) {
      return
    }

    const controller = new AbortController()
    let ignore = false

    const loadWorkOrder = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/work-orders/${workOrderId}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          if (!ignore) {
            setWorkOrder(null)
            setError(
              response.status === 404
                ? 'Ordem de serviço não encontrada.'
                : 'Erro ao carregar ordem de serviço.'
            )
          }
          return
        }

        const data = await response.json() as { data?: WorkOrderDetail }

        if (!ignore) {
          if (!data.data) {
            setWorkOrder(null)
            setError('Ordem de serviço não encontrada.')
            return
          }

          setWorkOrder(data.data)
        }
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return
        }

        console.error('Error loading work order:', loadError)
        if (!ignore) {
          setWorkOrder(null)
          setError('Erro ao conectar ao servidor.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void loadWorkOrder()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [shouldLoad, workOrderId])

  const isOnlyExecutor = !!currentUserId && !!workOrder?.assignedToId && workOrder.assignedToId === currentUserId

  const handleEdit = () => {
    if (!workOrder) {
      return
    }

    onEdit(workOrder)
    onClose()
  }

  const handleDelete = () => {
    if (!workOrder) {
      return
    }

    onDelete(workOrder.id)
  }

  const sourceRequestImages = useMemo(
    () => workOrder?.sourceRequest?.files?.filter(isImageFile) ?? [],
    [workOrder?.sourceRequest?.files]
  )

  const executionFiles = useMemo(
    () => workOrder?.files ?? [],
    [workOrder?.files]
  )

  const executionImageFiles = useMemo(
    () => executionFiles.filter(isImageFile),
    [executionFiles]
  )

  const executionDocumentFiles = useMemo(
    () => executionFiles.filter(file => !isImageFile(file)),
    [executionFiles]
  )

  const executionSteps = workOrder?.executionSteps ?? []

  const hasExecutionDetails = Boolean(
    workOrder?.completedOn ||
    workOrder?.actualDuration ||
    workOrder?.executionNotes ||
    workOrder?.beforePhotoUrl ||
    workOrder?.afterPhotoUrl ||
    executionSteps.length > 0 ||
    executionFiles.length > 0
  )

  const content = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : error ? (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <Icon name="description" className="text-5xl text-muted-foreground mx-auto mb-4" />
        <p className="text-sm font-medium text-foreground mb-1">{error}</p>
        <p className="text-xs text-muted-foreground">
          A ordem de serviço pode ter sido excluída ou você não tem permissão para visualizá-la.
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
  ) : workOrder ? (
    <div className="flex-1 overflow-y-auto">
      {!isOnlyExecutor && (
        <PanelActionButtons
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <DetailSection title="Resumo da OS" icon="assignment">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 px-1">
            <span className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md border border-gray-200 bg-white text-gray-900 shadow-sm">
              {getSystemStatusLabel(workOrder.systemStatus)}
            </span>
            <span className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md border border-gray-200 shadow-sm ${getStatusColor(workOrder.status)}`}>
              {getStatusLabel(workOrder.status)}
            </span>
            <span className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md border border-gray-200 shadow-sm ${getPriorityColor(workOrder.priority)}`}>
              {getPriorityLabel(workOrder.priority)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 px-1">
            {workOrder.externalId && (
              <DetailField
                label="Código Externo"
                value={<span className="font-mono">{workOrder.externalId}</span>}
              />
            )}
            {workOrder.internalId && (
              <DetailField
                label="Número Interno"
                value={<span className="font-mono">{workOrder.internalId}</span>}
              />
            )}
            {workOrder.createdAt && (
              <DetailField label="Criado em" value={formatDateTime(workOrder.createdAt)} />
            )}
            {workOrder.dueDate && (
              <DetailField label="Vencimento" value={formatDate(workOrder.dueDate)} />
            )}
          </div>
        </div>
      </DetailSection>

      <DetailSection title="Solicitação de Serviço (SS)" icon="description">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 px-1">
          <DetailField
            label="Descrição da Solicitação"
            className="sm:col-span-2"
            value={workOrder.sourceRequest?.description || workOrder.description || 'Sem descrição'}
          />
          {workOrder.sourceRequest?.createdBy && (
            <DetailField
              label="Solicitado por"
              value={`${workOrder.sourceRequest.createdBy.firstName} ${workOrder.sourceRequest.createdBy.lastName}`}
            />
          )}
          {workOrder.createdBy && (
            <DetailField
              label="Atribuído por"
              value={`${workOrder.createdBy.firstName} ${workOrder.createdBy.lastName}`}
            />
          )}
          {workOrder.createdAt && (
            <DetailField
              label="Data da Solicitação"
              value={formatDateTime(workOrder.sourceRequest?.createdAt || workOrder.createdAt)}
            />
          )}
          {workOrder.asset && (
            <DetailField label="Ativo" value={workOrder.asset.name} />
          )}
          {workOrder.location && (
            <DetailField label="Localização" value={workOrder.location.name} />
          )}
        </div>
      </DetailSection>

      {sourceRequestImages.length > 0 && (
        <DetailSection title="Imagens da Solicitação Original" icon="image">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
            {sourceRequestImages.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setImageViewer({ url: file.url, name: file.name })}
                className="overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-sm transition-colors hover:border-gray-300"
              >
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-48 w-full object-cover"
                />
                <div className="border-t border-gray-200 px-3 py-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                </div>
              </button>
            ))}
          </div>
        </DetailSection>
      )}

      {hasExecutionDetails && (
        <DetailSection title="Execução" icon="construction">
          <div className="space-y-4 px-1">
            {(workOrder.completedOn || workOrder.actualDuration) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {workOrder.completedOn && (
                  <DetailField label="Concluída em" value={formatDateTime(workOrder.completedOn)} />
                )}
                {typeof workOrder.actualDuration === 'number' && (
                  <DetailField label="Duração" value={`${workOrder.actualDuration} min`} />
                )}
              </div>
            )}

            {workOrder.executionNotes && (
              <DetailField
                label="Descrição do Trabalho"
                value={workOrder.executionNotes}
              />
            )}

            {executionSteps.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Etapas Executadas</p>
                <div className="space-y-2">
                  {executionSteps.map((step, index) => (
                    <div
                      key={`${step.stepName}-${index}`}
                      className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="flex items-start gap-2">
                        <Icon
                          name={step.completed ? 'check_circle' : 'radio_button_unchecked'}
                          className={`mt-0.5 text-base ${step.completed ? 'text-success' : 'text-gray-400'}`}
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-gray-900">{step.stepName}</p>
                          {step.optionType === 'RESPONSE' && step.responseValue && (
                            <p className="mt-1 text-xs text-gray-500">Resposta: {step.responseValue}</p>
                          )}
                          {step.optionType === 'OPTION' && step.selectedOption && (
                            <p className="mt-1 text-xs text-gray-500">Opção: {step.selectedOption}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(workOrder.beforePhotoUrl || workOrder.afterPhotoUrl) && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Fotos de Execução</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workOrder.beforePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setImageViewer({ url: workOrder.beforePhotoUrl as string, name: 'Foto Antes' })}
                      className="overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-sm transition-colors hover:border-gray-300"
                    >
                      <img
                        src={workOrder.beforePhotoUrl}
                        alt="Foto Antes"
                        className="h-48 w-full object-cover"
                      />
                      <div className="border-t border-gray-200 px-3 py-2">
                        <p className="text-sm font-medium text-gray-900">Foto Antes</p>
                      </div>
                    </button>
                  )}
                  {workOrder.afterPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setImageViewer({ url: workOrder.afterPhotoUrl as string, name: 'Foto Depois' })}
                      className="overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-sm transition-colors hover:border-gray-300"
                    >
                      <img
                        src={workOrder.afterPhotoUrl}
                        alt="Foto Depois"
                        className="h-48 w-full object-cover"
                      />
                      <div className="border-t border-gray-200 px-3 py-2">
                        <p className="text-sm font-medium text-gray-900">Foto Depois</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {executionImageFiles.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Imagens Anexadas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {executionImageFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setImageViewer({ url: file.url, name: file.name })}
                      className="overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-sm transition-colors hover:border-gray-300"
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-48 w-full object-cover"
                      />
                      <div className="border-t border-gray-200 px-3 py-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {executionDocumentFiles.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Documentos</p>
                <div className="space-y-2">
                  {executionDocumentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon name="description" className="text-xl text-gray-500" />
                        <p className="truncate text-[13px] font-medium text-gray-900">{file.name}</p>
                      </div>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Abrir
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
    <div className="flex-1 flex items-center justify-center p-6">
      <p className="text-muted-foreground">Ordem de serviço não encontrada.</p>
    </div>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-gray-900 truncate">{workOrder?.title || 'Ordem de Serviço'}</h2>
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
    <Modal isOpen={isOpen} onClose={onClose} title={workOrder?.title || 'Ordem de Serviço'} size="wide" noPadding>
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
