'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { X, FileText, Calendar, User, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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
}

export function RAFViewModal({ isOpen, onClose, raf, inPage = false }: RAFViewModalProps) {
  if (!raf) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" hideHeader inPage={inPage}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b px-4 md:px-6 pt-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-primary" />
              <h2 className="text-lg md:text-2xl font-bold text-foreground">{raf.rafNumber}</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
                raf.failureType === 'REPETITIVE'
                  ? 'bg-danger-light text-gray-800'
                  : 'bg-warning-light text-gray-800'
              }`}>
                {raf.failureType === 'REPETITIVE' ? 'Repetitiva' : 'Aleatória'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-card p-3 md:p-6">
          {/* Informações Básicas */}
          <div className="mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-primary/5 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border-l-4 border-primary">
              📋 INFORMAÇÕES BÁSICAS
            </h2>
            <div className="space-y-2 md:space-y-3 bg-secondary p-2 md:p-3 rounded-lg">
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
                {raf.productionLost && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Produção Perdida:</label>
                    <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">{raf.productionLost} ton</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DIVISOR */}
          <div className="my-4 md:my-6 border-t-2 border-dashed border-input"></div>

          {/* Descrição da Falha */}
          <div className="mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-danger-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border-l-4 border-danger">
              ⚠️ DESCRIÇÃO DA FALHA
            </h2>
            <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-lg">
              <p className="text-sm md:text-base text-foreground whitespace-pre-wrap bg-card p-2 rounded border">
                {raf.failureDescription}
              </p>
            </div>
          </div>

          {/* Observações */}
          {raf.observation && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-warning-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border-l-4 border-warning">
                📝 OBSERVAÇÕES
              </h2>
              <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-lg">
                <p className="text-sm md:text-base text-foreground whitespace-pre-wrap bg-card p-2 rounded border">
                  {raf.observation}
                </p>
              </div>
            </div>
          )}

          {/* Ação Imediata */}
          <div className="mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-success-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border-l-4 border-gray-500">
              ✅ AÇÃO IMEDIATA
            </h2>
            <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-lg">
              <p className="text-sm md:text-base text-foreground whitespace-pre-wrap bg-card p-2 rounded border">
                {raf.immediateAction}
              </p>
            </div>
          </div>

          {/* 5 Porquês */}
          {raf.fiveWhys && raf.fiveWhys.length > 0 && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-primary/5 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border-l-4 border-primary">
                🔍 5 PORQUÊS
              </h2>
              <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-lg">
                {raf.fiveWhys.map((why, index) => (
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

          {/* Teste de Hipóteses */}
          {raf.hypothesisTests && raf.hypothesisTests.length > 0 && raf.hypothesisTests[0].description && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-gray-100 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border-l-4 border-gray-500">
                🧪 TESTE DE HIPÓTESES
              </h2>
              <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-lg overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Item</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Descrição</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Possível</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Evidência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {raf.hypothesisTests.map((test, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900">{test.item}</td>
                        <td className="px-3 py-2 text-gray-900">{test.description}</td>
                        <td className="px-3 py-2 text-gray-900">{test.possible}</td>
                        <td className="px-3 py-2 text-gray-900">{test.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Plano de Ação */}
          {raf.actionPlan && raf.actionPlan.length > 0 && raf.actionPlan[0].what && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-success-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border-l-4 border-gray-500">
                📋 PLANO DE AÇÃO
              </h2>
              <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-lg overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">O Que</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Quem</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Quando</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {raf.actionPlan.map((action, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900">{action.what}</td>
                        <td className="px-3 py-2 text-gray-900">{action.who}</td>
                        <td className="px-3 py-2 text-gray-900">{action.when}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-4 md:mt-6 pt-2 md:pt-3 border-t border-input text-center text-xs md:text-sm text-muted-foreground">
            <p>Relatório gerado automaticamente - {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 md:gap-3 pt-3 md:pt-4 border-t px-3 md:px-6 pb-3 md:pb-4">
          <Button variant="outline" onClick={onClose} className="text-sm md:text-base">
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
