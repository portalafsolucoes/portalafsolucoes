'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/lib/utils'
import { parseTaskSteps } from '@/lib/workOrders/taskSteps'
import { formatHours } from '@/lib/units/time'

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
  // Modo embedded: usado pelo BatchPrintView para renderizar so a folha A4,
  // sem overlay/toolbar/wrapper de carregamento.
  data?: PrintWorkOrder | null
  embedded?: boolean
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

// Folha A4 — layout fiel ao modelo, com paginacao multi-pagina via @page A4.
// O conteudo flui livremente no DOM e o navegador quebra em paginas conforme
// necessario. break-inside: avoid em cada card de tarefa evita corte de tarefa.
export function WorkOrderPrintSheet({ workOrder, companyLogo, companyName }: {
  workOrder: PrintWorkOrder
  companyLogo: string | null
  companyName: string
}) {
  const displayId = workOrder.externalId || workOrder.internalId || workOrder.customId || workOrder.id.slice(0, 8)
  const planNumber = workOrder.maintenancePlanExec?.planNumber ?? null
  const sortedTasks = [...(workOrder.tasks || [])].sort((a, b) => a.order - b.order)

  // Recursos a nivel OS — o print exibe apenas Materiais e Ferramentas em
  // duas tabelas lado a lado (modelo). LABOR/SPECIALTY a nivel OS, se ainda
  // existirem em registros legados, NAO entram aqui — mao de obra mora dentro
  // de cada tarefa via TaskResource.
  const woRes = workOrder.woResources || []
  const materials = woRes.filter(r => r.resourceType === 'MATERIAL')
  const tools = woRes.filter(r => r.resourceType === 'TOOL')

  // Hierarquia do ativo
  const assetChain: string[] = []
  if (workOrder.asset) {
    let current = workOrder.asset.parentAsset
    while (current) {
      assetChain.unshift(current.name)
      current = current.parentAsset
    }
  }

  // Garante numero minimo de linhas para o executante anotar a mao
  const padArray = <T,>(arr: T[], min: number, empty: T): T[] => {
    if (arr.length >= min) return arr
    return [...arr, ...Array.from({ length: min - arr.length }, () => empty)]
  }
  const materialsRows = padArray<PrintWoResource | null>(materials, 6, null)
  const toolsRows = padArray<PrintWoResource | null>(tools, 6, null)

  return (
    <div className="wo-print-sheet bg-white text-[10px] text-gray-900 leading-snug">
      {/* === CABECALHO === */}
      <div className="wo-print-header grid grid-cols-[45mm_1fr_38mm] gap-2 border-2 border-gray-900 mb-1">
        {/* Logo + Nº Plano + Nº OS (lado esquerdo, espelhando o modelo) */}
        <div className="border-r-2 border-gray-900 px-2 py-1 flex flex-col items-center justify-center text-center">
          {companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyLogo}
              alt={companyName}
              className="max-h-[12mm] max-w-[42mm] object-contain"
            />
          ) : (
            <span className="text-[10px] font-bold">{companyName}</span>
          )}
          {planNumber && (
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide">
              Plano #{planNumber}
            </p>
          )}
        </div>

        {/* Centro: Controle de execucao (apenas 2 caixas: Inicio, Fim) */}
        <div className="px-2 py-1 flex flex-col">
          <p className="text-[8px] font-bold uppercase tracking-wide text-gray-600 text-center mb-0.5">
            Controle de Execucao
          </p>
          <div className="grid grid-cols-2 gap-2 flex-1">
            <div className="border border-gray-400 px-2 py-1 flex flex-col">
              <p className="text-[7px] font-bold uppercase text-gray-500">Data e Horario Inicio</p>
              <p className="text-[10px] mt-auto font-mono">____/____/______&nbsp;&nbsp;____:____</p>
            </div>
            <div className="border border-gray-400 px-2 py-1 flex flex-col">
              <p className="text-[7px] font-bold uppercase text-gray-500">Data e Horario Fim</p>
              <p className="text-[10px] mt-auto font-mono">____/____/______&nbsp;&nbsp;____:____</p>
            </div>
          </div>
        </div>

        {/* Direita: Numero da OS */}
        <div className="border-l-2 border-gray-900 px-2 py-1 text-center flex flex-col items-center justify-center">
          <p className="text-[8px] font-bold uppercase tracking-wide text-gray-600">Ordem de Servico</p>
          <p className="text-2xl font-black leading-none mt-0.5">{displayId}</p>
          <p className="text-[8px] uppercase mt-0.5 text-gray-700">{getTypeLabel(workOrder.type)}</p>
        </div>
      </div>

      {/* === ATIVO E LOCALIZACAO === */}
      <table className="w-full border-collapse mb-1 wo-print-block">
        <thead>
          <tr>
            <th colSpan={3} className="border border-gray-900 bg-gray-100 px-2 py-0.5 text-left text-[9px] font-bold uppercase tracking-wider">
              Ativo e Localizacao
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
      <table className="w-full border-collapse mb-1 wo-print-block">
        <thead>
          <tr>
            <th colSpan={5} className="border border-gray-900 bg-gray-100 px-2 py-0.5 text-left text-[9px] font-bold uppercase tracking-wider">
              Resumo da O.S.
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
                : getTypeLabel(workOrder.type)}
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
      <div className="border border-gray-900 mb-1 wo-print-block">
        <p className="bg-gray-100 border-b border-gray-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
          Descricao
        </p>
        <div className="px-2 py-1 min-h-[14mm]">
          {/* whitespace-pre-line preserva quebras de linha do textarea */}
          <p className="whitespace-pre-line text-[10px]">
            {workOrder.description || ' '}
          </p>
        </div>
      </div>

      {/* === TAREFAS === */}
      {sortedTasks.length > 0 && (
        <div className="mb-1">
          <div className="border border-gray-900 grid grid-cols-[1fr_25mm] bg-gray-100">
            <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border-r border-gray-900">
              Tarefas
            </p>
            <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-center">
              Duracao Total Prevista
            </p>
          </div>
          <div className="border border-t-0 border-gray-900 grid grid-cols-[1fr_25mm]">
            <p className="px-2 py-0.5 text-[10px] border-r border-gray-900">
              Total: {sortedTasks.length} {sortedTasks.length === 1 ? 'tarefa' : 'tarefas'}
            </p>
            <p className="px-2 py-0.5 text-[10px] text-center font-bold">
              {formatHours(workOrder.estimatedDuration)}
            </p>
          </div>

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

            return (
              <div key={task.id} className="wo-task-card border border-t-0 border-gray-900">
                {/* Header da tarefa: titulo + data inicio + data fim */}
                <div className="grid grid-cols-[1fr_30mm_30mm] border-b border-gray-900">
                  <div className="px-2 py-1 border-r border-gray-900 bg-gray-50">
                    <span className="text-[10px] font-bold uppercase">
                      Tarefa {taskIdx + 1} - {task.label}
                    </span>
                  </div>
                  <div className="px-2 py-1 border-r border-gray-900 text-center">
                    <p className="text-[7px] font-bold uppercase text-gray-500">Data e Hora Inicio</p>
                    <p className="text-[10px] mt-0.5 font-mono">
                      {task.plannedStart
                        ? new Date(task.plannedStart).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        : '__/__/____  __:__'}
                    </p>
                  </div>
                  <div className="px-2 py-1 text-center">
                    <p className="text-[7px] font-bold uppercase text-gray-500">Data e Hora Fim</p>
                    <p className="text-[10px] mt-0.5 font-mono">
                      {task.plannedEnd
                        ? new Date(task.plannedEnd).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        : '__/__/____  __:__'}
                    </p>
                  </div>
                </div>

                {/* Linha 2: Manutentor/Especialidade + Duracao da tarefa */}
                <div className="grid grid-cols-[1fr_60mm] border-b border-gray-900">
                  <div className="px-2 py-1 border-r border-gray-900">
                    <span className="text-[7px] font-bold uppercase text-gray-500">Manutentor / Especialidade</span>
                    <p className="text-[10px] mt-0.5 min-h-[4mm]">
                      {laborNames.length > 0 ? laborNames.join(' · ') : ' '}
                    </p>
                  </div>
                  <div className="px-2 py-1 text-center">
                    <p className="text-[7px] font-bold uppercase text-gray-500">Duracao da Tarefa</p>
                    <p className="text-[10px] mt-0.5 font-bold">
                      {formatHours(task.executionTime)}
                    </p>
                  </div>
                </div>

                {/* Etapas + Resposta */}
                {steps.length > 0 ? (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-[7px] font-bold uppercase tracking-wide text-gray-500">
                        <th className="px-2 py-0.5 text-left bg-gray-50 w-[7mm]">&nbsp;</th>
                        <th className="px-2 py-0.5 text-left bg-gray-50">Etapas</th>
                        <th className="px-2 py-0.5 text-left bg-gray-50 w-[55mm] border-l border-gray-300">Resposta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {steps.map((step, stepIdx) => (
                        <tr key={step.stepId || stepIdx} className="wo-step-row">
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
              </div>
            )
          })}
        </div>
      )}

      {/* === RECURSOS - MATERIAIS / FERRAMENTAS lado a lado === */}
      <div className="grid grid-cols-2 gap-2 mb-1 wo-print-block">
        {/* Materiais */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th colSpan={3} className="border border-gray-900 bg-gray-100 px-2 py-0.5 text-left text-[9px] font-bold uppercase tracking-wider">
                Recursos - Materiais
              </th>
            </tr>
            <tr className="text-[7px] font-bold uppercase tracking-wide text-gray-600">
              <th className="border border-gray-900 px-1 py-0.5 text-left w-[12mm]">Qtd.</th>
              <th className="border border-gray-900 px-1 py-0.5 text-left w-[14mm]">Unidade</th>
              <th className="border border-gray-900 px-1 py-0.5 text-left">Nome</th>
            </tr>
          </thead>
          <tbody>
            {materialsRows.map((r, idx) => (
              <tr key={r?.id || `mat-${idx}`}>
                <td className="border border-gray-900 px-1 py-0.5 text-[10px]">{r?.quantity ?? ' '}</td>
                <td className="border border-gray-900 px-1 py-0.5 text-[10px]">{r?.unit || ' '}</td>
                <td className="border border-gray-900 px-1 py-0.5 text-[10px]">{r?.resource?.name || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Ferramentas */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th colSpan={3} className="border border-gray-900 bg-gray-100 px-2 py-0.5 text-left text-[9px] font-bold uppercase tracking-wider">
                Recursos - Ferramentas
              </th>
            </tr>
            <tr className="text-[7px] font-bold uppercase tracking-wide text-gray-600">
              <th className="border border-gray-900 px-1 py-0.5 text-left w-[12mm]">Qtd.</th>
              <th className="border border-gray-900 px-1 py-0.5 text-left w-[14mm]">Unidade</th>
              <th className="border border-gray-900 px-1 py-0.5 text-left">Nome</th>
            </tr>
          </thead>
          <tbody>
            {toolsRows.map((r, idx) => (
              <tr key={r?.id || `tool-${idx}`}>
                <td className="border border-gray-900 px-1 py-0.5 text-[10px]">{r?.quantity ?? ' '}</td>
                <td className="border border-gray-900 px-1 py-0.5 text-[10px]">{r?.unit || ' '}</td>
                <td className="border border-gray-900 px-1 py-0.5 text-[10px]">{r?.resource?.name || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* === OBSERVACOES === */}
      <div className="border border-gray-900 mb-2 wo-print-block">
        <div className="bg-gray-100 border-b border-gray-900 px-2 py-0.5 flex items-baseline gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider">Observacoes</span>
          <span className="text-[8px] italic text-gray-600">Area de livre preenchimento do manutentor</span>
        </div>
        <div className="px-2 py-2 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-gray-400">&nbsp;</div>
          ))}
        </div>
      </div>

      {/* === ASSINATURA UNICA (EXECUTANTE) === */}
      <div className="flex justify-end mt-6 wo-print-signature">
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

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 overflow-auto wo-print-overlay">
      {/* Estilos de impressao A4 — paginacao multi-pagina, margens minimas,
          e neutralizacao do overlay/toolbar para fluxo limpo. */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }
        @media print {
          html, body {
            background: white !important;
          }
          .wo-print-overlay {
            position: static !important;
            background: white !important;
            overflow: visible !important;
          }
          .wo-print-toolbar { display: none !important; }
          .wo-print-page-wrapper {
            padding: 0 !important;
            display: block !important;
          }
          .wo-print-sheet {
            width: 100% !important;
            min-height: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .wo-task-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .wo-step-row {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .wo-print-block {
            break-inside: avoid-page;
          }
          .wo-print-signature {
            break-before: avoid;
            page-break-before: avoid;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>

      {/* Toolbar (escondida na impressao) */}
      <div className="wo-print-toolbar print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
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
      <div className="wo-print-page-wrapper flex justify-center py-6">
        <div className="bg-white w-[210mm] shadow-lg p-[6mm]">
          <WorkOrderPrintSheet workOrder={workOrder} companyLogo={companyLogo} companyName={companyName} />
        </div>
      </div>
    </div>
  )
}
