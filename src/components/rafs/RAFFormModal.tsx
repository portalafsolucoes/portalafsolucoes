'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface RAFFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RAFFormModal({ isOpen, onClose, onSuccess }: RAFFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    rafNumber: '',
    area: '',
    equipment: '',
    occurrenceDate: '',
    occurrenceTime: '',
    panelOperator: '',
    stopExtension: false,
    failureBreakdown: false,
    productionLost: '',
    failureDescription: '',
    observation: '',
    immediateAction: '',
    failureType: 'RANDOM' as 'RANDOM' | 'REPETITIVE'
  })

  const [fiveWhys, setFiveWhys] = useState<string[]>(['', '', '', '', ''])
  const [hypothesisTests, setHypothesisTests] = useState<Array<{description: string, possible: string, evidence: string}>>([
    { description: '', possible: '', evidence: '' }
  ])
  const [actionPlan, setActionPlan] = useState<Array<{what: string, who: string, when: string}>>([
    { what: '', who: '', when: '' }
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/rafs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fiveWhys: fiveWhys.filter(w => w.trim() !== ''),
          hypothesisTests: hypothesisTests.map((h, i) => ({ item: i + 1, ...h })),
          actionPlan
        })
      })

      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao criar RAF')
      }
    } catch (error) {
      console.error('Error creating RAF:', error)
      alert('Erro ao criar RAF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" title="">
      <div className="h-full flex flex-col bg-secondary">
        {/* Header Fixo com Close */}
        <div className="flex-shrink-0 px-8 py-4 bg-card border-b border-on-surface-variant/10">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Relatório de Análise de Falha (RAF)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Preencha todos os campos obrigatórios</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2">
              <Icon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll - Formato A4 */}
        <div className="flex-1 overflow-y-auto py-6">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-8 space-y-6">
            
            {/* Seção 1: Identificação */}
            <div className="bg-card rounded-[4px] overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-on-surface-variant/10">
                <h3 className="text-sm font-semibold text-foreground">1. IDENTIFICAÇÃO</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Nº RAF *</label>
                    <input type="text" required value={formData.rafNumber} onChange={(e) => setFormData({...formData, rafNumber: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" placeholder="FQ13" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Área *</label>
                    <input type="text" required value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" placeholder="MOAGEM 2" />
                  </div>
                  <div className="col-span-7">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Equipamento *</label>
                    <input type="text" required value={formData.equipment} onChange={(e) => setFormData({...formData, equipment: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Sensor de Temperatura" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Data *</label>
                    <input type="date" required value={formData.occurrenceDate} onChange={(e) => setFormData({...formData, occurrenceDate: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Hora *</label>
                    <input type="time" required value={formData.occurrenceTime} onChange={(e) => setFormData({...formData, occurrenceTime: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div className="col-span-7">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Operador de Painel *</label>
                    <input type="text" required value={formData.panelOperator} onChange={(e) => setFormData({...formData, panelOperator: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Nome completo" />
                  </div>
                  <div className="col-span-12 flex items-center gap-6 pt-2 border-t border-on-surface-variant/10 mt-2">
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={formData.stopExtension} onChange={(e) => setFormData({...formData, stopExtension: e.target.checked})} className="w-3.5 h-3.5 text-muted-foreground border-input rounded focus:ring-ring" />
                      <span>Prolongamento de Parada</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={formData.failureBreakdown} onChange={(e) => setFormData({...formData, failureBreakdown: e.target.checked})} className="w-3.5 h-3.5 text-muted-foreground border-input rounded focus:ring-ring" />
                      <span>Falha/Quebra</span>
                    </label>
                    <div className="flex-1">
                      <input type="number" step="0.01" value={formData.productionLost} onChange={(e) => setFormData({...formData, productionLost: e.target.value})} className="w-full max-w-xs px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Produção Perdida (ton)" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 2: Descrição */}
            <div className="bg-card rounded-[4px] overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-on-surface-variant/10">
                <h3 className="text-sm font-semibold text-foreground">2. DESCRIÇÃO DA FALHA *</h3>
              </div>
              <div className="p-4">
                <textarea required rows={3} value={formData.failureDescription} onChange={(e) => setFormData({...formData, failureDescription: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring resize-none" placeholder="Descreva detalhadamente a falha ocorrida..." />
              </div>
            </div>

            {/* Seção 3: Observação */}
            <div className="bg-card rounded-[4px] overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-on-surface-variant/10">
                <h3 className="text-sm font-semibold text-foreground">3. OBSERVAÇÃO (Levantamento de Pistas) *</h3>
              </div>
              <div className="p-4">
                <textarea required rows={3} value={formData.observation} onChange={(e) => setFormData({...formData, observation: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring resize-none" placeholder="Observações e pistas levantadas durante investigação..." />
              </div>
            </div>

            {/* Seção 4: Ação Imediata */}
            <div className="bg-card rounded-[4px] overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-on-surface-variant/10">
                <h3 className="text-sm font-semibold text-foreground">4. AÇÃO DE BLOQUEIO IMEDIATO *</h3>
              </div>
              <div className="p-4">
                <textarea required rows={3} value={formData.immediateAction} onChange={(e) => setFormData({...formData, immediateAction: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring resize-none" placeholder="Ações tomadas imediatamente para bloquear o problema..." />
              </div>
            </div>

            {/* Seção 5: 5 Porquês */}
            <div className="bg-card rounded-[4px] overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-on-surface-variant/10">
                <h3 className="text-sm font-semibold text-foreground">5. MÉTODO DOS 5 PORQUÊS</h3>
              </div>
              <div className="p-4 space-y-2">
                {fiveWhys.map((why, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-16">Por quê {index + 1}:</span>
                    <input type="text" value={why} onChange={(e) => { const newWhys = [...fiveWhys]; newWhys[index] = e.target.value; setFiveWhys(newWhys); }} className="flex-1 px-2 py-1.5 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" placeholder={`Resposta ${index + 1}...`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Seção 6: Tipo de Falha */}
            <div className="bg-card rounded-[4px] overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-on-surface-variant/10">
                <h3 className="text-sm font-semibold text-foreground">6. TIPO DE FALHA *</h3>
              </div>
              <div className="p-4 flex gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="failureType" value="RANDOM" checked={formData.failureType === 'RANDOM'} onChange={() => setFormData({...formData, failureType: 'RANDOM'})} className="w-4 h-4 text-muted-foreground border-input focus:ring-ring" />
                  <span>Aleatória</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="failureType" value="REPETITIVE" checked={formData.failureType === 'REPETITIVE'} onChange={() => setFormData({...formData, failureType: 'REPETITIVE'})} className="w-4 h-4 text-muted-foreground border-input focus:ring-ring" />
                  <span>Repetitiva</span>
                </label>
              </div>
            </div>

            {/* Seção 7: Teste de Hipóteses */}
            <div className="bg-card rounded-[4px] overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-on-surface-variant/10">
                <h3 className="text-sm font-semibold text-foreground">7. TESTE DE HIPÓTESES / CAUSAS PROVÁVEIS</h3>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b border-on-surface-variant/10">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Item</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Descrição</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Possível?</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Evidência?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hypothesisTests.map((test, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="px-2 py-1.5 text-xs text-muted-foreground">{index + 1}</td>
                        <td className="px-2 py-1.5"><input type="text" value={test.description} onChange={(e) => { const newTests = [...hypothesisTests]; newTests[index].description = e.target.value; setHypothesisTests(newTests); }} className="w-full px-2 py-1 text-xs border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" /></td>
                        <td className="px-2 py-1.5"><input type="text" value={test.possible} onChange={(e) => { const newTests = [...hypothesisTests]; newTests[index].possible = e.target.value; setHypothesisTests(newTests); }} className="w-full px-2 py-1 text-xs border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" /></td>
                        <td className="px-2 py-1.5"><input type="text" value={test.evidence} onChange={(e) => { const newTests = [...hypothesisTests]; newTests[index].evidence = e.target.value; setHypothesisTests(newTests); }} className="w-full px-2 py-1 text-xs border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={() => setHypothesisTests([...hypothesisTests, { description: '', possible: '', evidence: '' }])} className="mt-2 text-xs text-muted-foreground hover:text-foreground underline">+ Adicionar linha</button>
              </div>
            </div>

            {/* Seção 8: Plano de Ação */}
            <div className="bg-card rounded-[4px] overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-on-surface-variant/10">
                <h3 className="text-sm font-semibold text-foreground">8. PLANO DE AÇÃO</h3>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b border-on-surface-variant/10">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">O QUÊ?</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">QUEM?</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">QUANDO?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionPlan.map((action, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="px-2 py-1.5"><input type="text" value={action.what} onChange={(e) => { const newPlan = [...actionPlan]; newPlan[index].what = e.target.value; setActionPlan(newPlan); }} className="w-full px-2 py-1 text-xs border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" /></td>
                        <td className="px-2 py-1.5"><input type="text" value={action.who} onChange={(e) => { const newPlan = [...actionPlan]; newPlan[index].who = e.target.value; setActionPlan(newPlan); }} className="w-full px-2 py-1 text-xs border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" /></td>
                        <td className="px-2 py-1.5"><input type="date" value={action.when} onChange={(e) => { const newPlan = [...actionPlan]; newPlan[index].when = e.target.value; setActionPlan(newPlan); }} className="w-full px-2 py-1 text-xs border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={() => setActionPlan([...actionPlan, { what: '', who: '', when: '' }])} className="mt-2 text-xs text-muted-foreground hover:text-foreground underline">+ Adicionar ação</button>
              </div>
            </div>

            {/* Botões Fixos no Footer */}
            <div className="flex gap-3 justify-end pt-4 pb-2 border-t border-on-surface-variant/10 bg-card sticky bottom-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Criar RAF'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  )
}
