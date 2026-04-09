'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface FinalizeModalProps {
  isOpen: boolean
  onClose: () => void
  workOrder: any
  onFinalized: () => void
}

interface ExecutionResource {
  resourceId?: string
  memberName: string
  quantity: number
  hours: number
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  observation: string
}

interface ExecutionStep {
  stepId: string
  stepName: string
  optionType: string
  completed: boolean
  responseValue: string
  selectedOption: string
  options: { id: string; label: string; order: number }[]
}

interface PlanTask {
  id: string
  description: string
  order: number
  steps: {
    id: string
    order: number
    step: {
      id: string
      name: string
      optionType: string
      options: { id: string; label: string; order: number }[]
    }
  }[]
}

interface CalendarWarning {
  resource: string
  warnings: string[]
}

interface CalendarDetail {
  resource: string
  calendar: string
  registeredHours: number
  effectiveHours: number
  efficiency: string
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

  // Estado de calendário
  const [calendarWarnings, setCalendarWarnings] = useState<CalendarWarning[]>([])
  const [calendarDetails, setCalendarDetails] = useState<CalendarDetail[]>([])
  const [checkingCalendar, setCheckingCalendar] = useState(false)

  // Carregar recursos do plano (se existirem) com suas informações de calendário
  const [planResources, setPlanResources] = useState<any[]>([])
  // Etapas de execução
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [loadingSteps, setLoadingSteps] = useState(false)

  useEffect(() => {
    if (!isOpen || !workOrder) return
    // Buscar recursos e tarefas do plano se houver assetMaintenancePlanId
    if (workOrder.assetMaintenancePlanId) {
      loadPlanResources(workOrder.assetMaintenancePlanId)
      loadPlanSteps(workOrder.assetMaintenancePlanId)
    }
  }, [isOpen, workOrder])

  const loadPlanResources = async (planId: string) => {
    try {
      const res = await fetch(`/api/maintenance-plans/asset/${planId}/resources`)
      if (res.ok) {
        const data = await res.json()
        setPlanResources(data.data || [])
      }
    } catch {
      // silently fail - it's informational
    }
  }

  const loadPlanSteps = async (planId: string) => {
    setLoadingSteps(true)
    try {
      const res = await fetch(`/api/maintenance-plans/asset/${planId}/tasks`)
      if (res.ok) {
        const { data: tasks } = await res.json()
        // Achatar todas as steps de todas as tasks em uma lista
        const allSteps: ExecutionStep[] = []
        for (const task of (tasks as PlanTask[] || [])) {
          const sortedSteps = (task.steps || []).sort((a, b) => a.order - b.order)
          for (const ts of sortedSteps) {
            if (!ts.step) continue
            allSteps.push({
              stepId: ts.step.id,
              stepName: ts.step.name,
              optionType: ts.step.optionType || 'NONE',
              completed: false,
              responseValue: '',
              selectedOption: '',
              options: (ts.step.options || []).sort((a, b) => a.order - b.order),
            })
          }
        }
        setExecutionSteps(allSteps)
      }
    } catch {
      // silently fail
    }
    setLoadingSteps(false)
  }

  const updateStep = (index: number, field: keyof ExecutionStep, value: any) => {
    setExecutionSteps(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Verificação de calendário quando datas/horas mudam
  const checkCalendarAvailability = useCallback(async () => {
    const validResources = resources.filter(r => r.resourceId && r.startDate)
    if (validResources.length === 0) {
      setCalendarWarnings([])
      setCalendarDetails([])
      return
    }

    setCheckingCalendar(true)
    try {
      const resourceIds = validResources.map(r => r.resourceId!).join(',')
      const res = await fetch(`/api/resources/availability?resourceIds=${resourceIds}&date=${validResources[0].startDate}`)
      if (!res.ok) return

      const { data } = await res.json()
      const warnings: CalendarWarning[] = []
      const details: CalendarDetail[] = []

      for (const r of validResources) {
        const resAvail = data?.find((d: any) => d.resourceId === r.resourceId)
        if (!resAvail?.hasCalendar) continue

        const resourceLabel = r.memberName || resAvail.resourceName || 'Recurso'
        const resourceWarnings: string[] = []

        // Verificar data início
        if (r.startDate && resAvail.dateAvailability && !resAvail.dateAvailability.isWorkingDay) {
          resourceWarnings.push(`${r.startDate} não é dia útil no calendário "${resAvail.calendarName}"`)
        }

        // Verificar horários
        if (r.startTime && resAvail.dateAvailability) {
          const shiftInfo = resAvail.weeklySummary?.find((s: any) => s.hours > 0)
          if (shiftInfo && resAvail.dateAvailability.availableHours > 0) {
            // Informativo: mostrar horas disponíveis
            details.push({
              resource: resourceLabel,
              calendar: resAvail.calendarName,
              registeredHours: r.hours || 0,
              effectiveHours: resAvail.dateAvailability.availableHours,
              efficiency: r.hours > 0
                ? Math.round((Math.min(r.hours, resAvail.dateAvailability.availableHours) / r.hours) * 100) + '%'
                : '-',
            })
          }
        }

        if (resourceWarnings.length > 0) {
          warnings.push({ resource: resourceLabel, warnings: resourceWarnings })
        }
      }

      setCalendarWarnings(warnings)
      setCalendarDetails(details)
    } catch {
      // silently fail
    }
    setCheckingCalendar(false)
  }, [resources])

  // Debounce na verificação de calendário
  useEffect(() => {
    const hasResourceWithCalendarData = resources.some(r => r.resourceId && r.startDate)
    if (!hasResourceWithCalendarData) return

    const timer = setTimeout(checkCalendarAvailability, 500)
    return () => clearTimeout(timer)
  }, [resources, checkCalendarAvailability])

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

  const selectPlanResource = (index: number, planRes: any) => {
    const updated = [...resources]
    updated[index] = {
      ...updated[index],
      resourceId: planRes.resourceId,
      memberName: planRes.resourceName || planRes.resource?.name || '',
    }
    setResources(updated)
  }

  const handleFinalize = async () => {
    setSaving(true)
    setError('')
    try {
      const body: any = {
        executionResources: resources.filter(r => r.memberName),
        executionSteps: executionSteps.length > 0
          ? executionSteps.map(s => ({
              stepId: s.stepId,
              stepName: s.stepName,
              optionType: s.optionType,
              completed: s.completed,
              responseValue: s.optionType === 'RESPONSE' ? s.responseValue : undefined,
              selectedOption: s.optionType === 'OPTION' ? s.selectedOption : undefined,
            }))
          : undefined,
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
        {error && <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">{error}</div>}

        {/* Info da OS */}
        <div className="p-3 bg-muted rounded-[4px] text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><span className="text-muted-foreground">OS:</span> <span className="font-medium">{workOrder.internalId || workOrder.id.slice(0,8)}</span></div>
            <div><span className="text-muted-foreground">Ativo:</span> <span className="font-medium">{workOrder.asset?.name || '-'}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{workOrder.status}</span></div>
            <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{workOrder.type}</span></div>
          </div>
        </div>

        {/* Avisos de Calendário */}
        {calendarWarnings.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-[4px]">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="warning" className="text-base text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Avisos de Calendário</span>
            </div>
            <ul className="space-y-1">
              {calendarWarnings.map((cw, i) => (
                <li key={i} className="text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-medium">{cw.resource}:</span>{' '}
                  {cw.warnings.join('; ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detalhes de eficiência de calendário */}
        {calendarDetails.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-[4px]">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="schedule" className="text-base text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-info-light-foreground dark:text-blue-300">Disponibilidade por Calendário</span>
            </div>
            <div className="space-y-1">
              {calendarDetails.map((cd, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-blue-700 dark:text-blue-400">
                    <span className="font-medium">{cd.resource}</span>
                    <span className="text-blue-500 dark:text-blue-500 ml-1">({cd.calendar})</span>
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {cd.effectiveHours}h disponíveis no dia
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Etapas de Execução */}
        {executionSteps.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon name="check_box" className="text-base" />
              Etapas de Execução ({executionSteps.filter(s => s.completed).length}/{executionSteps.length})
            </h3>
            <div className="space-y-2">
              {executionSteps.map((step, i) => (
                <div key={i} className="p-3 rounded-[4px] space-y-2">
                  {/* Linha principal: checkbox + nome */}
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step.completed}
                      onChange={e => updateStep(i, 'completed', e.target.checked)}
                      className="mt-0.5 rounded border-border"
                    />
                    <div className="flex-1">
                      <span className={`text-sm ${step.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {step.stepName}
                      </span>
                      {step.optionType !== 'NONE' && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                          {step.optionType === 'RESPONSE' ? (
                            <><Icon name="chat" className="text-xs" /> Resposta</>
                          ) : (
                            <><Icon name="list" className="text-xs" /> Opção</>
                          )}
                        </span>
                      )}
                    </div>
                  </label>

                  {/* Campo de Resposta (RESPONSE) */}
                  {step.optionType === 'RESPONSE' && step.completed && (
                    <div className="pl-6">
                      <input
                        type="text"
                        value={step.responseValue}
                        onChange={e => updateStep(i, 'responseValue', e.target.value)}
                        placeholder="Digite o valor observado (ex: 72°C, 2.3 mm/s...)"
                        className="w-full px-2 py-1.5 text-sm rounded bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}

                  {/* Campo de Opção (OPTION) */}
                  {step.optionType === 'OPTION' && step.completed && (
                    <div className="pl-6">
                      <select
                        value={step.selectedOption}
                        onChange={e => updateStep(i, 'selectedOption', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione...</option>
                        {step.options.map(opt => (
                          <option key={opt.id} value={opt.label}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingSteps && (
          <div className="text-center py-3 text-sm text-muted-foreground">
            Carregando etapas...
          </div>
        )}

        {/* Dados Reais de Execução */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Dados Reais de Execução</h3>
            <Button size="sm" variant="outline" onClick={addResource}>
              <Icon name="add" className="text-sm mr-1" /> Recurso
            </Button>
          </div>

          <div className="space-y-3">
            {resources.map((r, i) => (
              <div key={i} className="p-3 rounded-[4px] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Recurso #{i + 1}</span>
                  <div className="flex items-center gap-2">
                    {/* Seletor de recurso do plano (se disponível) */}
                    {planResources.length > 0 && (
                      <select
                        value={r.resourceId || ''}
                        onChange={e => {
                          const selected = planResources.find((pr: any) => pr.resourceId === e.target.value)
                          if (selected) selectPlanResource(i, selected)
                          else updateResource(i, 'resourceId', '')
                        }}
                        className="px-2 py-1 text-xs rounded bg-card"
                        title="Vincular a recurso do plano"
                      >
                        <option value="">Vincular recurso...</option>
                        {planResources.map((pr: any) => (
                          <option key={pr.resourceId} value={pr.resourceId}>
                            {pr.resourceName || pr.resource?.name || pr.resourceId?.slice(0, 8)}
                            {pr.calendarName ? ` (${pr.calendarName})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {r.resourceId && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 rounded text-xs text-blue-600 dark:text-blue-400" title="Recurso vinculado ao calendário">
                        <Icon name="calendar_today" className="text-sm" />
                      </span>
                    )}
                    {resources.length > 1 && (
                      <button onClick={() => removeResource(i)} className="p-1 hover:bg-danger-light rounded">
                        <Icon name="delete" className="text-sm text-danger" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nome do Integrante</label>
                    <input type="text" value={r.memberName} onChange={e => updateResource(i, 'memberName', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded bg-card" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Qtd. Recurso</label>
                    <input type="number" value={r.quantity} onChange={e => updateResource(i, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm rounded bg-card" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Horas</label>
                    <input type="number" step="0.5" value={r.hours} onChange={e => updateResource(i, 'hours', Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm rounded bg-card" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Data Início</label>
                    <input type="date" value={r.startDate} onChange={e => updateResource(i, 'startDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded bg-card" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Hora Início</label>
                    <input type="time" value={r.startTime} onChange={e => updateResource(i, 'startTime', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded bg-card" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Data Fim</label>
                    <input type="date" value={r.endDate} onChange={e => updateResource(i, 'endDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded bg-card" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Hora Fim</label>
                    <input type="time" value={r.endTime} onChange={e => updateResource(i, 'endTime', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded bg-card" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Observação</label>
                  <input type="text" value={r.observation} onChange={e => updateResource(i, 'observation', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm rounded bg-card" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observação geral */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Observação Geral</label>
          <textarea value={executionNotes} onChange={e => setExecutionNotes(e.target.value)}
            rows={3} className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Notas sobre a execução..." />
        </div>

        {/* Emitir OS corretiva */}
        <div className="p-3 rounded-[4px] space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={generateCorrective} onChange={e => setGenerateCorrective(e.target.checked)} className="rounded border-border" />
            <span className="text-sm font-medium">Emitir OS Corretiva?</span>
          </label>
          {generateCorrective && (
            <div className="space-y-3 pl-6">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Título da OS Corretiva</label>
                <input type="text" value={correctiveTitle} onChange={e => setCorrectiveTitle(e.target.value)}
                  placeholder="Ex: Substituição de rolamento" className="w-full px-2 py-1.5 text-sm rounded bg-card" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tipo</label>
                <select value={correctiveType} onChange={e => setCorrectiveType(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded bg-card">
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
