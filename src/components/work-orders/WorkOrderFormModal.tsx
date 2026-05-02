'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ResourceSelector, type TaskResourceItem } from '@/components/ui/ResourceSelector'
import { useAuth } from '@/hooks/useAuth'
import { toUpperNoAccent } from '@/lib/textNormalizer'
import { normalizeUserRole } from '@/lib/user-roles'
import { parseTaskSteps } from '@/lib/workOrders/taskSteps'
import { diffHours, formatHours } from '@/lib/units/time'

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

interface AssetItem {
  id: string
  name: string
  protheusCode?: string | null
  tag?: string | null
  locationId?: string | null
  parentAssetId?: string | null
  parentAsset?: { id: string; protheusCode?: string; name: string } | null
}

interface GenericStepItem { id: string; name: string; optionType?: string }
interface TaskStep { stepId: string; order: number; optionType: string }
interface TaskRow {
  key: string
  description: string
  executionTime: number | ''
  plannedStart: string // datetime-local string ('YYYY-MM-DDTHH:mm') or ''
  plannedEnd: string
  steps: TaskStep[]
}

export interface WorkOrderFormInitialTask {
  description: string
  executionTime?: number | null
  plannedStart?: string | null
  plannedEnd?: string | null
  steps: { stepId: string; order: number; optionType: string }[]
}

export interface WorkOrderFormInitialValues {
  description?: string
  type?: string
  osType?: string
  priority?: string
  assetId?: string
  locationId?: string
  dueDate?: string
  maintenanceAreaId?: string
  serviceTypeId?: string
  tasks?: WorkOrderFormInitialTask[]
  resources?: TaskResourceItem[]
  assignedTeamIds?: string[]
  assignedToId?: string
}

interface WorkOrderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  inPage?: boolean
  initialValues?: WorkOrderFormInitialValues
  sourceRequestId?: string | null
  mode?: 'create' | 'edit'
  workOrderId?: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const emptyTask = (): TaskRow => ({
  key: crypto.randomUUID(),
  description: '',
  executionTime: '',
  plannedStart: '',
  plannedEnd: '',
  steps: [],
})

// Converte ISO/Date em string compativel com <input type="datetime-local"> ('YYYY-MM-DDTHH:mm')
// preservando o horario local do usuario (sem deslocamento de fuso).
function toDatetimeLocal(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const labelCls = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'
const inputCls = 'w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = 'w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-background pr-8'

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function WorkOrderFormModal({
  isOpen,
  onClose,
  onSuccess,
  inPage = false,
  initialValues,
  sourceRequestId,
  mode = 'create',
  workOrderId,
}: WorkOrderFormModalProps) {
  const { unitId } = useAuth()
  const isEdit = mode === 'edit'
  const [loading, setLoading] = useState(false)
  const [isFromPlan, setIsFromPlan] = useState(false)
  const [editStatus, setEditStatus] = useState('PENDING')
  const [hydrating, setHydrating] = useState(false)
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [teamMembers, setTeamMembers] = useState<{ user: { id: string; firstName: string; lastName: string; role?: string | null } }[]>([])
  const [woResources, setWoResources] = useState<TaskResourceItem[]>([])
  const [maintenanceAreas, setMaintenanceAreas] = useState<{ id: string; name: string; code?: string }[]>([])
  const [serviceTypes, setServiceTypes] = useState<{ id: string; code: string; name: string; maintenanceAreaId: string; maintenanceType?: { id: string; name: string; characteristic?: string | null } | null }[]>([])
  const [allServiceTypes, setAllServiceTypes] = useState<{ id: string; code: string; name: string; maintenanceAreaId: string; maintenanceType?: { id: string; name: string; characteristic?: string | null } | null }[]>([])
  const [genericSteps, setGenericSteps] = useState<GenericStepItem[]>([])

  // Auto-fill externalId
  const [nextExternalId, setNextExternalId] = useState('')

  // Tasks & steps
  const [tasks, setTasks] = useState<TaskRow[]>([emptyTask()])
  const [stepSearch, setStepSearch] = useState<Record<string, string>>({})
  const [stepDropdownOpen, setStepDropdownOpen] = useState<Record<string, boolean>>({})
  const [stepDropdownPos, setStepDropdownPos] = useState<Record<string, { top: number; left: number; width: number }>>({})
  const stepInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const stepPortalRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Asset autocomplete (padrão RequestFormModal)
  const [assetCodeSearch, setAssetCodeSearch] = useState('')
  const [assetNameSearch, setAssetNameSearch] = useState('')
  const [assetOptions, setAssetOptions] = useState<AssetItem[]>([])
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null)
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [activeSearchField, setActiveSearchField] = useState<'code' | 'name' | null>(null)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const assetDropdownRef = useRef<HTMLDivElement>(null)
  const assetCodeInputRef = useRef<HTMLInputElement>(null)
  const assetNameInputRef = useRef<HTMLInputElement>(null)
  const assetSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Planos de manutenção do bem encontrados
  const [availablePlans, setAvailablePlans] = useState<{ id: string; name: string | null; sequence: number; period: string | null; serviceType?: { code: string; name: string } | null }[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [loadingPlans, setLoadingPlans] = useState(false)

  // Periodo do plano atualmente selecionado (UNICA | REPETITIVA | null).
  // Quando o plano for REPETITIVA os campos de previsao por tarefa sao escondidos
  // (decisao registrada na sessao 2026-05-01: planos repetitivos nao recebem
  // janela planejada por OS, ja que a frequencia define o ciclo).
  const selectedPlanPeriod = (() => {
    if (!selectedPlanId) return null
    const plan = availablePlans.find(p => p.id === selectedPlanId)
    return plan ? String(plan.period || '').toUpperCase() : null
  })()
  const showPlannedWindowFields = selectedPlanPeriod !== 'REPETITIVA'

  const [formData, setFormData] = useState({
    description: '',
    type: 'CORRECTIVE',
    osType: '',
    priority: 'NONE',
    dueDate: '',
    assetId: '',
    locationId: '',
    assignedTeamIds: [] as string[],
    assignedToId: '',
    externalId: '',
    maintenanceAreaId: '',
    serviceTypeId: '',
    toleranceDays: ''
  })

  useEffect(() => {
    if (isOpen) {
      if (!isEdit) resetForm()
      loadData()
      if (isEdit && workOrderId) {
        hydrateFromWorkOrder(workOrderId)
      }
    }
    // loadData/resetForm/hydrate are stable within a single open cycle; intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEdit, workOrderId])

  // Auto-preenche locationId quando unitId carrega (apenas em modo criacao)
  useEffect(() => {
    if (isEdit) return
    if (unitId && !formData.assetId) {
      setFormData(prev => ({ ...prev, locationId: unitId }))
    }
    // Intentionally reacting only to unitId; formData.assetId presence is a snapshot check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, isEdit])

  // Aplica initialValues (ex.: vindos da finalização de OS para abrir uma corretiva,
  // ou do botão "Copiar OS" no painel de detalhe)
  useEffect(() => {
    if (isEdit) return
    if (!isOpen || !initialValues) return
    setFormData(prev => ({
      ...prev,
      description: initialValues.description ?? prev.description,
      type: initialValues.type ?? prev.type,
      osType: initialValues.osType ?? prev.osType,
      priority: initialValues.priority ?? prev.priority,
      assetId: initialValues.assetId ?? prev.assetId,
      locationId: initialValues.locationId ?? prev.locationId,
      dueDate: initialValues.dueDate ?? prev.dueDate,
      maintenanceAreaId: initialValues.maintenanceAreaId ?? prev.maintenanceAreaId,
      serviceTypeId: initialValues.serviceTypeId ?? prev.serviceTypeId,
      assignedTeamIds: initialValues.assignedTeamIds ?? prev.assignedTeamIds,
      assignedToId: initialValues.assignedToId ?? prev.assignedToId,
    }))

    if (initialValues.tasks && initialValues.tasks.length > 0) {
      setTasks(initialValues.tasks.map(t => ({
        key: crypto.randomUUID(),
        description: t.description,
        executionTime: t.executionTime ?? '',
        plannedStart: toDatetimeLocal(t.plannedStart ?? null),
        plannedEnd: toDatetimeLocal(t.plannedEnd ?? null),
        steps: t.steps,
      })))
    }

    if (initialValues.resources && initialValues.resources.length > 0) {
      setWoResources(initialValues.resources)
    }

    if (initialValues.assignedTeamIds && initialValues.assignedTeamIds[0]) {
      loadTeamMembers(initialValues.assignedTeamIds[0])
    }
  }, [isOpen, initialValues, isEdit])

  // Quando o assetId vier de initialValues, busca o ativo na API para preencher autocomplete
  useEffect(() => {
    if (isEdit) return
    if (!isOpen || !initialValues?.assetId) return
    const fetchAsset = async () => {
      try {
        const res = await fetch(`/api/assets?summary=true&all=true`)
        const data = await res.json()
        const allAssets: AssetItem[] = data.data || []
        const a = allAssets.find(x => x.id === initialValues.assetId)
        if (a) {
          setSelectedAsset(a)
          setAssetCodeSearch(a.protheusCode || a.tag || '')
          setAssetNameSearch(a.name)
        }
      } catch (error) {
        console.error('Error fetching asset for initialValues:', error)
      }
    }
    fetchAsset()
  }, [isOpen, initialValues?.assetId, isEdit])

  const resetForm = () => {
    setFormData({
      description: '',
      type: 'CORRECTIVE',
      osType: '',
      priority: 'NONE',
      dueDate: '',
      assetId: '',
      locationId: unitId || '',
      assignedTeamIds: [],
      assignedToId: '',
      externalId: '',
      maintenanceAreaId: '',
      serviceTypeId: '',
      toleranceDays: ''
    })
    setTeamMembers([])
    setWoResources([])
    setTasks([emptyTask()])
    setStepSearch({})
    setStepDropdownOpen({})
    setStepDropdownPos({})
    setAssetCodeSearch('')
    setAssetNameSearch('')
    setSelectedAsset(null)
    setAssetOptions([])
    setShowAssetDropdown(false)
    setNextExternalId('')
    setAvailablePlans([])
    setSelectedPlanId('')
  }

  const loadData = async () => {
    try {
      const baseFetches = [
        fetch('/api/locations'),
        fetch('/api/teams'),
        fetch('/api/basic-registrations/maintenance-areas'),
        fetch('/api/basic-registrations/service-types'),
        fetch('/api/basic-registrations/generic-steps'),
      ]
      const allFetches = isEdit
        ? baseFetches
        : [...baseFetches, fetch('/api/work-orders/next-id')]

      const responses = await Promise.all(allFetches)
      const [locationsRes, teamsRes, areasRes, stRes, stepsRes, nextIdRes] = responses
      const datas = await Promise.all(responses.map(r => r.json()))
      const [locationsData, teamsData, areasData, stData, stepsData, nextIdData] = datas
      void locationsRes; void teamsRes; void areasRes; void stRes; void stepsRes; void nextIdRes

      setLocations(locationsData.data || [])
      setTeams(teamsData.data || [])
      setMaintenanceAreas(areasData.data || [])
      setAllServiceTypes(stData.data || [])
      setGenericSteps(stepsData.data || [])
      if (!isEdit && nextIdData?.data) {
        setNextExternalId(nextIdData.data)
        setFormData(prev => ({ ...prev, externalId: nextIdData.data }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const loadTeamMembers = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`)
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data.data || [])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  /* ---- Hidratacao em modo edicao ---- */

  const hydrateFromWorkOrder = async (woId: string) => {
    setHydrating(true)
    try {
      const [woRes, resRes] = await Promise.all([
        fetch(`/api/work-orders/${woId}`),
        fetch(`/api/work-orders/${woId}/resources`),
      ])
      if (!woRes.ok) {
        console.error('Erro ao carregar OS para edicao')
        return
      }
      const woJson = await woRes.json()
      const wo = woJson.data
      if (!wo) return

      const fromPlan = !!(wo.assetMaintenancePlan || wo.assetMaintenancePlanId || wo.maintenancePlanExec)
      setIsFromPlan(fromPlan)
      setEditStatus(wo.status || 'PENDING')

      // Hidratar formData
      setFormData(prev => ({
        ...prev,
        description: wo.description || '',
        type: wo.type || 'CORRECTIVE',
        osType: wo.osType || '',
        priority: wo.priority || 'NONE',
        dueDate: wo.dueDate ? String(wo.dueDate).split('T')[0] : '',
        assetId: wo.assetId || '',
        locationId: wo.locationId || prev.locationId,
        assignedTeamIds: Array.isArray(wo.assignedTeams) ? wo.assignedTeams.map((t: { id: string }) => t.id) : [],
        assignedToId: wo.assignedToId || '',
        externalId: wo.externalId || wo.internalId || '',
        maintenanceAreaId: wo.maintenanceAreaId || '',
        serviceTypeId: wo.serviceTypeId || '',
        // tolerancia nao e persistida; em edicao comeca em 0 (sem ajuste extra)
        toleranceDays: '',
      }))

      // Mostrar internalId/externalId no campo readonly de identificacao
      setNextExternalId(wo.internalId || wo.externalId || '')

      // Asset selecionado (autocomplete)
      if (wo.asset) {
        setSelectedAsset({
          id: wo.asset.id,
          name: wo.asset.name,
          protheusCode: wo.asset.protheusCode || null,
          tag: wo.asset.tag || null,
          locationId: wo.asset.locationId || null,
          parentAssetId: wo.asset.parentAssetId || null,
          parentAsset: wo.asset.parentAsset || null,
        })
        setAssetCodeSearch(wo.asset.protheusCode || wo.asset.tag || '')
        setAssetNameSearch(wo.asset.name || '')
      }

      // Equipe (usa primeira atribuida) -> carrega membros
      if (Array.isArray(wo.assignedTeams) && wo.assignedTeams.length > 0) {
        loadTeamMembers(wo.assignedTeams[0].id)
      }

      // Tarefas + etapas (usa o helper canonico para tolerar legado UPPERCASE)
      type WoTaskApi = {
        id?: string
        label?: string
        description?: string
        order?: number
        executionTime?: number | null
        plannedStart?: string | null
        plannedEnd?: string | null
        steps?: unknown
      }
      const woTasks = (wo.tasks as WoTaskApi[] | undefined) || []
      const sortedWoTasks = [...woTasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const hydratedTasks: TaskRow[] = sortedWoTasks.map(t => ({
        key: crypto.randomUUID(),
        description: t.label || t.description || '',
        executionTime: t.executionTime ?? '',
        plannedStart: toDatetimeLocal(t.plannedStart ?? null),
        plannedEnd: toDatetimeLocal(t.plannedEnd ?? null),
        steps: parseTaskSteps(t.steps).map((s, idx) => ({
          stepId: s.stepId || '',
          order: idx,
          optionType: s.optionType || 'NONE',
        })),
      }))
      setTasks(hydratedTasks.length > 0 ? hydratedTasks : [emptyTask()])

      // Recursos
      if (resRes.ok) {
        const resJson = await resRes.json()
        type WoResApi = {
          resourceType: string
          resource?: { id: string } | null
          jobTitle?: { id: string } | null
          user?: { id: string } | null
          quantity?: number | null
          hours?: number | null
          unit?: string | null
        }
        const list: WoResApi[] = resJson.data || []
        const mapped: TaskResourceItem[] = list.map(r => ({
          resourceType: r.resourceType as TaskResourceItem['resourceType'],
          resourceId: r.resource?.id || null,
          jobTitleId: r.jobTitle?.id || null,
          userId: r.user?.id || null,
          quantity: r.quantity ?? null,
          hours: r.hours ?? null,
          unit: r.unit || null,
        }))
        setWoResources(mapped)
      }
    } catch (error) {
      console.error('Erro ao hidratar OS para edicao:', error)
    } finally {
      setHydrating(false)
    }
  }

  /* ---- Asset autocomplete (padrão RequestFormModal) ---- */

  const updateDropdownPosition = useCallback((field: 'code' | 'name') => {
    const inputRef = field === 'code' ? assetCodeInputRef : assetNameInputRef
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
  }, [])

  const searchAssets = useCallback(async (term: string, field: 'code' | 'name') => {
    if (term.length < 2) {
      setAssetOptions([])
      setShowAssetDropdown(false)
      return
    }
    setLoadingAssets(true)
    try {
      const res = await fetch(`/api/assets?summary=true&limit=15&search=${encodeURIComponent(term)}`)
      const data = await res.json()
      const results: AssetItem[] = data.data || []
      setAssetOptions(results.slice(0, 10))
      if (results.length > 0) {
        setActiveSearchField(field)
        updateDropdownPosition(field)
        setShowAssetDropdown(true)
      } else {
        setShowAssetDropdown(false)
      }
    } catch (error) {
      console.error('Error searching assets:', error)
    } finally {
      setLoadingAssets(false)
    }
  }, [updateDropdownPosition])

  const handleAssetSearchChange = (value: string, field: 'code' | 'name') => {
    if (field === 'code') {
      setAssetCodeSearch(value)
    } else {
      setAssetNameSearch(value)
    }
    if (selectedAsset) {
      setSelectedAsset(null)
      setFormData(prev => ({ ...prev, assetId: '', locationId: unitId || '' }))
      if (field === 'code') setAssetNameSearch('')
      else setAssetCodeSearch('')
    }
    if (assetSearchTimerRef.current) clearTimeout(assetSearchTimerRef.current)
    assetSearchTimerRef.current = setTimeout(() => searchAssets(value, field), 300)
  }

  const handleAssetSelect = (asset: AssetItem) => {
    setSelectedAsset(asset)
    setAssetCodeSearch(asset.protheusCode || asset.tag || '')
    setAssetNameSearch(asset.name)
    setFormData(prev => ({
      ...prev,
      assetId: asset.id,
      locationId: asset.locationId || prev.locationId,
    }))
    setShowAssetDropdown(false)
  }

  const clearAsset = () => {
    setSelectedAsset(null)
    setAssetCodeSearch('')
    setAssetNameSearch('')
    setFormData(prev => ({ ...prev, assetId: '', locationId: unitId || '' }))
    setAssetOptions([])
  }

  /* ---- Tasks & steps ---- */

  const updateStepDropdownPosition = useCallback((taskKey: string) => {
    const input = stepInputRefs.current[taskKey]
    if (input) {
      const rect = input.getBoundingClientRect()
      setStepDropdownPos(prev => ({
        ...prev,
        [taskKey]: { top: rect.bottom + 4, left: rect.left, width: rect.width },
      }))
    }
  }, [])

  const addTask = () => setTasks(prev => [...prev, emptyTask()])

  const removeTask = (key: string) => setTasks(prev => prev.filter(t => t.key !== key))

  const updateTask = (key: string, patch: Partial<TaskRow>) => {
    setTasks(prev => prev.map(t => t.key === key ? { ...t, ...patch } : t))
  }

  const addStepToTask = (taskKey: string, stepId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      if (t.steps.some(s => s.stepId === stepId)) return t
      const step = genericSteps.find(gs => gs.id === stepId)
      return {
        ...t,
        steps: [...t.steps, { stepId, order: t.steps.length, optionType: step?.optionType || 'NONE' }]
      }
    }))
  }

  const removeStepFromTask = (taskKey: string, stepId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      return { ...t, steps: t.steps.filter(s => s.stepId !== stepId) }
    }))
  }

  const updateStepOptionType = (taskKey: string, stepId: string, optionType: string) => {
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      return {
        ...t,
        steps: t.steps.map(s => s.stepId === stepId ? { ...s, optionType } : s)
      }
    }))
  }

  const moveStepInTask = (taskKey: string, index: number, direction: 'up' | 'down') => {
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      const arr = [...t.steps]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= arr.length) return t
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return { ...t, steps: arr }
    }))
  }

  /* ---- Service types filter ---- */

  useEffect(() => {
    let filtered = allServiceTypes

    // Filtrar por área de manutenção
    if (formData.maintenanceAreaId) {
      filtered = filtered.filter(st => st.maintenanceAreaId === formData.maintenanceAreaId)
    }

    // Filtrar por característica (Preventiva/Corretiva) conforme o tipo de OS
    // Comparação case/acento-insensitiva: o servidor persiste em UPPER sem acento
    // (normalizeTextPayload), então o valor real no banco é 'CORRETIVA'/'PREVENTIVA'.
    const isCorrective = (st: { maintenanceType?: { characteristic?: string | null } | null }) =>
      toUpperNoAccent(st.maintenanceType?.characteristic ?? null) === 'CORRETIVA'

    if (formData.type === 'PREVENTIVE' || formData.type === 'PREDICTIVE') {
      filtered = filtered.filter(st => !isCorrective(st))
    } else if (formData.type === 'CORRECTIVE') {
      filtered = filtered.filter(st => isCorrective(st))
    }

    // Em edicao, manter o tipo de servico atual na lista mesmo se a regra de
    // caracteristica nao casar (legado pode ter combinacoes inconsistentes)
    if (isEdit && formData.serviceTypeId) {
      const current = allServiceTypes.find(st => st.id === formData.serviceTypeId)
      if (current && !filtered.some(st => st.id === current.id)) {
        filtered = [current, ...filtered]
      }
    }

    setServiceTypes(filtered)

    // Limpar serviceTypeId se o selecionado não está mais na lista filtrada (apenas criacao).
    // Aguardar allServiceTypes carregar antes de avaliar — evita zerar o id pre-preenchido
    // por initialValues (fluxo "Copiar OS") durante o load inicial.
    if (
      !isEdit &&
      allServiceTypes.length > 0 &&
      formData.serviceTypeId &&
      !filtered.some(st => st.id === formData.serviceTypeId)
    ) {
      setFormData(prev => ({ ...prev, serviceTypeId: '' }))
    }
    // formData.serviceTypeId is a snapshot-check dependency, intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.maintenanceAreaId, formData.type, allServiceTypes, isEdit])

  /* ---- Search matching AssetMaintenancePlans when classification is filled ---- */

  useEffect(() => {
    // Em edicao, o pre-preenchimento por plano nao deve disparar (a OS ja existe)
    if (isEdit) return

    // Limpar planos quando campos de classificação mudam
    setAvailablePlans([])
    setSelectedPlanId('')

    // Só busca planos para OS preventiva/preditiva com ativo e tipo de serviço selecionados
    if (
      (formData.type !== 'PREVENTIVE' && formData.type !== 'PREDICTIVE') ||
      !formData.assetId ||
      !formData.serviceTypeId
    ) return

    const fetchPlans = async () => {
      setLoadingPlans(true)
      try {
        const res = await fetch(`/api/maintenance-plans/asset?assetId=${formData.assetId}`)
        const data = await res.json()
        type PlanApiItem = {
          id: string
          name: string
          sequence?: number | null
          period?: string | null
          serviceTypeId?: string | null
          serviceType?: { id: string; name: string; code: string } | null
          isActive?: boolean
        }
        const plans: PlanApiItem[] = (data.data || []).filter(
          (p: PlanApiItem) => p.serviceTypeId === formData.serviceTypeId && p.isActive !== false
        )
        setAvailablePlans(plans.map((p) => ({
          id: p.id,
          name: p.name,
          sequence: p.sequence ?? 0,
          period: p.period ?? null,
          serviceType: p.serviceType ? { code: p.serviceType.code, name: p.serviceType.name } : null,
        })))
      } catch (error) {
        console.error('Error fetching asset maintenance plans:', error)
      } finally {
        setLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [formData.type, formData.assetId, formData.serviceTypeId, isEdit])

  /* ---- Pre-fill from selected plan ---- */

  const applyPlanData = useCallback(async (planId: string) => {
    if (!planId) return
    try {
      const tasksRes = await fetch(`/api/maintenance-plans/asset/${planId}/tasks`)
      const tasksData = await tasksRes.json()
      const planTasks = tasksData.data || []

      if (planTasks.length === 0) return

      // Pré-preencher tarefas e etapas
      type PlanTaskStepApi = {
        stepId: string
        order?: number | null
        step?: { optionType?: string | null } | null
      }
      type PlanTaskResourceApi = {
        resourceType?: string | null
        resourceId?: string | null
        jobTitleId?: string | null
        userId?: string | null
        quantity?: number | null
        resourceCount?: number | null
        hours?: number | null
        unit?: string | null
      }
      type PlanTaskApi = {
        description?: string | null
        executionTime?: number | null
        steps?: PlanTaskStepApi[]
        resources?: PlanTaskResourceApi[]
      }
      const prefilled: TaskRow[] = (planTasks as PlanTaskApi[]).map((pt) => ({
        key: crypto.randomUUID(),
        description: pt.description || '',
        executionTime: pt.executionTime ?? '',
        // Plano nao armazena janela planejada — comeca vazio para o usuario preencher na OS.
        plannedStart: '',
        plannedEnd: '',
        steps: (pt.steps || [])
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((s) => ({
            stepId: s.stepId,
            order: s.order ?? 0,
            optionType: s.step?.optionType || 'NONE',
          })),
      }))

      setTasks(prefilled.length > 0 ? prefilled : [emptyTask()])

      // Pré-preencher recursos agregados de todas as tarefas
      const allResources: TaskResourceItem[] = []
      for (const pt of planTasks as PlanTaskApi[]) {
        for (const r of (pt.resources || [])) {
          allResources.push({
            resourceType: (r.resourceType || 'MATERIAL') as TaskResourceItem['resourceType'],
            resourceId: r.resourceId || null,
            jobTitleId: r.jobTitleId || null,
            userId: r.userId || null,
            quantity: r.quantity ?? r.resourceCount ?? null,
            hours: r.hours ?? null,
            unit: r.unit || null,
          })
        }
      }

      setWoResources(allResources.length > 0 ? allResources : [])
    } catch (error) {
      console.error('Error fetching plan tasks:', error)
    }
  }, [])

  const handlePlanSelect = useCallback((planId: string) => {
    setSelectedPlanId(planId)
    if (planId) {
      applyPlanData(planId)
    } else {
      // Limpar pré-preenchimento se desmarcou o plano
      setTasks([emptyTask()])
      setWoResources([])
    }
  }, [applyPlanData])

  /* ---- Click outside to close dropdowns ---- */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      // Asset dropdown
      if (assetDropdownRef.current?.contains(target)) return
      if (assetCodeInputRef.current?.contains(target)) return
      if (assetNameInputRef.current?.contains(target)) return
      setShowAssetDropdown(false)
      setActiveSearchField(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close step dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      for (const key of Object.keys(stepDropdownOpen)) {
        if (!stepDropdownOpen[key]) continue
        const inputRef = stepInputRefs.current[key]
        const portalRef = stepPortalRefs.current[key]
        if (inputRef?.contains(target)) continue
        if (portalRef?.contains(target)) continue
        setStepDropdownOpen(prev => ({ ...prev, [key]: false }))
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [stepDropdownOpen])

  // Reposicionar dropdown de etapas em scroll/resize enquanto estiver aberto
  useEffect(() => {
    const openKeys = Object.keys(stepDropdownOpen).filter(k => stepDropdownOpen[k])
    if (openKeys.length === 0) return
    const updateAll = () => {
      openKeys.forEach(key => updateStepDropdownPosition(key))
    }
    window.addEventListener('scroll', updateAll, true)
    window.addEventListener('resize', updateAll)
    return () => {
      window.removeEventListener('scroll', updateAll, true)
      window.removeEventListener('resize', updateAll)
    }
  }, [stepDropdownOpen, updateStepDropdownPosition])

  /* ---- Submit ---- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Require at least one task with description
    const validTasks = tasks.filter(t => t.description.trim())
    if (validTasks.length === 0) {
      alert('Adicione pelo menos uma tarefa')
      return
    }

    // Validar janela planejada por tarefa (espelha a regra do servidor)
    if (showPlannedWindowFields) {
      for (let i = 0; i < validTasks.length; i++) {
        const t = validTasks[i]
        const hasStart = !!t.plannedStart
        const hasEnd = !!t.plannedEnd
        if (hasStart !== hasEnd) {
          alert(`Tarefa ${i + 1}: preencha ambos os campos de previsao (inicio e fim) ou nenhum.`)
          return
        }
        if (hasStart && hasEnd && new Date(t.plannedEnd) < new Date(t.plannedStart)) {
          alert(`Tarefa ${i + 1}: fim previsto deve ser posterior ao inicio previsto.`)
          return
        }
      }
    }

    setLoading(true)

    try {
      const title = validTasks[0].description
      // Quando os campos de previsao estao escondidos (plano Repetitiva), nao
      // enviamos plannedStart/plannedEnd para evitar persistir valores stale
      // que poderiam ter ficado em estado anterior.
      const includePlannedWindow = showPlannedWindowFields
      const tasksPayload = validTasks.map((t, idx) => ({
        label: t.description,
        executionTime: t.executionTime === '' ? null : t.executionTime,
        plannedStart: includePlannedWindow && t.plannedStart ? new Date(t.plannedStart).toISOString() : null,
        plannedEnd: includePlannedWindow && t.plannedEnd ? new Date(t.plannedEnd).toISOString() : null,
        order: idx,
        steps: t.steps.length > 0
          ? t.steps.map(s => {
              const gs = genericSteps.find(g => g.id === s.stepId)
              return {
                stepId: s.stepId,
                stepName: gs?.name || '',
                optionType: s.optionType || 'NONE',
                options: [],
              }
            })
          : null,
      }))
      const resourcesPayload = woResources.map(r => ({
        resourceType: r.resourceType,
        resourceId: r.resourceId || null,
        jobTitleId: r.jobTitleId || null,
        userId: r.userId || null,
        quantity: r.quantity ?? null,
        hours: r.hours ?? null,
        unit: r.unit || null,
      }))

      let res: Response
      if (isEdit && workOrderId) {
        res = await fetch(`/api/work-orders/${workOrderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            title,
            status: editStatus,
            tasks: tasksPayload,
            resources: resourcesPayload,
          })
        })
      } else {
        res = await fetch('/api/work-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            title,
            sourceRequestId: sourceRequestId || undefined,
            resources: resourcesPayload,
            tasks: tasksPayload,
          })
        })
      }

      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        alert(isEdit ? 'Erro ao atualizar ordem de servico' : 'Erro ao criar ordem de servico')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  /* ---- Render ---- */

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar Ordem de Servico' : 'Nova Ordem de Servico'} size="wide" inPage={inPage}>
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">

          {isEdit && isFromPlan && (
            <div className="bg-warning-light/40 border border-warning/30 rounded-[4px] p-3 flex items-start gap-2 text-[12px] text-foreground">
              <Icon name="info" className="text-base text-warning mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wide text-[11px]">OS originada de um Plano de Manutencao</p>
                <p className="mt-0.5 text-muted-foreground">
                  Tipo, Sub-tipo, Ativo, Area, Tipo de Servico, Prioridade, Vencimento e Tolerancia ficam bloqueados.
                  Voce pode editar Tarefas, Etapas, Recursos, Atribuicao e Status.
                </p>
              </div>
            </div>
          )}

          {isEdit && (editStatus === 'COMPLETE' || editStatus === 'IN_PROGRESS') && (
            <div className="bg-warning-light/40 border border-warning/30 rounded-[4px] p-3 flex items-start gap-2 text-[12px] text-foreground">
              <Icon name="warning" className="text-base text-warning mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wide text-[11px]">
                  Esta OS ja esta {editStatus === 'COMPLETE' ? 'finalizada' : 'em progresso'}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Alteracoes nas Tarefas/Etapas atualizam o planejado, mas nao retroagem no execucao registrado.
                </p>
              </div>
            </div>
          )}

          {/* ============ 1. IDENTIFICAÇÃO ============ */}
          <ModalSection title="Identificacao">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>
                  Numero da OS (6 digitos)
                </label>
                <input
                  value={nextExternalId || formData.externalId}
                  readOnly
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Gerado automaticamente
                </p>
              </div>
            </div>
          </ModalSection>

          {/* ============ 2. ATIVO E LOCALIZAÇÃO ============ */}
          <ModalSection title="Ativo e Localizacao">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* Código do Bem - autocomplete via API */}
              <div>
                <label className={labelCls}>Codigo do Bem</label>
                <div className="relative">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                  <input
                    ref={assetCodeInputRef}
                    type="text"
                    value={assetCodeSearch}
                    onChange={(e) => handleAssetSearchChange(e.target.value, 'code')}
                    onFocus={() => {
                      if (assetOptions.length > 0 && !selectedAsset) {
                        setActiveSearchField('code')
                        updateDropdownPosition('code')
                        setShowAssetDropdown(true)
                      }
                    }}
                    placeholder="Digite o codigo..."
                    className={`w-full pl-10 pr-10 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring ${
                      selectedAsset ? 'border-green-300 bg-green-50' : 'border-input'
                    }`}
                    readOnly={!!selectedAsset || isFromPlan}
                  />
                  {selectedAsset && !isFromPlan && (
                    <button type="button" onClick={clearAsset}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <Icon name="close" className="text-base" />
                    </button>
                  )}
                  {loadingAssets && activeSearchField === 'code' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-surface-variant" />
                    </div>
                  )}
                </div>
              </div>

              {/* Nome do Bem - autocomplete via API */}
              <div>
                <label className={labelCls}>Nome do Bem</label>
                <div className="relative">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                  <input
                    ref={assetNameInputRef}
                    type="text"
                    value={assetNameSearch}
                    onChange={(e) => handleAssetSearchChange(e.target.value, 'name')}
                    onFocus={() => {
                      if (assetOptions.length > 0 && !selectedAsset) {
                        setActiveSearchField('name')
                        updateDropdownPosition('name')
                        setShowAssetDropdown(true)
                      }
                    }}
                    placeholder="Digite o nome do bem..."
                    className={`w-full pl-10 pr-10 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring ${
                      selectedAsset ? 'border-green-300 bg-green-50' : 'border-input'
                    }`}
                    readOnly={!!selectedAsset || isFromPlan}
                  />
                  {loadingAssets && activeSearchField === 'name' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-surface-variant" />
                    </div>
                  )}
                </div>
              </div>

              {/* Localização (automática pela unidade ativa) */}
              <div>
                <label className={labelCls}>Localizacao</label>
                <input
                  type="text"
                  readOnly
                  value={locations.find(l => l.id === formData.locationId)?.name || ''}
                  placeholder="Automatica pela unidade ativa"
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Definida automaticamente pela unidade ativa
                </p>
              </div>
            </div>

            {/* Dropdown de resultados via portal */}
            {showAssetDropdown && !selectedAsset && dropdownPos && typeof document !== 'undefined' && createPortal(
              <div
                ref={assetDropdownRef}
                className="fixed bg-white border border-gray-200 rounded-[4px] shadow-lg max-h-60 overflow-auto"
                style={{
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                  zIndex: 9999,
                }}
              >
                {assetOptions.map(asset => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleAssetSelect(asset)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="precision_manufacturing" className="text-base text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                        <div className="text-xs text-gray-500">
                          {asset.protheusCode && <span>Codigo: {asset.protheusCode}</span>}
                          {asset.protheusCode && asset.tag && <span> | </span>}
                          {asset.tag && <span>TAG: {asset.tag}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>,
              document.body
            )}

            {/* Dados do bem selecionado */}
            {selectedAsset && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-[4px] p-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Codigo</span>
                    <span className="text-[13px] font-medium text-gray-900">{selectedAsset.protheusCode || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Nome do Bem</span>
                    <span className="text-[13px] font-medium text-gray-900">{selectedAsset.name}</span>
                  </div>
                  {selectedAsset.tag && (
                    <div>
                      <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">TAG</span>
                      <span className="text-[13px] font-medium text-gray-900">{selectedAsset.tag}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ModalSection>

          {/* ============ 3. CLASSIFICAÇÃO ============ */}
          <ModalSection title="Classificacao">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Tipo de OS</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, osType: '' })}
                  className={selectCls}
                  disabled={isFromPlan}
                >
                  <option value="CORRECTIVE">Corretiva</option>
                  <option value="PREVENTIVE">Preventiva</option>
                  <option value="PREDICTIVE">Preditiva</option>
                  <option value="REACTIVE">Reativa</option>
                </select>
              </div>
              {formData.type === 'CORRECTIVE' && (
                <div>
                  <label className={labelCls}>Sub-tipo Corretiva</label>
                  <select
                    value={formData.osType}
                    onChange={(e) => setFormData({ ...formData, osType: e.target.value })}
                    className={selectCls}
                    disabled={isFromPlan}
                  >
                    <option value="">Selecione</option>
                    <option value="CORRECTIVE_PLANNED">Corretiva Planejada</option>
                    <option value="CORRECTIVE_IMMEDIATE">Corretiva Imediata</option>
                  </select>
                  {formData.osType === 'CORRECTIVE_IMMEDIATE' && (
                    <p className="text-xs text-amber-600 mt-1">
                      Uma RAF sera gerada automaticamente para esta OS
                    </p>
                  )}
                </div>
              )}
              {formData.type === 'PREVENTIVE' && (
                <div>
                  <label className={labelCls}>Sub-tipo Preventiva</label>
                  <select
                    value={formData.osType}
                    onChange={(e) => setFormData({ ...formData, osType: e.target.value })}
                    className={selectCls}
                    disabled={isFromPlan}
                  >
                    <option value="">Selecione</option>
                    <option value="PREVENTIVE_MANUAL">Preventiva Manual</option>
                  </select>
                </div>
              )}
              <div>
                <label className={labelCls}>Prioridade</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className={selectCls}
                  disabled={isFromPlan}
                >
                  <option value="NONE">Nenhuma</option>
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Critica</option>
                </select>
              </div>
              {isEdit && (
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className={selectCls}
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="RELEASED">Liberada</option>
                    <option value="IN_PROGRESS">Em Progresso</option>
                    <option value="ON_HOLD">Em Espera</option>
                    <option value="COMPLETE">Completa</option>
                    <option value="REPROGRAMMED">Reprogramada</option>
                  </select>
                </div>
              )}
              <div>
                <label className={labelCls}>Area de Manutencao</label>
                <select
                  value={formData.maintenanceAreaId}
                  onChange={(e) => setFormData({ ...formData, maintenanceAreaId: e.target.value, serviceTypeId: '' })}
                  className={selectCls}
                  disabled={isFromPlan}
                >
                  <option value="">Selecione</option>
                  {maintenanceAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.code ? `${area.code} - ${area.name}` : area.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tipo de Servico</label>
                <select
                  value={formData.serviceTypeId}
                  onChange={(e) => setFormData({ ...formData, serviceTypeId: e.target.value })}
                  className={selectCls}
                  disabled={isFromPlan}
                >
                  <option value="">Selecione</option>
                  {serviceTypes.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.code} - {st.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Data de Vencimento</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className={inputCls}
                  disabled={isFromPlan}
                />
              </div>
              <div>
                <label className={labelCls}>Tolerancia (dias)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.toleranceDays}
                  onChange={(e) => setFormData({ ...formData, toleranceDays: e.target.value })}
                  placeholder="Ex: 2"
                  className={inputCls}
                  disabled={isFromPlan}
                />
                {isEdit && !isFromPlan && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Em edicao, a tolerancia ajusta a data de vencimento ao salvar.
                  </p>
                )}
              </div>
            </div>
          </ModalSection>

          {/* Seleção de plano de manutenção (preventiva/preditiva) */}
          {(formData.type === 'PREVENTIVE' || formData.type === 'PREDICTIVE') &&
            formData.assetId && formData.serviceTypeId && (
            <ModalSection title="Plano de Manutencao do Bem">
              {loadingPlans ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-surface-variant" />
                  <span className="text-sm text-muted-foreground">Buscando planos cadastrados...</span>
                </div>
              ) : availablePlans.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {availablePlans.length === 1
                      ? 'Foi encontrado 1 plano de manutencao cadastrado para este bem e tipo de servico.'
                      : `Foram encontrados ${availablePlans.length} planos de manutencao cadastrados para este bem e tipo de servico.`
                    }
                  </p>
                  <div>
                    <label className={labelCls}>Selecione o plano para pre-preencher a OS</label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => handlePlanSelect(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Nenhum (preencher manualmente)</option>
                      {availablePlans.map((plan) => {
                        const periodLabel = String(plan.period || '').toUpperCase() === 'UNICA'
                          ? ' (Unica)'
                          : String(plan.period || '').toUpperCase() === 'REPETITIVA'
                            ? ' (Repetitiva)'
                            : ''
                        return (
                          <option key={plan.id} value={plan.id}>
                            {plan.name || `Plano #${plan.sequence}`}
                            {plan.serviceType ? ` — ${plan.serviceType.code} - ${plan.serviceType.name}` : ''}
                            {periodLabel}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  {selectedPlanId && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Icon name="check_circle" className="text-sm" />
                      Tarefas, etapas e recursos foram pre-preenchidos a partir do plano selecionado.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-1">
                  Nenhum plano de manutencao cadastrado para este bem e tipo de servico. Preencha manualmente.
                </p>
              )}
            </ModalSection>
          )}

          {/* ============ 4. TAREFAS E ETAPAS ============ */}
          <ModalSection title="Tarefas e Etapas">
            <div className="space-y-4">
              {/* Descrição geral da OS */}
              <div>
                <label className={labelCls}>Descricao Geral (opcional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Observacoes gerais sobre esta OS..."
                  className={inputCls}
                />
              </div>

              {/* Tasks */}
              {tasks.map((task, idx) => (
                <div key={task.key} className="border border-border rounded-[4px] p-3 space-y-3 bg-background">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Tarefa {idx + 1}</span>
                    <div className="flex-1" />
                    {tasks.length > 1 && (
                      <button type="button" onClick={() => removeTask(task.key)} className="p-1 hover:bg-danger-light rounded">
                        <Icon name="close" className="text-base text-danger" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-3">
                      <label className={labelCls}>Tarefa <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        value={task.description}
                        onChange={e => updateTask(task.key, { description: e.target.value })}
                        placeholder="Ex: Inspecionar correia transportadora"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      {(() => {
                        const isDerived = showPlannedWindowFields && !!task.plannedStart && !!task.plannedEnd
                        return (
                          <>
                            <label className={labelCls}>
                              Tempo Execucao (h)
                              {isDerived && (
                                <span className="ml-1 normal-case font-normal text-[10px] text-muted-foreground">(calculado)</span>
                              )}
                            </label>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              inputMode="decimal"
                              value={isDerived ? diffHours(task.plannedStart, task.plannedEnd) : task.executionTime}
                              readOnly={isDerived}
                              onChange={e => updateTask(task.key, { executionTime: e.target.value === '' ? '' : Number(e.target.value) })}
                              placeholder="Ex: 1,5"
                              className={`${inputCls}${isDerived ? ' bg-muted text-muted-foreground cursor-not-allowed' : ''}`}
                            />
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  {showPlannedWindowFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Inicio Previsto</label>
                        <input
                          type="datetime-local"
                          value={task.plannedStart}
                          onChange={e => updateTask(task.key, { plannedStart: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Fim Previsto</label>
                        <input
                          type="datetime-local"
                          value={task.plannedEnd}
                          onChange={e => updateTask(task.key, { plannedEnd: e.target.value })}
                          min={task.plannedStart || undefined}
                          className={inputCls}
                        />
                        {task.plannedStart && task.plannedEnd && new Date(task.plannedEnd) < new Date(task.plannedStart) && (
                          <p className="mt-1 text-[11px] text-danger">Fim deve ser posterior ao inicio.</p>
                        )}
                        {task.plannedStart && task.plannedEnd && new Date(task.plannedEnd) >= new Date(task.plannedStart) && (
                          <p className="mt-1 text-[11px] text-muted-foreground">Duracao prevista: {formatHours(diffHours(task.plannedStart, task.plannedEnd))}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Etapas */}
                  <div>
                    <label className={labelCls}>Etapas</label>
                    {task.steps.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {task.steps.map((s, sIdx) => {
                          const step = genericSteps.find((gs) => gs.id === s.stepId)
                          return (
                            <div key={s.stepId} className="flex items-center gap-2 p-2 bg-muted rounded-[4px]">
                              <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">{sIdx + 1}</span>
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button type="button" disabled={sIdx === 0}
                                  onClick={() => moveStepInTask(task.key, sIdx, 'up')}
                                  className="p-0.5 hover:bg-background rounded disabled:opacity-30 disabled:cursor-not-allowed">
                                  <Icon name="arrow_upward" className="text-xs" />
                                </button>
                                <button type="button" disabled={sIdx === task.steps.length - 1}
                                  onClick={() => moveStepInTask(task.key, sIdx, 'down')}
                                  className="p-0.5 hover:bg-background rounded disabled:opacity-30 disabled:cursor-not-allowed">
                                  <Icon name="arrow_downward" className="text-xs" />
                                </button>
                              </div>
                              <span className="text-sm flex-1 min-w-0 truncate">{step?.name || s.stepId}</span>
                              <select value={s.optionType || 'NONE'}
                                onChange={e => updateStepOptionType(task.key, s.stepId, e.target.value)}
                                className="px-2 py-1 text-xs border border-input rounded-[4px] bg-background">
                                <option value="NONE">Nenhuma</option>
                                <option value="RESPONSE">Resposta</option>
                                <option value="OPTION">Opcao</option>
                              </select>
                              <button type="button" onClick={() => removeStepFromTask(task.key, s.stepId)} className="p-0.5 hover:text-danger shrink-0">
                                <Icon name="close" className="text-sm" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div className="relative">
                      <input
                        ref={el => { stepInputRefs.current[task.key] = el }}
                        type="text"
                        value={stepSearch[task.key] || ''}
                        onChange={e => {
                          setStepSearch(prev => ({ ...prev, [task.key]: e.target.value }))
                          setStepDropdownOpen(prev => ({ ...prev, [task.key]: true }))
                          updateStepDropdownPosition(task.key)
                        }}
                        onFocus={() => {
                          setStepDropdownOpen(prev => ({ ...prev, [task.key]: true }))
                          updateStepDropdownPosition(task.key)
                        }}
                        placeholder="+ Adicionar etapa..."
                        className={selectCls}
                      />
                      <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground pointer-events-none" />
                      {stepDropdownOpen[task.key] && stepDropdownPos[task.key] && typeof document !== 'undefined' && (() => {
                        const query = (stepSearch[task.key] || '').toLowerCase()
                        const available = genericSteps
                          .filter((gs) => !task.steps.some(s => s.stepId === gs.id))
                          .filter((gs) => !query || gs.name.toLowerCase().includes(query))
                        if (available.length === 0) return null
                        const pos = stepDropdownPos[task.key]
                        return createPortal(
                          <div
                            ref={el => { stepPortalRefs.current[task.key] = el }}
                            className="fixed bg-card border border-input rounded-[4px] shadow-lg max-h-[420px] overflow-y-auto"
                            style={{ top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
                          >
                            {available.map((gs) => (
                              <button
                                key={gs.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors border-b border-gray-100 last:border-b-0"
                                onClick={() => {
                                  addStepToTask(task.key, gs.id)
                                  setStepSearch(prev => ({ ...prev, [task.key]: '' }))
                                  setStepDropdownOpen(prev => ({ ...prev, [task.key]: false }))
                                }}
                              >
                                {gs.name}
                              </button>
                            ))}
                          </div>,
                          document.body
                        )
                      })()}
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addTask}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium">
                <Icon name="add" className="text-base" />
                Adicionar Tarefa
              </button>
            </div>
          </ModalSection>

          {/* ============ 5. RECURSOS ============ */}
          <ModalSection title="Recursos">
            <ResourceSelector
              resources={woResources}
              onChange={setWoResources}
            />
          </ModalSection>

          {/* ============ 6. ATRIBUIÇÃO ============ */}
          <ModalSection title="Atribuicao">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Equipe Responsavel</label>
                <select
                  value={formData.assignedTeamIds[0] || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, assignedTeamIds: e.target.value ? [e.target.value] : [], assignedToId: '' })
                    if (e.target.value) {
                      loadTeamMembers(e.target.value)
                    } else {
                      setTeamMembers([])
                    }
                  }}
                  className={selectCls}
                >
                  <option value="">Selecione uma equipe</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Executante (Opcional)</label>
                {(() => {
                  const manutentorMembers = teamMembers.filter(m => normalizeUserRole(m.user.role) === 'MANUTENTOR')
                  return (
                    <>
                      <select
                        value={formData.assignedToId}
                        onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                        className={selectCls}
                        disabled={manutentorMembers.length === 0}
                      >
                        <option value="">
                          {teamMembers.length === 0
                            ? 'Selecione uma equipe primeiro'
                            : manutentorMembers.length === 0
                              ? 'Equipe sem manutentor'
                              : 'Nenhum (lider atribuira)'}
                        </option>
                        {manutentorMembers.map((member) => (
                          <option key={member.user.id} value={member.user.id}>
                            {member.user.firstName} {member.user.lastName}
                          </option>
                        ))}
                      </select>
                      {teamMembers.length > 0 && manutentorMembers.length === 0 && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Apenas pessoas com papel Manutentor podem ser executantes.
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          </ModalSection>

        </div>

        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || hydrating} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {loading ? 'Salvando...' : isEdit ? 'Salvar Alteracoes' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
