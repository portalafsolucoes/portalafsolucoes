'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/lib/utils'

interface PrintWorkOrder {
  id: string
  title: string
  description?: string | null
  type?: string | null
  status: string
  priority: string
  systemStatus?: string | null
  externalId?: string | null
  internalId?: string | null
  customId?: string | null
  estimatedDuration?: number | null
  createdAt?: string | null
  dueDate?: string | null
  asset?: { name: string; parentAsset?: any } | null
  location?: { name: string } | null
  assignedTo?: { firstName: string; lastName: string } | null
  assignedTeams?: { id: string; name: string }[]
  createdBy?: { firstName: string; lastName: string } | null
  assetMaintenancePlanId?: string | null
  assetMaintenancePlan?: { name?: string | null; sequence: number } | null
  maintenancePlanExec?: { planNumber: number } | null
  tasks?: {
    id: string
    label: string
    notes?: string | null
    completed: boolean
    order: number
    executionTime?: number | null
    steps?: any
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

interface WorkOrderPrintViewProps {
  workOrderId: string
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

interface TaskStep {
  stepId?: string
  stepName: string
  optionType: string
  options?: { id?: string; label: string; order: number }[]
}

function parseTaskSteps(steps: any): TaskStep[] {
  if (!steps) return []
  if (Array.isArray(steps)) return steps
  try {
    return JSON.parse(steps)
  } catch {
    return []
  }
}

export function WorkOrderPrintView({ workOrderId, onClose }: WorkOrderPrintViewProps) {
  const { user } = useAuth()
  const [workOrder, setWorkOrder] = useState<PrintWorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)
  const companyLogo = user?.company?.logo || null
  const companyName = user?.company?.name || 'Empresa'

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/work-orders/${workOrderId}`)
        if (res.ok) {
          const { data } = await res.json()
          setWorkOrder(data)
        }
      } catch {
        // silently fail
      }
      setLoading(false)
    }
    void load()
  }, [workOrderId])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar ordem de servico.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded">Fechar</button>
        </div>
      </div>
    )
  }

  const displayId = workOrder.externalId || workOrder.internalId || workOrder.customId || workOrder.id.slice(0, 8)
  const sortedTasks = [...(workOrder.tasks || [])].sort((a, b) => a.order - b.order)

  const groupedResources: Record<string, typeof workOrder.woResources> = {}
  for (const r of (workOrder.woResources || [])) {
    const type = r.resourceType || 'MATERIAL'
    if (!groupedResources[type]) groupedResources[type] = []
    groupedResources[type]!.push(r)
  }

  // Build asset hierarchy chain
  const assetChain: string[] = []
  if (workOrder.asset) {
    let current = workOrder.asset.parentAsset
    while (current) {
      assetChain.unshift(current.name)
      current = current.parentAsset
    }
    assetChain.push(workOrder.asset.name)
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 overflow-auto">
      {/* Toolbar - hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Visualizacao de Impressao - OS {displayId}</h2>
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

      {/* A4 Page */}
      <div className="flex justify-center py-8 print:py-0 print:block">
        <div
          ref={printRef}
          className="bg-white w-[210mm] min-h-[297mm] shadow-lg print:shadow-none print:w-full px-[15mm] py-[10mm] text-[11px] text-gray-900 leading-relaxed"
        >
          {/* === CABEÇALHO === */}
          <div className="flex items-start justify-between border-b-2 border-gray-900 pb-3 mb-4">
            {/* Logo */}
            <div className="flex-shrink-0 w-[45mm]">
              {companyLogo ? (
                <div className="bg-gray-600 rounded px-3 py-2 inline-block">
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

            {/* Campos de Data/Hora */}
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

            {/* Número da OS */}
            <div className="flex-shrink-0 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Ordem de Servico</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">{displayId}</p>
              <p className="text-[9px] text-gray-500">{getTypeLabel(workOrder.type)}</p>
            </div>
          </div>

          {/* === 1. RESUMO DA OS === */}
          <div className="mb-3">
            <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">Resumo da OS</span>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Status</p>
                <p className="font-medium">{getStatusLabel(workOrder.status)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Prioridade</p>
                <p className="font-medium">{getPriorityLabel(workOrder.priority)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Tipo</p>
                <p className="font-medium">{getTypeLabel(workOrder.type)}</p>
              </div>
              {workOrder.createdAt && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Criado em</p>
                  <p className="font-medium">{formatDateTime(workOrder.createdAt)}</p>
                </div>
              )}
              {workOrder.dueDate && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Vencimento</p>
                  <p className="font-medium">{formatDate(workOrder.dueDate)}</p>
                </div>
              )}
              {workOrder.estimatedDuration != null && workOrder.estimatedDuration > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Tempo Estimado</p>
                  <p className="font-medium">{workOrder.estimatedDuration} min</p>
                </div>
              )}
            </div>
            {workOrder.description && (
              <div className="mt-2 px-1">
                <p className="text-[9px] font-bold text-gray-500 uppercase">Descricao</p>
                <p className="font-medium">{workOrder.description}</p>
              </div>
            )}
          </div>

          {/* === 2. ATIVO E LOCALIZAÇÃO === */}
          {(workOrder.asset || workOrder.location) && (
            <div className="mb-3">
              <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                <span className="font-bold text-[10px] uppercase tracking-wider">Ativo e Localizacao</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1">
                {workOrder.asset && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Ativo</p>
                    <p className="font-medium">{workOrder.asset.name}</p>
                  </div>
                )}
                {workOrder.location && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Localizacao</p>
                    <p className="font-medium">{workOrder.location.name}</p>
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

          {/* === 3. PLANO DE ORIGEM === */}
          {workOrder.assetMaintenancePlanId && (
            <div className="mb-3">
              <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                <span className="font-bold text-[10px] uppercase tracking-wider">Plano de Origem</span>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
                {workOrder.assetMaintenancePlan?.name && (
                  <div className="col-span-2">
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Nome da Manutencao</p>
                    <p className="font-medium">{workOrder.assetMaintenancePlan.name}</p>
                  </div>
                )}
                {workOrder.maintenancePlanExec?.planNumber && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Plano de Execucao</p>
                    <p className="font-medium">Plano #{workOrder.maintenancePlanExec.planNumber}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === 4. TAREFAS === */}
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
                            {task.executionTime && (
                              <span className="text-[9px] text-gray-500">({task.executionTime} min)</span>
                            )}
                          </div>
                          {task.notes && (
                            <p className="text-[9px] text-gray-500 mt-0.5">{task.notes}</p>
                          )}

                          {/* Etapas com tipo evidenciado + campo em branco */}
                          {steps.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                              <p className="text-[8px] font-bold text-gray-500 uppercase">Etapas:</p>
                              {steps.map((step, stepIdx) => (
                                <div key={step.stepId || stepIdx} className="flex items-start gap-2 border-b border-gray-100 pb-1">
                                  <span className="w-4 h-4 border border-gray-400 rounded-sm flex-shrink-0 mt-0.5"></span>
                                  <div className="flex-1">
                                    <span className="text-[10px]">{step.stepName}</span>
                                    {step.optionType && step.optionType !== 'NONE' && (
                                      <span className="ml-1 text-[8px] font-bold px-1 py-0.5 rounded bg-gray-200 text-gray-700 uppercase">
                                        {step.optionType === 'RESPONSE' ? 'Resposta' : 'Opcao'}
                                      </span>
                                    )}
                                  </div>
                                  {/* Campo em branco para preenchimento manual */}
                                  <div className="flex-shrink-0 w-[35mm] border-b border-gray-400 ml-2">
                                    <span className="text-[7px] text-gray-400">
                                      {step.optionType === 'RESPONSE' ? 'Valor:' : step.optionType === 'OPTION' ? 'Opcao:' : ''}
                                    </span>
                                  </div>
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

          {/* === 5. RECURSOS === */}
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

          {/* === OBSERVAÇÕES (linhas em branco) === */}
          <div className="mt-6">
            <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-3">
              <span className="font-bold text-[10px] uppercase tracking-wider">Observacoes</span>
            </div>
            <div className="space-y-4 px-1">
              {Array.from({ length: 8 }).map((_, i) => (
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
      </div>
    </div>
  )
}
