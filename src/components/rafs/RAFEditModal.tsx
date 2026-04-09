'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

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
  failureType: 'RANDOM' | 'REPETITIVE'
  fiveWhys: string[]
  hypothesisTests: Array<{
    item: number
    description: string
    possible: string
    evidence: string
  }>
  actionPlan: Array<{
    what: string
    who: string
    when: string
  }>
}

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
  const [hypothesisTests, setHypothesisTests] = useState<Array<{item: number, description: string, possible: string, evidence: string}>>([
    { item: 1, description: '', possible: '', evidence: '' }
  ])
  const [actionPlan, setActionPlan] = useState<Array<{what: string, who: string, when: string}>>([
    { what: '', who: '', when: '' }
  ])

  useEffect(() => {
    if (isOpen && rafId) {
      loadRAF()
    }
  }, [isOpen, rafId])

  const loadRAF = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/rafs/${rafId}`)
      const data = await res.json()
      
      if (res.ok) {
        const raf = data.data
        
        // Formatar data para input
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
          setHypothesisTests(raf.hypothesisTests)
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
          hypothesisTests,
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar RAF" size="xl" inPage={inPage}>
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-4 space-y-3">
            <div className="space-y-4 md:space-y-6">
              {/* Informações Básicas */}
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-primary/5 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-primary">
                  📋 INFORMAÇÕES BÁSICAS
                </h2>
                <div className="space-y-2 md:space-y-3 bg-secondary p-2 md:p-3 rounded-[4px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Número RAF *</label>
                    <input
                      type="text"
                      required
                      value={formData.rafNumber}
                      onChange={(e) => setFormData({...formData, rafNumber: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Área *</label>
                    <input
                      type="text"
                      required
                      value={formData.area}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Equipamento *</label>
                    <input
                      type="text"
                      required
                      value={formData.equipment}
                      onChange={(e) => setFormData({...formData, equipment: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data *</label>
                    <input
                      type="date"
                      required
                      value={formData.occurrenceDate}
                      onChange={(e) => setFormData({...formData, occurrenceDate: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Hora *</label>
                    <input
                      type="time"
                      required
                      value={formData.occurrenceTime}
                      onChange={(e) => setFormData({...formData, occurrenceTime: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Operador *</label>
                    <input
                      type="text"
                      required
                      value={formData.panelOperator}
                      onChange={(e) => setFormData({...formData, panelOperator: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Produção Perdida (ton)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.productionLost}
                      onChange={(e) => setFormData({...formData, productionLost: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tipo de Falha *</label>
                    <select
                      required
                      value={formData.failureType}
                      onChange={(e) => setFormData({...formData, failureType: e.target.value as 'RANDOM' | 'REPETITIVE'})}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    >
                      <option value="RANDOM">Aleatória</option>
                      <option value="REPETITIVE">Repetitiva</option>
                    </select>
                  </div>
                </div>
                </div>
              </div>

              {/* DIVISOR */}
              <div className="my-4 md:my-6 border-t-2 border-dashed border-input"></div>

              {/* Descrição da Falha */}
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-danger-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-danger">
                  ⚠️ DESCRIÇÃO DA FALHA
                </h2>
                <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px]">
                  <textarea
                    required
                    value={formData.failureDescription}
                    onChange={(e) => setFormData({...formData, failureDescription: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 text-sm md:text-base text-foreground bg-card rounded border border-input focus:ring-2 focus:ring-ring"
                    placeholder="Descreva detalhadamente a falha..."
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-warning-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-warning">
                  📝 OBSERVAÇÕES
                </h2>
                <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px]">
                  <textarea
                    value={formData.observation}
                    onChange={(e) => setFormData({...formData, observation: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 text-sm md:text-base text-foreground bg-card rounded border border-input focus:ring-2 focus:ring-ring"
                    placeholder="Observações adicionais..."
                  />
                </div>
              </div>

              {/* Ação Imediata */}
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-success-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-green-500">
                  ✅ AÇÃO IMEDIATA
                </h2>
                <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px]">
                  <textarea
                    value={formData.immediateAction}
                    onChange={(e) => setFormData({...formData, immediateAction: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 text-sm md:text-base text-foreground bg-card rounded border border-input focus:ring-2 focus:ring-ring"
                    placeholder="Ações imediatas tomadas..."
                  />
                </div>
              </div>

              {/* 5 Porquês */}
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-primary/5 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-primary">
                  🔍 5 PORQUÊS
                </h2>
                <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px]">
                  {fiveWhys.map((why, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold flex-shrink-0 text-sm">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={why}
                        onChange={(e) => {
                          const newWhys = [...fiveWhys]
                          newWhys[index] = e.target.value
                          setFiveWhys(newWhys)
                        }}
                        className="flex-1 px-3 py-2 text-sm md:text-base text-foreground bg-card rounded border border-input focus:ring-2 focus:ring-ring"
                        placeholder={`Porquê ${index + 1}?`}
                      />
                      {fiveWhys.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFiveWhys(fiveWhys.filter((_, i) => i !== index))}
                          className="p-2 text-danger hover:bg-danger-light rounded transition-colors"
                        >
                          <Icon name="delete" className="text-base" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFiveWhys([...fiveWhys, ''])}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Icon name="add" className="text-base" />
                    Adicionar Porquê
                  </button>
                </div>
              </div>

              {/* Teste de Hipóteses */}
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-amber-50 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-amber-500">
                  🧪 TESTE DE HIPÓTESES
                </h2>
                <div className="space-y-3 bg-secondary p-2 md:p-3 rounded-[4px]">
                  {hypothesisTests.map((test, index) => (
                    <div key={index} className="p-3 bg-card rounded-[4px]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">Item {test.item}</span>
                        {hypothesisTests.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setHypothesisTests(hypothesisTests.filter((_, i) => i !== index))}
                            className="p-1 text-danger hover:bg-danger-light rounded transition-colors"
                          >
                            <Icon name="delete" className="text-base" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <input
                          type="text"
                          value={test.description}
                          onChange={(e) => {
                            const newTests = [...hypothesisTests]
                            newTests[index].description = e.target.value
                            setHypothesisTests(newTests)
                          }}
                          className="px-3 py-2 text-sm border border-input rounded focus:ring-2 focus:ring-ring"
                          placeholder="Descrição"
                        />
                        <input
                          type="text"
                          value={test.possible}
                          onChange={(e) => {
                            const newTests = [...hypothesisTests]
                            newTests[index].possible = e.target.value
                            setHypothesisTests(newTests)
                          }}
                          className="px-3 py-2 text-sm border border-input rounded focus:ring-2 focus:ring-ring"
                          placeholder="Possível"
                        />
                        <input
                          type="text"
                          value={test.evidence}
                          onChange={(e) => {
                            const newTests = [...hypothesisTests]
                            newTests[index].evidence = e.target.value
                            setHypothesisTests(newTests)
                          }}
                          className="px-3 py-2 text-sm border border-input rounded focus:ring-2 focus:ring-ring"
                          placeholder="Evidência"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setHypothesisTests([...hypothesisTests, {
                      item: hypothesisTests.length + 1,
                      description: '',
                      possible: '',
                      evidence: ''
                    }])}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Icon name="add" className="text-base" />
                    Adicionar Hipótese
                  </button>
                </div>
              </div>

              {/* Plano de Ação */}
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-success-light/10 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-green-500">
                  📋 PLANO DE AÇÃO
                </h2>
                <div className="space-y-3 bg-secondary p-2 md:p-3 rounded-[4px]">
                  {actionPlan.map((action, index) => (
                    <div key={index} className="p-3 bg-card rounded-[4px]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">Ação {index + 1}</span>
                        {actionPlan.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setActionPlan(actionPlan.filter((_, i) => i !== index))}
                            className="p-1 text-danger hover:bg-danger-light rounded transition-colors"
                          >
                            <Icon name="delete" className="text-base" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={action.what}
                          onChange={(e) => {
                            const newPlan = [...actionPlan]
                            newPlan[index].what = e.target.value
                            setActionPlan(newPlan)
                          }}
                          className="px-3 py-2 text-sm border border-input rounded focus:ring-2 focus:ring-ring"
                          placeholder="O Que"
                        />
                        <input
                          type="text"
                          value={action.who}
                          onChange={(e) => {
                            const newPlan = [...actionPlan]
                            newPlan[index].who = e.target.value
                            setActionPlan(newPlan)
                          }}
                          className="px-3 py-2 text-sm border border-input rounded focus:ring-2 focus:ring-ring"
                          placeholder="Quem"
                        />
                        <input
                          type="text"
                          value={action.when}
                          onChange={(e) => {
                            const newPlan = [...actionPlan]
                            newPlan[index].when = e.target.value
                            setActionPlan(newPlan)
                          }}
                          className="px-3 py-2 text-sm border border-input rounded focus:ring-2 focus:ring-ring"
                          placeholder="Quando"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setActionPlan([...actionPlan, { what: '', who: '', when: '' }])}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Icon name="add" className="text-base" />
                    Adicionar Ação
                  </button>
                </div>
              </div>
            </div>
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
