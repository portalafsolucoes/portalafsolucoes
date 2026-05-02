'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/lib/utils'
import { parseTaskSteps } from '@/lib/workOrders/taskSteps'
import { formatHours } from '@/lib/units/time'

interface AssetRef {
  name: string
  parentAsset?: AssetRef | null
}

interface BatchPrintWO {
  id: string
  title: string
  description?: string | null
  type?: string | null
  status: string
  priority: string
  externalId?: string | null
  internalId?: string | null
  customId?: string | null
  estimatedDuration?: number | null
  createdAt?: string | null
  dueDate?: string | null
  rescheduledDate?: string | null
  asset?: AssetRef | null
  location?: { name: string } | null
  assetMaintenancePlan?: { name?: string | null; sequence: number } | null
  maintenancePlanExec?: { planNumber: number } | null
  tasks?: {
    id: string
    label: string
    notes?: string | null
    completed: boolean
    order: number
    executionTime?: number | null
    plannedStart?: string | null
    plannedEnd?: string | null
    steps?: unknown
  }[]
  woResources?: {
    id: string
    resourceType: string
    quantity?: number | null
    hours?: number | null
    unit?: string | null
    resource?: { id: string; name: string } | null
    jobTitle?: { id: string; name: string } | null
    user?: { id: string; firstName: string; lastName: string } | null
  }[]
}

interface Props {
  workOrderIds: string[]
  scheduledDate?: string | null
  onClose: () => void
}

function getTypeLabel(type?: string | null): string {
  switch (type) {
    case 'PREVENTIVE': return 'Preventiva'
    case 'CORRECTIVE': return 'Corretiva'
    case 'PREDICTIVE': return 'Preditiva'
    case 'REACTIVE': return 'Reativa'
    default: return type || '-'
  }
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'CRITICAL': return 'Critica'
    case 'HIGH': return 'Alta'
    case 'MEDIUM': return 'Media'
    case 'LOW': return 'Baixa'
    default: return 'Nenhuma'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Pendente'
    case 'RELEASED': return 'Liberada'
    case 'IN_PROGRESS': return 'Em Progresso'
    case 'ON_HOLD': return 'Em Espera'
    case 'COMPLETE': return 'Concluida'
    case 'REPROGRAMMED': return 'Reprogramada'
    default: return status
  }
}

function getResourceTypeLabel(type: string): string {
  switch (type) {
    case 'MATERIAL': return 'Material'
    case 'TOOL': return 'Ferramenta'
    case 'LABOR': return 'Mao de Obra'
    case 'SPECIALTY': return 'Especialidade'
    default: return type
  }
}


export function WorkOrdersBatchPrintView({ workOrderIds, scheduledDate, onClose }: Props) {
  const { user } = useAuth()
  const [workOrders, setWorkOrders] = useState<BatchPrintWO[]>([])
  const [loading, setLoading] = useState(true)
  const companyLogo = user?.company?.logo || null
  const companyName = user?.company?.name || 'Empresa'

  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.all(
          workOrderIds.map(id =>
            fetch(`/api/work-orders/${id}`).then(r => r.ok ? r.json() : null).catch(() => null)
          )
        )
        const wos: BatchPrintWO[] = []
        for (const res of results) {
          if (res?.data) wos.push(res.data as BatchPrintWO)
        }
        setWorkOrders(wos)
      } catch {
        // silently fail
      }
      setLoading(false)
    }
    void load()
  }, [workOrderIds])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Carregando OSs...</p>
        </div>
      </div>
    )
  }

  if (workOrders.length === 0) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Nenhuma OS disponivel para impressao.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 overflow-auto">
      {/* Toolbar - hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">
          Impressao em Lote - {workOrders.length} OS{workOrders.length > 1 ? 's' : ''}
          {scheduledDate && (
            <span className="ml-2 text-gray-500 font-normal">
              (Data programada: {formatDate(scheduledDate)})
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-[4px] hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Pages */}
      <div className="flex flex-col items-center py-8 print:py-0 print:block gap-8 print:gap-0">
        {workOrders.map((wo, idx) => {
          const displayId = wo.externalId || wo.internalId || wo.customId || wo.id.slice(0, 8)
          const sortedTasks = [...(wo.tasks || [])].sort((a, b) => a.order - b.order)

          const groupedResources: Record<string, typeof wo.woResources> = {}
          for (const r of (wo.woResources || [])) {
            const type = r.resourceType || 'MATERIAL'
            if (!groupedResources[type]) groupedResources[type] = []
            groupedResources[type]!.push(r)
          }

          const assetChain: string[] = []
          if (wo.asset) {
            let current: AssetRef | null | undefined = wo.asset.parentAsset
            while (current) {
              assetChain.unshift(current.name)
              current = current.parentAsset
            }
            assetChain.push(wo.asset.name)
          }

          return (
            <div
              key={wo.id}
              className={`bg-white w-[210mm] min-h-[297mm] shadow-lg print:shadow-none print:w-full px-[15mm] py-[10mm] text-[11px] text-gray-900 leading-relaxed ${
                idx < workOrders.length - 1 ? 'print:break-after-page' : ''
              }`}
            >
              {/* === CABEÇALHO === */}
              <div className="flex items-start justify-between border-b-2 border-gray-900 pb-3 mb-4">
                <div className="flex-shrink-0 w-[45mm]">
                  {companyLogo ? (
                    <div className="bg-gray-600 rounded px-3 py-2 inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={companyLogo}
                        alt={companyName}
                        className="max-h-[14mm] max-w-[40mm] object-contain object-left"
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-gray-900">{companyName}</span>
                  )}
                </div>

                <div className="flex-1 px-4">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500 mb-1 text-center">Controle de Execucao</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="border border-gray-400 rounded px-2 py-1.5">
                      <p className="text-[8px] font-bold uppercase text-gray-500">Data Inicio</p>
                      <p className="text-[10px] mt-0.5">____/____/______</p>
                    </div>
                    <div className="border border-gray-400 rounded px-2 py-1.5">
                      <p className="text-[8px] font-bold uppercase text-gray-500">Hora Inicio</p>
                      <p className="text-[10px] mt-0.5">______:______</p>
                    </div>
                    <div className="border border-gray-400 rounded px-2 py-1.5">
                      <p className="text-[8px] font-bold uppercase text-gray-500">Data Fim</p>
                      <p className="text-[10px] mt-0.5">____/____/______</p>
                    </div>
                    <div className="border border-gray-400 rounded px-2 py-1.5">
                      <p className="text-[8px] font-bold uppercase text-gray-500">Hora Fim</p>
                      <p className="text-[10px] mt-0.5">______:______</p>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Ordem de Servico</p>
                  <p className="text-xl font-black text-gray-900 mt-0.5">{displayId}</p>
                  <p className="text-[9px] text-gray-500">{getTypeLabel(wo.type)}</p>
                </div>
              </div>

              {/* === RESUMO === */}
              <div className="mb-3">
                <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                  <span className="font-bold text-[10px] uppercase tracking-wider">Resumo da OS</span>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Titulo</p>
                    <p className="font-medium">{wo.title}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Status</p>
                    <p className="font-medium">{getStatusLabel(wo.status)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Prioridade</p>
                    <p className="font-medium">{getPriorityLabel(wo.priority)}</p>
                  </div>
                  {wo.createdAt && (
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Criado em</p>
                      <p className="font-medium">{formatDateTime(wo.createdAt)}</p>
                    </div>
                  )}
                  {wo.dueDate && (
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Vencimento</p>
                      <p className="font-medium">{formatDate(wo.dueDate)}</p>
                    </div>
                  )}
                  {wo.rescheduledDate && (
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Data Reprogramada</p>
                      <p className="font-medium">{formatDate(wo.rescheduledDate)}</p>
                    </div>
                  )}
                  {wo.estimatedDuration != null && wo.estimatedDuration > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Tempo Estimado</p>
                      <p className="font-medium">{formatHours(wo.estimatedDuration)}</p>
                    </div>
                  )}
                  {scheduledDate && (
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Data Programada</p>
                      <p className="font-medium">{formatDate(scheduledDate)}</p>
                    </div>
                  )}
                </div>
                {wo.description && (
                  <div className="mt-2 px-1">
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Descricao</p>
                    <p className="font-medium">{wo.description}</p>
                  </div>
                )}
              </div>

              {/* === ATIVO E LOCALIZAÇÃO === */}
              {(wo.asset || wo.location) && (
                <div className="mb-3">
                  <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Ativo e Localizacao</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1">
                    {wo.asset && (
                      <div>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Ativo</p>
                        <p className="font-medium">{wo.asset.name}</p>
                      </div>
                    )}
                    {wo.location && (
                      <div>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Localizacao</p>
                        <p className="font-medium">{wo.location.name}</p>
                      </div>
                    )}
                  </div>
                  {assetChain.length > 1 && (
                    <div className="mt-1 px-1 text-[9px] text-gray-500">
                      Hierarquia: {assetChain.join(' > ')}
                    </div>
                  )}
                </div>
              )}

              {/* === TAREFAS === */}
              {sortedTasks.length > 0 && (
                <div className="mb-3">
                  <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Tarefas ({sortedTasks.length})</span>
                  </div>
                  <div className="space-y-2">
                    {sortedTasks.map((task, taskIdx) => {
                      const steps = parseTaskSteps(task.steps)
                      return (
                        <div key={task.id} className="border border-gray-200 rounded px-2 py-1.5">
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-bold text-gray-400 mt-0.5">{taskIdx + 1}.</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[11px]">{task.label}</span>
                                {task.executionTime != null && (
                                  <span className="text-[9px] text-gray-500">({formatHours(task.executionTime)})</span>
                                )}
                              </div>
                              {(task.plannedStart || task.plannedEnd) && (
                                <p className="text-[9px] text-gray-600 mt-0.5">
                                  Previsao: {task.plannedStart ? new Date(task.plannedStart).toLocaleString('pt-BR') : '-'} → {task.plannedEnd ? new Date(task.plannedEnd).toLocaleString('pt-BR') : '-'}
                                </p>
                              )}
                              {task.notes && (
                                <p className="text-[9px] text-gray-500 mt-0.5">{task.notes}</p>
                              )}
                              {steps.length > 0 && (
                                <div className="mt-1.5 space-y-1">
                                  <p className="text-[8px] font-bold text-gray-500 uppercase">Etapas:</p>
                                  {steps.map((step, stepIdx) => (
                                    <div key={step.stepId || stepIdx} className="flex items-start gap-2 border-b border-gray-100 pb-1">
                                      <span className="w-4 h-4 border border-gray-400 rounded-sm flex-shrink-0 mt-0.5"></span>
                                      <div className="flex-1">
                                        <span className="text-[10px]">{step.stepName}</span>
                                      </div>
                                      <div className="flex-shrink-0 w-[35mm] border-b border-gray-400 ml-2"></div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* === RECURSOS === */}
              {Object.keys(groupedResources).length > 0 && (
                <div className="mb-3">
                  <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Recursos</span>
                  </div>
                  {Object.entries(groupedResources).map(([type, resources]) => {
                    const isLabor = type === 'LABOR' || type === 'SPECIALTY'
                    return (
                      <div key={type} className="mb-2">
                        <p className="text-[9px] font-bold text-gray-500 uppercase mb-1 px-1">{getResourceTypeLabel(type)}</p>
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b border-gray-300">
                              <th className="text-left py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px]">Nome</th>
                              <th className="text-center py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px]">Qtd</th>
                              {isLabor ? (
                                <th className="text-center py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px]">Horas</th>
                              ) : (
                                <th className="text-center py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px]">Unidade</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {resources!.map((r) => {
                              const name = r.resource?.name
                                || r.jobTitle?.name
                                || (r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Recurso')
                              return (
                                <tr key={r.id} className="border-b border-gray-100">
                                  <td className="py-0.5 px-1">{name}</td>
                                  <td className="py-0.5 px-1 text-center">{r.quantity || '-'}</td>
                                  {isLabor ? (
                                    <td className="py-0.5 px-1 text-center">{r.hours || '-'}</td>
                                  ) : (
                                    <td className="py-0.5 px-1 text-center">{r.unit || 'un'}</td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* === OBSERVAÇÕES === */}
              <div className="mt-6">
                <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-3">
                  <span className="font-bold text-[10px] uppercase tracking-wider">Observacoes</span>
                </div>
                <div className="space-y-4 px-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border-b border-gray-300 pb-1"></div>
                  ))}
                </div>
              </div>

              {/* === ASSINATURAS === */}
              <div className="mt-8 grid grid-cols-2 gap-8 px-4">
                <div className="text-center">
                  <div className="border-t border-gray-900 pt-1 mt-8">
                    <p className="text-[9px] font-bold uppercase text-gray-500">Executante</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-900 pt-1 mt-8">
                    <p className="text-[9px] font-bold uppercase text-gray-500">Responsavel</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
