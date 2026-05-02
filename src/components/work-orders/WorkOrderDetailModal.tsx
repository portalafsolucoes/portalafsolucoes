'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ImageViewerModal } from '../ui/ImageViewerModal'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { PanelActionButtons } from '@/components/ui/PanelActionButtons'
import { formatDate, formatDateTime, getPriorityColor, getStatusColor } from '@/lib/utils'
import { parseTaskSteps } from '@/lib/workOrders/taskSteps'
import { formatHours } from '@/lib/units/time'

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

interface AssetParent {
  id: string
  name: string
  parentAssetId?: string | null
  parentAsset?: AssetParent | null
}

interface WorkOrderAsset {
  id?: string
  name: string
  parentAssetId?: string | null
  parentAsset?: AssetParent | null
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

interface WOResourceDetail {
  id: string
  resourceType: string
  quantity?: number | null
  hours?: number | null
  unit?: string | null
  resource?: { id: string; name: string } | null
  jobTitle?: { id: string; name: string } | null
  user?: { id: string; firstName: string; lastName: string } | null
}

interface TaskStep {
  stepId?: string
  stepName: string
  optionType: string
  options?: { id?: string; label: string; order: number }[]
}

interface WOTask {
  id: string
  label: string
  notes?: string | null
  completed: boolean
  order: number
  executionTime?: number | null
  plannedStart?: string | null
  plannedEnd?: string | null
  steps?: TaskStep[] | string | null
}

interface RescheduleHistoryEntry {
  id: string
  previousDate?: string | null
  newDate: string
  previousStatus?: string | null
  wasOverdue: boolean
  reason?: string | null
  createdAt: string
  user?: { id: string; firstName: string; lastName: string } | null
}

interface WorkOrderDetail {
  id: string
  title: string
  description?: string | null
  type?: string | null
  osType?: string | null
  status: string
  priority: string
  systemStatus?: string | null
  externalId?: string | null
  internalId?: string | null
  customId?: string | null
  estimatedDuration?: number | null
  createdAt?: string | null
  dueDate?: string | null
  rescheduledDate?: string | null
  rescheduleCount?: number | null
  rescheduleHistory?: RescheduleHistoryEntry[]
  completedOn?: string | null
  actualDuration?: number | null
  executionNotes?: string | null
  beforePhotoUrl?: string | null
  afterPhotoUrl?: string | null
  assignedToId?: string | null
  assignedTo?: BasicUser | null
  assignedTeams?: { id: string; name: string }[]
  asset?: WorkOrderAsset | null
  location?: WorkOrderLocation | null
  createdBy?: BasicUser | null
  sourceRequest?: SourceRequest | null
  files?: WorkOrderFile[]
  executionSteps?: ExecutionStep[]
  tasks?: WOTask[]
  woResources?: WOResourceDetail[]
  assetMaintenancePlanId?: string | null
  assetMaintenancePlan?: { id: string; name?: string | null; sequence: number } | null
  maintenancePlanExec?: { id: string; planNumber: number } | null
  maintenanceArea?: { id: string; name: string; code?: string | null } | null
  serviceType?: { id: string; name: string; code: string } | null
  raf?: { id: string; rafNumber: string } | null
}

interface WorkOrderDetailModalProps {
  isOpen: boolean
  onClose: () => void
  workOrderId: string
  onEdit: (workOrder: WorkOrderDetail) => void
  onDelete: (workOrderId: string) => void
  onPrint?: (workOrder: WorkOrderDetail) => void
  onFinalize?: (workOrder: WorkOrderDetail) => void
  onCopy?: (workOrder: WorkOrderDetail) => void
  currentUserId?: string
  inPage?: boolean
}

function DetailSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm hover:bg-gray-200 transition-colors"
      >
        <Icon name={open ? 'expand_more' : 'chevron_right'} className="text-base text-gray-600" />
        <Icon name={icon} className="text-base text-gray-600" />
        <span className="font-bold text-[12px] uppercase tracking-wider text-gray-900">{title}</span>
      </button>
      {open && <div className="mt-4">{children}</div>}
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
    case 'CRITICAL': return 'CRITICA'
    case 'HIGH': return 'ALTA'
    case 'MEDIUM': return 'MEDIA'
    case 'LOW': return 'BAIXA'
    default: return 'NENHUMA'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'PENDENTE'
    case 'RELEASED': return 'LIBERADA'
    case 'OPEN': return 'ABERTA'
    case 'IN_PROGRESS': return 'EM PROGRESSO'
    case 'ON_HOLD': return 'EM ESPERA'
    case 'COMPLETE': return 'CONCLUIDA'
    case 'REPROGRAMMED': return 'REPROGRAMADA'
    default: return status
  }
}

function getSystemStatusLabel(systemStatus?: string | null): string {
  return systemStatus === 'IN_SYSTEM' ? 'Sistema' : 'Fora do Sistema'
}

function getTypeLabel(type?: string | null): string {
  switch (type) {
    case 'PREVENTIVE': return 'PREVENTIVA'
    case 'CORRECTIVE': return 'CORRETIVA'
    case 'PREDICTIVE': return 'PREDITIVA'
    case 'REACTIVE': return 'REATIVA'
    default: return type || '-'
  }
}

function getResourceTypeLabel(type: string): string {
  switch (type) {
    case 'MATERIAL': return 'MATERIAL'
    case 'TOOL': return 'FERRAMENTA'
    case 'LABOR': return 'MAO DE OBRA'
    case 'SPECIALTY': return 'ESPECIALIDADE'
    default: return type
  }
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
  onPrint,
  onFinalize,
  onCopy,
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
                ? 'Ordem de servico nao encontrada.'
                : 'Erro ao carregar ordem de servico.'
            )
          }
          return
        }

        const data = await response.json() as { data?: WorkOrderDetail }

        if (!ignore) {
          if (!data.data) {
            setWorkOrder(null)
            setError('Ordem de servico nao encontrada.')
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

  const handlePrint = () => {
    if (!workOrder || !onPrint) return
    onPrint(workOrder)
  }

  const handleFinalize = () => {
    if (!workOrder || !onFinalize) return
    onFinalize(workOrder)
    onClose()
  }

  const handleCopy = () => {
    if (!workOrder || !onCopy) return
    onCopy(workOrder)
    onClose()
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

  const sortedTasks = useMemo(
    () => [...(workOrder?.tasks || [])].sort((a, b) => a.order - b.order),
    [workOrder?.tasks]
  )

  const groupedResources = useMemo(() => {
    const resources = workOrder?.woResources || []
    if (resources.length === 0) return null
    const groups: Record<string, WOResourceDetail[]> = {}
    for (const r of resources) {
      const type = r.resourceType || 'MATERIAL'
      if (!groups[type]) groups[type] = []
      groups[type].push(r)
    }
    return groups
  }, [workOrder?.woResources])

  const hasSourceRequest = !!workOrder?.sourceRequest?.id
  const hasPlanOrigin = !!workOrder?.assetMaintenancePlanId

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
          A ordem de servico pode ter sido excluida ou voce nao tem permissao para visualiza-la.
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
          onCopy={onCopy ? handleCopy : undefined}
          onPrint={onPrint ? handlePrint : undefined}
          onFinalize={onFinalize ? handleFinalize : undefined}
          onDelete={handleDelete}
        />
      )}

      {/* 1. Resumo da OS */}
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
            <span className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md border border-gray-200 bg-white text-gray-900 shadow-sm">
              {getTypeLabel(workOrder.type)}
            </span>
            {workOrder.osType && (
              <span className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md border border-gray-200 bg-white text-gray-900 shadow-sm">
                {workOrder.osType === 'CORRECTIVE_IMMEDIATE' ? 'Corretiva Imediata' : workOrder.osType === 'CORRECTIVE_PLANNED' ? 'Corretiva Planejada' : workOrder.osType === 'PREVENTIVE_MANUAL' ? 'Preventiva Manual' : workOrder.osType}
              </span>
            )}
            {(workOrder.rescheduleCount ?? 0) > 0 && (
              <span
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md border border-amber-200 bg-amber-50 text-amber-800 shadow-sm"
                title="Numero de vezes que esta OS foi reprogramada estando atrasada"
              >
                <Icon name="event_repeat" className="text-base" />
                Reprogramada {workOrder.rescheduleCount}x
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 px-1">
            {workOrder.externalId && (
              <DetailField
                label="Codigo Externo"
                value={<span className="font-mono">{workOrder.externalId}</span>}
              />
            )}
            {workOrder.internalId && (
              <DetailField
                label="Numero Interno"
                value={<span className="font-mono">{workOrder.internalId}</span>}
              />
            )}
            {workOrder.createdAt && (
              <DetailField label="Criado em" value={formatDateTime(workOrder.createdAt)} />
            )}
            {workOrder.dueDate && (
              <DetailField label="Vencimento" value={formatDate(workOrder.dueDate)} />
            )}
            {workOrder.rescheduledDate && (
              <DetailField
                label="Data Reprogramada"
                value={<span className="text-amber-700 font-semibold">{formatDate(workOrder.rescheduledDate)}</span>}
              />
            )}
            {workOrder.estimatedDuration != null && workOrder.estimatedDuration > 0 && (
              <DetailField label="Tempo de Execucao" value={formatHours(workOrder.estimatedDuration)} />
            )}
            {workOrder.maintenanceArea && (
              <DetailField label="Area de Manutencao" value={workOrder.maintenanceArea.code ? `${workOrder.maintenanceArea.code} - ${workOrder.maintenanceArea.name}` : workOrder.maintenanceArea.name} />
            )}
            {workOrder.serviceType && (
              <DetailField label="Tipo de Servico" value={`${workOrder.serviceType.code} - ${workOrder.serviceType.name}`} />
            )}
            {workOrder.raf && (
              <DetailField label="RAF" value={<span className="font-mono text-amber-700">{workOrder.raf.rafNumber}</span>} />
            )}
          </div>

          {workOrder.description && (
            <div className="px-1">
              <DetailField label="Descricao" value={workOrder.description} />
            </div>
          )}
        </div>
      </DetailSection>

      {/* 2. Ativo e Localização */}
      {(workOrder.asset || workOrder.location) && (
        <DetailSection title="Ativo e Localizacao" icon="location_on">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 px-1">
            {workOrder.asset && (
              <DetailField label="Ativo" value={workOrder.asset.name} />
            )}
            {workOrder.location && (
              <DetailField label="Localizacao" value={workOrder.location.name} />
            )}
          </div>
          {workOrder.asset?.parentAsset && (() => {
            const chain: string[] = []
            let current: AssetParent | null | undefined = workOrder.asset?.parentAsset
            while (current) {
              chain.unshift(current.name)
              current = current.parentAsset
            }
            chain.push(workOrder.asset!.name)
            return (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground bg-gray-50 border border-gray-200 rounded-[4px] px-3 py-2">
                <Icon name="account_tree" className="text-sm text-gray-400 mr-1" />
                {chain.map((name, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <Icon name="chevron_right" className="text-sm text-gray-400" />}
                    <span className={i === chain.length - 1 ? 'font-semibold text-gray-700' : ''}>
                      {name}
                    </span>
                  </span>
                ))}
              </div>
            )
          })()}
        </DetailSection>
      )}

      {/* 3. Plano de Origem (condicional - só para OSs de plano) */}
      {hasPlanOrigin && (
        <DetailSection title="Plano de Origem" icon="engineering">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 px-1">
            {workOrder.assetMaintenancePlan?.name && (
              <DetailField
                label="Nome da Manutencao"
                value={workOrder.assetMaintenancePlan.name}
                className="sm:col-span-2"
              />
            )}
            {workOrder.maintenancePlanExec?.planNumber && (
              <DetailField
                label="Plano de Execucao"
                value={`Plano #${workOrder.maintenancePlanExec.planNumber}`}
              />
            )}
            {typeof workOrder.assetMaintenancePlan?.sequence === 'number' && (
              <DetailField
                label="Sequencia"
                value={workOrder.assetMaintenancePlan.sequence}
              />
            )}
          </div>
        </DetailSection>
      )}

      {/* 4. Tarefas */}
      {sortedTasks.length > 0 && (
        <DetailSection title={`Tarefas (${sortedTasks.length})`} icon="checklist">
          <div className="space-y-3 px-1">
            {sortedTasks.map((task) => {
              const steps = parseTaskSteps(task.steps)
              return (
                <div
                  key={task.id}
                  className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Icon
                      name={task.completed ? 'check_circle' : 'radio_button_unchecked'}
                      className={`mt-0.5 text-base flex-shrink-0 ${task.completed ? 'text-success' : 'text-gray-400'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-gray-900">{task.label}</p>
                        {task.executionTime != null && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Icon name="schedule" className="text-sm" />
                            {formatHours(task.executionTime)}
                          </span>
                        )}
                      </div>
                      {(task.plannedStart || task.plannedEnd) && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                          <Icon name="event" className="text-sm" />
                          Previsao: {task.plannedStart ? new Date(task.plannedStart).toLocaleString('pt-BR') : '-'} → {task.plannedEnd ? new Date(task.plannedEnd).toLocaleString('pt-BR') : '-'}
                        </p>
                      )}
                      {task.notes && (
                        <p className="mt-1 text-xs text-gray-500">{task.notes}</p>
                      )}
                    </div>
                  </div>

                  {steps.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Etapas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {steps.map((step, idx) => (
                          <span
                            key={step.stepId || idx}
                            className="inline-block px-2.5 py-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm"
                          >
                            {step.stepName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </DetailSection>
      )}

      {/* 5. Recursos */}
      {groupedResources && (
        <DetailSection title="Recursos" icon="inventory_2">
          <div className="space-y-4 px-1">
            {Object.entries(groupedResources).map(([type, resources]) => (
              <div key={type}>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                  {getResourceTypeLabel(type)}
                </p>
                <div className="space-y-1.5">
                  {resources.map((r) => {
                    const name = r.resource?.name
                      || r.jobTitle?.name
                      || (r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Recurso')
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm"
                      >
                        <span className="text-[13px] font-medium text-gray-900">{name}</span>
                        <div className="flex items-center gap-3 text-[12px] text-gray-500">
                          {r.quantity != null && r.quantity > 0 && (
                            <span>{r.quantity} {r.unit || 'un'}</span>
                          )}
                          {r.hours != null && r.hours > 0 && (
                            <span>{r.hours}h</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* 6. Atribuição */}
      {(workOrder.assignedTo || (workOrder.assignedTeams && workOrder.assignedTeams.length > 0) || workOrder.createdBy) && (
        <DetailSection title="Atribuicao" icon="group">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 px-1">
            {workOrder.assignedTeams && workOrder.assignedTeams.length > 0 && (
              <DetailField
                label="Equipe(s)"
                value={workOrder.assignedTeams.map(t => t.name).join(', ')}
              />
            )}
            {workOrder.assignedTo && (
              <DetailField
                label="Executante"
                value={`${workOrder.assignedTo.firstName} ${workOrder.assignedTo.lastName}`}
              />
            )}
            {workOrder.createdBy && (
              <DetailField
                label="Criado por"
                value={`${workOrder.createdBy.firstName} ${workOrder.createdBy.lastName}`}
              />
            )}
          </div>
        </DetailSection>
      )}

      {/* Historico de Reprogramacao - SOMENTE quando houve pelo menos uma reprogramacao */}
      {workOrder.rescheduleHistory && workOrder.rescheduleHistory.length > 0 && (
        <DetailSection title={`Historico de Reprogramacao (${workOrder.rescheduleHistory.length})`} icon="event_repeat">
          <div className="space-y-2 px-1">
            {[...workOrder.rescheduleHistory]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-md border border-amber-200 bg-amber-50/40 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 flex-wrap text-[13px] font-medium text-gray-900">
                    {entry.previousDate && (
                      <span className="line-through text-gray-500">{formatDate(entry.previousDate)}</span>
                    )}
                    <Icon name="arrow_forward" className="text-base text-amber-700" />
                    <span className="font-semibold text-amber-800">{formatDate(entry.newDate)}</span>
                    {entry.wasOverdue && (
                      <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Estava atrasada
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500">
                    <span>{formatDateTime(entry.createdAt)}</span>
                    {entry.user && (
                      <span className="flex items-center gap-1">
                        <Icon name="person" className="text-sm" />
                        {entry.user.firstName} {entry.user.lastName}
                      </span>
                    )}
                  </div>
                  {entry.reason && (
                    <p className="mt-2 text-[12px] text-gray-700">{entry.reason}</p>
                  )}
                </div>
              ))}
          </div>
        </DetailSection>
      )}

      {/* 7. Solicitação de Serviço - SOMENTE quando sourceRequest existir */}
      {hasSourceRequest && (
        <DetailSection title="Solicitacao de Servico (SS)" icon="description">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 px-1">
            <DetailField
              label="Descricao da Solicitacao"
              className="sm:col-span-2"
              value={workOrder.sourceRequest?.description || 'Sem descricao'}
            />
            {workOrder.sourceRequest?.createdBy && (
              <DetailField
                label="Solicitado por"
                value={`${workOrder.sourceRequest.createdBy.firstName} ${workOrder.sourceRequest.createdBy.lastName}`}
              />
            )}
            {workOrder.sourceRequest?.createdAt && (
              <DetailField
                label="Data da Solicitacao"
                value={formatDateTime(workOrder.sourceRequest.createdAt)}
              />
            )}
          </div>
        </DetailSection>
      )}

      {/* Imagens da Solicitação Original */}
      {sourceRequestImages.length > 0 && (
        <DetailSection title="Imagens da Solicitacao Original" icon="image">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
            {sourceRequestImages.map((file) => (
              <button
                key={file.id}
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
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                </div>
              </button>
            ))}
          </div>
        </DetailSection>
      )}

      {/* 8. Execução */}
      {hasExecutionDetails && (
        <DetailSection title="Execucao" icon="construction">
          <div className="space-y-4 px-1">
            {(workOrder.completedOn || workOrder.actualDuration) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {workOrder.completedOn && (
                  <DetailField label="Concluida em" value={formatDateTime(workOrder.completedOn)} />
                )}
                {typeof workOrder.actualDuration === 'number' && (
                  <DetailField label="Duracao" value={formatHours(workOrder.actualDuration)} />
                )}
              </div>
            )}

            {workOrder.executionNotes && (
              <DetailField
                label="Descricao do Trabalho"
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
                            <p className="mt-1 text-xs text-gray-500">Opcao: {step.selectedOption}</p>
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
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Fotos de Execucao</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workOrder.beforePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setImageViewer({ url: workOrder.beforePhotoUrl as string, name: 'Foto Antes' })}
                      className="overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-sm transition-colors hover:border-gray-300"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
      <p className="text-muted-foreground">Ordem de servico nao encontrada.</p>
    </div>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-gray-900 truncate">{workOrder?.title || 'Ordem de Servico'}</h2>
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
    <Modal isOpen={isOpen} onClose={onClose} title={workOrder?.title || 'Ordem de Servico'} size="wide" noPadding>
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
