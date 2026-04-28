'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ResourceSelector, type TaskResourceItem } from '@/components/ui/ResourceSelector'
import { useAuth } from '@/hooks/useAuth'

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
  steps: TaskStep[]
}

export interface WorkOrderFormInitialValues {
  description?: string
  type?: string
  osType?: string
  priority?: string
  assetId?: string
  locationId?: string
  dueDate?: string
}

interface WorkOrderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  inPage?: boolean
  initialValues?: WorkOrderFormInitialValues
  sourceRequestId?: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const emptyTask = (): TaskRow => ({
  key: crypto.randomUUID(),
  description: '',
  executionTime: '',
  steps: [],
})

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
}: WorkOrderFormModalProps) {
  const { unitId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [teamMembers, setTeamMembers] = useState<{ user: { id: string; firstName: string; lastName: string } }[]>([])
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
  const stepDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
  const [availablePlans, setAvailablePlans] = useState<{ id: string; name: string | null; sequence: number; serviceType?: { code: string; name: string } | null }[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [loadingPlans, setLoadingPlans] = useState(false)

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
      loadData()
      resetForm()
    }
    // loadData/resetForm are stable within a single open cycle; intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Auto-preenche locationId quando unitId carrega
  useEffect(() => {
    if (unitId && !formData.assetId) {
      setFormData(prev => ({ ...prev, locationId: unitId }))
    }
    // Intentionally reacting only to unitId; formData.assetId presence is a snapshot check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId])

  // Aplica initialValues (ex.: vindos da finalização de OS para abrir uma corretiva)
  useEffect(() => {
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
    }))
  }, [isOpen, initialValues])

  // Quando o assetId vier de initialValues, busca o ativo na API para preencher autocomplete
  useEffect(() => {
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
  }, [isOpen, initialValues?.assetId])

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
      const [locationsRes, teamsRes, areasRes, stRes, stepsRes, nextIdRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/teams'),
        fetch('/api/basic-registrations/maintenance-areas'),
        fetch('/api/basic-registrations/service-types'),
        fetch('/api/basic-registrations/generic-steps'),
        fetch('/api/work-orders/next-id'),
      ])

      const [locationsData, teamsData, areasData, stData, stepsData, nextIdData] = await Promise.all([
        locationsRes.json(),
        teamsRes.json(),
        areasRes.json(),
        stRes.json(),
        stepsRes.json(),
        nextIdRes.json(),
      ])

      setLocations(locationsData.data || [])
      setTeams(teamsData.data || [])
      setMaintenanceAreas(areasData.data || [])
      setAllServiceTypes(stData.data || [])
      setGenericSteps(stepsData.data || [])
      if (nextIdData.data) {
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
    if (formData.type === 'PREVENTIVE' || formData.type === 'PREDICTIVE') {
      filtered = filtered.filter(st => st.maintenanceType?.characteristic !== 'Corretiva')
    } else if (formData.type === 'CORRECTIVE') {
      filtered = filtered.filter(st => st.maintenanceType?.characteristic === 'Corretiva')
    }

    setServiceTypes(filtered)

    // Limpar serviceTypeId se o selecionado não está mais na lista filtrada
    if (formData.serviceTypeId && !filtered.some(st => st.id === formData.serviceTypeId)) {
      setFormData(prev => ({ ...prev, serviceTypeId: '' }))
    }
    // formData.serviceTypeId is a snapshot-check dependency, intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.maintenanceAreaId, formData.type, allServiceTypes])

  /* ---- Search matching AssetMaintenancePlans when classification is filled ---- */

  useEffect(() => {
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
          serviceType: p.serviceType ? { code: p.serviceType.code, name: p.serviceType.name } : null,
        })))
      } catch (error) {
        console.error('Error fetching asset maintenance plans:', error)
      } finally {
        setLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [formData.type, formData.assetId, formData.serviceTypeId])

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
      for (const key of Object.keys(stepDropdownOpen)) {
        const ref = stepDropdownRefs.current[key]
        if (ref && !ref.contains(e.target as Node)) {
          setStepDropdownOpen(prev => ({ ...prev, [key]: false }))
        }
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [stepDropdownOpen])

  /* ---- Submit ---- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Require at least one task with description
    const validTasks = tasks.filter(t => t.description.trim())
    if (validTasks.length === 0) {
      alert('Adicione pelo menos uma tarefa')
      return
    }

    setLoading(true)

    try {
      const title = validTasks[0].description

      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          title,
          sourceRequestId: sourceRequestId || undefined,
          resources: woResources.map(r => ({
            resourceType: r.resourceType,
            resourceId: r.resourceId || null,
            jobTitleId: r.jobTitleId || null,
            userId: r.userId || null,
            quantity: r.quantity ?? null,
            hours: r.hours ?? null,
            unit: r.unit || null,
          })),
          tasks: validTasks.map((t, idx) => ({
            label: t.description,
            executionTime: t.executionTime || null,
            order: idx,
            steps: t.steps.length > 0
              ? JSON.stringify(t.steps.map(s => {
                  const gs = genericSteps.find(g => g.id === s.stepId)
                  return {
                    stepId: s.stepId,
                    stepName: gs?.name || '',
                    optionType: s.optionType || 'NONE',
                    options: [],
                  }
                }))
              : null,
          })),
        })
      })

      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        alert('Erro ao criar ordem de servico')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  /* ---- Render ---- */

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Ordem de Servico" size="wide" inPage={inPage}>
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">

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
                    readOnly={!!selectedAsset}
                  />
                  {selectedAsset && (
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
                    readOnly={!!selectedAsset}
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
                >
                  <option value="NONE">Nenhuma</option>
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Critica</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Area de Manutencao</label>
                <select
                  value={formData.maintenanceAreaId}
                  onChange={(e) => setFormData({ ...formData, maintenanceAreaId: e.target.value, serviceTypeId: '' })}
                  className={selectCls}
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
                />
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
                      {availablePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name || `Plano #${plan.sequence}`}
                          {plan.serviceType ? ` — ${plan.serviceType.code} - ${plan.serviceType.name}` : ''}
                        </option>
                      ))}
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
                      <label className={labelCls}>Tempo Execucao (min)</label>
                      <input
                        type="number"
                        value={task.executionTime}
                        onChange={e => updateTask(task.key, { executionTime: e.target.value === '' ? '' : Number(e.target.value) })}
                        placeholder="Ex: 60"
                        className={inputCls}
                      />
                    </div>
                  </div>
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
                    <div className="relative" ref={el => { stepDropdownRefs.current[task.key] = el }}>
                      <input
                        type="text"
                        value={stepSearch[task.key] || ''}
                        onChange={e => {
                          setStepSearch(prev => ({ ...prev, [task.key]: e.target.value }))
                          setStepDropdownOpen(prev => ({ ...prev, [task.key]: true }))
                        }}
                        onFocus={() => setStepDropdownOpen(prev => ({ ...prev, [task.key]: true }))}
                        placeholder="+ Adicionar etapa..."
                        className={selectCls}
                      />
                      <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground pointer-events-none" />
                      {stepDropdownOpen[task.key] && (() => {
                        const query = (stepSearch[task.key] || '').toLowerCase()
                        const available = genericSteps
                          .filter((gs) => !task.steps.some(s => s.stepId === gs.id))
                          .filter((gs) => !query || gs.name.toLowerCase().includes(query))
                        return available.length > 0 ? (
                          <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-input rounded-[4px] shadow-lg">
                            {available.map((gs) => (
                              <button
                                key={gs.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                                onClick={() => {
                                  addStepToTask(task.key, gs.id)
                                  setStepSearch(prev => ({ ...prev, [task.key]: '' }))
                                  setStepDropdownOpen(prev => ({ ...prev, [task.key]: false }))
                                }}
                              >
                                {gs.name}
                              </button>
                            ))}
                          </div>
                        ) : null
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
                <select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  className={selectCls}
                  disabled={teamMembers.length === 0}
                >
                  <option value="">
                    {teamMembers.length === 0 ? 'Selecione uma equipe primeiro' : 'Nenhum (lider atribuira)'}
                  </option>
                  {teamMembers.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.firstName} {member.user.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </ModalSection>

        </div>

        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
