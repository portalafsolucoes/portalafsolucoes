'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface RAFEditModalProps {
  isOpen: boolean
  onClose: () => void
  rafId: string
  onSuccess: () => void
  inPage?: boolean
}

export function RAFEditModal({ isOpen, onClose, rafId, onSuccess, inPage = false }: RAFEditModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  const [fiveWhys, setFiveWhys] = useState<string[]>([''])
  const [hypothesisTests, setHypothesisTests] = useState<Array<{ description: string, possible: string, evidence: string }>>([
    { description: '', possible: '', evidence: '' }
  ])
  const [actionPlan, setActionPlan] = useState<Array<{ what: string, who: string, when: string }>>([
    { what: '', who: '', when: '' }
  ])

  useEffect(() => {
    if (isOpen && rafId) {
      loadRAF()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, rafId])

  const loadRAF = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/rafs/${rafId}`)
      const data = await res.json()

      if (res.ok) {
        const raf = data.data
        const date = new Date(raf.occurrenceDate)
        const formattedDate = date.toISOString().split('T')[0]

        setFormData({
          rafNumber: raf.rafNumber,
          area: raf.area,
          equipment: raf.equipment,
          occurrenceDate: formattedDate,
          occurrenceTime: raf.occurrenceTime,
          panelOperator: raf.panelOperator,
          stopExtension: raf.stopExtension,
          failureBreakdown: raf.failureBreakdown,
          productionLost: raf.productionLost ? raf.productionLost.toString() : '',
          failureDescription: raf.failureDescription,
          observation: raf.observation || '',
          immediateAction: raf.immediateAction || '',
          failureType: raf.failureType
        })

        if (raf.fiveWhys && raf.fiveWhys.length > 0) {
          setFiveWhys(raf.fiveWhys)
        }

        if (raf.hypothesisTests && raf.hypothesisTests.length > 0) {
          setHypothesisTests(raf.hypothesisTests.map((h: { description: string, possible: string, evidence: string }) => ({
            description: h.description,
            possible: h.possible,
            evidence: h.evidence
          })))
        }

        if (raf.actionPlan && raf.actionPlan.length > 0) {
          setActionPlan(raf.actionPlan)
        }
      }
    } catch (error) {
      console.error('Error loading RAF:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/rafs/${rafId}`, {
        method: 'PUT',
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
        alert(data.error || 'Erro ao atualizar RAF')
      }
    } catch (error) {
      console.error('Error updating RAF:', error)
      alert('Erro ao atualizar RAF')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar RAF" inPage={inPage}>
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-3">

            <ModalSection title="Identificação">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nº RAF *</label>
                  <input type="text" required value={formData.rafNumber} onChange={(e) => setFormData({...formData, rafNumber: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Área *</label>
                  <input type="text" required value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Equipamento *</label>
                  <input type="text" required value={formData.equipment} onChange={(e) => setFormData({...formData, equipment: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data *</label>
                  <input type="date" required value={formData.occurrenceDate} onChange={(e) => setFormData({...formData, occurrenceDate: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Hora *</label>
                  <input type="time" required value={formData.occurrenceTime} onChange={(e) => setFormData({...formData, occurrenceTime: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Operador de Painel *</label>
                  <input type="text" required value={formData.panelOperator} onChange={(e) => setFormData({...formData, panelOperator: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={formData.stopExtension} onChange={(e) => setFormData({...formData, stopExtension: e.target.checked})} className="rounded border-input" />
                  Prolongamento de Parada
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={formData.failureBreakdown} onChange={(e) => setFormData({...formData, failureBreakdown: e.target.checked})} className="rounded border-input" />
                  Falha/Quebra
                </label>
                <div className="flex-1 max-w-xs">
                  <input type="number" step="0.01" value={formData.productionLost} onChange={(e) => setFormData({...formData, productionLost: e.target.value})} className={inputClass} placeholder="Produção Perdida (ton)" />
                </div>
              </div>
            </ModalSection>

            <ModalSection title="Descrição da Falha">
              <textarea required rows={3} value={formData.failureDescription} onChange={(e) => setFormData({...formData, failureDescription: e.target.value})} className={`${inputClass} resize-none`} placeholder="Descreva detalhadamente a falha ocorrida..." />
            </ModalSection>

            <ModalSection title="Observação (Levantamento de Pistas)">
              <textarea rows={3} value={formData.observation} onChange={(e) => setFormData({...formData, observation: e.target.value})} className={`${inputClass} resize-none`} placeholder="Observações e pistas levantadas durante investigação..." />
            </ModalSection>

            <ModalSection title="Ação de Bloqueio Imediato">
              <textarea rows={3} value={formData.immediateAction} onChange={(e) => setFormData({...formData, immediateAction: e.target.value})} className={`${inputClass} resize-none`} placeholder="Ações tomadas imediatamente para bloquear o problema..." />
            </ModalSection>

            <ModalSection title="Método dos 5 Porquês">
              <div className="space-y-2">
                {fiveWhys.map((why, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase w-20 shrink-0">Por quê {index + 1}</span>
                    <input
                      type="text"
                      value={why}
                      onChange={(e) => {
                        const newWhys = [...fiveWhys]
                        newWhys[index] = e.target.value
                        setFiveWhys(newWhys)
                      }}
                      className={inputClass}
                      placeholder={`Resposta ${index + 1}...`}
                    />
                    {fiveWhys.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFiveWhys(fiveWhys.filter((_, i) => i !== index))}
                        className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                      >
                        <Icon name="close" className="text-base" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFiveWhys([...fiveWhys, ''])}
                  className="mt-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Icon name="add" className="text-sm" /> Adicionar porquê
                </button>
              </div>
            </ModalSection>

            <ModalSection title="Tipo de Falha">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="failureType" value="RANDOM" checked={formData.failureType === 'RANDOM'} onChange={() => setFormData({...formData, failureType: 'RANDOM'})} className="border-input" />
                  Aleatória
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="failureType" value="REPETITIVE" checked={formData.failureType === 'REPETITIVE'} onChange={() => setFormData({...formData, failureType: 'REPETITIVE'})} className="border-input" />
                  Repetitiva
                </label>
              </div>
            </ModalSection>

            <ModalSection title="Teste de Hipóteses / Causas Prováveis">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-8">Item</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-28">Possível?</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-28">Evidência?</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {hypothesisTests.map((test, index) => (
                    <tr key={index} className="border-b border-border">
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">{index + 1}</td>
                      <td className="px-2 py-1.5"><input type="text" value={test.description} onChange={(e) => { const n = [...hypothesisTests]; n[index].description = e.target.value; setHypothesisTests(n) }} className={inputClass} /></td>
                      <td className="px-2 py-1.5"><input type="text" value={test.possible} onChange={(e) => { const n = [...hypothesisTests]; n[index].possible = e.target.value; setHypothesisTests(n) }} className={inputClass} /></td>
                      <td className="px-2 py-1.5"><input type="text" value={test.evidence} onChange={(e) => { const n = [...hypothesisTests]; n[index].evidence = e.target.value; setHypothesisTests(n) }} className={inputClass} /></td>
                      <td className="px-2 py-1.5">
                        {hypothesisTests.length > 1 && (
                          <button type="button" onClick={() => setHypothesisTests(hypothesisTests.filter((_, i) => i !== index))} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                            <Icon name="close" className="text-sm" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => setHypothesisTests([...hypothesisTests, { description: '', possible: '', evidence: '' }])} className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Icon name="add" className="text-sm" /> Adicionar linha
              </button>
            </ModalSection>

            <ModalSection title="Plano de Ação">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase">O quê?</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-40">Quem?</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-40">Quando?</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {actionPlan.map((action, index) => (
                    <tr key={index} className="border-b border-border">
                      <td className="px-2 py-1.5"><input type="text" value={action.what} onChange={(e) => { const n = [...actionPlan]; n[index].what = e.target.value; setActionPlan(n) }} className={inputClass} /></td>
                      <td className="px-2 py-1.5"><input type="text" value={action.who} onChange={(e) => { const n = [...actionPlan]; n[index].who = e.target.value; setActionPlan(n) }} className={inputClass} /></td>
                      <td className="px-2 py-1.5"><input type="date" value={action.when} onChange={(e) => { const n = [...actionPlan]; n[index].when = e.target.value; setActionPlan(n) }} className={inputClass} /></td>
                      <td className="px-2 py-1.5">
                        {actionPlan.length > 1 && (
                          <button type="button" onClick={() => setActionPlan(actionPlan.filter((_, i) => i !== index))} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                            <Icon name="close" className="text-sm" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => setActionPlan([...actionPlan, { what: '', who: '', when: '' }])} className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Icon name="add" className="text-sm" /> Adicionar ação
              </button>
            </ModalSection>

          </div>

          <div className="flex gap-3 px-4 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || loading} className="flex-1">
              <Icon name="save" className="text-base mr-2" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
