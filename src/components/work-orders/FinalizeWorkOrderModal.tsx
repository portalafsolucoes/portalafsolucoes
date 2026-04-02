'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Plus, Trash2 } from 'lucide-react'

interface FinalizeModalProps {
  isOpen: boolean
  onClose: () => void
  workOrder: any
  onFinalized: () => void
}

interface ExecutionResource {
  memberName: string
  quantity: number
  hours: number
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  observation: string
}

export function FinalizeWorkOrderModal({ isOpen, onClose, workOrder, onFinalized }: FinalizeModalProps) {
  const [resources, setResources] = useState<ExecutionResource[]>([{
    memberName: '', quantity: 1, hours: 0,
    startDate: '', startTime: '', endDate: '', endTime: '', observation: '',
  }])
  const [executionNotes, setExecutionNotes] = useState('')
  const [generateCorrective, setGenerateCorrective] = useState(false)
  const [correctiveTitle, setCorrectiveTitle] = useState('')
  const [correctiveType, setCorrectiveType] = useState('CORRECTIVE_PLANNED')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addResource = () => {
    setResources([...resources, {
      memberName: '', quantity: 1, hours: 0,
      startDate: '', startTime: '', endDate: '', endTime: '', observation: '',
    }])
  }

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index))
  }

  const updateResource = (index: number, field: string, value: any) => {
    const updated = [...resources]
    updated[index] = { ...updated[index], [field]: value }
    setResources(updated)
  }

  const handleFinalize = async () => {
    setSaving(true)
    setError('')
    try {
      const body: any = {
        executionResources: resources.filter(r => r.memberName),
        executionNotes,
        generateCorrectiveOS: generateCorrective,
      }

      // Calcular datas reais da primeira e última entrada
      const validResources = resources.filter(r => r.startDate)
      if (validResources.length > 0) {
        const first = validResources[0]
        const last = validResources[validResources.length - 1]
        if (first.startDate && first.startTime) {
          body.realMaintenanceStart = `${first.startDate}T${first.startTime || '00:00'}:00`
        }
        if (last.endDate && last.endTime) {
          body.realMaintenanceEnd = `${last.endDate}T${last.endTime || '23:59'}:00`
        }
      }

      if (generateCorrective) {
        body.correctiveData = {
          title: correctiveTitle || `OS Corretiva - ${workOrder.title}`,
          osType: correctiveType,
          priority: 'MEDIUM',
        }
      }

      const res = await fetch(`/api/work-orders/${workOrder.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao finalizar')
        setSaving(false)
        return
      }

      onFinalized()
      onClose()
    } catch {
      setError('Erro de conexão')
    }
    setSaving(false)
  }

  if (!workOrder) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Finalizar OS: ${workOrder.title}`} size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {error && <div className="p-3 bg-danger-light text-danger-light-foreground rounded-lg text-sm">{error}</div>}

        {/* Info da OS */}
        <div className="p-3 bg-muted rounded-lg text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><span className="text-muted-foreground">OS:</span> <span className="font-medium">{workOrder.internalId || workOrder.id.slice(0,8)}</span></div>
            <div><span className="text-muted-foreground">Ativo:</span> <span className="font-medium">{workOrder.asset?.name || '-'}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{workOrder.status}</span></div>
            <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{workOrder.type}</span></div>
          </div>
        </div>

        {/* Dados Reais de Execução */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Dados Reais de Execução</h3>
            <Button size="sm" variant="outline" onClick={addResource}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Recurso
            </Button>
          </div>

          <div className="space-y-3">
            {resources.map((r, i) => (
              <div key={i} className="p-3 border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Recurso #{i + 1}</span>
                  {resources.length > 1 && (
                    <button onClick={() => removeResource(i)} className="p-1 hover:bg-danger-light rounded">
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nome do Integrante</label>
                    <input type="text" value={r.memberName} onChange={e => updateResource(i, 'memberName', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Qtd. Recurso</label>
                    <input type="number" value={r.quantity} onChange={e => updateResource(i, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Horas</label>
                    <input type="number" step="0.5" value={r.hours} onChange={e => updateResource(i, 'hours', Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Data Início</label>
                    <input type="date" value={r.startDate} onChange={e => updateResource(i, 'startDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Hora Início</label>
                    <input type="time" value={r.startTime} onChange={e => updateResource(i, 'startTime', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Data Fim</label>
                    <input type="date" value={r.endDate} onChange={e => updateResource(i, 'endDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Hora Fim</label>
                    <input type="time" value={r.endTime} onChange={e => updateResource(i, 'endTime', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Observação</label>
                  <input type="text" value={r.observation} onChange={e => updateResource(i, 'observation', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observação geral */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Observação Geral</label>
          <textarea value={executionNotes} onChange={e => setExecutionNotes(e.target.value)}
            rows={3} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Notas sobre a execução..." />
        </div>

        {/* Emitir OS corretiva */}
        <div className="p-3 border border-border rounded-lg space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={generateCorrective} onChange={e => setGenerateCorrective(e.target.checked)} className="rounded border-border" />
            <span className="text-sm font-medium">Emitir OS Corretiva?</span>
          </label>
          {generateCorrective && (
            <div className="space-y-3 pl-6">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Título da OS Corretiva</label>
                <input type="text" value={correctiveTitle} onChange={e => setCorrectiveTitle(e.target.value)}
                  placeholder="Ex: Substituição de rolamento" className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tipo</label>
                <select value={correctiveType} onChange={e => setCorrectiveType(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card">
                  <option value="CORRECTIVE_PLANNED">Corretiva Programada</option>
                  <option value="CORRECTIVE_IMMEDIATE">Corretiva Imediata</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} size="sm">Cancelar</Button>
          <Button onClick={handleFinalize} disabled={saving} size="sm">
            {saving ? 'Finalizando...' : 'Finalizar OS'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
