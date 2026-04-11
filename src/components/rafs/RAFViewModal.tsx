'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { formatDate } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

interface RAF {
  id: string
  rafNumber: string
  area: string
  equipment: string
  occurrenceDate: string
  occurrenceTime: string
  panelOperator: string
  stopExtension: boolean
  failureBreakdown: boolean
  productionLost: number | null
  failureDescription: string
  observation: string
  immediateAction: string
  fiveWhys: string[]
  hypothesisTests: Array<{
    item: number
    description: string
    possible: string
    evidence: string
  }>
  failureType: string
  actionPlan: Array<{
    what: string
    who: string
    when: string
  }>
  createdAt: string
  createdBy?: {
    firstName: string
    lastName: string
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

export function RAFViewModal({ isOpen, onClose, raf, inPage = false, onEdit, onDelete }: RAFViewModalProps) {
  const [activeTab, setActiveTab] = useState('identificacao')

  if (!raf) return null

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
                {raf.failureType === 'REPETITIVE' ? 'Repetitiva' : 'Aleatória'}
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

        {/* Ações */}
        {(onEdit || onDelete) && (
          <div className="p-4 border-b border-gray-200 space-y-2">
            {onEdit && (
              <button
                onClick={() => onEdit(raf.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
              >
                <Icon name="edit" className="text-base" />
                Editar RAF
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(raf.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:opacity-90 transition-colors"
              >
                <Icon name="delete" className="text-base" />
                Excluir RAF
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
                Identificação
              </TabsTrigger>
              <TabsTrigger value="analise" className="flex items-center gap-1.5">
                <Icon name="analytics" className="text-base" />
                Análise
              </TabsTrigger>
              <TabsTrigger value="plano" className="flex items-center gap-1.5">
                <Icon name="checklist" className="text-base" />
                Plano
              </TabsTrigger>
            </TabsList>

            {/* Tab: Identificação */}
            <TabsContent value="identificacao" className="flex-1 overflow-y-auto mt-0">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Dados Gerais</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Número RAF</p>
                    <p className="text-sm text-foreground">{raf.rafNumber}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Área</p>
                    <p className="text-sm text-foreground">{raf.area}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Equipamento</p>
                    <p className="text-sm text-foreground">{raf.equipment}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data da Ocorrência</p>
                    <p className="text-sm text-foreground">{formatDate(raf.occurrenceDate)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Horário</p>
                    <p className="text-sm text-foreground">{raf.occurrenceTime}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Operador</p>
                    <p className="text-sm text-foreground">{raf.panelOperator}</p>
                  </div>
                  {raf.productionLost != null && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Produção Perdida</p>
                      <p className="text-sm text-foreground">{raf.productionLost} ton</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-b border-gray-200">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Descrição da Falha</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{raf.failureDescription}</p>
              </div>

              {raf.observation && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Observações</h3>
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

            {/* Tab: Análise */}
            <TabsContent value="analise" className="flex-1 overflow-y-auto mt-0">
              {raf.fiveWhys && raf.fiveWhys.filter(Boolean).length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">5 Porquês</h3>
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
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Teste de Hipóteses</h3>
                  <div className="space-y-4">
                    {raf.hypothesisTests.filter(t => t.description).map((test, i) => (
                      <div key={i} className="grid grid-cols-2 gap-x-4 gap-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="col-span-2">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Descrição</p>
                          <p className="text-sm text-foreground">{test.description}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Possível</p>
                          <p className="text-sm text-foreground">{test.possible}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Evidência</p>
                          <p className="text-sm text-foreground">{test.evidence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {raf.fiveWhys?.filter(Boolean).length === 0 && raf.hypothesisTests?.filter(t => t.description).length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma análise registrada.
                </div>
              )}
            </TabsContent>

            {/* Tab: Plano */}
            <TabsContent value="plano" className="flex-1 overflow-y-auto mt-0">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Ação Imediata</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{raf.immediateAction || '—'}</p>
              </div>

              {raf.actionPlan && raf.actionPlan.filter(a => a.what).length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Plano de Ação</h3>
                  <div className="space-y-4">
                    {raf.actionPlan.filter(a => a.what).map((action, i) => (
                      <div key={i} className="grid grid-cols-2 gap-x-4 gap-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="col-span-2">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">O Que</p>
                          <p className="text-sm text-foreground">{action.what}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Quem</p>
                          <p className="text-sm text-foreground">{action.who}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Quando</p>
                          <p className="text-sm text-foreground">{action.when}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                {raf.failureType === 'REPETITIVE' ? 'Repetitiva' : 'Aleatória'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(raf.id)}
                className="p-2 hover:bg-muted rounded-[4px] transition-colors"
                title="Editar"
              >
                <Icon name="edit" className="text-xl text-muted-foreground" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(raf.id)}
                className="p-2 hover:bg-danger-light rounded-[4px] transition-colors"
                title="Excluir"
              >
                <Icon name="delete" className="text-xl text-danger" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-[4px] transition-colors"
            >
              <Icon name="close" className="text-2xl text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-card p-3 md:p-6">
          <div className="mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-primary/5 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-primary">
              📋 INFORMAÇÕES BÁSICAS
            </h2>
            <div className="space-y-2 md:space-y-3 bg-secondary p-2 md:p-3 rounded-[4px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Área:</label>
                  <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">{raf.area}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Equipamento:</label>
                  <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">{raf.equipment}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Data da Ocorrência:</label>
                  <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                    {formatDate(raf.occurrenceDate)} às {raf.occurrenceTime}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Operador:</label>
                  <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">{raf.panelOperator}</p>
                </div>
                {raf.productionLost != null && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Produção Perdida:</label>
                    <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">{raf.productionLost} ton</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="my-4 md:my-6 border-t-2 border-dashed border-input"></div>

          <div className="mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-danger-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-danger">
              ⚠️ DESCRIÇÃO DA FALHA
            </h2>
            <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px]">
              <p className="text-sm md:text-base text-foreground whitespace-pre-wrap bg-card p-2 rounded border">
                {raf.failureDescription}
              </p>
            </div>
          </div>

          {raf.observation && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-warning-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-warning">
                📝 OBSERVAÇÕES
              </h2>
              <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px]">
                <p className="text-sm md:text-base text-foreground whitespace-pre-wrap bg-card p-2 rounded border">
                  {raf.observation}
                </p>
              </div>
            </div>
          )}

          <div className="mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-success-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-border">
              ✅ AÇÃO IMEDIATA
            </h2>
            <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px]">
              <p className="text-sm md:text-base text-foreground whitespace-pre-wrap bg-card p-2 rounded border">
                {raf.immediateAction}
              </p>
            </div>
          </div>

          {raf.fiveWhys && raf.fiveWhys.filter(Boolean).length > 0 && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-primary/5 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-primary">
                🔍 5 PORQUÊS
              </h2>
              <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px]">
                {raf.fiveWhys.filter(Boolean).map((why, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold flex-shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border flex-1">{why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {raf.hypothesisTests && raf.hypothesisTests.filter(t => t.description).length > 0 && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-surface-low px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-border">
                🧪 TESTE DE HIPÓTESES
              </h2>
              <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px] overflow-x-auto">
                <table className="w-full text-sm rounded-[4px]">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Item</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Possível</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Evidência</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {raf.hypothesisTests.filter(t => t.description).map((test, index) => (
                      <tr key={index} className="hover:bg-secondary">
                        <td className="px-3 py-2 text-sm text-foreground">{test.item}</td>
                        <td className="px-3 py-2 text-sm text-foreground">{test.description}</td>
                        <td className="px-3 py-2 text-sm text-foreground">{test.possible}</td>
                        <td className="px-3 py-2 text-sm text-foreground">{test.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {raf.actionPlan && raf.actionPlan.filter(a => a.what).length > 0 && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-success-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-border">
                📋 PLANO DE AÇÃO
              </h2>
              <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px] overflow-x-auto">
                <table className="w-full text-sm rounded-[4px]">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">O Que</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quem</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quando</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {raf.actionPlan.filter(a => a.what).map((action, index) => (
                      <tr key={index} className="hover:bg-secondary">
                        <td className="px-3 py-2 text-sm text-foreground">{action.what}</td>
                        <td className="px-3 py-2 text-sm text-foreground">{action.who}</td>
                        <td className="px-3 py-2 text-sm text-foreground">{action.when}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 md:mt-6 pt-2 md:pt-3 border-t border-input text-center text-xs md:text-sm text-muted-foreground">
            <p>Relatório gerado automaticamente - {new Date().toLocaleString('pt-BR')}</p>
          </div>
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
