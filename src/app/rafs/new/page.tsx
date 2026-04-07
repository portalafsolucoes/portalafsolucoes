'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'


export default function NewRAFPage() {
  const router = useRouter()
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

  const [fiveWhys, setFiveWhys] = useState<string[]>([''])
  const [hypothesisTests, setHypothesisTests] = useState<Array<{item: number, description: string, possible: string, evidence: string}>>([
    { item: 1, description: '', possible: '', evidence: '' }
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
          hypothesisTests,
          actionPlan
        })
      })

      if (res.ok) {
        router.push('/rafs')
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
    <AppLayout>
      <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-6 pt-16 lg:pt-0">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => router.back()}>
              <Icon name="arrow_back" className="text-base mr-2" />
              Voltar
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Novo RAF</h1>
          <p className="mt-1 text-sm text-muted-foreground">Preencha os dados do Relatório de Análise de Falha</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Cabeçalho */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
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
            </div>
          </div>

          {/* Descrição da Falha */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Descrição da Falha *</h2>
            <textarea
              required
              rows={4}
              value={formData.failureDescription}
              onChange={(e) => setFormData({...formData, failureDescription: e.target.value})}
              className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring resize-none"
              placeholder="Descreva detalhadamente a falha ocorrida..."
            />
          </div>

          {/* Observação */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Observação (Levantamento de Pistas) *</h2>
            <textarea
              required
              rows={4}
              value={formData.observation}
              onChange={(e) => setFormData({...formData, observation: e.target.value})}
              className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring resize-none"
              placeholder="Descreva as observações e pistas levantadas..."
            />
          </div>

          {/* Ação de Bloqueio Imediato */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Ação de Bloqueio Imediato *</h2>
            <textarea
              required
              rows={4}
              value={formData.immediateAction}
              onChange={(e) => setFormData({...formData, immediateAction: e.target.value})}
              className="w-full px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring resize-none"
              placeholder="Descreva as ações de bloqueio imediatas..."
            />
          </div>

          {/* 5 Porquês */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Método dos 5 Porquês</h2>
              <Button
                type="button"
                size="sm"
                onClick={() => setFiveWhys([...fiveWhys, ''])}
              >
                <Icon name="add" className="text-base mr-2" />
                Adicionar Porquê
              </Button>
            </div>
            <div className="space-y-3">
              {fiveWhys.map((why, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={why}
                    onChange={(e) => {
                      const newWhys = [...fiveWhys]
                      newWhys[index] = e.target.value
                      setFiveWhys(newWhys)
                    }}
                    className="flex-1 px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    placeholder={`Porquê ${index + 1}...`}
                  />
                  {fiveWhys.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFiveWhys(fiveWhys.filter((_, i) => i !== index))}
                    >
                      <Icon name="delete" className="text-base" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tipo de Falha */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Tipo de Falha *</h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="failureType"
                  value="RANDOM"
                  checked={formData.failureType === 'RANDOM'}
                  onChange={(e) => setFormData({...formData, failureType: 'RANDOM'})}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-foreground">Aleatória</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="failureType"
                  value="REPETITIVE"
                  checked={formData.failureType === 'REPETITIVE'}
                  onChange={(e) => setFormData({...formData, failureType: 'REPETITIVE'})}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-foreground">Repetitiva</span>
              </label>
            </div>
          </div>

          {/* Teste de Hipóteses */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Teste de Hipóteses / Causas Prováveis</h2>
              <Button
                type="button"
                size="sm"
                onClick={() => setHypothesisTests([...hypothesisTests, { item: hypothesisTests.length + 1, description: '', possible: '', evidence: '' }])}
              >
                <Icon name="add" className="text-base mr-2" />
                Adicionar Hipótese
              </Button>
            </div>
            <div className="space-y-4">
              {hypothesisTests.map((test, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-secondary rounded-[4px]">
                  <input
                    type="text"
                    value={test.description}
                    onChange={(e) => {
                      const newTests = [...hypothesisTests]
                      newTests[index].description = e.target.value
                      setHypothesisTests(newTests)
                    }}
                    className="md:col-span-2 px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    placeholder="Descrição do item..."
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
                    placeholder="Possível?"
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
                    placeholder="Evidência?"
                  />
                  {hypothesisTests.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHypothesisTests(hypothesisTests.filter((_, i) => i !== index))}
                      className="md:col-span-4"
                    >
                      <Icon name="delete" className="text-base mr-2" />
                      Remover
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Plano de Ação */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Plano de Ação</h2>
              <Button
                type="button"
                size="sm"
                onClick={() => setActionPlan([...actionPlan, { what: '', who: '', when: '' }])}
              >
                <Icon name="add" className="text-base mr-2" />
                Adicionar Ação
              </Button>
            </div>
            <div className="space-y-4">
              {actionPlan.map((action, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-secondary rounded-[4px]">
                  <input
                    type="text"
                    value={action.what}
                    onChange={(e) => {
                      const newPlan = [...actionPlan]
                      newPlan[index].what = e.target.value
                      setActionPlan(newPlan)
                    }}
                    className="px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                    placeholder="O QUÊ?"
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
                    placeholder="QUEM?"
                  />
                  <input
                    type="date"
                    value={action.when}
                    onChange={(e) => {
                      const newPlan = [...actionPlan]
                      newPlan[index].when = e.target.value
                      setActionPlan(newPlan)
                    }}
                    className="px-3 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring"
                  />
                  {actionPlan.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActionPlan(actionPlan.filter((_, i) => i !== index))}
                      className="md:col-span-3"
                    >
                      <Icon name="delete" className="text-base mr-2" />
                      Remover
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end bg-card rounded-[4px] ambient-shadow p-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Criar RAF'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
