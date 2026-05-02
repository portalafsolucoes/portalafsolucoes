'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { ResourceSelector, type TaskResourceItem } from '@/components/ui/ResourceSelector'
import type { ApiItemResponse, ApiListResponse } from '@/types/api'
import type {
  AssetFamilyModelOption,
  AssetFamilyOption,
  AssetOption,
  CalendarOption,
  NamedEntity,
  ServiceTypeOption,
} from '@/types/catalog'

/* ------------------------------------------------------------------ */
/*  Tipos                                                               */
/* ------------------------------------------------------------------ */

interface TaskStep { stepId: string; order: number; optionType: string }
interface GenericStepWithType { id: string; name: string; optionType?: string }
interface TaskRow {
  key: string
  description: string
  executionTime: number | ''
  steps: TaskStep[]
  resources: TaskResourceItem[]
}

interface AssetPlanFormData {
  assetId: string
  serviceTypeId: string
  maintenanceAreaId: string
  maintenanceTypeId: string
  name: string
  calendarId: string
  maintenanceTime: number | ''
  timeUnit: string
  period: string
  trackingType: string
  lastMaintenanceDate: string
  standardPlanId?: string
}

interface PlanTaskResponse {
  id?: string
  description?: string | null
  executionTime?: number | null
  steps?: Array<{ stepId: string; order: number; optionType?: string }>
  resources?: Array<{
    resourceType?: string | null
    resourceId?: string | null
    jobTitleId?: string | null
    userId?: string | null
    resourceCount?: number | null
    quantity?: number | null
    hours?: number | null
    unit?: string | null
  }>
}

interface AssetPlanResponse {
  id?: string
  assetId?: string | null
  serviceTypeId?: string | null
  maintenanceAreaId?: string | null
  maintenanceTypeId?: string | null
  name?: string | null
  calendarId?: string | null
  maintenanceTime?: number | null
  timeUnit?: string | null
  period?: string | null
  trackingType?: string | null
  lastMaintenanceDate?: string | null
  sequence?: number | null
  isStandard?: boolean
  tasks?: PlanTaskResponse[]
}

const emptyTask = (): TaskRow => ({
  key: crypto.randomUUID(),
  description: '',
  executionTime: '',
  steps: [],
  resources: [],
})

const emptyFormData = (): AssetPlanFormData => ({
  assetId: '',
  serviceTypeId: '',
  maintenanceAreaId: '',
  maintenanceTypeId: '',
  name: '',
  calendarId: '',
  maintenanceTime: '',
  timeUnit: '',
  period: '',
  trackingType: 'TIME',
  lastMaintenanceDate: '',
})

/* ------------------------------------------------------------------ */
/*  Constantes de estilo                                                */
/* ------------------------------------------------------------------ */

const labelCls = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'
const inputCls = 'w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls

/* ------------------------------------------------------------------ */
/*  Autocomplete de Bem/Ativo                                          */
/* ------------------------------------------------------------------ */

function AssetAutocomplete({ value, onChange, assets }: {
  value: string
  onChange: (id: string) => void
  assets: AssetOption[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const formatLabel = (a: AssetOption) =>
    `${a.tag ? `[${a.tag}] ` : ''}${a.name}`

  // Sync display when value changes externally (e.g. edit load)
  useEffect(() => {
    if (value) {
      const match = assets.find(a => a.id === value)
      setSearch(match ? formatLabel(match) : '')
    } else {
      setSearch('')
    }
  }, [value, assets])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = assets.filter(a => {
    if (!search) return true
    const label = formatLabel(a).toLowerCase()
    return label.includes(search.toLowerCase())
  })

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange('')
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar bem/ativo..."
          title={search}
          className={`${inputCls} pr-8 truncate`}
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <Icon name="expand_more" className="text-base" />
        </button>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {filtered.length > 0 ? filtered.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onChange(a.id)
                setSearch(formatLabel(a))
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent-orange-light transition-colors truncate ${a.id === value ? 'bg-accent-orange text-white font-semibold' : ''}`}
              title={formatLabel(a)}
            >
              {formatLabel(a)}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface AssetPlanFormPanelProps {
  editingId?: string | null
  inPage?: boolean
  onClose: () => void
  onSuccess: () => void
}

/* ------------------------------------------------------------------ */
/*  Componente                                                          */
/* ------------------------------------------------------------------ */

export default function AssetPlanFormPanel({
  editingId = null,
  inPage = false,
  onClose,
  onSuccess,
}: AssetPlanFormPanelProps) {
  const [formData, setFormData] = useState<AssetPlanFormData>(emptyFormData())
  const [tasks, setTasks] = useState<TaskRow[]>([emptyTask()])
  const [saving, setSaving] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [error, setError] = useState('')

  const [serviceTypes, setServiceTypes] = useState<ServiceTypeOption[]>([])
  const [assets, setAssets] = useState<AssetOption[]>([])
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [genericSteps, setGenericSteps] = useState<GenericStepWithType[]>([])
  const [families, setFamilies] = useState<AssetFamilyOption[]>([])
  const [familyModels, setFamilyModels] = useState<AssetFamilyModelOption[]>([])

  const [stepSearch, setStepSearch] = useState<Record<string, string>>({})
  const [stepDropdownOpen, setStepDropdownOpen] = useState<Record<string, boolean>>({})
  const stepDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [nextSequence, setNextSequence] = useState<number | null>(null)
  const [loadingSeq, setLoadingSeq] = useState(false)

  const [assetFamily, setAssetFamily] = useState<AssetFamilyOption | null>(null)
  const [assetFamilyModel, setAssetFamilyModel] = useState<AssetFamilyModelOption | null>(null)
  const [derivedArea, setDerivedArea] = useState<NamedEntity | null>(null)
  const [derivedMaintType, setDerivedMaintType] = useState<NamedEntity | null>(null)
  const [isStandard, setIsStandard] = useState<'sim' | 'nao' | ''>('')
  const [loadingStandard, setLoadingStandard] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Click outside para fechar dropdown de etapas                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const anyOpen = Object.entries(stepDropdownOpen).some(([, v]) => v)
      if (!anyOpen) return
      const shouldClose: Record<string, boolean> = {}
      for (const [key, open] of Object.entries(stepDropdownOpen)) {
        if (open && stepDropdownRefs.current[key] && !stepDropdownRefs.current[key]!.contains(target)) {
          shouldClose[key] = true
        }
      }
      if (Object.keys(shouldClose).length > 0) {
        setStepDropdownOpen(prev => {
          const next = { ...prev }
          for (const k of Object.keys(shouldClose)) next[k] = false
          return next
        })
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [stepDropdownOpen])

  /* ---------------------------------------------------------------- */
  /*  Carregar dependências e dados do plano                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    loadDependencies()
    if (editingId) {
      loadPlan(editingId)
    } else {
      setFormData(emptyFormData())
      setTasks([emptyTask()])
      setError('')
      setNextSequence(null)
      setAssetFamily(null)
      setAssetFamilyModel(null)
      setDerivedArea(null)
      setDerivedMaintType(null)
      setIsStandard('')
    }
  }, [editingId])

  const loadDependencies = async () => {
    const [stRes, assRes, calRes, stepsRes, famRes, modelsRes] = await Promise.all([
      fetch('/api/basic-registrations/service-types'),
      fetch('/api/assets?all=true'),
      fetch('/api/basic-registrations/calendars'),
      fetch('/api/basic-registrations/generic-steps'),
      fetch('/api/basic-registrations/asset-families'),
      fetch('/api/basic-registrations/asset-family-models'),
    ])
    const [stData, assData, calData, stepsData, famData, modelsData] = await Promise.all([
      stRes.json() as Promise<ApiListResponse<ServiceTypeOption>>,
      assRes.json() as Promise<ApiListResponse<AssetOption>>,
      calRes.json() as Promise<ApiListResponse<CalendarOption>>,
      stepsRes.json() as Promise<ApiListResponse<GenericStepWithType>>,
      famRes.json() as Promise<ApiListResponse<AssetFamilyOption>>,
      modelsRes.json() as Promise<ApiListResponse<AssetFamilyModelOption>>,
    ])
    setServiceTypes(stData.data || [])
    setAssets(assData.data || [])
    setCalendars(calData.data || [])
    setGenericSteps(stepsData.data || [])
    setFamilies(famData.data || [])
    setFamilyModels(modelsData.data || [])
  }

  const loadPlan = async (planId: string) => {
    setLoadingPlan(true)
    try {
      const res = await fetch(`/api/maintenance-plans/asset/${planId}`)
      const json = await res.json() as ApiItemResponse<AssetPlanResponse>
      if (!res.ok) { setError(json.error || 'Erro ao carregar plano'); setLoadingPlan(false); return }
      const plan = json.data
      if (!plan) {
        setError('Plano não encontrado')
        setLoadingPlan(false)
        return
      }
      setFormData({
        assetId: plan.assetId || '',
        serviceTypeId: plan.serviceTypeId || '',
        maintenanceAreaId: plan.maintenanceAreaId || '',
        maintenanceTypeId: plan.maintenanceTypeId || '',
        name: plan.name || '',
        calendarId: plan.calendarId || '',
        maintenanceTime: plan.maintenanceTime ?? '',
        timeUnit: plan.timeUnit || '',
        period: plan.period || '',
        trackingType: plan.trackingType || 'TIME',
        lastMaintenanceDate: plan.lastMaintenanceDate ? plan.lastMaintenanceDate.split('T')[0] : '',
      })
      setNextSequence(plan.sequence ?? null)
      setIsStandard(plan.isStandard ? 'sim' : 'nao')
      if (plan.tasks && plan.tasks.length > 0) {
        setTasks(plan.tasks.map((t) => ({
          key: t.id || crypto.randomUUID(),
          description: t.description || '',
          executionTime: t.executionTime ?? '',
          steps: (t.steps || []).map((s) => ({ stepId: s.stepId, order: s.order, optionType: s.optionType || 'NONE' })),
          resources: (t.resources || []).map((r) => ({
            resourceType: (r.resourceType || 'MATERIAL') as TaskResourceItem['resourceType'],
            resourceId: r.resourceId || null,
            jobTitleId: r.jobTitleId || null,
            userId: r.userId || null,
            quantity: r.resourceCount ?? r.quantity ?? 1,
            hours: r.hours ?? 0,
            unit: r.unit || 'UN',
          })),
        })))
      }
    } catch { setError('Erro ao carregar plano') }
    setLoadingPlan(false)
  }

  /* ---------------------------------------------------------------- */
  /*  Sequência preview                                                */
  /* ---------------------------------------------------------------- */

  const fetchNextSequence = useCallback(async (assetId: string, serviceTypeId: string) => {
    if (!assetId || !serviceTypeId) { setNextSequence(null); return }
    setLoadingSeq(true)
    try {
      const params = new URLSearchParams({ assetId, serviceTypeId })
      const res = await fetch(`/api/maintenance-plans/asset/next-sequence?${params}`)
      const json = await res.json()
      setNextSequence(json.data ?? null)
    } catch { setNextSequence(null) }
    setLoadingSeq(false)
  }, [])

  useEffect(() => {
    if (!editingId) {
      fetchNextSequence(formData.assetId || '', formData.serviceTypeId || '')
    }
  }, [editingId, formData.assetId, formData.serviceTypeId, fetchNextSequence])

  /* ---------------------------------------------------------------- */
  /*  Derivar família e tipo modelo do ativo selecionado               */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!formData.assetId) {
      setAssetFamily(null)
      setAssetFamilyModel(null)
      return
    }
    const asset = assets.find((a) => a.id === formData.assetId)
    if (asset) {
      const fam = asset.familyId ? families.find((f) => f.id === asset.familyId) : null
      const model = asset.familyModelId ? familyModels.find((m) => m.id === asset.familyModelId) : null
      setAssetFamily(fam || null)
      setAssetFamilyModel(model || null)
    } else {
      setAssetFamily(null)
      setAssetFamilyModel(null)
    }
  }, [formData.assetId, assets, families, familyModels])

  /* ---------------------------------------------------------------- */
  /*  Derivar área e tipo de manutenção do tipo de serviço             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!formData.serviceTypeId) {
      setDerivedArea(null)
      setDerivedMaintType(null)
      return
    }
    const st = serviceTypes.find((s) => s.id === formData.serviceTypeId)
    if (st) {
      setDerivedArea(st.maintenanceArea || null)
      setDerivedMaintType(st.maintenanceType || null)
      setFormData(prev => ({
        ...prev,
        maintenanceAreaId: st.maintenanceAreaId || st.maintenanceArea?.id || '',
        maintenanceTypeId: st.maintenanceTypeId || st.maintenanceType?.id || '',
      }))
    } else {
      setDerivedArea(null)
      setDerivedMaintType(null)
    }
  }, [formData.serviceTypeId, serviceTypes])

  /* ---------------------------------------------------------------- */
  /*  Lógica Manutenção Padrão                                         */
  /* ---------------------------------------------------------------- */

  const handleStandardChange = async (value: 'sim' | 'nao') => {
    setIsStandard(value)
    if (value !== 'sim') return

    const asset = assets.find((a) => a.id === formData.assetId)
    if (!asset?.familyId || !formData.serviceTypeId) {
      alert('Selecione o Bem/Ativo e o Tipo de Serviço antes de marcar Manutenção Padrão.')
      setIsStandard('')
      return
    }

    setLoadingStandard(true)
    try {
      const params = new URLSearchParams({
        familyId: asset.familyId,
        serviceTypeId: formData.serviceTypeId,
      })
      if (asset.familyModelId) params.set('familyModelId', asset.familyModelId)
      if (nextSequence) params.set('sequence', String(nextSequence))

      const res = await fetch(`/api/maintenance-plans/standard/search?${params}`)
      const json = await res.json() as ApiItemResponse<AssetPlanResponse>

      if (!json.found || !json.data) {
        alert('Não existe manutenção padrão para o cadastro atual.')
        setIsStandard('nao')
        setLoadingStandard(false)
        return
      }

      const stdPlan = json.data
      setFormData(prev => ({
        ...prev,
        name: stdPlan.name || prev.name || '',
        calendarId: stdPlan.calendarId || prev.calendarId || '',
        trackingType: stdPlan.trackingType || prev.trackingType || 'TIME',
        maintenanceTime: stdPlan.maintenanceTime ?? prev.maintenanceTime ?? '',
        timeUnit: stdPlan.timeUnit || prev.timeUnit || '',
        period: stdPlan.period || prev.period || '',
        standardPlanId: stdPlan.id,
      }))

      if (stdPlan.tasks && stdPlan.tasks.length > 0) {
        setTasks(stdPlan.tasks.map((t) => ({
          key: crypto.randomUUID(),
          description: t.description || '',
          executionTime: t.executionTime ?? '',
          steps: (t.steps || []).map((s) => ({ stepId: s.stepId, order: s.order, optionType: s.optionType || 'NONE' })),
          resources: (t.resources || []).map((r) => ({
            resourceType: (r.resourceType || 'MATERIAL') as TaskResourceItem['resourceType'],
            resourceId: r.resourceId || null,
            jobTitleId: r.jobTitleId || null,
            userId: r.userId || null,
            quantity: r.resourceCount ?? r.quantity ?? 1,
            hours: r.hours ?? 0,
            unit: r.unit || 'UN',
          })),
        })))
      }
    } catch {
      alert('Erro ao buscar manutenção padrão.')
      setIsStandard('')
    }
    setLoadingStandard(false)
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers de tarefas                                               */
  /* ---------------------------------------------------------------- */

  const updateTask = (key: string, patch: Partial<TaskRow>) => {
    setTasks(prev => prev.map(t => t.key === key ? { ...t, ...patch } : t))
  }

  const addTask = () => setTasks(prev => [...prev, emptyTask()])

  const removeTask = (key: string) => {
    setTasks(prev => prev.length <= 1 ? prev : prev.filter(t => t.key !== key))
  }

  const addStepToTask = (taskKey: string, stepId: string) => {
    const gs = genericSteps.find(g => g.id === stepId)
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      if (t.steps.some(s => s.stepId === stepId)) return t
      return { ...t, steps: [...t.steps, { stepId, order: t.steps.length, optionType: gs?.optionType || 'NONE' }] }
    }))
  }

  const removeStepFromTask = (taskKey: string, stepId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      const filtered = t.steps.filter(s => s.stepId !== stepId)
      return { ...t, steps: filtered.map((s, i) => ({ ...s, order: i })) }
    }))
  }

  const moveStepInTask = (taskKey: string, index: number, direction: 'up' | 'down') => {
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      const newSteps = [...t.steps]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= newSteps.length) return t
      ;[newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]]
      return { ...t, steps: newSteps.map((s, i) => ({ ...s, order: i })) }
    }))
  }

  const updateStepOptionType = (taskKey: string, stepId: string, optionType: string) => {
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      return { ...t, steps: t.steps.map(s => s.stepId === stepId ? { ...s, optionType } : s) }
    }))
  }

  const updateTaskResources = (taskKey: string, newResources: TaskResourceItem[]) => {
    setTasks(prev => prev.map(t => t.key === taskKey ? { ...t, resources: newResources } : t))
  }

  /* ---------------------------------------------------------------- */
  /*  Save                                                             */
  /* ---------------------------------------------------------------- */

  const handleSave = async () => {
    if (!formData.lastMaintenanceDate) {
      alert('Preencha o campo "Data da Última Manutenção" antes de salvar.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...formData,
        isStandard: isStandard === 'sim',
      }

      let planId: string

      if (editingId) {
        const planRes = await fetch(`/api/maintenance-plans/asset/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const planResult = await planRes.json()
        if (!planRes.ok) { setError(planResult.error || 'Erro ao atualizar plano'); setSaving(false); return }
        planId = editingId
      } else {
        const planRes = await fetch('/api/maintenance-plans/asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const planResult = await planRes.json()
        if (!planRes.ok) { setError(planResult.error || 'Erro ao salvar plano'); setSaving(false); return }
        planId = planResult.data?.id
        if (!planId) { setError('Erro: plano criado sem ID'); setSaving(false); return }
      }

      const validTasks = tasks.filter(t => t.description.trim())
      if (validTasks.length > 0) {
        const tasksPayload = validTasks.map((t, i) => ({
          description: t.description.trim(),
          order: i,
          executionTime: t.executionTime !== '' ? Number(t.executionTime) : null,
          steps: t.steps.map((s, j) => ({ stepId: s.stepId, order: j })),
          resources: t.resources.map(r => ({
            resourceType: r.resourceType,
            resourceId: r.resourceId || null,
            jobTitleId: r.jobTitleId || null,
            userId: r.userId || null,
            resourceCount: r.quantity ?? 1,
            quantity: r.quantity ?? 0,
            hours: r.hours ?? 0,
            unit: r.unit || null,
          })),
        }))
        const tasksRes = await fetch(`/api/maintenance-plans/asset/${planId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: tasksPayload }),
        })
        if (!tasksRes.ok) {
          const tasksErr = await tasksRes.json()
          setError(tasksErr.error || `Plano ${editingId ? 'atualizado' : 'criado'}, mas erro ao salvar tarefas`)
          setSaving(false)
          onSuccess()
          return
        }
      }

      onSuccess()
      onClose()
    } catch { setError('Erro de conexão') }
    setSaving(false)
  }

  /* ---------------------------------------------------------------- */
  /*  Form content                                                     */
  /* ---------------------------------------------------------------- */

  const formBody = (
    <>
      {error && <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">{error}</div>}

      {/* ============ CLASSIFICAÇÃO ============ */}
      <ModalSection title="Classificação">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Bem/Ativo <span className="text-danger">*</span></label>
            <AssetAutocomplete
              value={formData.assetId || ''}
              onChange={id => setFormData({ ...formData, assetId: id })}
              assets={assets}
            />
          </div>
          <div>
            <label className={labelCls}>Família de Bens</label>
            <input
              type="text"
              readOnly
              value={assetFamily ? `${assetFamily.code} - ${assetFamily.name}` : '-'}
              className={`${inputCls} bg-muted cursor-not-allowed`}
            />
          </div>
          <div>
            <label className={labelCls}>Tipo Modelo</label>
            <input
              type="text"
              readOnly
              value={assetFamilyModel ? assetFamilyModel.name : 'Genérico'}
              className={`${inputCls} bg-muted cursor-not-allowed`}
            />
          </div>
          <div>
            <label className={labelCls}>Tipo de Serviço <span className="text-danger">*</span></label>
            <select value={formData.serviceTypeId || ''} onChange={e => setFormData({ ...formData, serviceTypeId: e.target.value })} className={selectCls}>
              <option value="">Selecione...</option>
              {serviceTypes.map((st) => <option key={st.id} value={st.id}>{st.code} - {st.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Área de Manutenção</label>
            <input
              type="text"
              readOnly
              value={derivedArea?.name || '-'}
              className={`${inputCls} bg-muted cursor-not-allowed`}
            />
          </div>
          <div>
            <label className={labelCls}>Tipo de Manutenção</label>
            <input
              type="text"
              readOnly
              value={derivedMaintType?.name || '-'}
              className={`${inputCls} bg-muted cursor-not-allowed`}
            />
          </div>
          <div>
            <label className={labelCls}>Sequência</label>
            <input
              type="text"
              readOnly
              value={loadingSeq ? '...' : (nextSequence ?? '-')}
              className={`${inputCls} bg-muted cursor-not-allowed`}
            />
          </div>
          <div>
            <label className={labelCls}>Manutenção Padrão?</label>
            <select
              value={isStandard}
              onChange={e => {
                const val = e.target.value as 'sim' | 'nao' | ''
                if (val === 'sim' || val === 'nao') handleStandardChange(val)
                else setIsStandard('')
              }}
              disabled={loadingStandard}
              className={selectCls}
            >
              <option value="">Selecione...</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
            {loadingStandard && <p className="text-xs text-muted-foreground mt-1">Buscando plano padrão...</p>}
          </div>
        </div>
      </ModalSection>

      {/* ============ MANUTENÇÃO ============ */}
      <ModalSection title="Manutenção">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="col-span-2 md:col-span-3">
            <label className={labelCls}>Nome da Manutenção</label>
            <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Manutenção Prev. Mec. 28 Dias" className={inputCls} />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className={labelCls}>Calendário</label>
            <select value={formData.calendarId || ''} onChange={e => setFormData({ ...formData, calendarId: e.target.value })} className={selectCls}>
              <option value="">Nenhum</option>
              {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tipo de Controle</label>
            <select value={formData.trackingType || 'TIME'} onChange={e => setFormData({ ...formData, trackingType: e.target.value })} className={selectCls}>
              <option value="TIME">Tempo Pré-determinado</option>
              <option value="HORIMETER">Horímetro</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Tempo</label>
            <input type="number" value={formData.maintenanceTime || ''} onChange={e => setFormData({ ...formData, maintenanceTime: Number(e.target.value) })}
              placeholder="Ex: 28" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Unidade</label>
            <select value={formData.timeUnit || ''} onChange={e => setFormData({ ...formData, timeUnit: e.target.value })} className={selectCls}>
              <option value="">Selecione...</option>
              <option value="Dia(s)">Dia(s)</option>
              <option value="Semana(s)">Semana(s)</option>
              <option value="Mês(es)">Mês(es)</option>
              <option value="Hora(s)">Hora(s)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Período</label>
            <select value={formData.period || ''} onChange={e => setFormData({ ...formData, period: e.target.value })} className={selectCls}>
              <option value="">Selecione...</option>
              <option value="Repetitiva">Repetitiva</option>
              <option value="Unica">Única</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Data da Última Manutenção <span className="text-danger">*</span></label>
            <input type="date" value={formData.lastMaintenanceDate || ''} onChange={e => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
              className={inputCls} />
          </div>
        </div>
      </ModalSection>

      {/* ============ TAREFAS E ETAPAS ============ */}
      <ModalSection title="Tarefas e Etapas">
        <div className="space-y-4">
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
                  <label className={labelCls}>Descrição da Tarefa <span className="text-danger">*</span></label>
                  <input type="text" value={task.description} onChange={e => updateTask(task.key, { description: e.target.value })}
                    placeholder="Ex: Inspecionar correia transportadora" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tempo Execução (h)</label>
                  <input type="number" step="0.25" min="0" inputMode="decimal" value={task.executionTime} onChange={e => updateTask(task.key, { executionTime: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="Ex: 1,5" className={inputCls} />
                </div>
              </div>
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
                            <option value="OPTION">Opção</option>
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
              <ResourceSelector
                resources={task.resources}
                onChange={(newRes) => updateTaskResources(task.key, newRes)}
              />
            </div>
          ))}
          <button type="button" onClick={addTask}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium">
            <Icon name="add" className="text-base" />
            Adicionar Tarefa
          </button>
        </div>
      </ModalSection>
    </>
  )

  const formFooter = (
    <div className="flex gap-3 px-4 py-4 border-t border-border">
      <Button variant="outline" type="button" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button type="submit" disabled={saving || loadingPlan} className="flex-1">
          <Icon name="save" className="text-base mr-2" />
          {loadingPlan ? 'Carregando...' : saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Salvar'}
        </Button>
    </div>
  )

  const title = editingId ? 'Editar Plano do Bem' : 'Novo Plano do Bem'

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <Icon name="close" className="text-xl" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleSave() }} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {formBody}
          </div>
          {formFooter}
        </form>
      </div>
    )
  }

  return (
    <Modal isOpen onClose={onClose} title={title} size="wide">
      <form onSubmit={e => { e.preventDefault(); handleSave() }}>
        <div className="p-4 space-y-3">
          {formBody}
        </div>
        {formFooter}
      </form>
    </Modal>
  )
}
