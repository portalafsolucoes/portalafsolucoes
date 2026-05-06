'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/lib/utils'
import { parseTaskSteps } from '@/lib/workOrders/taskSteps'
import { formatHours } from '@/lib/units/time'
import { PrintPortal } from '@/components/print/PrintPortal'

interface AssetChain {
  name: string
  parentAsset?: AssetChain | null
}

interface PrintTaskResource {
  id: string
  resourceType: string
  hours?: number | null
  quantity?: number | null
  user?: { id: string; firstName: string; lastName: string } | null
  jobTitle?: { id: string; name: string } | null
}

interface PrintTask {
  id: string
  label: string
  notes?: string | null
  completed: boolean
  order: number
  executionTime?: number | null
  plannedStart?: string | null
  plannedEnd?: string | null
  steps?: unknown
  resources?: PrintTaskResource[]
}

interface PrintWoResource {
  id: string
  resourceType: string
  quantity?: number | null
  hours?: number | null
  unit?: string | null
  taskId?: string | null
  resource?: { id: string; name: string } | null
  jobTitle?: { id: string; name: string } | null
  user?: { id: string; firstName: string; lastName: string } | null
}

export interface PrintWorkOrder {
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
  asset?: AssetChain | null
  location?: { name: string } | null
  assignedTo?: { firstName: string; lastName: string } | null
  assignedTeams?: { id: string; name: string }[]
  createdBy?: { firstName: string; lastName: string } | null
  assetMaintenancePlanId?: string | null
  assetMaintenancePlan?: { name?: string | null; sequence: number } | null
  maintenancePlanExec?: { planNumber: number } | null
  tasks?: PrintTask[]
  woResources?: PrintWoResource[]
  serviceType?: { id: string; name: string; code: string } | null
}

interface WorkOrderPrintViewProps {
  workOrderId: string
  onClose: () => void
  data?: PrintWorkOrder | null
  embedded?: boolean
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
    case 'IN_PROGRESS': return 'EM PROGRESSO'
    case 'ON_HOLD': return 'EM ESPERA'
    case 'COMPLETE': return 'CONCLUIDA'
    default: return status
  }
}

// Folha A4 — layout fiel ao MODELO DE OS_REV1.pdf, com paginacao multi-pagina
// via @page A4. O conteudo flui livremente no DOM e o navegador quebra em
// paginas conforme necessario. break-inside: avoid em cada card de tarefa
// evita corte de tarefa no meio.
export function WorkOrderPrintSheet({ workOrder, companyLogo, companyName }: {
  workOrder: PrintWorkOrder
  companyLogo: string | null
  companyName: string
}) {
  const displayId = workOrder.externalId || workOrder.internalId || workOrder.customId || workOrder.id.slice(0, 8)
  const planNumber = workOrder.maintenancePlanExec?.planNumber ?? null
  const sortedTasks = [...(workOrder.tasks || [])].sort((a, b) => a.order - b.order)
  const firstTaskId = sortedTasks[0]?.id ?? null

  // Recursos a nivel OS (WorkOrderResource) — agrupados por tarefa via taskId.
  // Linhas com taskId === null (legado, antes da migracao) caem na primeira
  // tarefa. LABOR/SPECIALTY a nivel OS NAO entram aqui — mao de obra mora
  // dentro de cada tarefa via TaskResource (campo task.resources).
  const woRes = workOrder.woResources || []
  const resourcesByTask = (taskId: string): { materials: PrintWoResource[]; tools: PrintWoResource[] } => {
    const matches = woRes.filter((r) => {
      if (r.resourceType !== 'MATERIAL' && r.resourceType !== 'TOOL') return false
      if (r.taskId) return r.taskId === taskId
      // Legado: linhas sem taskId vao para a primeira tarefa
      return taskId === firstTaskId
    })
    return {
      materials: matches.filter((r) => r.resourceType === 'MATERIAL'),
      tools: matches.filter((r) => r.resourceType === 'TOOL'),
    }
  }

  // Hierarquia do ativo
  const assetChain: string[] = []
  if (workOrder.asset) {
    let current = workOrder.asset.parentAsset
    while (current) {
      assetChain.unshift(current.name)
      current = current.parentAsset
    }
  }

  return (
    <div className="wo-print-sheet bg-white text-[10px] text-gray-900 leading-snug">
      {/* === CABECALHO — fiel ao modelo (PDF):
          [LOGO + Nº OS + Nº Plano | INÍCIO | FIM]
          LOGO ocupa metade superior da coluna esquerda; Nº OS e Nº Plano
          ocupam a metade inferior em duas sub-colunas. */}
      <div className="grid grid-cols-[60mm_1fr_1fr] border-2 border-gray-900 mb-1 print-block-keep">
        {/* Coluna esquerda: logo + Nº OS + Nº Plano */}
        <div className="border-r-2 border-gray-900 flex flex-col">
          <div className="border-b border-gray-900 flex items-center justify-center px-2 py-2 min-h-[14mm]">
            {companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companyLogo}
                alt={companyName}
                className="max-h-[12mm] max-w-[50mm] object-contain"
              />
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider">{companyName}</span>
            )}
          </div>
          <div className="grid grid-cols-2">
            <div className="px-2 py-1 border-r border-gray-900">
              <p className="text-[7px] font-bold uppercase tracking-wide text-gray-500">Nº OS</p>
              <p className="text-[10px] font-bold mt-0.5">{displayId}</p>
            </div>
            <div className="px-2 py-1">
              <p className="text-[7px] font-bold uppercase tracking-wide text-gray-500">Nº Plano</p>
              <p className="text-[10px] mt-0.5">{planNumber ?? '-'}</p>
            </div>
          </div>
        </div>

        {/* Coluna central: INÍCIO */}
        <div className="border-r-2 border-gray-900 flex flex-col">
          <div className="border-b border-gray-900 px-2 py-1 text-center bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-wider">Inicio</p>
          </div>
          <div className="flex-1 flex items-center justify-center px-2 py-2">
            <p className="font-mono text-[10px]">____/____/______&nbsp;&nbsp;____:____</p>
          </div>
        </div>

        {/* Coluna direita: FIM */}
        <div className="flex flex-col">
          <div className="border-b border-gray-900 px-2 py-1 text-center bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-wider">Fim</p>
          </div>
          <div className="flex-1 flex items-center justify-center px-2 py-2">
            <p className="font-mono text-[10px]">____/____/______&nbsp;&nbsp;____:____</p>
          </div>
        </div>
      </div>

      {/* === IDENTIFICACAO DO ATIVO === */}
      <table className="w-full border-collapse mb-1 print-block-keep">
        <thead>
          <tr>
            <th colSpan={3} className="border border-gray-900 bg-gray-100 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider">
              Identificacao do Ativo
            </th>
          </tr>
          <tr className="text-[8px] font-bold uppercase tracking-wide text-gray-600">
            <th className="border border-gray-900 px-2 py-0.5 text-left w-[35%]">Ativo</th>
            <th className="border border-gray-900 px-2 py-0.5 text-left">Hierarquia</th>
            <th className="border border-gray-900 px-2 py-0.5 text-left w-[25%]">Localizacao</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-900 px-2 py-1 align-top">{workOrder.asset?.name || '-'}</td>
            <td className="border border-gray-900 px-2 py-1 align-top">
              {assetChain.length > 0 ? assetChain.join(' > ') : '-'}
            </td>
            <td className="border border-gray-900 px-2 py-1 align-top">{workOrder.location?.name || '-'}</td>
          </tr>
        </tbody>
      </table>

      {/* === RESUMO DA OS === */}
      <table className="w-full border-collapse mb-1 print-block-keep">
        <thead>
          <tr>
            <th colSpan={5} className="border border-gray-900 bg-gray-100 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider">
              Resumo da OS
            </th>
          </tr>
          <tr className="text-[8px] font-bold uppercase tracking-wide text-gray-600">
            <th className="border border-gray-900 px-2 py-0.5 text-left">Status</th>
            <th className="border border-gray-900 px-2 py-0.5 text-left">Prioridade</th>
            <th className="border border-gray-900 px-2 py-0.5 text-left">Tipo de Servico</th>
            <th className="border border-gray-900 px-2 py-0.5 text-left">Criado em</th>
            <th className="border border-gray-900 px-2 py-0.5 text-left">Vencimento</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-900 px-2 py-1">{getStatusLabel(workOrder.status)}</td>
            <td className="border border-gray-900 px-2 py-1">{getPriorityLabel(workOrder.priority)}</td>
            <td className="border border-gray-900 px-2 py-1">
              {workOrder.serviceType
                ? `${workOrder.serviceType.code} - ${workOrder.serviceType.name}`
                : '-'}
            </td>
            <td className="border border-gray-900 px-2 py-1">
              {workOrder.createdAt ? formatDateTime(workOrder.createdAt) : '-'}
            </td>
            <td className="border border-gray-900 px-2 py-1">
              {workOrder.dueDate ? formatDate(workOrder.dueDate) : '-'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* === DESCRICAO === */}
      <div className="border border-gray-900 mb-2 print-block-keep">
        <p className="bg-gray-100 border-b border-gray-900 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider">
          Descricao
        </p>
        <div className="px-2 py-1 min-h-[14mm]">
          <p className="whitespace-pre-line text-[10px]">
            {workOrder.description || ' '}
          </p>
        </div>
      </div>

      {/* === TAREFAS === */}
      {sortedTasks.map((task, taskIdx) => {
        const steps = parseTaskSteps(task.steps)
        const taskResources = task.resources || []
        const laborNames = taskResources
          .map((r) => {
            if (r.resourceType === 'LABOR' && r.user) {
              return `${r.user.firstName} ${r.user.lastName}`
            }
            if (r.resourceType === 'SPECIALTY' && r.jobTitle) {
              return r.jobTitle.name
            }
            return null
          })
          .filter(Boolean) as string[]

        const { materials: taskMaterials, tools: taskTools } = resourcesByTask(task.id)
        const hasResources = taskMaterials.length > 0 || taskTools.length > 0

        return (
          <div key={task.id} className="wo-task-card print-break-avoid border border-gray-900 mb-2">
            {/* Titulo da tarefa */}
            <div className="bg-gray-100 border-b border-gray-900 px-2 py-1 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Tarefa {taskIdx + 1} - {task.label}
              </span>
            </div>

            {/* Cabecalho da tarefa em UMA linha (modelo): Manutentor | Duracao | Inicio | Fim */}
            <div className="grid grid-cols-[1fr_24mm_36mm_36mm] border-b border-gray-900">
              <div className="px-2 py-1 border-r border-gray-900">
                <p className="text-[7px] font-bold uppercase tracking-wide text-gray-500">
                  Nome do Manutentor ou Especialidade
                </p>
                {laborNames.length > 0 ? (
                  // Uma linha por manutentor/especialidade (modelo)
                  laborNames.map((name, i) => (
                    <p key={i} className="text-[10px] mt-0.5 leading-tight">{name}</p>
                  ))
                ) : (
                  <p className="text-[10px] mt-0.5">&nbsp;</p>
                )}
              </div>
              <div className="px-2 py-1 border-r border-gray-900 text-center">
                <p className="text-[7px] font-bold uppercase tracking-wide text-gray-500">Duracao Tarefa</p>
                <p className="text-[10px] mt-0.5 font-bold">{formatHours(task.executionTime)}</p>
              </div>
              <div className="px-2 py-1 border-r border-gray-900 text-center">
                <p className="text-[7px] font-bold uppercase tracking-wide text-gray-500">Data e Hora Inicio</p>
                <p className="text-[10px] mt-0.5 font-mono">
                  {task.plannedStart
                    ? new Date(task.plannedStart).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : '__/__/____  __:__'}
                </p>
              </div>
              <div className="px-2 py-1 text-center">
                <p className="text-[7px] font-bold uppercase tracking-wide text-gray-500">Data e Hora Fim</p>
                <p className="text-[10px] mt-0.5 font-mono">
                  {task.plannedEnd
                    ? new Date(task.plannedEnd).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : '__/__/____  __:__'}
                </p>
              </div>
            </div>

            {/* Etapas + Resposta (com checkbox conforme modelo) */}
            {steps.length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-[7px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50">
                    <th className="px-2 py-0.5 text-left w-[7mm]">&nbsp;</th>
                    <th className="px-2 py-0.5 text-left">Etapas</th>
                    <th className="px-2 py-0.5 text-left w-[55mm] border-l border-gray-300">Resposta</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step, stepIdx) => (
                    <tr key={step.stepId || stepIdx} className="print-break-avoid">
                      <td className="border-t border-gray-300 px-2 py-1 text-center align-middle">
                        <span className="inline-block w-3 h-3 border border-gray-700"></span>
                      </td>
                      <td className="border-t border-gray-300 px-2 py-1 text-[10px] align-middle">
                        {step.stepName}
                      </td>
                      <td className="border-t border-l border-gray-300 px-2 py-1 align-middle">
                        <span className="block w-full border-b border-gray-400 min-h-[5mm]">&nbsp;</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-2 py-1 text-[9px] text-gray-500 italic">
                Sem etapas detalhadas para esta tarefa.
              </div>
            )}

            {task.notes && (
              <p className="px-2 py-1 text-[9px] text-gray-500 border-t border-gray-300">
                Nota: {task.notes}
              </p>
            )}

            {/* RECURSOS TAREFA N — exibe apenas quando ha materiais ou ferramentas */}
            {hasResources && (
              <div className="border-t border-gray-900">
                <div className="bg-gray-100 border-b border-gray-900 px-2 py-1 text-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    Recursos Tarefa {taskIdx + 1}
                  </span>
                </div>
                <div className="grid grid-cols-2">
                  {/* Materiais — 3 colunas (Qtd, Unidade, Nome) */}
                  <div className="border-r border-gray-900">
                    <div className="bg-gray-50 border-b border-gray-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Materiais
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-[7px] font-bold uppercase tracking-wide text-gray-600 bg-gray-50">
                          <th className="border-b border-r border-gray-300 px-1 py-0.5 text-left w-[12mm]">Qtd.</th>
                          <th className="border-b border-r border-gray-300 px-1 py-0.5 text-left w-[14mm]">Unidade</th>
                          <th className="border-b border-gray-300 px-1 py-0.5 text-left">Nome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskMaterials.length > 0 ? (
                          taskMaterials.map((r) => (
                            <tr key={r.id}>
                              <td className="border-b border-r border-gray-300 px-1 py-0.5 text-[10px]">{r.quantity ?? ' '}</td>
                              <td className="border-b border-r border-gray-300 px-1 py-0.5 text-[10px]">{r.unit || ' '}</td>
                              <td className="border-b border-gray-300 px-1 py-0.5 text-[10px]">{r.resource?.name || ' '}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-2 py-1 text-[9px] text-gray-400 italic text-center">-</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Ferramentas — 2 colunas (Qtd, Nome) — modelo NAO tem unidade */}
                  <div>
                    <div className="bg-gray-50 border-b border-gray-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Ferramentas
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-[7px] font-bold uppercase tracking-wide text-gray-600 bg-gray-50">
                          <th className="border-b border-r border-gray-300 px-1 py-0.5 text-left w-[12mm]">Qtd.</th>
                          <th className="border-b border-gray-300 px-1 py-0.5 text-left">Nome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskTools.length > 0 ? (
                          taskTools.map((r) => (
                            <tr key={r.id}>
                              <td className="border-b border-r border-gray-300 px-1 py-0.5 text-[10px]">{r.quantity ?? ' '}</td>
                              <td className="border-b border-gray-300 px-1 py-0.5 text-[10px]">{r.resource?.name || ' '}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="px-2 py-1 text-[9px] text-gray-400 italic text-center">-</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* === OBSERVACOES === */}
      <div className="border border-gray-900 mb-3 print-block-keep">
        <div className="bg-gray-100 border-b border-gray-900 px-2 py-0.5 text-center">
          <span className="text-[9px] font-bold uppercase tracking-wider">Observacoes</span>
        </div>
        <div className="px-2 py-2 space-y-3">
          {/* 9 linhas em branco (modelo) para preenchimento manual */}
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border-b border-gray-400">&nbsp;</div>
          ))}
        </div>
      </div>

      {/* === ASSINATURA UNICA (EXECUTANTE) === */}
      <div className="flex justify-end mt-4 print-break-avoid">
        <div className="w-[80mm] text-center">
          <div className="border-t border-gray-900 pt-0.5">
            <p className="text-[9px] font-bold uppercase tracking-wider">Executante</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WorkOrderPrintView({ workOrderId, onClose, data, embedded = false }: WorkOrderPrintViewProps) {
  const { user } = useAuth()
  const [workOrder, setWorkOrder] = useState<PrintWorkOrder | null>(data ?? null)
  const [loading, setLoading] = useState(!data)
  const companyLogo = user?.company?.logo || null
  const companyName = user?.company?.name || 'Empresa'

  useEffect(() => {
    if (data) {
      setWorkOrder(data)
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const res = await fetch(`/api/work-orders/${workOrderId}`)
        if (res.ok) {
          const { data: woData } = await res.json()
          setWorkOrder(woData)
        }
      } catch {
        // silent fail
      }
      setLoading(false)
    }
    void load()
  }, [workOrderId, data])

  const handlePrint = () => {
    window.print()
  }

  if (embedded) {
    if (!workOrder) return null
    return <WorkOrderPrintSheet workOrder={workOrder} companyLogo={companyLogo} companyName={companyName} />
  }

  if (loading) {
    return (
      <PrintPortal>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Carregando...</p>
          </div>
        </div>
      </PrintPortal>
    )
  }

  if (!workOrder) {
    return (
      <PrintPortal>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-gray-600">Erro ao carregar ordem de servico.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded">Fechar</button>
          </div>
        </div>
      </PrintPortal>
    )
  }

  const displayId = workOrder.externalId || workOrder.internalId || workOrder.customId || workOrder.id.slice(0, 8)

  return (
    <PrintPortal>
      {/* Toolbar (escondida na impressao) */}
      <div className="print-portal-toolbar sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
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

      {/* Folha A4 */}
      <div className="print-portal-pages flex justify-center py-6">
        <div className="print-portal-page bg-white w-[210mm] shadow-lg p-[6mm]">
          <WorkOrderPrintSheet workOrder={workOrder} companyLogo={companyLogo} companyName={companyName} />
        </div>
      </div>
    </PrintPortal>
  )
}
