'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'


export default function EditRAFPage() {
  const router = useRouter()
  const params = useParams()
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
    loadRAF()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadRAF = async () => {
    try {
      const res = await fetch(`/api/rafs/${params.id}`)
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
      } else {
        alert(data.error || 'Erro ao carregar RAF')
        router.push('/rafs')
      }
    } catch (error) {
      console.error('Error loading RAF:', error)
      alert('Erro ao carregar RAF')
      router.push('/rafs')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/rafs/${params.id}`, {
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
        router.push(`/rafs/${params.id}`)
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-6 pt-16 lg:pt-0">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => router.back()}>
              <Icon name="arrow_back" className="text-base mr-2" />
              Voltar
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Editar RAF</h1>
          <p className="mt-1 text-sm text-muted-foreground">Atualize os dados do Relatório de Análise de Falha</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cabeçalho */}
          <div className="bg-card rounded-[4px] ambient-shadow p-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Informações Básicas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Número RAF *
                </label>
                <input
                  type="text"
                  required
                  value={formData.rafNumber}
                  onChange={(e) => setFormData({...formData, rafNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                  placeholder="Ex: FQ13"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Área *
                </label>
                <input
                  type="text"
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                  placeholder="Ex: MOAGEM 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Equipamento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.equipment}
                  onChange={(e) => setFormData({...formData, equipment: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                  placeholder="Ex: SENSOR TEMP. ENT. FIL."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Data Ocorrência *
                </label>
                <input
                  type="date"
                  required
                  value={formData.occurrenceDate}
                  onChange={(e) => setFormData({...formData, occurrenceDate: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Hora *
                </label>
                <input
                  type="time"
                  required
                  value={formData.occurrenceTime}
                  onChange={(e) => setFormData({...formData, occurrenceTime: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Operador de Painel *
                </label>
                <input
                  type="text"
                  required
                  value={formData.panelOperator}
                  onChange={(e) => setFormData({...formData, panelOperator: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                  placeholder="Nome do operador"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.stopExtension}
                    onChange={(e) => setFormData({...formData, stopExtension: e.target.checked})}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">Prolongamento de Parada</span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.failureBreakdown}
                    onChange={(e) => setFormData({...formData, failureBreakdown: e.target.checked})}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">Falha/Quebra</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Produção Perdida (ton)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.productionLost}
                  onChange={(e) => setFormData({...formData, productionLost: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tipo de Falha *
                </label>
                <select
                  required
                  value={formData.failureType}
                  onChange={(e) => setFormData({...formData, failureType: e.target.value as 'RANDOM' | 'REPETITIVE'})}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                >
                  <option value="RANDOM">Aleatória</option>
                  <option value="REPETITIVE">Repetitiva</option>
                </select>
              </div>
            </div>
          </div>

          {/* Descrição da Falha */}
          <div className="bg-card rounded-[4px] ambient-shadow p-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Descrição da Falha</h2>
            <textarea
              required
              value={formData.failureDescription}
              onChange={(e) => setFormData({...formData, failureDescription: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
              placeholder="Descreva detalhadamente a falha..."
            />
          </div>

          {/* Observações */}
          <div className="bg-card rounded-[4px] ambient-shadow p-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Observações</h2>
            <textarea
              value={formData.observation}
              onChange={(e) => setFormData({...formData, observation: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
              placeholder="Observações adicionais..."
            />
          </div>

          {/* Ação Imediata */}
          <div className="bg-card rounded-[4px] ambient-shadow p-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Ação Imediata</h2>
            <textarea
              value={formData.immediateAction}
              onChange={(e) => setFormData({...formData, immediateAction: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
              placeholder="Ações imediatas tomadas..."
            />
          </div>

          {/* 5 Porquês */}
          <div className="bg-card rounded-[4px] ambient-shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">5 Porquês</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFiveWhys([...fiveWhys, ''])}
              >
                <Icon name="add" className="text-base mr-2" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              {fiveWhys.map((why, index) => (
                <div key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
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
                    className="flex-1 px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    placeholder={`Porquê ${index + 1}?`}
                  />
                  {fiveWhys.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFiveWhys(fiveWhys.filter((_, i) => i !== index))}
                      className="text-danger"
                    >
                      <Icon name="delete" className="text-base" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Teste de Hipóteses */}
          <div className="bg-card rounded-[4px] ambient-shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Teste de Hipóteses</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHypothesisTests([...hypothesisTests, {
                  item: hypothesisTests.length + 1,
                  description: '',
                  possible: '',
                  evidence: ''
                }])}
              >
                <Icon name="add" className="text-base mr-2" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-4">
              {hypothesisTests.map((test, index) => (
                <div key={index} className="p-4 rounded-[4px] space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-foreground">Item {test.item}</h3>
                    {hypothesisTests.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHypothesisTests(hypothesisTests.filter((_, i) => i !== index))}
                        className="text-danger"
                      >
                        <Icon name="delete" className="text-base" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      value={test.description}
                      onChange={(e) => {
                        const newTests = [...hypothesisTests]
                        newTests[index].description = e.target.value
                        setHypothesisTests(newTests)
                      }}
                      className="px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
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
                      className="px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
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
                      className="px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                      placeholder="Evidência"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plano de Ação */}
          <div className="bg-card rounded-[4px] ambient-shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Plano de Ação</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActionPlan([...actionPlan, { what: '', who: '', when: '' }])}
              >
                <Icon name="add" className="text-base mr-2" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-4">
              {actionPlan.map((action, index) => (
                <div key={index} className="p-4 rounded-[4px]">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-foreground">Ação {index + 1}</h3>
                    {actionPlan.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActionPlan(actionPlan.filter((_, i) => i !== index))}
                        className="text-danger"
                      >
                        <Icon name="delete" className="text-base" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={action.what}
                      onChange={(e) => {
                        const newPlan = [...actionPlan]
                        newPlan[index].what = e.target.value
                        setActionPlan(newPlan)
                      }}
                      className="px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
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
                      className="px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
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
                      className="px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                      placeholder="Quando"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
