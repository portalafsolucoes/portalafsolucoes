'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface ActionPlanItem {
  item: number
  subject: string
  deadline: string
  actionDescription: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  linkedWorkOrderId?: string
  linkedWorkOrderNumber?: string
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
  const [rafNumber, setRafNumber] = useState('')
  const [woInfo, setWoInfo] = useState<{ id: string; internalId?: string; asset?: { name: string; tag?: string }; maintenanceArea?: { name: string; code?: string } } | null>(null)
  const [ssInfo, setSsInfo] = useState<{ id: string; requestNumber?: string | null; title?: string | null; asset?: { name: string; tag?: string } | null } | null>(null)
  const [formData, setFormData] = useState({
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
  const [actionPlan, setActionPlan] = useState<ActionPlanItem[]>([
    { item: 1, subject: '', deadline: '', actionDescription: '', status: 'PENDING' }
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

        setRafNumber(raf.rafNumber)
        setWoInfo(raf.workOrder || null)
        setSsInfo(raf.request || null)
        setFormData({
          occurrenceDate: formattedDate,
          occurrenceTime: raf.occurrenceTime,
          panelOperator: raf.panelOperator,
          stopExtension: raf.stopExtension,
          failureBreakdown: raf.failureBreakdown,
          productionLost: raf.productionLost ? raf.productionLost.toString() : '',
          failureDescription: raf.failureDescription || '',
          observation: raf.observation || '',
          immediateAction: raf.immediateAction || '',
          failureType: raf.failureType
        })

        if (raf.fiveWhys && raf.fiveWhys.length > 0) {
          setFiveWhys(raf.fiveWhys)
        }

        if (raf.hypothesisTests && raf.hypothesisTests.length > 0) {
          type HypothesisTestRow = { description?: string; possible?: string; evidence?: string }
          setHypothesisTests((raf.hypothesisTests as HypothesisTestRow[]).map((h) => ({
            description: h.description || '',
            possible: h.possible || '',
            evidence: h.evidence || ''
          })))
        }

        if (raf.actionPlan && raf.actionPlan.length > 0) {
          type ActionPlanRow = Partial<ActionPlanItem>
          setActionPlan((raf.actionPlan as ActionPlanRow[]).map((a, i) => ({
            item: a.item || i + 1,
            subject: a.subject || '',
            deadline: a.deadline || '',
            actionDescription: a.actionDescription || '',
            status: a.status || 'PENDING',
            linkedWorkOrderId: a.linkedWorkOrderId || undefined,
            linkedWorkOrderNumber: a.linkedWorkOrderNumber || undefined
          })))
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
          actionPlan: actionPlan.map((a, i) => ({ ...a, item: i + 1 }))
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

  const addActionPlanItem = () => {
    setActionPlan([...actionPlan, {
      item: actionPlan.length + 1,
      subject: '',
      deadline: '',
      actionDescription: '',
      status: 'PENDING'
    }])
  }

  const updateActionPlan = (index: number, field: keyof ActionPlanItem, value: string) => {
    const updated = [...actionPlan]
    updated[index] = { ...updated[index], [field]: value }
    setActionPlan(updated)
  }

  const removeActionPlanItem = (index: number) => {
    const updated = actionPlan.filter((_, i) => i !== index).map((a, i) => ({ ...a, item: i + 1 }))
    setActionPlan(updated)
  }

  const statusColor = (s: string) => {
    if (s === 'COMPLETED') return 'bg-green-100 text-green-800'
    if (s === 'IN_PROGRESS') return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar RAF — ${rafNumber}`} inPage={inPage}>
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

            {/* Info da OS vinculada (read-only) */}
            {woInfo && (
              <ModalSection title="OS Vinculada">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {woInfo.internalId && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">N° OS</label>
                      <p className="text-sm font-mono text-foreground">{woInfo.internalId}</p>
                    </div>
                  )}
                  {woInfo.asset && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Codigo do Bem</label>
                        <p className="text-sm font-mono text-foreground">{woInfo.asset.tag || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nome do Bem</label>
                        <p className="text-sm text-foreground">{woInfo.asset.name}</p>
                      </div>
                    </>
                  )}
                  {woInfo.maintenanceArea && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Area de Manutencao</label>
                      <p className="text-sm text-foreground">{woInfo.maintenanceArea.code ? `${woInfo.maintenanceArea.code} - ${woInfo.maintenanceArea.name}` : woInfo.maintenanceArea.name}</p>
                    </div>
                  )}
                </div>
              </ModalSection>
            )}

            {/* Info da SS vinculada (read-only) - quando RAF veio direto de uma SS */}
            {!woInfo && ssInfo && (
              <ModalSection title="SS Vinculada">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ssInfo.requestNumber && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">N° SS</label>
                      <p className="text-sm font-mono text-foreground">{ssInfo.requestNumber}</p>
                    </div>
                  )}
                  {ssInfo.asset && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Codigo do Bem</label>
                        <p className="text-sm font-mono text-foreground">{ssInfo.asset.tag || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nome do Bem</label>
                        <p className="text-sm text-foreground">{ssInfo.asset.name}</p>
                      </div>
                    </>
                  )}
                  {ssInfo.title && (
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Titulo da SS</label>
                      <p className="text-sm text-foreground">{ssInfo.title}</p>
                    </div>
                  )}
                </div>
              </ModalSection>
            )}

            <ModalSection title="Identificacao">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">N° RAF</label>
                  <input type="text" value={rafNumber} disabled className={`${inputClass} bg-gray-100 cursor-not-allowed`} />
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
                  <input type="number" step="0.01" value={formData.productionLost} onChange={(e) => setFormData({...formData, productionLost: e.target.value})} className={inputClass} placeholder="Producao Perdida (ton)" />
                </div>
              </div>
            </ModalSection>

            <ModalSection title="Descricao da Falha">
              <textarea rows={3} value={formData.failureDescription} onChange={(e) => setFormData({...formData, failureDescription: e.target.value})} className={`${inputClass} resize-none`} placeholder="Descreva detalhadamente a falha ocorrida..." />
            </ModalSection>

            <ModalSection title="Observacao (Levantamento de Pistas)">
              <textarea rows={3} value={formData.observation} onChange={(e) => setFormData({...formData, observation: e.target.value})} className={`${inputClass} resize-none`} placeholder="Observacoes e pistas levantadas durante investigacao..." />
            </ModalSection>

            <ModalSection title="Acao de Bloqueio Imediato">
              <textarea rows={3} value={formData.immediateAction} onChange={(e) => setFormData({...formData, immediateAction: e.target.value})} className={`${inputClass} resize-none`} placeholder="Acoes tomadas imediatamente para bloquear o problema..." />
            </ModalSection>

            <ModalSection title="Metodo dos 5 Porques">
              <div className="space-y-2">
                {fiveWhys.map((why, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase w-20 shrink-0">Por que {index + 1}</span>
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
                      <button type="button" onClick={() => setFiveWhys(fiveWhys.filter((_, i) => i !== index))} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                        <Icon name="close" className="text-base" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setFiveWhys([...fiveWhys, ''])} className="mt-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Icon name="add" className="text-sm" /> Adicionar porque
                </button>
              </div>
            </ModalSection>

            <ModalSection title="Tipo de Falha">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="failureType" value="RANDOM" checked={formData.failureType === 'RANDOM'} onChange={() => setFormData({...formData, failureType: 'RANDOM'})} className="border-input" />
                  Aleatoria
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="failureType" value="REPETITIVE" checked={formData.failureType === 'REPETITIVE'} onChange={() => setFormData({...formData, failureType: 'REPETITIVE'})} className="border-input" />
                  Repetitiva
                </label>
              </div>
            </ModalSection>

            <ModalSection title="Teste de Hipoteses / Causas Provaveis">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-8">Item</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase">Descricao</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-28">Possivel?</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-28">Evidencia?</th>
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

            <ModalSection title="Plano de Acao">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-10">Item</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase">Assunto</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-32">Prazo</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase">Descricao da Acao</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-32">Status</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-28">N° OS</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionPlan.map((action, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="px-2 py-1.5 text-xs text-muted-foreground font-mono">{action.item}</td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={action.subject} onChange={(e) => updateActionPlan(index, 'subject', e.target.value)} className={inputClass} placeholder="Assunto" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="date" value={action.deadline} onChange={(e) => updateActionPlan(index, 'deadline', e.target.value)} className={inputClass} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={action.actionDescription} onChange={(e) => updateActionPlan(index, 'actionDescription', e.target.value)} className={inputClass} placeholder="Descricao da acao" />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={action.status}
                            onChange={(e) => updateActionPlan(index, 'status', e.target.value)}
                            className={`${inputClass} ${statusColor(action.status)}`}
                          >
                            <option value="PENDING">Pendente</option>
                            <option value="IN_PROGRESS">Andamento</option>
                            <option value="COMPLETED">Concluido</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          {action.linkedWorkOrderNumber ? (
                            <span className="text-xs font-mono text-primary">{action.linkedWorkOrderNumber}</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                window.open('/work-orders?createFromRaf=true', '_blank')
                              }}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                              title="Gerar OS a partir deste item"
                            >
                              <Icon name="add_circle" className="text-sm" />
                              Gerar OS
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {actionPlan.length > 1 && (
                            <button type="button" onClick={() => removeActionPlanItem(index)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                              <Icon name="close" className="text-sm" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addActionPlanItem} className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Icon name="add" className="text-sm" /> Adicionar item
              </button>
            </ModalSection>

          </div>

          <div className="flex gap-3 px-4 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || loading} className="flex-1">
              <Icon name="save" className="text-base mr-2" />
              {saving ? 'Salvando...' : 'Salvar Alteracoes'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
