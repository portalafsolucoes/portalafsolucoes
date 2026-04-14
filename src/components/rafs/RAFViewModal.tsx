'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { formatDate } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

interface ActionPlanItem {
  item: number
  subject: string
  deadline: string
  actionDescription: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  linkedWorkOrderId?: string
  linkedWorkOrderNumber?: string
}

interface RAF {
  id: string
  rafNumber: string
  occurrenceDate: string
  occurrenceTime: string
  panelOperator: string
  stopExtension?: boolean
  failureBreakdown?: boolean
  productionLost?: number | null
  failureDescription?: string
  observation?: string
  immediateAction?: string
  fiveWhys?: string[]
  hypothesisTests?: Array<{
    item: number
    description: string
    possible: string
    evidence: string
  }>
  failureType: string
  actionPlan?: ActionPlanItem[]
  createdAt: string
  createdBy?: {
    firstName: string
    lastName: string
  }
  workOrder?: {
    id: string
    internalId?: string
    title?: string
    status?: string
    osType?: string
    type?: string
    maintenanceArea?: { id: string; name: string; code?: string }
    serviceType?: { id: string; code: string; name: string }
    asset?: { id: string; name: string; tag?: string }
  }
}

interface RAFViewModalProps {
  isOpen: boolean
  onClose: () => void
  raf: RAF | null
  inPage?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

const statusLabel = (s: string) => {
  if (s === 'IN_PROGRESS') return 'Andamento'
  if (s === 'COMPLETED') return 'Concluido'
  return 'Pendente'
}

const statusBadge = (s: string) => {
  if (s === 'COMPLETED') return 'bg-green-100 text-green-800'
  if (s === 'IN_PROGRESS') return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-800'
}

export function RAFViewModal({ isOpen, onClose, raf, inPage = false, onEdit, onDelete }: RAFViewModalProps) {
  const [activeTab, setActiveTab] = useState('identificacao')

  if (!raf) return null

  const wo = raf.workOrder

  // ── inPage (desktop split-panel) ──────────────────────────────────────────
  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-lg font-black text-gray-900">{raf.rafNumber}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                raf.failureType === 'REPETITIVE'
                  ? 'bg-danger-light text-foreground'
                  : 'bg-warning-light text-foreground'
              }`}>
                {raf.failureType === 'REPETITIVE' ? 'Repetitiva' : 'Aleatoria'}
              </span>
              {raf.stopExtension && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary text-foreground border border-border">
                  Ext. Parada
                </span>
              )}
              {raf.failureBreakdown && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary text-foreground border border-border">
                  Breakdown
                </span>
              )}
            </div>
          </div>
          <PanelCloseButton onClick={onClose} className="ml-2" />
        </div>

        {/* Acoes */}
        {(onEdit || onDelete) && (
          <div className="p-4 border-b border-gray-200 space-y-2">
            {onEdit && (
              <button
                onClick={() => onEdit(raf.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
              >
                <Icon name="edit" className="text-base" />
                Editar
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(raf.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:opacity-90 transition-colors"
              >
                <Icon name="delete" className="text-base" />
                Excluir
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start border-b rounded-none px-4 flex-shrink-0">
              <TabsTrigger value="identificacao" className="flex items-center gap-1.5">
                <Icon name="info" className="text-base" />
                Identificacao
              </TabsTrigger>
              <TabsTrigger value="analise" className="flex items-center gap-1.5">
                <Icon name="analytics" className="text-base" />
                Analise
              </TabsTrigger>
              <TabsTrigger value="plano" className="flex items-center gap-1.5">
                <Icon name="checklist" className="text-base" />
                Plano de Acao
              </TabsTrigger>
            </TabsList>

            {/* Tab: Identificacao */}
            <TabsContent value="identificacao" className="flex-1 overflow-y-auto mt-0">
              {/* OS Vinculada */}
              {wo && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">OS Vinculada</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {wo.internalId && (
                      <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">N° OS</p>
                        <p className="text-sm font-mono text-foreground">{wo.internalId}</p>
                      </div>
                    )}
                    {wo.asset && (
                      <>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Codigo do Bem</p>
                          <p className="text-sm font-mono text-foreground">{wo.asset.tag || '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Nome do Bem</p>
                          <p className="text-sm text-foreground">{wo.asset.name}</p>
                        </div>
                      </>
                    )}
                    {wo.maintenanceArea && (
                      <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Area de Manutencao</p>
                        <p className="text-sm text-foreground">{wo.maintenanceArea.code ? `${wo.maintenanceArea.code} - ${wo.maintenanceArea.name}` : wo.maintenanceArea.name}</p>
                      </div>
                    )}
                    {wo.serviceType && (
                      <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Tipo de Servico</p>
                        <p className="text-sm text-foreground">{wo.serviceType.code} - {wo.serviceType.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 border-b border-gray-200">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Dados Gerais</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Numero RAF</p>
                    <p className="text-sm text-foreground">{raf.rafNumber}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data da Ocorrencia</p>
                    <p className="text-sm text-foreground">{formatDate(raf.occurrenceDate)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Horario</p>
                    <p className="text-sm text-foreground">{raf.occurrenceTime}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Operador</p>
                    <p className="text-sm text-foreground">{raf.panelOperator}</p>
                  </div>
                  {raf.productionLost != null && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Producao Perdida</p>
                      <p className="text-sm text-foreground">{raf.productionLost} ton</p>
                    </div>
                  )}
                </div>
              </div>

              {raf.failureDescription && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Descricao da Falha</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{raf.failureDescription}</p>
                </div>
              )}

              {raf.observation && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Observacoes</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{raf.observation}</p>
                </div>
              )}

              {raf.createdBy && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Registro</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Criado por</p>
                      <p className="text-sm text-foreground">{raf.createdBy.firstName} {raf.createdBy.lastName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Criado em</p>
                      <p className="text-sm text-foreground">{new Date(raf.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab: Analise */}
            <TabsContent value="analise" className="flex-1 overflow-y-auto mt-0">
              {raf.fiveWhys && raf.fiveWhys.filter(Boolean).length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">5 Porques</h3>
                  <div className="space-y-2">
                    {raf.fiveWhys.filter(Boolean).map((why, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary border border-border text-foreground text-xs flex items-center justify-center font-medium">
                          {i + 1}
                        </span>
                        <p className="text-sm text-foreground">{why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {raf.hypothesisTests && raf.hypothesisTests.filter(t => t.description).length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Teste de Hipoteses</h3>
                  <div className="space-y-4">
                    {raf.hypothesisTests.filter(t => t.description).map((test, i) => (
                      <div key={i} className="grid grid-cols-2 gap-x-4 gap-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="col-span-2">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Descricao</p>
                          <p className="text-sm text-foreground">{test.description}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Possivel</p>
                          <p className="text-sm text-foreground">{test.possible}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Evidencia</p>
                          <p className="text-sm text-foreground">{test.evidence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!raf.fiveWhys || raf.fiveWhys.filter(Boolean).length === 0) && (!raf.hypothesisTests || raf.hypothesisTests.filter(t => t.description).length === 0) && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma analise registrada.
                </div>
              )}
            </TabsContent>

            {/* Tab: Plano de Acao */}
            <TabsContent value="plano" className="flex-1 overflow-y-auto mt-0">
              {raf.immediateAction && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Acao Imediata</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{raf.immediateAction}</p>
                </div>
              )}

              {raf.actionPlan && raf.actionPlan.length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Plano de Acao</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground uppercase w-10">Item</th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground uppercase">Assunto</th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground uppercase w-28">Prazo</th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground uppercase">Descricao</th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground uppercase w-24">Status</th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground uppercase w-24">N° OS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {raf.actionPlan.map((action, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-2 py-2 text-xs font-mono text-muted-foreground">{action.item || i + 1}</td>
                            <td className="px-2 py-2 text-sm text-foreground">{action.subject || '—'}</td>
                            <td className="px-2 py-2 text-sm text-foreground">{action.deadline ? formatDate(action.deadline) : '—'}</td>
                            <td className="px-2 py-2 text-sm text-foreground">{action.actionDescription || '—'}</td>
                            <td className="px-2 py-2">
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusBadge(action.status || 'PENDING')}`}>
                                {statusLabel(action.status || 'PENDING')}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-xs font-mono text-primary">
                              {action.linkedWorkOrderNumber || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!raf.immediateAction && (!raf.actionPlan || raf.actionPlan.length === 0) && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum plano de acao registrado.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // ── Overlay (mobile) ──────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" hideHeader>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b px-4 md:px-6 pt-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="description" className="text-2xl text-primary" />
              <h2 className="text-lg md:text-2xl font-bold text-foreground">{raf.rafNumber}</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
                raf.failureType === 'REPETITIVE'
                  ? 'bg-danger-light text-foreground'
                  : 'bg-warning-light text-foreground'
              }`}>
                {raf.failureType === 'REPETITIVE' ? 'Repetitiva' : 'Aleatoria'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button onClick={() => onEdit(raf.id)} className="p-2 hover:bg-muted rounded-[4px] transition-colors" title="Editar">
                <Icon name="edit" className="text-xl text-muted-foreground" />
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(raf.id)} className="p-2 hover:bg-danger-light rounded-[4px] transition-colors" title="Excluir">
                <Icon name="delete" className="text-xl text-danger" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-[4px] transition-colors">
              <Icon name="close" className="text-2xl text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-card p-3 md:p-6 space-y-4">
          {wo && (
            <div className="bg-gray-50 border border-gray-200 rounded-[4px] p-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">OS Vinculada</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {wo.internalId && <div><span className="text-gray-500">OS:</span> <span className="font-mono">{wo.internalId}</span></div>}
                {wo.asset?.tag && <div><span className="text-gray-500">Bem:</span> <span className="font-mono">{wo.asset.tag}</span> — {wo.asset.name}</div>}
                {wo.maintenanceArea && <div><span className="text-gray-500">Area:</span> {wo.maintenanceArea.code || ''} {wo.maintenanceArea.name}</div>}
              </div>
            </div>
          )}

          {raf.failureDescription && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Descricao da Falha</h3>
              <p className="text-sm whitespace-pre-wrap">{raf.failureDescription}</p>
            </div>
          )}

          {raf.immediateAction && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Acao Imediata</h3>
              <p className="text-sm whitespace-pre-wrap">{raf.immediateAction}</p>
            </div>
          )}

          {raf.actionPlan && raf.actionPlan.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Plano de Acao</h3>
              <div className="space-y-2">
                {raf.actionPlan.map((a, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-[4px] p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-500">#{a.item || i + 1}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusBadge(a.status || 'PENDING')}`}>
                        {statusLabel(a.status || 'PENDING')}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-1">{a.subject || '—'}</p>
                    {a.actionDescription && <p className="text-xs text-gray-600 mt-0.5">{a.actionDescription}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      {a.deadline && <span>Prazo: {formatDate(a.deadline)}</span>}
                      {a.linkedWorkOrderNumber && <span>OS: {a.linkedWorkOrderNumber}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
