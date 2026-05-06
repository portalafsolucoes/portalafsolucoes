'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
      {/* === CABECALHO ===
          3 colunas: [Logo + Nº OS / Nº Plano] | [INICIO] | [FIM]
          Layout fiel ao modelo MODELO DE OS_REV1.pdf. */}
      <div className="wo-print-header grid grid-cols-[55mm_1fr_1fr] border-2 border-gray-900 mb-1">
        {/* Coluna 1: logo em cima, Nº OS + Nº Plano embaixo */}
        <div className="border-r-2 border-gray-900 flex flex-col">
          <div className="flex-1 flex items-center justify-center px-2 py-1 border-b border-gray-900 min-h-[14mm]">
            {companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companyLogo}
                alt={companyName}
                className="max-h-[12mm] max-w-[50mm] object-contain"
              />
            ) : (
              <span className="text-[10px] font-bold uppercase">{companyName}</span>
            )}
          </div>
          <div className="grid grid-cols-2">
            <div className="border-r border-gray-900 px-2 py-1 flex flex-col">
              <p className="text-[7px] font-bold uppercase text-gray-500">Nº OS</p>
              <p className="text-[11px] font-bold mt-0.5">{displayId}</p>
            </div>
            <div className="px-2 py-1 flex flex-col">
              <p className="text-[7px] font-bold uppercase text-gray-500">Nº Plano</p>
              <p className="text-[11px] font-bold mt-0.5">{planNumber ?? ' '}</p>
            </div>
          </div>
        </div>

        {/* Coluna 2: INICIO */}
        <div className="border-r-2 border-gray-900 flex flex-col">
          <p className="text-[9px] font-bold uppercase tracking-wider text-center bg-gray-100 border-b border-gray-900 px-2 py-0.5">
            Inicio
          </p>
          <div className="flex-1 flex items-end px-2 py-2">
            <p className="text-[10px] font-mono w-full text-center">____/____/______&nbsp;&nbsp;____:____</p>
          </div>
        </div>

        {/* Coluna 3: FIM */}
        <div className="flex flex-col">
          <p className="text-[9px] font-bold uppercase tracking-wider text-center bg-gray-100 border-b border-gray-900 px-2 py-0.5">
            Fim
          </p>
          <div className="flex-1 flex items-end px-2 py-2">
            <p className="text-[10px] font-mono w-full text-center">____/____/______&nbsp;&nbsp;____:____</p>
          </div>
        </div>
      </div>

      {/* === IDENTIFICACAO DO ATIVO === */}
      <table className="w-full border-collapse mb-1 wo-print-block">
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
      <table className="w-full border-collapse mb-1 wo-print-block">
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
        <p className="bg-gray-100 border-b border-gray-900 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider">
          Descricao
        </p>
        <div className="px-2 py-1 min-h-[14mm]">
          {/* whitespace-pre-line preserva quebras de linha do textarea */}
          <p className="whitespace-pre-line text-[10px]">
            {workOrder.description || ' '}
          </p>
        </div>
      </div>

      {/* === TAREFAS ===
          Cada tarefa: banner do titulo + 1 linha de 4 colunas
          (Manutentor/Especialidade | Duracao Tarefa | Inicio | Fim) + Etapas/Resposta.
          Fiel ao MODELO DE OS_REV1.pdf — sem bloco agregado de "duracao total prevista". */}
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
              <div key={task.id} className="wo-task-card border border-gray-900 mb-1">
                {/* Banner: TAREFA N - DESCRICAO DA TAREFA */}
                <div className="bg-gray-100 border-b border-gray-900 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider">
                  Tarefa {taskIdx + 1} - {task.label}
                </div>

                {/* Linha unica com 4 colunas: Manutentor/Especialidade | Duracao | Inicio | Fim */}
                <div className="grid grid-cols-[1fr_25mm_32mm_32mm] border-b border-gray-900">
                  <div className="px-2 py-1 border-r border-gray-900">
                    <p className="text-[7px] font-bold uppercase text-gray-500">Nome do Manutentor ou Especialidade</p>
                    <p className="text-[10px] mt-0.5 min-h-[4mm]">
                      {laborNames.length > 0 ? laborNames.join(' · ') : ' '}
                    </p>
                  </div>
                  <div className="px-2 py-1 border-r border-gray-900 text-center">
                    <p className="text-[7px] font-bold uppercase text-gray-500">Duracao Tarefa</p>
                    <p className="text-[10px] mt-0.5 font-bold">
                      {formatHours(task.executionTime)}
                    </p>
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

                {/* Etapas + Resposta — etapas em italico conforme modelo */}
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
                          <td className="border-t border-gray-300 px-2 py-1 text-[10px] italic align-middle">
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

      {/* === RECURSOS - MATERIAIS / FERRAMENTAS lado a lado === */}
      <div className="grid grid-cols-2 gap-2 mb-1 wo-print-block">
        {/* Materiais */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th colSpan={3} className="border border-gray-900 bg-gray-100 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider">
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
              <th colSpan={2} className="border border-gray-900 bg-gray-100 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider">
                Recursos - Ferramentas
              </th>
            </tr>
            <tr className="text-[7px] font-bold uppercase tracking-wide text-gray-600">
              <th className="border border-gray-900 px-1 py-0.5 text-left w-[12mm]">Qtd.</th>
              <th className="border border-gray-900 px-1 py-0.5 text-left">Nome</th>
            </tr>
          </thead>
          <tbody>
            {toolsRows.map((r, idx) => (
              <tr key={r?.id || `tool-${idx}`}>
                <td className="border border-gray-900 px-1 py-0.5 text-[10px]">{r?.quantity ?? ' '}</td>
                <td className="border border-gray-900 px-1 py-0.5 text-[10px]">{r?.resource?.name || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* === OBSERVACOES === */}
      <div className="border border-gray-900 mb-2 wo-print-block">
        <p className="bg-gray-100 border-b border-gray-900 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider">
          Observacoes
        </p>
        <div className="px-2 py-2 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
  const [mounted, setMounted] = useState(false)
  const companyLogo = user?.company?.logo || null
  const companyName = user?.company?.name || 'Empresa'

  useEffect(() => {
    setMounted(true)
  }, [])

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

  if (!mounted) return null

  let body: React.ReactNode
  if (loading) {
    body = (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  } else if (!workOrder) {
    body = (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar ordem de servico.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded">Fechar</button>
        </div>
      </div>
    )
  } else {
    const displayId = workOrder.externalId || workOrder.internalId || workOrder.customId || workOrder.id.slice(0, 8)
    body = renderOverlay(workOrder, displayId, companyLogo, companyName, handlePrint, onClose)
  }

  // Portal para document.body — garante que o overlay seja irmao direto dos
  // demais root elements (#__next, etc.) e que a regra de print
  // `body > *:not(.wo-print-portal) { display: none }` funcione de forma
  // independente da arvore React. Sem isso, conteudo da pagina pai (sidebar,
  // listagem) imprime junto com a folha A4.
  return createPortal(
    <div className="wo-print-portal">
      <PrintStyles />
      {body}
    </div>,
    document.body
  )
}

function PrintStyles() {
  return (
    <style>{`
      @page {
        size: A4 portrait;
        margin: 6mm 8mm;
      }
      @media print {
        html, body {
          background: white !important;
        }
        /* Esconde tudo o que esta no body, EXCETO o portal do print view.
           Como o portal e irmao direto dos demais root elements (#__next),
           esta regra remove sidebar, header e listagem da impressao
           sem depender de visibility/specificidade. */
        body > *:not(.wo-print-portal) {
          display: none !important;
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
  )
}

function renderOverlay(
  workOrder: PrintWorkOrder,
  displayId: string,
  companyLogo: string | null,
  companyName: string,
  handlePrint: () => void,
  onClose: () => void
) {
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 overflow-auto wo-print-overlay">

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
