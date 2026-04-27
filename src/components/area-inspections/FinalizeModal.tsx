'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import type { InspectionDetail } from './types'

interface MaintenanceAreaOption {
  id: string
  name: string
  code: string | null
}

interface NokDraft {
  stepId: string
  title: string
  description: string
  priority: string
  maintenanceAreaId: string
  dueDate: string
}

interface Props {
  inspection: InspectionDetail
  isOpen: boolean
  onClose: () => void
  onFinalized: (createdSsCount: number) => void
}

const PRIORITIES = [
  { value: 'NONE', label: 'Sem prioridade' },
  { value: 'LOW', label: 'Baixa' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
]

const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1'
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900'

export default function FinalizeModal({ inspection, isOpen, onClose, onFinalized }: Props) {
  const pendingNoks = useMemo(() => {
    const result: Array<{
      stepId: string
      assetName: string
      assetTag: string | null
      stepName: string
    }> = []
    for (const a of inspection.assets) {
      for (const s of a.steps) {
        if (s.answer === 'NOK' && !s.requestId) {
          result.push({
            stepId: s.id,
            assetName: a.assetName,
            assetTag: a.assetTag,
            stepName: s.stepName,
          })
        }
      }
    }
    return result
  }, [inspection])

  const [drafts, setDrafts] = useState<Record<string, NokDraft>>({})
  const [areas, setAreas] = useState<MaintenanceAreaOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const initial: Record<string, NokDraft> = {}
    for (const n of pendingNoks) {
      initial[n.stepId] = {
        stepId: n.stepId,
        title: `${n.assetTag ? `${n.assetTag} - ` : ''}${n.stepName}`,
        description: '',
        priority: 'NORMAL',
        maintenanceAreaId: '',
        dueDate: '',
      }
    }
    setDrafts(initial)
    setError(null)
  }, [isOpen, pendingNoks])

  useEffect(() => {
    if (!isOpen) return
    void (async () => {
      try {
        const res = await fetch('/api/basic-registrations/maintenance-areas')
        const json = await res.json()
        setAreas((json.data || []) as MaintenanceAreaOption[])
      } catch (e) {
        console.error(e)
      }
    })()
  }, [isOpen])

  const updateDraft = (stepId: string, patch: Partial<NokDraft>) => {
    setDrafts((prev) => ({ ...prev, [stepId]: { ...prev[stepId], ...patch } }))
  }

  const handleFinalize = async () => {
    setError(null)
    // Validação local
    const missing: string[] = []
    for (const stepId of Object.keys(drafts)) {
      const d = drafts[stepId]
      if (!d.title.trim() || !d.maintenanceAreaId) missing.push(stepId)
    }
    if (missing.length > 0) {
      setError(`${missing.length} NOK(s) sem dados completos. Preencha título e área de manutenção.`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/inspections/${inspection.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nokDetails: Object.values(drafts).map((d) => ({
            stepId: d.stepId,
            title: d.title,
            description: d.description || null,
            priority: d.priority,
            maintenanceAreaId: d.maintenanceAreaId,
            dueDate: d.dueDate || null,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Erro ao finalizar')
        return
      }
      onFinalized(json.data?.createdRequests || 0)
    } catch (e) {
      console.error(e)
      setError('Erro ao finalizar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Finalizar Inspeção #${inspection.number}`}>
      <div className="p-4 space-y-3">
        {error && (
          <div className="bg-danger-light border border-danger/30 text-danger text-sm p-3 rounded-[4px]">
            {error}
          </div>
        )}
        {pendingNoks.length === 0 ? (
          <div className="text-sm text-gray-700">
            Nenhum NOK pendente nesta inspeção. Ao confirmar, ela será marcada como finalizada sem
            gerar novas SSs.
          </div>
        ) : (
          <ModalSection title={`NOKs a gerar SS (${pendingNoks.length})`}>
            <div className="space-y-3">
              {pendingNoks.map((n, idx) => {
                const d = drafts[n.stepId]
                if (!d) return null
                return (
                  <div
                    key={n.stepId}
                    className="border border-gray-200 rounded-[4px] p-3 bg-gray-50/60"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-gray-500 uppercase">
                        NOK {idx + 1}
                      </span>
                      <span className="text-xs text-gray-700 truncate">
                        {n.assetTag || '?'} — {n.assetName} · {n.stepName}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className={labelCls}>Título da SS *</label>
                        <input
                          type="text"
                          className={inputCls}
                          value={d.title}
                          onChange={(e) => updateDraft(n.stepId, { title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Prioridade</label>
                        <select
                          className={inputCls}
                          value={d.priority}
                          onChange={(e) => updateDraft(n.stepId, { priority: e.target.value })}
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelCls}>Descrição</label>
                        <textarea
                          rows={2}
                          className={inputCls}
                          value={d.description}
                          onChange={(e) => updateDraft(n.stepId, { description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className={labelCls}>Área de manutenção *</label>
                          <select
                            className={inputCls}
                            value={d.maintenanceAreaId}
                            onChange={(e) =>
                              updateDraft(n.stepId, { maintenanceAreaId: e.target.value })
                            }
                            required
                          >
                            <option value="">Selecione...</option>
                            {areas.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code ? `${a.code} - ` : ''}
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Prazo (opcional)</label>
                          <input
                            type="date"
                            className={inputCls}
                            value={d.dueDate}
                            onChange={(e) => updateDraft(n.stepId, { dueDate: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ModalSection>
        )}
      </div>

      <div className="flex gap-3 px-4 py-4 bg-gray-50 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleFinalize}
          disabled={submitting}
          className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
        >
          <Icon name="check_circle" className="text-base mr-2" />
          {submitting ? 'Finalizando...' : 'Finalizar Inspeção'}
        </Button>
      </div>
    </Modal>
  )
}
