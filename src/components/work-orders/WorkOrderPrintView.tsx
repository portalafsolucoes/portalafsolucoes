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
  unit?: string | null
  user?: { id: string; firstName: string; lastName: string } | null
  jobTitle?: { id: string; name: string } | null
  resource?: { id: string; name: string; unit?: string | null } | null
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

// Par label/valor compacto usado no estilo clean. Label em cinza claro
// uppercase pequeno acima do valor em preto. Sem bordas internas — apenas
// posicionamento em grid. Reaproveitado em "Resumo da OS" e onde mais fizer
// sentido no print.
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">{label}</p>
      <p className="text-[10px] font-medium text-gray-900 leading-tight">{value}</p>
    </div>
  )
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

  // Recursos por tarefa (MATERIAL/TOOL/LABOR/SPECIALTY) ja sao renderizados
  // dentro de cada card de tarefa, conforme MODELO DE OS_REV1.pdf.
  // O bloco abaixo (woRes) e fallback de compat para OSs legadas que ainda
  // tem MATERIAL/TOOL em WorkOrderResource (nivel OS) — so renderiza quando
  // nenhuma tarefa tem recursos proprios.
  const woRes = workOrder.woResources || []
  const materials = woRes.filter(r => r.resourceType === 'MATERIAL')
  const tools = woRes.filter(r => r.resourceType === 'TOOL')
  const anyTaskHasResources = sortedTasks.some(t =>
    (t.resources || []).some(r => r.resourceType === 'MATERIAL' || r.resourceType === 'TOOL')
  )
  const showLegacyResourcesBlock = !anyTaskHasResources && (materials.length > 0 || tools.length > 0)

  // Hierarquia do ativo: caminho completo do topo ate o proprio ativo.
  // Para um ativo raiz, o chain tem apenas o nome dele. Para um ativo filho,
  // mostra "Pai > Sub > Ativo". O fetch da API ja traz ate 5 niveis de pais.
  // Supabase as vezes retorna `parentAsset` como array vazio em vez de null —
  // o helper abaixo normaliza para um objeto unico ou null.
  const normalizeParent = (p: unknown): AssetChain | null => {
    if (!p) return null
    if (Array.isArray(p)) return p.length > 0 ? (p[0] as AssetChain) : null
    return p as AssetChain
  }
  const assetChain: string[] = []
  if (workOrder.asset) {
    let current: AssetChain | null = normalizeParent(workOrder.asset.parentAsset)
    while (current && current.name) {
      assetChain.unshift(current.name)
      current = normalizeParent(current.parentAsset)
    }
    if (workOrder.asset.name) assetChain.push(workOrder.asset.name)
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

      {/* === ATIVO E LOCALIZACAO ===
          Estilo clean: caixa fina contornada com o titulo + grid 2 colunas sem grade interna.
          Hierarquia aparece como linha secundaria abaixo do nome do ativo, como no MODELO. */}
      <div className="mb-3 wo-print-block">
        <div className="border border-gray-300 rounded-sm px-3 py-1 mb-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-700">Ativo e Localizacao</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-3">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Ativo</p>
            <p className="text-[11px] font-bold text-gray-900 leading-tight">
              {workOrder.asset?.name || '-'}
            </p>
            {assetChain.length > 0 && (
              <p className="text-[8px] text-gray-500 mt-0.5">
                Hierarquia: &gt; {assetChain.join(' > ')}
              </p>
            )}
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Localizacao</p>
            <p className="text-[11px] font-bold text-gray-900 leading-tight">
              {workOrder.location?.name || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* === RESUMO DA OS ===
          Estilo clean: caixa fina contornada com o titulo + grid 3x2 sem grade interna.
          Tipo de Servico (codigo - nome) preservado quando existir; Tempo Estimado adicionado
          como sexto campo conforme imagens de referencia. */}
      <div className="mb-3 wo-print-block">
        <div className="border border-gray-300 rounded-sm px-3 py-1 mb-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-700">Resumo da OS</p>
        </div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-2.5 px-3">
          <Field label="Status" value={getStatusLabel(workOrder.status)} />
          <Field label="Prioridade" value={getPriorityLabel(workOrder.priority)} />
          <Field
            label="Tipo de Servico"
            value={workOrder.serviceType
              ? `${workOrder.serviceType.code} - ${workOrder.serviceType.name}`
              : getTypeLabel(workOrder.type)}
          />
          <Field
            label="Criado em"
            value={workOrder.createdAt ? formatDateTime(workOrder.createdAt) : '-'}
          />
          <Field
            label="Vencimento"
            value={workOrder.dueDate ? formatDate(workOrder.dueDate) : '-'}
          />
          <Field label="Tempo Estimado" value={formatHours(workOrder.estimatedDuration)} />
        </div>
      </div>

      {/* === DESCRICAO ===
          Estilo clean: caixa fina contornada com o titulo + texto livre abaixo,
          sem moldura interna. whitespace-pre-line preserva quebras de linha. */}
      <div className="mb-3 wo-print-block">
        <div className="border border-gray-300 rounded-sm px-3 py-1 mb-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-700">Descricao</p>
        </div>
        <div className="px-3">
          <p className="whitespace-pre-line text-[10px] text-gray-900 leading-relaxed min-h-[14mm]">
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
            const taskMaterials = taskResources.filter(r => r.resourceType === 'MATERIAL')
            const taskTools = taskResources.filter(r => r.resourceType === 'TOOL')
            const hasTaskResources = taskMaterials.length > 0 || taskTools.length > 0

            return (
              <div key={task.id} className="wo-task-card mb-3">
                {/* Titulo da tarefa em caixa fina contornada (estilo clean) */}
                <div className="border border-gray-300 rounded-sm px-3 py-1 mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-700">
                    Tarefa {taskIdx + 1} - {task.label}
                  </p>
                </div>

                {/* 4 colunas em grid borderless (estilo clean): Manutentor/Especialidade | Duracao | Inicio | Fim */}
                <div className="grid grid-cols-[1fr_25mm_36mm_36mm] gap-x-4 px-3 mb-2">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Manutentor / Especialidade</p>
                    <p className="text-[10px] text-gray-900 min-h-[4mm]">
                      {laborNames.length > 0 ? laborNames.join(' · ') : ' '}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Duracao</p>
                    <p className="text-[10px] text-gray-900 font-medium">
                      {formatHours(task.executionTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Inicio Previsto</p>
                    <p className="text-[10px] text-gray-900 font-mono">
                      {task.plannedStart
                        ? new Date(task.plannedStart).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        : '__/__/____  __:__'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Fim Previsto</p>
                    <p className="text-[10px] text-gray-900 font-mono">
                      {task.plannedEnd
                        ? new Date(task.plannedEnd).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        : '__/__/____  __:__'}
                    </p>
                  </div>
                </div>

                {/* Etapas + Resposta — apenas divisores horizontais finos, sem grade vertical.
                    Etapas em italico, conforme MODELO. */}
                {steps.length > 0 ? (
                  <div className="px-3">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-[8px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300">
                          <th className="px-2 py-1 text-left w-[7mm]">&nbsp;</th>
                          <th className="px-2 py-1 text-left">Etapas</th>
                          <th className="px-2 py-1 text-left w-[55mm]">Resposta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {steps.map((step, stepIdx) => (
                          <tr key={step.stepId || stepIdx} className="wo-step-row border-b border-gray-200">
                            <td className="px-2 py-1.5 text-center align-middle">
                              <span className="inline-block w-3 h-3 border border-gray-700"></span>
                            </td>
                            <td className="px-2 py-1.5 text-[10px] italic text-gray-900 align-middle">
                              {step.stepName}
                            </td>
                            <td className="px-2 py-1.5 align-middle">
                              <span className="block w-full border-b border-gray-400 min-h-[5mm]">&nbsp;</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-3 text-[9px] text-gray-500 italic mb-1">
                    Sem etapas detalhadas para esta tarefa.
                  </div>
                )}

                {/* RECURSOS TAREFA N — bloco condicional por tarefa, estilo clean.
                    Caixa fina contornada como titulo + tabelas Materiais e Ferramentas
                    lado a lado, com apenas divisores horizontais entre linhas. */}
                {hasTaskResources && (
                  <div className="mt-2 px-3">
                    <div className="border border-gray-300 rounded-sm px-3 py-1 mb-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-700">
                        Recursos Tarefa {taskIdx + 1}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6">
                      {/* Materiais */}
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Materiais</p>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="text-[7px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300">
                              <th className="px-1 py-1 text-left w-[12mm]">Qtd.</th>
                              <th className="px-1 py-1 text-left w-[14mm]">Unidade</th>
                              <th className="px-1 py-1 text-left">Nome</th>
                            </tr>
                          </thead>
                          <tbody>
                            {taskMaterials.length > 0 ? taskMaterials.map((r, idx) => (
                              <tr key={r.id || `tmat-${idx}`} className="border-b border-gray-200">
                                <td className="px-1 py-1 text-[10px] text-gray-900">{r.quantity ?? '-'}</td>
                                <td className="px-1 py-1 text-[10px] text-gray-900">{r.unit || r.resource?.unit || '-'}</td>
                                <td className="px-1 py-1 text-[10px] text-gray-900">{r.resource?.name || '-'}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={3} className="px-1 py-1 text-[9px] text-gray-400 italic">-</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {/* Ferramentas — modelo nao tem coluna UNIDADE em ferramentas */}
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Ferramentas</p>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="text-[7px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300">
                              <th className="px-1 py-1 text-left w-[12mm]">Qtd.</th>
                              <th className="px-1 py-1 text-left">Nome</th>
                            </tr>
                          </thead>
                          <tbody>
                            {taskTools.length > 0 ? taskTools.map((r, idx) => (
                              <tr key={r.id || `ttool-${idx}`} className="border-b border-gray-200">
                                <td className="px-1 py-1 text-[10px] text-gray-900">{r.quantity ?? '-'}</td>
                                <td className="px-1 py-1 text-[10px] text-gray-900">{r.resource?.name || '-'}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={2} className="px-1 py-1 text-[9px] text-gray-400 italic">-</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {task.notes && (
                  <p className="px-3 mt-1 text-[9px] text-gray-500">
                    Nota: {task.notes}
                  </p>
                )}
              </div>
            )
          })}

      {/* === RECURSOS DA OS (FALLBACK DE COMPAT P/ OSs LEGADAS) ===
          Renderiza apenas quando nenhuma tarefa tem MATERIAL/TOOL atribuido
          (TaskResource), mas existem recursos a nivel OS (WorkOrderResource).
          OSs novas usam recursos por tarefa, fieis ao MODELO DE OS_REV1.pdf. */}
      {showLegacyResourcesBlock && (
      <div className="mb-3 wo-print-block">
        <div className="border border-gray-300 rounded-sm px-3 py-1 mb-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-700">Recursos</p>
        </div>
      <div className="grid grid-cols-2 gap-x-6 px-3">
        {/* Materiais */}
        <div>
        <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Materiais</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[7px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300">
              <th className="px-1 py-1 text-left w-[12mm]">Qtd.</th>
              <th className="px-1 py-1 text-left w-[14mm]">Unidade</th>
              <th className="px-1 py-1 text-left">Nome</th>
            </tr>
          </thead>
          <tbody>
            {materialsRows.map((r, idx) => (
              <tr key={r?.id || `mat-${idx}`}>
                <td className="border-b border-gray-200 px-1 py-1 text-[10px] text-gray-900">{r?.quantity ?? ' '}</td>
                <td className="border-b border-gray-200 px-1 py-1 text-[10px] text-gray-900">{r?.unit || ' '}</td>
                <td className="border-b border-gray-200 px-1 py-1 text-[10px] text-gray-900">{r?.resource?.name || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Ferramentas */}
        <div>
        <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Ferramentas</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[7px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300">
              <th className="px-1 py-1 text-left w-[12mm]">Qtd.</th>
              <th className="px-1 py-1 text-left">Nome</th>
            </tr>
          </thead>
          <tbody>
            {toolsRows.map((r, idx) => (
              <tr key={r?.id || `tool-${idx}`}>
                <td className="border-b border-gray-200 px-1 py-1 text-[10px] text-gray-900">{r?.quantity ?? ' '}</td>
                <td className="border-b border-gray-200 px-1 py-1 text-[10px] text-gray-900">{r?.resource?.name || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      </div>
      )}

      {/* === OBSERVACOES ===
          Estilo clean: caixa fina contornada com o titulo + linhas em branco
          finas para anotacao manual durante a execucao. */}
      <div className="mb-3 wo-print-block">
        <div className="border border-gray-300 rounded-sm px-3 py-1 mb-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-700">Observacoes</p>
        </div>
        <div className="px-3 space-y-3 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-b border-gray-300">&nbsp;</div>
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
        margin: 5mm;
      }

      /* Padrao do print: 80% de escala no card da OS, com centralizacao
         horizontal — aplicado em tela e em impressao para uniformizar.
         Importante: para o @page margin: 5mm valer no Chrome, o usuario
         precisa ter "Margens: Padrao" e "Escala: Padrao" no dialogo de
         impressao do navegador. */
      .wo-print-card {
        zoom: 0.8;
        margin-left: auto;
        margin-right: auto;
      }

      @media print {
        html, body {
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
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
          inset: auto !important;
          background: white !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .wo-print-toolbar { display: none !important; }
        .wo-print-page-wrapper {
          padding: 0 !important;
          margin: 0 !important;
          display: block !important;
        }
        .wo-print-card {
          box-shadow: none !important;
          padding: 0 !important;
          width: 100% !important;
          margin: 0 !important;
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

      {/* Folha A4 — card com classe wo-print-card aplica zoom e centraliza */}
      <div className="wo-print-page-wrapper flex justify-center py-6">
        <div className="wo-print-card bg-white w-[210mm] shadow-lg p-[5mm]">
          <WorkOrderPrintSheet workOrder={workOrder} companyLogo={companyLogo} companyName={companyName} />
        </div>
      </div>
    </div>
  )
}
