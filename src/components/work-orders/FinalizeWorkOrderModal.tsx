'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { getDisplayId } from '@/lib/workOrderUtils'

export interface FinalizeResult {
  generateCorrective: boolean
  sourceWorkOrder?: {
    id: string
    displayId: string
    assetId?: string | null
    locationId?: string | null
  }
}

interface FinalizeModalProps {
  isOpen: boolean
  onClose: () => void
  workOrder: Record<string, unknown>
  onFinalized: (result?: FinalizeResult) => void
  inPage?: boolean
}

type ResourceCategory = 'LABOR' | 'SPECIALTY' | 'MATERIAL' | 'TOOL'

interface PlannedResource {
  id: string
  resourceType: ResourceCategory
  resourceId?: string | null
  jobTitleId?: string | null
  userId?: string | null
  resourceName: string
  quantity: number
  hours: number
  unit: string
}

interface ExecutionResourceLabor {
  type: 'LABOR' | 'SPECIALTY'
  resourceId?: string
  resourceName: string
  plannedResourceId?: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  observation: string
}

interface ExecutionResourceMaterial {
  type: 'MATERIAL' | 'TOOL'
  resourceId?: string
  resourceName: string
  plannedResourceId?: string
  quantity: number
  unit: string
  observation: string
}

interface AvailableResource {
  id: string
  name: string
  type: ResourceCategory
  unit?: string | null
}

type ExecutionResource = ExecutionResourceLabor | ExecutionResourceMaterial

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
  resources: {
    id: string
    resourceType: string
    resourceId: string | null
    jobTitleId: string | null
    userId: string | null
    resourceCount: number
    quantity: number
    hours: number
    unit: string
    resource?: { id: string; name: string; type: string; unit?: string } | null
    jobTitle?: { id: string; name: string } | null
    user?: { id: string; firstName: string; lastName: string; jobTitle?: string } | null
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

const UNIT_OPTIONS = ['un', 'kg', 'L', 'm', 'm²', 'm³', 'pç', 'cx', 'par', 'jg', 'rl', 'gl', 'fl', 'tb', 'H']

function getResourceTypeLabel(type: string): string {
  switch (type) {
    case 'MATERIAL': return 'Material'
    case 'TOOL': return 'Ferramenta'
    case 'LABOR': return 'Mao de Obra'
    case 'SPECIALTY': return 'Especialidade'
    default: return type
  }
}

function getResourceTypeIcon(type: string): string {
  switch (type) {
    case 'MATERIAL': return 'inventory_2'
    case 'TOOL': return 'construction'
    case 'LABOR': return 'person'
    case 'SPECIALTY': return 'engineering'
    default: return 'category'
  }
}

function isLaborType(type: string): boolean {
  return type === 'LABOR' || type === 'SPECIALTY'
}

export function FinalizeWorkOrderModal({ isOpen, onClose, workOrder, onFinalized, inPage = false }: FinalizeModalProps) {
  const [executionResources, setExecutionResources] = useState<ExecutionResource[]>([])
  const [executionNotes, setExecutionNotes] = useState('')
  const [generateCorrective, setGenerateCorrective] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Horímetro
  const [actualMeterReading, setActualMeterReading] = useState<string>('')
  const isHorimeterBased = workOrder?.dueMeterReading != null

  // RAF pendente
  const [rafPending, setRafPending] = useState<{ rafNumber: string; pendingCount: number } | null>(null)

  // Calendário
  const [calendarWarnings, setCalendarWarnings] = useState<CalendarWarning[]>([])
  const [calendarDetails, setCalendarDetails] = useState<CalendarDetail[]>([])
  const [_checkingCalendar, setCheckingCalendar] = useState(false)

  // Recursos previstos do plano
  const [plannedResources, setPlannedResources] = useState<PlannedResource[]>([])
  const [loadingPlan, setLoadingPlan] = useState(false)

  // Etapas de execução
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [loadingSteps, setLoadingSteps] = useState(false)

  // Recursos cadastrados (fonte: /api/basic-registrations/resources)
  const [availableResources, setAvailableResources] = useState<AvailableResource[]>([])

  // Fontes de Mão de Obra: pessoas (LABOR) e cargos (SPECIALTY)
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; jobTitle?: string | null }[]>([])
  const [availableJobTitles, setAvailableJobTitles] = useState<{ id: string; name: string }[]>([])

  // Verificar se há RAF com PA pendente para OS corretiva imediata
  useEffect(() => {
    if (!isOpen || !workOrder) return
    setRafPending(null)
    if (workOrder.osType === 'CORRECTIVE_IMMEDIATE' && workOrder.raf) {
      // Buscar detalhes da RAF
      fetch(`/api/rafs/${workOrder.raf.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.data?.actionPlan) {
            const pending = (data.data.actionPlan as { status: string }[]).filter((a) => a.status !== 'COMPLETED')
            if (pending.length > 0) {
              setRafPending({ rafNumber: data.data.rafNumber, pendingCount: pending.length })
            }
          }
        })
        .catch(() => {})
    }
  }, [isOpen, workOrder])

  useEffect(() => {
    if (!isOpen || !workOrder) return
    if (workOrder.assetMaintenancePlanId) {
      loadPlanTasksAndResources(workOrder.assetMaintenancePlanId)
    }
  }, [isOpen, workOrder])

  // Carrega recursos cadastrados (Material/Ferramenta) + pessoas (LABOR) + cargos (SPECIALTY)
  useEffect(() => {
    if (!isOpen) return

    // Material & Ferramenta
    type ResourceApiItem = { id: string; name: string; type: string; unit?: string | null }
    fetch('/api/basic-registrations/resources')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(({ data }: { data?: ResourceApiItem[] }) => {
        const list: AvailableResource[] = (data || []).map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type as ResourceCategory,
          unit: r.unit ?? null,
        }))
        setAvailableResources(list)
      })
      .catch(() => setAvailableResources([]))

    // Pessoas (fonte para LABOR)
    type UserApiItem = { id: string; firstName: string; lastName: string; jobTitle?: string | null }
    fetch('/api/users?enabled=true&brief=resource')
      .then(r => r.ok ? r.json() : { data: [] })
      .then((json: UserApiItem[] | { data?: UserApiItem[] }) => {
        const arr: UserApiItem[] = Array.isArray(json) ? json : (json.data || [])
        const list = arr.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          jobTitle: u.jobTitle ?? null,
        }))
        setAvailableUsers(list)
      })
      .catch(() => setAvailableUsers([]))

    // Cargos (fonte para SPECIALTY)
    type JobTitleApiItem = { id: string; name: string }
    fetch('/api/basic-registrations/job-titles')
      .then(r => r.ok ? r.json() : { data: [] })
      .then((json: JobTitleApiItem[] | { data?: JobTitleApiItem[] }) => {
        const arr: JobTitleApiItem[] = Array.isArray(json) ? json : (json.data || [])
        const list = arr.map((jt) => ({
          id: jt.id,
          name: jt.name,
        }))
        setAvailableJobTitles(list)
      })
      .catch(() => setAvailableJobTitles([]))
  }, [isOpen])

  const loadPlanTasksAndResources = async (planId: string) => {
    setLoadingPlan(true)
    setLoadingSteps(true)
    try {
      const res = await fetch(`/api/maintenance-plans/asset/${planId}/tasks`)
      if (res.ok) {
        const { data: tasks } = await res.json()
        const allPlannedResources: PlannedResource[] = []
        const allSteps: ExecutionStep[] = []

        for (const task of (tasks as PlanTask[] || [])) {
          // Coletar recursos
          for (const r of (task.resources || [])) {
            const name = r.resource?.name
              || r.jobTitle?.name
              || (r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Recurso')
            allPlannedResources.push({
              id: r.id,
              resourceType: r.resourceType as ResourceCategory,
              resourceId: r.resourceId,
              jobTitleId: r.jobTitleId,
              userId: r.userId,
              resourceName: name,
              quantity: r.quantity || r.resourceCount || 1,
              hours: r.hours || 0,
              unit: r.unit || (isLaborType(r.resourceType) ? 'H' : 'un'),
            })
          }

          // Coletar etapas
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

        setPlannedResources(allPlannedResources)
        setExecutionSteps(allSteps)
      }
    } catch {
      // silently fail
    }
    setLoadingPlan(false)
    setLoadingSteps(false)
  }

  const updateStep = (index: number, field: keyof ExecutionStep, value: ExecutionStep[keyof ExecutionStep]) => {
    setExecutionSteps(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Transferir previstos para realizados
  const transferPlannedToRealized = () => {
    const newResources: ExecutionResource[] = plannedResources.map(pr => {
      if (isLaborType(pr.resourceType)) {
        return {
          type: pr.resourceType as 'LABOR' | 'SPECIALTY',
          resourceId: pr.resourceId || undefined,
          resourceName: pr.resourceName,
          plannedResourceId: pr.id,
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          observation: '',
        } as ExecutionResourceLabor
      } else {
        return {
          type: pr.resourceType as 'MATERIAL' | 'TOOL',
          resourceId: pr.resourceId || undefined,
          resourceName: pr.resourceName,
          plannedResourceId: pr.id,
          quantity: pr.quantity,
          unit: pr.unit || 'un',
          observation: '',
        } as ExecutionResourceMaterial
      }
    })
    setExecutionResources(prev => [...prev, ...newResources])
  }

  // Adicionar recurso realizado
  const addLaborResource = (laborType: 'LABOR' | 'SPECIALTY' = 'LABOR') => {
    setExecutionResources(prev => [...prev, {
      type: laborType,
      resourceName: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      observation: '',
    } as ExecutionResourceLabor])
  }

  const addMaterialResource = () => {
    setExecutionResources(prev => [...prev, {
      type: 'MATERIAL',
      resourceName: '',
      quantity: 1,
      unit: 'un',
      observation: '',
    } as ExecutionResourceMaterial])
  }

  const removeResource = (index: number) => {
    setExecutionResources(prev => prev.filter((_, i) => i !== index))
  }

  const updateResource = (index: number, field: string, value: string | number | undefined) => {
    setExecutionResources(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Selecionar recurso cadastrado: preenche id, nome e (para materiais) unidade
  const selectResource = (index: number, resourceId: string) => {
    const picked = availableResources.find(r => r.id === resourceId)
    setExecutionResources(prev => {
      const updated = [...prev]
      const current = updated[index]
      if (!picked) {
        updated[index] = { ...current, resourceId: undefined, resourceName: '' } as ExecutionResource
        return updated
      }
      if (isLaborType(current.type)) {
        updated[index] = {
          ...current,
          resourceId: picked.id,
          resourceName: picked.name,
        } as ExecutionResourceLabor
      } else {
        const mr = current as ExecutionResourceMaterial
        updated[index] = {
          ...mr,
          resourceId: picked.id,
          resourceName: picked.name,
          unit: picked.unit || mr.unit || 'un',
        } as ExecutionResourceMaterial
      }
      return updated
    })
  }

  // Verificação de calendário
  const checkCalendarAvailability = useCallback(async () => {
    const laborResources = executionResources.filter(
      r => isLaborType(r.type) && (r as ExecutionResourceLabor).startDate && r.plannedResourceId
    )
    if (laborResources.length === 0) {
      setCalendarWarnings([])
      setCalendarDetails([])
      return
    }

    setCheckingCalendar(true)
    try {
      const planRes = plannedResources.filter(pr => pr.resourceId)
      if (planRes.length === 0) { setCheckingCalendar(false); return }

      const resourceIds = planRes.map(pr => pr.resourceId!).join(',')
      const firstDate = (laborResources[0] as ExecutionResourceLabor).startDate
      const res = await fetch(`/api/resources/availability?resourceIds=${resourceIds}&date=${firstDate}`)
      if (!res.ok) { setCheckingCalendar(false); return }

      const { data } = await res.json()
      const warnings: CalendarWarning[] = []
      const details: CalendarDetail[] = []

      for (const r of laborResources) {
        const lr = r as ExecutionResourceLabor
        const planned = plannedResources.find(pr => pr.id === r.plannedResourceId)
        if (!planned?.resourceId) continue

        const resAvail = data?.find((d: { resourceId: string; hasCalendar?: boolean; resourceName?: string; calendarName?: string; dateAvailability?: { isWorkingDay: boolean; availableHours: number } }) => d.resourceId === planned.resourceId)
        if (!resAvail?.hasCalendar) continue

        const resourceLabel = lr.resourceName || resAvail.resourceName || 'Recurso'
        const resourceWarnings: string[] = []

        if (lr.startDate && resAvail.dateAvailability && !resAvail.dateAvailability.isWorkingDay) {
          resourceWarnings.push(`${lr.startDate} nao e dia util no calendario "${resAvail.calendarName}"`)
        }

        if (lr.startDate && resAvail.dateAvailability?.availableHours > 0) {
          details.push({
            resource: resourceLabel,
            calendar: resAvail.calendarName,
            registeredHours: 0,
            effectiveHours: resAvail.dateAvailability.availableHours,
            efficiency: '-',
          })
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
  }, [executionResources, plannedResources])

  useEffect(() => {
    const hasLabor = executionResources.some(
      r => isLaborType(r.type) && (r as ExecutionResourceLabor).startDate
    )
    if (!hasLabor) return
    const timer = setTimeout(checkCalendarAvailability, 500)
    return () => clearTimeout(timer)
  }, [executionResources, checkCalendarAvailability])

  const handleFinalize = async () => {
    // Validação de horímetro obrigatório
    if (isHorimeterBased) {
      const reading = parseFloat(actualMeterReading)
      if (!actualMeterReading || isNaN(reading) || reading <= 0) {
        setError('Informe o horimetro atual para finalizar esta OS.')
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      // Converter executionResources para o formato esperado pela API
      const apiResources = executionResources
        .filter(r => r.resourceName)
        .map(r => {
          if (isLaborType(r.type)) {
            const lr = r as ExecutionResourceLabor
            return {
              memberName: lr.resourceName,
              resourceName: lr.resourceName,
              quantity: 1,
              hours: 0,
              startDate: lr.startDate,
              startTime: lr.startTime,
              endDate: lr.endDate,
              endTime: lr.endTime,
              observation: lr.observation,
              resourceId: lr.resourceId || undefined,
              plannedResourceId: lr.plannedResourceId || undefined,
            }
          } else {
            const mr = r as ExecutionResourceMaterial
            return {
              memberName: mr.resourceName,
              resourceName: mr.resourceName,
              quantity: mr.quantity,
              hours: 0,
              unit: mr.unit,
              startDate: '',
              startTime: '',
              endDate: '',
              endTime: '',
              observation: mr.observation,
              resourceId: mr.resourceId || undefined,
              plannedResourceId: mr.plannedResourceId || undefined,
            }
          }
        })

      const body: Record<string, unknown> = {
        executionResources: apiResources,
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

      // Enviar horímetro real quando a OS é controlada por horímetro
      if (isHorimeterBased && actualMeterReading) {
        body.actualMeterReading = parseFloat(actualMeterReading)
      }

      // Calcular datas reais da primeira e última entrada de mão de obra
      const laborEntries = executionResources.filter(r => isLaborType(r.type)) as ExecutionResourceLabor[]
      const validLabor = laborEntries.filter(r => r.startDate)
      if (validLabor.length > 0) {
        const first = validLabor[0]
        const last = validLabor[validLabor.length - 1]
        if (first.startDate && first.startTime) {
          body.realMaintenanceStart = `${first.startDate}T${first.startTime || '00:00'}:00`
        }
        if (last.endDate && last.endTime) {
          body.realMaintenanceEnd = `${last.endDate}T${last.endTime || '23:59'}:00`
        }
      }

      // Nota: a criação da OS corretiva não é feita pela API finalize.
      // Quando generateCorrective=true, a UI redireciona o usuário para o formulário
      // de "Nova Ordem de Serviço" com a descrição pré-preenchida referenciando esta OS.

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

      onFinalized({
        generateCorrective,
        sourceWorkOrder: {
          id: workOrder.id,
          displayId: getDisplayId(workOrder),
          assetId: workOrder.assetId ?? workOrder.asset?.id ?? null,
          locationId: workOrder.locationId ?? workOrder.asset?.locationId ?? null,
        },
      })
      onClose()
    } catch {
      setError('Erro de conexao')
    }
    setSaving(false)
  }

  if (!workOrder) return null

  const laborRealized = executionResources.filter(r => isLaborType(r.type))
  const materialRealized = executionResources.filter(r => !isLaborType(r.type))
  const _plannedLabor = plannedResources.filter(r => isLaborType(r.resourceType))
  const _plannedMaterial = plannedResources.filter(r => !isLaborType(r.resourceType))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Finalizar OS: ${workOrder.title}`} size="wide" inPage={inPage}>
      <div className="p-4 space-y-4">
        {error && <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">{error}</div>}

        {/* Aviso de RAF com PA pendente */}
        {rafPending && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-[4px] flex items-start gap-3">
            <Icon name="block" className="text-xl text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-danger">Finalização bloqueada</p>
              <p className="text-sm text-foreground mt-1">
                A RAF <span className="font-mono font-bold">{rafPending.rafNumber}</span> possui{' '}
                <span className="font-bold">{rafPending.pendingCount}</span> item(ns) do Plano de Ação ainda não concluído(s).
                Finalize todos os itens do PA antes de encerrar esta OS.
              </p>
            </div>
          </div>
        )}

        {/* Info da OS */}
        <div className="p-3 bg-muted rounded-[4px] text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><span className="text-muted-foreground">OS:</span> <span className="font-medium">{getDisplayId(workOrder)}</span></div>
            <div><span className="text-muted-foreground">Ativo:</span> <span className="font-medium">{workOrder.asset?.name || '-'}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{workOrder.status}</span></div>
            <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{workOrder.type}</span></div>
          </div>
        </div>

        {/* Horímetro — Campo obrigatório para OSs controladas por horímetro */}
        {isHorimeterBased && (
          <div className="p-3 border border-blue-200 bg-blue-50 rounded-[4px] space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="speed" className="text-base text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">Leitura do Horimetro</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Horimetro Previsto (h)</label>
                <div className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-[4px] text-gray-600">
                  {workOrder.dueMeterReading?.toLocaleString('pt-BR')} h
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Horimetro Atual (h) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualMeterReading}
                  onChange={e => setActualMeterReading(e.target.value)}
                  placeholder="Informe o horimetro no momento da manutencao"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
            <p className="text-xs text-blue-600">
              <Icon name="info" className="text-xs mr-1 inline" />
              Ao finalizar, o horimetro do ativo sera atualizado e as proximas OSs deste plano serao recalculadas.
            </p>
          </div>
        )}

        {/* Avisos de Calendário */}
        {calendarWarnings.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-[4px]">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="warning" className="text-base text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Avisos de Calendario</span>
            </div>
            <ul className="space-y-1">
              {calendarWarnings.map((cw, i) => (
                <li key={i} className="text-xs text-amber-700">
                  <span className="font-medium">{cw.resource}:</span> {cw.warnings.join('; ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {calendarDetails.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-[4px]">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="schedule" className="text-base text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Disponibilidade por Calendario</span>
            </div>
            <div className="space-y-1">
              {calendarDetails.map((cd, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-blue-700">
                    <span className="font-medium">{cd.resource}</span>
                    <span className="text-blue-500 ml-1">({cd.calendar})</span>
                  </span>
                  <span className="text-blue-600">{cd.effectiveHours}h disponiveis no dia</span>
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
              Etapas de Execucao ({executionSteps.filter(s => s.completed).length}/{executionSteps.length})
            </h3>
            <div className="space-y-2">
              {executionSteps.map((step, i) => (
                <div key={i} className="p-3 rounded-[4px] space-y-2">
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
                            <><Icon name="list" className="text-xs" /> Opcao</>
                          )}
                        </span>
                      )}
                    </div>
                  </label>

                  {step.optionType === 'RESPONSE' && step.completed && (
                    <div className="pl-6">
                      <input
                        type="text"
                        value={step.responseValue}
                        onChange={e => updateStep(i, 'responseValue', e.target.value)}
                        placeholder="Digite o valor observado (ex: 72°C, 2.3 mm/s...)"
                        className="w-full px-2 py-1.5 text-sm rounded bg-card border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}

                  {step.optionType === 'OPTION' && step.completed && (
                    <div className="pl-6">
                      <select
                        value={step.selectedOption}
                        onChange={e => updateStep(i, 'selectedOption', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded bg-card border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ring"
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

        {/* ============================== */}
        {/* INSUMOS PREVISTOS (read-only) */}
        {/* ============================== */}
        {plannedResources.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Icon name="assignment" className="text-base" />
                Insumos Previstos
              </h3>
              <Button size="sm" onClick={transferPlannedToRealized} className="bg-gray-900 text-white hover:bg-gray-800">
                <Icon name="arrow_downward" className="text-sm mr-1" /> Transferir para Realizados
              </Button>
            </div>

            <div className="rounded-[4px] border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Tipo</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Recurso</th>
                    <th className="text-center px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Qtd</th>
                    <th className="text-center px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {plannedResources.map((pr) => (
                    <tr key={pr.id} className="border-b border-gray-100">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                          <Icon name={getResourceTypeIcon(pr.resourceType)} className="text-sm" />
                          {getResourceTypeLabel(pr.resourceType)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{pr.resourceName}</td>
                      <td className="px-3 py-2 text-center text-sm">{pr.quantity}</td>
                      <td className="px-3 py-2 text-center text-sm">{pr.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loadingPlan && (
          <div className="text-center py-3 text-sm text-muted-foreground">
            Carregando recursos do plano...
          </div>
        )}

        {/* ============================== */}
        {/* INSUMOS REALIZADOS (editável) */}
        {/* ============================== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="checklist" className="text-base" />
              Insumos Realizados
            </h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => addLaborResource('LABOR')}>
                <Icon name="person_add" className="text-sm mr-1" /> Mao de Obra
              </Button>
              <Button size="sm" variant="outline" onClick={() => addLaborResource('SPECIALTY')}>
                <Icon name="engineering" className="text-sm mr-1" /> Especialidade
              </Button>
              <Button size="sm" variant="outline" onClick={addMaterialResource}>
                <Icon name="add" className="text-sm mr-1" /> Material/Ferramenta
              </Button>
            </div>
          </div>

          {executionResources.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-gray-300 rounded-[4px]">
              <Icon name="inventory_2" className="text-3xl text-gray-300 mb-2" />
              <p>Nenhum insumo realizado adicionado.</p>
              <p className="text-xs mt-1">
                {plannedResources.length > 0
                  ? 'Use "Transferir para Realizados" para copiar os previstos ou adicione manualmente.'
                  : 'Adicione mao de obra ou materiais/ferramentas utilizados.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mão de Obra Realizada */}
              {laborRealized.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Icon name="person" className="text-sm" /> Mao de Obra / Especialidade
                  </p>
                  <div className="space-y-2">
                    {laborRealized.map((r, globalIdx) => {
                      const idx = executionResources.indexOf(r)
                      const lr = r as ExecutionResourceLabor
                      return (
                        <div key={idx} className="p-3 border border-gray-200 rounded-[4px] bg-white space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Icon name={getResourceTypeIcon(lr.type)} className="text-sm" />
                              {getResourceTypeLabel(lr.type)} #{globalIdx + 1}
                            </span>
                            <button onClick={() => removeResource(idx)} className="p-1 hover:bg-danger-light rounded">
                              <Icon name="delete" className="text-sm text-danger" />
                            </button>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Recurso</label>
                            {lr.type === 'SPECIALTY' ? (
                              <select
                                value={lr.resourceId || ''}
                                onChange={e => {
                                  const picked = availableJobTitles.find(jt => jt.id === e.target.value)
                                  updateResource(idx, 'resourceId', picked?.id || undefined)
                                  updateResource(idx, 'resourceName', picked?.name || '')
                                }}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="">Selecione...</option>
                                {availableJobTitles.map(jt => (
                                  <option key={jt.id} value={jt.id}>{jt.name}</option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={lr.resourceId || ''}
                                onChange={e => {
                                  const picked = availableUsers.find(u => u.id === e.target.value)
                                  updateResource(idx, 'resourceId', picked?.id || undefined)
                                  updateResource(idx, 'resourceName', picked?.name || '')
                                }}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="">Selecione...</option>
                                {availableUsers.map(u => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}{u.jobTitle ? ` (${u.jobTitle})` : ''}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Data Inicio</label>
                              <input type="date" value={lr.startDate} onChange={e => updateResource(idx, 'startDate', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card" />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Hora Inicio</label>
                              <input type="time" value={lr.startTime} onChange={e => updateResource(idx, 'startTime', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card" />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Data Fim</label>
                              <input type="date" value={lr.endDate} onChange={e => updateResource(idx, 'endDate', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card" />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Hora Fim</label>
                              <input type="time" value={lr.endTime} onChange={e => updateResource(idx, 'endTime', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Observacao</label>
                            <input type="text" value={lr.observation} onChange={e => updateResource(idx, 'observation', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card"
                              placeholder="Observacao..." />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Materiais/Ferramentas Realizados */}
              {materialRealized.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Icon name="inventory_2" className="text-sm" /> Materiais / Ferramentas
                  </p>
                  <div className="space-y-2">
                    {materialRealized.map((r, globalIdx) => {
                      const idx = executionResources.indexOf(r)
                      const mr = r as ExecutionResourceMaterial
                      return (
                        <div key={idx} className="p-3 border border-gray-200 rounded-[4px] bg-white space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Icon name={getResourceTypeIcon(mr.type)} className="text-sm" />
                              {getResourceTypeLabel(mr.type)} #{globalIdx + 1}
                            </span>
                            <button onClick={() => removeResource(idx)} className="p-1 hover:bg-danger-light rounded">
                              <Icon name="delete" className="text-sm text-danger" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Recurso</label>
                              <select
                                value={mr.resourceId || ''}
                                onChange={e => selectResource(idx, e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="">Selecione...</option>
                                {availableResources
                                  .filter(r => r.type === 'MATERIAL' || r.type === 'TOOL')
                                  .map(r => (
                                    <option key={r.id} value={r.id}>
                                      {r.name} ({getResourceTypeLabel(r.type)})
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Quantidade</label>
                              <input
                                type="number"
                                step="0.01"
                                value={mr.quantity}
                                onChange={e => updateResource(idx, 'quantity', Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Unidade</label>
                              <select
                                value={mr.unit}
                                onChange={e => updateResource(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card"
                              >
                                {UNIT_OPTIONS.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Observacao</label>
                            <input type="text" value={mr.observation} onChange={e => updateResource(idx, 'observation', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 bg-card"
                              placeholder="Observacao..." />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Observação geral */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observacao Geral</label>
          <textarea value={executionNotes} onChange={e => setExecutionNotes(e.target.value)}
            rows={3} className="w-full px-3 py-2 text-sm rounded-[4px] border border-gray-300 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Notas sobre a execucao..." />
        </div>

        {/* Emitir OS corretiva */}
        <div className="p-3 border border-gray-200 rounded-[4px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Emitir OS Corretiva?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ao selecionar &quot;Sim&quot;, apos finalizar esta OS voce sera direcionado ao formulario de Nova OS
                com a observacao pre-preenchida referenciando esta ordem.
              </p>
            </div>
            <div className="flex items-center bg-muted rounded-[4px] p-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setGenerateCorrective(false)}
                className={`px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                  !generateCorrective ? 'bg-background text-foreground ambient-shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Nao
              </button>
              <button
                type="button"
                onClick={() => setGenerateCorrective(true)}
                className={`px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                  generateCorrective ? 'bg-background text-foreground ambient-shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sim
              </button>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleFinalize} disabled={saving || !!rafPending} className="flex-1 bg-gray-900 text-white hover:bg-gray-800">
            <Icon name="check_circle" className="text-base mr-2" />
            {saving ? 'Finalizando...' : 'Finalizar OS'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
