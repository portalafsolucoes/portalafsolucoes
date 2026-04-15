'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ResourceSelector, type TaskResourceItem } from '@/components/ui/ResourceSelector'

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

interface WorkOrderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  inPage?: boolean
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
  inPage = false
}: WorkOrderFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [teamMembers, setTeamMembers] = useState<{ user: { id: string; firstName: string; lastName: string } }[]>([])
  const [woResources, setWoResources] = useState<TaskResourceItem[]>([])
  const [maintenanceAreas, setMaintenanceAreas] = useState<{ id: string; name: string; code?: string }[]>([])
  const [serviceTypes, setServiceTypes] = useState<{ id: string; code: string; name: string; maintenanceAreaId: string }[]>([])
  const [allServiceTypes, setAllServiceTypes] = useState<{ id: string; code: string; name: string; maintenanceAreaId: string }[]>([])
  const [genericSteps, setGenericSteps] = useState<GenericStepItem[]>([])

  // Auto-fill externalId
  const [nextExternalId, setNextExternalId] = useState('')

  // Tasks & steps
  const [tasks, setTasks] = useState<TaskRow[]>([emptyTask()])
  const [stepSearch, setStepSearch] = useState<Record<string, string>>({})
  const [stepDropdownOpen, setStepDropdownOpen] = useState<Record<string, boolean>>({})
  const stepDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Asset autocomplete
  const [assetCodeSearch, setAssetCodeSearch] = useState('')
  const [assetNameSearch, setAssetNameSearch] = useState('')
  const [assetCodeDropdownOpen, setAssetCodeDropdownOpen] = useState(false)
  const [assetNameDropdownOpen, setAssetNameDropdownOpen] = useState(false)
  const assetCodeRef = useRef<HTMLDivElement>(null)
  const assetNameRef = useRef<HTMLDivElement>(null)

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
    maintenanceFrequency: '',
    frequencyValue: '1',
    estimatedDuration: '',
    maintenanceAreaId: '',
    serviceTypeId: '',
    toleranceDays: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadData()
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setFormData({
      description: '',
      type: 'CORRECTIVE',
      osType: '',
      priority: 'NONE',
      dueDate: '',
      assetId: '',
      locationId: '',
      assignedTeamIds: [],
      assignedToId: '',
      externalId: '',
      maintenanceFrequency: '',
      frequencyValue: '1',
      estimatedDuration: '',
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
    setNextExternalId('')
  }

  const loadData = async () => {
    try {
      const [assetsRes, locationsRes, teamsRes, areasRes, stRes, stepsRes, nextIdRes] = await Promise.all([
        fetch('/api/assets?summary=true'),
        fetch('/api/locations'),
        fetch('/api/teams'),
        fetch('/api/basic-registrations/maintenance-areas'),
        fetch('/api/basic-registrations/service-types'),
        fetch('/api/basic-registrations/generic-steps'),
        fetch('/api/work-orders/next-id'),
      ])

      const [assetsData, locationsData, teamsData, areasData, stData, stepsData, nextIdData] = await Promise.all([
        assetsRes.json(),
        locationsRes.json(),
        teamsRes.json(),
        areasRes.json(),
        stRes.json(),
        stepsRes.json(),
        nextIdRes.json(),
      ])

      setAssets(assetsData.data || [])
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

  /* ---- Asset autocomplete ---- */

  const handleAssetSelect = (asset: AssetItem) => {
    setFormData(prev => ({
      ...prev,
      assetId: asset.id,
      locationId: asset.locationId || prev.locationId
    }))
    setAssetCodeSearch(asset.protheusCode || asset.tag || '')
    setAssetNameSearch(asset.name)
    setAssetCodeDropdownOpen(false)
    setAssetNameDropdownOpen(false)
  }

  const clearAsset = () => {
    setFormData(prev => ({ ...prev, assetId: '' }))
    setAssetCodeSearch('')
    setAssetNameSearch('')
  }

  const filteredAssetsByCode = assetCodeSearch.trim()
    ? assets.filter(a => {
        const q = assetCodeSearch.toLowerCase()
        return (a.protheusCode?.toLowerCase().includes(q)) || (a.tag?.toLowerCase().includes(q))
      })
    : assets.filter(a => a.protheusCode || a.tag)

  const filteredAssetsByName = assetNameSearch.trim()
    ? assets.filter(a => a.name.toLowerCase().includes(assetNameSearch.toLowerCase()))
    : assets

  /* ---- Asset hierarchy ---- */

  const getAssetHierarchy = (assetId: string): string[] => {
    const chain: string[] = []
    const assetMap = new Map(assets.map(a => [a.id, a]))
    let current = assetMap.get(assetId)
    const visited = new Set<string>()
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      chain.unshift(current.name)
      current = current.parentAssetId ? assetMap.get(current.parentAssetId) : undefined
    }
    return chain
  }

  const selectedAssetHierarchy = formData.assetId ? getAssetHierarchy(formData.assetId) : []

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
    if (formData.maintenanceAreaId) {
      setServiceTypes(allServiceTypes.filter(st => st.maintenanceAreaId === formData.maintenanceAreaId))
    } else {
      setServiceTypes(allServiceTypes)
    }
  }, [formData.maintenanceAreaId, allServiceTypes])

  /* ---- Click outside to close dropdowns ---- */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assetCodeRef.current && !assetCodeRef.current.contains(e.target as Node)) {
        setAssetCodeDropdownOpen(false)
      }
      if (assetNameRef.current && !assetNameRef.current.contains(e.target as Node)) {
        setAssetNameDropdownOpen(false)
      }
      // Close step dropdowns
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
          estimatedDuration: formData.estimatedDuration ? Number(formData.estimatedDuration) : null,
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Código do Bem - autocomplete */}
              <div ref={assetCodeRef} className="relative">
                <label className={labelCls}>Codigo do Bem</label>
                <div className="relative">
                  <input
                    type="text"
                    value={assetCodeSearch}
                    onChange={(e) => {
                      setAssetCodeSearch(e.target.value)
                      setAssetCodeDropdownOpen(true)
                      if (!e.target.value) clearAsset()
                    }}
                    onFocus={() => setAssetCodeDropdownOpen(true)}
                    placeholder="Buscar por codigo..."
                    className={inputCls}
                  />
                  {formData.assetId && (
                    <button type="button" onClick={clearAsset}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Icon name="close" className="text-sm" />
                    </button>
                  )}
                </div>
                {assetCodeDropdownOpen && filteredAssetsByCode.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-input rounded-[4px] shadow-lg">
                    {filteredAssetsByCode.slice(0, 50).map(asset => (
                      <button key={asset.id} type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                        onClick={() => handleAssetSelect(asset)}>
                        <span className="font-medium">{asset.protheusCode || asset.tag || '—'}</span>
                        <span className="text-muted-foreground ml-2">— {asset.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nome do Bem - autocomplete */}
              <div ref={assetNameRef} className="relative">
                <label className={labelCls}>Nome do Bem</label>
                <div className="relative">
                  <input
                    type="text"
                    value={assetNameSearch}
                    onChange={(e) => {
                      setAssetNameSearch(e.target.value)
                      setAssetNameDropdownOpen(true)
                      if (!e.target.value) clearAsset()
                    }}
                    onFocus={() => setAssetNameDropdownOpen(true)}
                    placeholder="Buscar por nome..."
                    className={inputCls}
                  />
                  {formData.assetId && (
                    <button type="button" onClick={clearAsset}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Icon name="close" className="text-sm" />
                    </button>
                  )}
                </div>
                {assetNameDropdownOpen && filteredAssetsByName.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-input rounded-[4px] shadow-lg">
                    {filteredAssetsByName.slice(0, 50).map(asset => (
                      <button key={asset.id} type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                        onClick={() => handleAssetSelect(asset)}>
                        <span className="font-medium">{asset.name}</span>
                        {(asset.protheusCode || asset.tag) && (
                          <span className="text-muted-foreground ml-2">({asset.protheusCode || asset.tag})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Localização */}
              <div>
                <label className={labelCls}>Localizacao</label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className={selectCls}
                >
                  <option value="">Selecione uma localizacao</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedAssetHierarchy.length > 1 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground bg-gray-50 border border-gray-200 rounded-[4px] px-3 py-2">
                <Icon name="account_tree" className="text-sm text-gray-400 mr-1" />
                {selectedAssetHierarchy.map((name, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <Icon name="chevron_right" className="text-sm text-gray-400" />}
                    <span className={i === selectedAssetHierarchy.length - 1 ? 'font-semibold text-gray-700' : ''}>
                      {name}
                    </span>
                  </span>
                ))}
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

          {/* Periodicidade (condicional) */}
          {formData.type === 'PREVENTIVE' && (
            <ModalSection title="Periodicidade">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Frequencia</label>
                  <select
                    value={formData.maintenanceFrequency}
                    onChange={(e) => setFormData({ ...formData, maintenanceFrequency: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Selecione a frequencia</option>
                    <option value="DAILY">Diaria</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="BIWEEKLY">Quinzenal</option>
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="SEMI_ANNUAL">Semestral</option>
                    <option value="ANNUAL">Anual</option>
                    <option value="CUSTOM">Personalizada</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>A cada (numero de periodos)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.frequencyValue}
                    onChange={(e) => setFormData({ ...formData, frequencyValue: e.target.value })}
                    placeholder="Ex: 2 (para a cada 2 semanas)"
                    className={inputCls}
                  />
                </div>
              </div>
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
            <div className="mb-3">
              <label className={labelCls}>Tempo de Execucao (min)</label>
              <input
                type="number"
                min={1}
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                placeholder="Ex: 30"
                className="w-full sm:w-40 px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tempo que cada recurso de pessoa/ferramenta levara para executar a OS
              </p>
            </div>
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
