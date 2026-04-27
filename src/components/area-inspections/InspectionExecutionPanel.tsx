'use client'

import { useState, useMemo, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import InspectionStatusBadge from './InspectionStatusBadge'
import type { InspectionAnswer, InspectionDetail, InspectionStepDetail } from './types'

interface Props {
  inspection: InspectionDetail
  onClose: () => void
  onSaved: (updatedInspection: InspectionDetail) => void
  onSubmitForReview?: (id: string) => Promise<void> | void
  isReviewMode?: boolean // true = gestor revisando (EM_REVISAO); false = manutentor preenchendo (RASCUNHO)
}

type DraftAnswer = { answer: InspectionAnswer | null; notes: string }
type DraftMap = Record<string, DraftAnswer>

const buildDraftFromInspection = (insp: InspectionDetail): DraftMap => {
  const draft: DraftMap = {}
  for (const a of insp.assets) {
    for (const s of a.steps) {
      draft[s.id] = { answer: s.answer, notes: s.notes || '' }
    }
  }
  return draft
}

export default function InspectionExecutionPanel({
  inspection,
  onClose,
  onSaved,
  onSubmitForReview,
  isReviewMode = false,
}: Props) {
  const [draft, setDraft] = useState<DraftMap>(() => buildDraftFromInspection(inspection))
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(() => new Set([inspection.assets[0]?.id]))
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setDraft(buildDraftFromInspection(inspection))
  }, [inspection])

  const totalSteps = useMemo(
    () => inspection.assets.reduce((acc, a) => acc + a.steps.length, 0),
    [inspection]
  )

  const pendingCount = useMemo(
    () =>
      Object.values(draft).filter((d) => d.answer === null || typeof d.answer === 'undefined').length,
    [draft]
  )

  const nokCount = useMemo(
    () => Object.values(draft).filter((d) => d.answer === 'NOK').length,
    [draft]
  )

  const setAnswer = (stepId: string, answer: InspectionAnswer | null) => {
    setDraft((prev) => ({ ...prev, [stepId]: { ...prev[stepId], answer } }))
  }

  const setNotes = (stepId: string, notes: string) => {
    setDraft((prev) => ({ ...prev, [stepId]: { ...prev[stepId], notes } }))
  }

  const bulkSetAnswerForAsset = (assetId: string, answer: InspectionAnswer) => {
    const asset = inspection.assets.find((a) => a.id === assetId)
    if (!asset) return
    setDraft((prev) => {
      const next = { ...prev }
      for (const step of asset.steps) {
        next[step.id] = { ...prev[step.id], answer }
      }
      return next
    })
  }

  const toggleExpand = (assetId: string) => {
    setExpandedAssets((prev) => {
      const next = new Set(prev)
      if (next.has(assetId)) next.delete(assetId)
      else next.add(assetId)
      return next
    })
  }

  const buildPayload = () =>
    Object.entries(draft).map(([stepId, val]) => ({
      stepId,
      answer: val.answer,
      notes: val.notes || null,
    }))

  const handleSave = async () => {
    setError(null)
    setSuccessMessage(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/inspections/${inspection.id}/answers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: buildPayload() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Erro ao salvar respostas')
        return
      }
      setSuccessMessage('Respostas salvas com sucesso')
      // Recarrega o detalhe
      const detailRes = await fetch(`/api/inspections/${inspection.id}`)
      if (detailRes.ok) {
        const detailJson = await detailRes.json()
        onSaved(detailJson.data as InspectionDetail)
      }
    } catch (e) {
      console.error(e)
      setError('Erro ao salvar respostas')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (pendingCount > 0) {
      setError(`Existem ${pendingCount} etapa(s) sem resposta. Preencha todas antes de enviar.`)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // 1. Salva primeiro para garantir consistência
      const saveRes = await fetch(`/api/inspections/${inspection.id}/answers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: buildPayload() }),
      })
      if (!saveRes.ok) {
        const json = await saveRes.json()
        setError(json.error || 'Erro ao salvar antes de enviar')
        return
      }
      // 2. Envia para revisão
      if (onSubmitForReview) {
        await onSubmitForReview(inspection.id)
      }
    } catch (e) {
      console.error(e)
      setError('Erro ao enviar para revisão')
    } finally {
      setSubmitting(false)
    }
  }

  const renderAnswerButton = (
    stepId: string,
    value: InspectionAnswer,
    label: string,
    activeClass: string
  ) => {
    const current = draft[stepId]?.answer
    const active = current === value
    return (
      <button
        type="button"
        onClick={() => setAnswer(stepId, active ? null : value)}
        className={`min-w-[44px] min-h-[34px] px-2 text-xs font-bold uppercase rounded-[4px] border transition-colors ${
          active
            ? activeClass
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-black text-gray-900">
              {isReviewMode ? 'Revisão' : 'Preenchimento'} #{inspection.number}
            </h2>
            <InspectionStatusBadge status={inspection.status} isOverdue={inspection.isOverdue} />
          </div>
          <p className="text-sm text-gray-600 truncate">{inspection.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors"
          aria-label="Fechar"
        >
          <Icon name="close" className="text-xl" />
        </button>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-700 flex-shrink-0">
        <span>
          Etapas: <strong>{totalSteps - pendingCount}/{totalSteps}</strong>
        </span>
        <span>
          NOKs: <strong>{nokCount}</strong>
        </span>
        {pendingCount > 0 && (
          <span className="text-danger">
            <Icon name="warning" className="text-sm align-middle mr-1" />
            {pendingCount} pendente(s)
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error && (
          <div className="bg-danger-light border border-danger/30 text-danger text-sm p-3 rounded-[4px]">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-success-light border border-success/30 text-success text-sm p-3 rounded-[4px]">
            {successMessage}
          </div>
        )}

        {inspection.assets.map((asset) => {
          const expanded = expandedAssets.has(asset.id)
          const assetAnswers = asset.steps.map((s) => draft[s.id]?.answer)
          const totalSteps = asset.steps.length
          const answered = assetAnswers.filter((a) => a != null).length
          const noks = assetAnswers.filter((a) => a === 'NOK').length
          return (
            <div key={asset.id} className="border border-gray-200 rounded-[4px] bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExpand(asset.id)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200 hover:bg-gray-200 transition-colors text-left"
              >
                <Icon name={expanded ? 'expand_more' : 'chevron_right'} className="text-base text-gray-600" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-gray-900 truncate">
                    {asset.assetTag || asset.assetProtheusCode || '?'} — {asset.assetName}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {asset.familyName || '-'} / {asset.familyModelName || '-'} ·{' '}
                    {answered}/{totalSteps} respondida(s) · {noks} NOK
                  </div>
                </div>
              </button>

              {expanded && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-[11px] font-bold text-gray-600 uppercase">Marcar tudo:</span>
                    <button
                      type="button"
                      onClick={() => bulkSetAnswerForAsset(asset.id, 'OK')}
                      className="px-2 py-1 text-xs font-bold uppercase rounded-[4px] border border-gray-900 bg-white text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkSetAnswerForAsset(asset.id, 'NA')}
                      className="px-2 py-1 text-xs font-bold uppercase rounded-[4px] border border-gray-500 bg-white text-gray-700 hover:bg-gray-500 hover:text-white transition-colors"
                    >
                      NA
                    </button>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {asset.steps.map((step: InspectionStepDetail, idx) => (
                      <div key={step.id} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[11px] font-bold text-muted-foreground mt-1 w-6">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-foreground">
                              {step.stepName}
                              {step.stepProtheusCode && (
                                <span className="ml-2 text-[10px] text-muted-foreground font-mono">
                                  {step.stepProtheusCode}
                                </span>
                              )}
                            </div>
                            <textarea
                              value={draft[step.id]?.notes || ''}
                              onChange={(e) => setNotes(step.id, e.target.value)}
                              placeholder="Observação (opcional)"
                              rows={1}
                              className="mt-2 w-full px-2 py-1 text-xs border border-gray-200 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-gray-900"
                            />
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <div className="flex gap-1">
                              {renderAnswerButton(step.id, 'OK', 'OK', 'bg-gray-900 text-white border-gray-900')}
                              {renderAnswerButton(
                                step.id,
                                'NOK',
                                'NOK',
                                'bg-white text-gray-900 border-2 border-gray-900 font-black'
                              )}
                              {renderAnswerButton(step.id, 'NA', 'NA', 'bg-gray-500 text-white border-gray-500')}
                            </div>
                            {step.requestId && (
                              <span className="text-[10px] text-muted-foreground">
                                <Icon name="link" className="text-xs align-middle mr-0.5" />
                                SS gerada
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 px-4 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={handleSave}
          disabled={saving || submitting}
          className="w-full"
        >
          <Icon name="save" className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar respostas'}
        </Button>
        {!isReviewMode && onSubmitForReview && (
          <Button
            type="button"
            onClick={handleSubmitForReview}
            disabled={saving || submitting || pendingCount > 0}
            className="w-full bg-gray-900 text-white hover:bg-gray-800"
          >
            <Icon name="send" className="mr-2" />
            {submitting
              ? 'Enviando...'
              : pendingCount > 0
              ? `Enviar para revisão (${pendingCount} pendente(s))`
              : 'Enviar para revisão'}
          </Button>
        )}
      </div>
    </div>
  )
}
