'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatHours } from '@/lib/units/time'

export interface IncorporationStandardPlan {
  id: string
  sequence: number
  name: string | null
  maintenanceTime: number | null
  timeUnit: string | null
  trackingType: string
  toleranceDays: number
  serviceType?: { id: string; code: string | null; name: string } | null
  family?: { id: string; code: string | null; name: string } | null
  familyModel?: { id: string; name: string } | null
  tasks?: Array<{
    id: string
    taskCode: number
    description: string
    order: number
    executionTime: number | null
    steps?: Array<{
      id: string
      order: number
      step?: { id: string; name: string } | null
    }>
    resources?: Array<{
      id: string
      resourceType: string
      resourceCount: number
      quantity: number
      hours: number
      unit: string
      resource?: { id: string; name: string; type: string | null; unit: string | null } | null
    }>
  }>
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedIds: string[]) => Promise<void> | void
  plans: IncorporationStandardPlan[]
  assetLabel?: string
  submitting?: boolean
}

function formatPeriodicity(plan: IncorporationStandardPlan): string {
  if (plan.trackingType === 'COUNTER') {
    return plan.maintenanceTime ? `${plan.maintenanceTime} (contador)` : 'Por contador'
  }
  if (!plan.maintenanceTime || !plan.timeUnit) return '-'
  return `${plan.maintenanceTime} ${String(plan.timeUnit).toLowerCase()}`
}

function formatServiceType(plan: IncorporationStandardPlan): string {
  if (!plan.serviceType) return '-'
  return plan.serviceType.code
    ? `${plan.serviceType.code} - ${plan.serviceType.name}`
    : plan.serviceType.name
}

export function StandardPlansIncorporationDialog({
  isOpen,
  onClose,
  onConfirm,
  plans,
  assetLabel,
  submitting = false,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  const allIds = useMemo(() => plans.map((p) => p.id), [plans])
  const allSelected = selectedIds.size > 0 && selectedIds.size === allIds.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < allIds.length

  const togglePlan = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return
    await onConfirm(Array.from(selectedIds))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Planos padrão compatíveis encontrados"
      size="lg"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-[4px]">
          <Icon name="auto_awesome" className="text-2xl text-gray-600 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium text-gray-900 mb-1">
              {assetLabel
                ? `Existem manutenções padrão cadastradas para a família de ${assetLabel}.`
                : 'Existem manutenções padrão cadastradas para esta família e tipo modelo.'}
            </p>
            <p>
              Selecione abaixo quais planos você deseja incorporar a este bem. O conteúdo
              será copiado e permanecerá vinculado ao padrão para permitir propagações
              futuras.
            </p>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum plano padrão compatível disponível.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleAll}
                  className="rounded border-input h-4 w-4"
                />
                <span className="text-sm font-medium text-foreground">
                  Selecionar todos ({plans.length})
                </span>
              </label>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} selecionado(s)
              </span>
            </div>

            <div className="border border-gray-200 rounded-[4px] divide-y divide-gray-200 overflow-hidden">
              {plans.map((plan) => {
                const isSelected = selectedIds.has(plan.id)
                const isExpanded = expandedIds.has(plan.id)
                const taskCount = plan.tasks?.length || 0

                return (
                  <div key={plan.id} className="bg-white">
                    <div
                      className={`flex items-start gap-3 px-3 py-3 ${isSelected ? 'bg-gray-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePlan(plan.id)}
                        className="mt-1 rounded border-input h-4 w-4"
                      />
                      <button
                        type="button"
                        onClick={() => toggleExpand(plan.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            name={isExpanded ? 'expand_more' : 'chevron_right'}
                            className="text-base text-gray-500"
                          />
                          <span className="text-sm font-semibold text-foreground">
                            {plan.sequence.toString().padStart(2, '0')} —{' '}
                            {plan.name || formatServiceType(plan)}
                          </span>
                        </div>
                        <div className="ml-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            <span className="font-medium">Serviço:</span>{' '}
                            {formatServiceType(plan)}
                          </span>
                          <span>
                            <span className="font-medium">Periodicidade:</span>{' '}
                            {formatPeriodicity(plan)}
                          </span>
                          <span>
                            <span className="font-medium">Tolerância:</span>{' '}
                            {plan.toleranceDays} dia(s)
                          </span>
                          <span>
                            <span className="font-medium">Tarefas:</span> {taskCount}
                          </span>
                        </div>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3 ml-9 space-y-2">
                        {taskCount === 0 ? (
                          <p className="text-xs italic text-muted-foreground">
                            Este plano não possui tarefas cadastradas.
                          </p>
                        ) : (
                          plan.tasks!.map((task) => (
                            <div
                              key={task.id}
                              className="border border-gray-200 rounded-[4px] bg-gray-50/60 p-2"
                            >
                              <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground mb-1">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-[10px] font-bold text-gray-700">
                                  {task.order}
                                </span>
                                <span className="flex-1">{task.description}</span>
                                {task.executionTime != null ? (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatHours(task.executionTime)}
                                  </span>
                                ) : null}
                              </div>
                              {task.steps && task.steps.length > 0 && (
                                <div className="pl-8 mt-1">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                    Etapas ({task.steps.length})
                                  </p>
                                  <ul className="list-disc pl-4 text-xs text-gray-700 space-y-0.5">
                                    {task.steps.map((s) => (
                                      <li key={s.id}>{s.step?.name || '—'}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {task.resources && task.resources.length > 0 && (
                                <div className="pl-8 mt-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                    Recursos ({task.resources.length})
                                  </p>
                                  <ul className="list-disc pl-4 text-xs text-gray-700 space-y-0.5">
                                    {task.resources.map((r) => (
                                      <li key={r.id}>
                                        {r.resource?.name || r.resourceType} —{' '}
                                        {r.quantity} {r.unit}
                                        {r.hours ? `, ${r.hours}h` : ''}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 px-4 py-4 bg-gray-50 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={submitting}
        >
          Pular
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={submitting || selectedIds.size === 0}
          className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
        >
          <Icon name="playlist_add_check" className="text-base mr-2" />
          {submitting
            ? 'Incorporando...'
            : `Incorporar ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
        </Button>
      </div>
    </Modal>
  )
}
