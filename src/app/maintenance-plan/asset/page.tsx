'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import AssetPlanDetailPanel from '@/components/asset-plans/AssetPlanDetailPanel'

/* ------------------------------------------------------------------ */
/*  Tipos locais                                                       */
/* ------------------------------------------------------------------ */

interface TaskStep { stepId: string; order: number }
interface TaskResource { resourceId: string; resourceCount: number; quantity: number; unit: string }
interface TaskRow {
  key: string
  description: string
  executionTime: number | ''
  steps: TaskStep[]
  resources: TaskResource[]
}

const emptyTask = (): TaskRow => ({
  key: crypto.randomUUID(),
  description: '',
  executionTime: '',
  steps: [],
  resources: [],
})

/* ------------------------------------------------------------------ */
/*  Constantes de estilo                                               */
/* ------------------------------------------------------------------ */

const labelCls = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'
const inputCls = 'w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

export default function AssetMaintenancePlanPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const role = user?.role ?? ''

  // --- dados da listagem ---
  const [assetPlans, setAssetPlans] = useState<any[]>([])
  const [search, setSearch] = useState('')

  // --- painel de detalhe ---
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // --- modal de criação/edição ---
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [tasks, setTasks] = useState<TaskRow[]>([emptyTask()])
  const [saving, setSaving] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [error, setError] = useState('')

  // --- dependências de select ---
  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  const [genericSteps, setGenericSteps] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [families, setFamilies] = useState<any[]>([])
  const [familyModels, setFamilyModels] = useState<any[]>([])
  const [depsLoaded, setDepsLoaded] = useState(false)

  // --- autocomplete de etapas ---
  const [stepSearch, setStepSearch] = useState<Record<string, string>>({})
  const [stepDropdownOpen, setStepDropdownOpen] = useState<Record<string, boolean>>({})
  const stepDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // --- sequência preview ---
  const [nextSequence, setNextSequence] = useState<number | null>(null)
  const [loadingSeq, setLoadingSeq] = useState(false)

  // --- campos auto derivados do ativo ---
  const [assetFamily, setAssetFamily] = useState<any>(null)
  const [assetFamilyModel, setAssetFamilyModel] = useState<any>(null)

  // --- campos auto derivados do tipo de serviço ---
  const [derivedArea, setDerivedArea] = useState<any>(null)
  const [derivedMaintType, setDerivedMaintType] = useState<any>(null)

  // --- manutenção padrão ---
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
  /*  Auth guard                                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'maintenance-plan', 'view')) {
      router.push('/dashboard'); return
    }
  }, [authLoading, user, role])

  useEffect(() => {
    if (role) loadData()
  }, [role])

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                     */
  /* ---------------------------------------------------------------- */

  const loadData = async () => {
    const res = await fetch('/api/maintenance-plans/asset')
    const data = await res.json()
    setAssetPlans(data.data || [])
  }

  /* ---------------------------------------------------------------- */
  /*  Selecionar plano para detalhe                                    */
  /* ---------------------------------------------------------------- */

  const handleSelectPlan = async (planId: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/maintenance-plans/asset/${planId}`)
      const json = await res.json()
      if (res.ok) setSelectedPlan(json.data)
    } catch { /* silent */ }
    setLoadingDetail(false)
  }

  const loadDependencies = async () => {
    const [stRes, assRes, calRes, stepsRes, resRes, famRes, modelsRes] = await Promise.all([
      fetch('/api/basic-registrations/service-types'),
      fetch('/api/assets?limit=1000'),
      fetch('/api/basic-registrations/calendars'),
      fetch('/api/basic-registrations/generic-steps'),
      fetch('/api/basic-registrations/resources'),
      fetch('/api/basic-registrations/asset-families'),
      fetch('/api/basic-registrations/asset-family-models'),
    ])
    const [stData, assData, calData, stepsData, resData, famData, modelsData] = await Promise.all([
      stRes.json(), assRes.json(), calRes.json(), stepsRes.json(), resRes.json(), famRes.json(), modelsRes.json()
    ])
    setServiceTypes(stData.data || [])
    setAssets(assData.data || [])
    setCalendars(calData.data || [])
    setGenericSteps(stepsData.data || [])
    setResources(resData.data || [])
    setFamilies(famData.data || [])
    setFamilyModels(modelsData.data || [])
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
    if (showFormModal && !editingId) {
      fetchNextSequence(formData.assetId || '', formData.serviceTypeId || '')
    }
  }, [showFormModal, editingId, formData.assetId, formData.serviceTypeId, fetchNextSequence])

  /* ---------------------------------------------------------------- */
  /*  Derivar família e tipo modelo do ativo selecionado               */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!formData.assetId) {
      setAssetFamily(null)
      setAssetFamilyModel(null)
      return
    }
    const asset = assets.find((a: any) => a.id === formData.assetId)
    if (asset) {
      const fam = asset.familyId ? families.find((f: any) => f.id === asset.familyId) : null
      const model = asset.familyModelId ? familyModels.find((m: any) => m.id === asset.familyModelId) : null
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
    const st = serviceTypes.find((s: any) => s.id === formData.serviceTypeId)
    if (st) {
      setDerivedArea(st.maintenanceArea || null)
      setDerivedMaintType(st.maintenanceType || null)
      // Auto-preencher os IDs no formData
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
  /*  Abrir / fechar modal                                             */
  /* ---------------------------------------------------------------- */

  const openCreate = () => {
    setEditingId(null)
    setFormData({})
    setTasks([emptyTask()])
    setError('')
    setNextSequence(null)
    setAssetFamily(null)
    setAssetFamilyModel(null)
    setDerivedArea(null)
    setDerivedMaintType(null)
    setIsStandard('')
    if (!depsLoaded) {
      loadDependencies()
      setDepsLoaded(true)
    }
    setShowFormModal(true)
  }

  const openEdit = async (planId: string) => {
    setEditingId(planId)
    setFormData({})
    setTasks([emptyTask()])
    setError('')
    setNextSequence(null)
    setAssetFamily(null)
    setAssetFamilyModel(null)
    setDerivedArea(null)
    setDerivedMaintType(null)
    setIsStandard('')
    if (!depsLoaded) {
      loadDependencies()
      setDepsLoaded(true)
    }
    setShowFormModal(true)
    setLoadingPlan(true)
    try {
      const res = await fetch(`/api/maintenance-plans/asset/${planId}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erro ao carregar plano'); setLoadingPlan(false); return }
      const plan = json.data
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
        setTasks(plan.tasks.map((t: any) => ({
          key: t.id || crypto.randomUUID(),
          description: t.description || '',
          executionTime: t.executionTime ?? '',
          steps: (t.steps || []).map((s: any) => ({ stepId: s.stepId, order: s.order })),
          resources: (t.resources || []).map((r: any) => ({
            resourceId: r.resourceId,
            resourceCount: r.resourceCount ?? 1,
            quantity: r.quantity ?? 0,
            unit: r.unit || 'UN',
          })),
        })))
      }
    } catch { setError('Erro ao carregar plano') }
    setLoadingPlan(false)
  }

  /* ---------------------------------------------------------------- */
  /*  Lógica Manutenção Padrão                                         */
  /* ---------------------------------------------------------------- */

  const handleStandardChange = async (value: 'sim' | 'nao') => {
    setIsStandard(value)
    if (value !== 'sim') return

    // Buscar plano padrão correspondente
    const asset = assets.find((a: any) => a.id === formData.assetId)
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
      const json = await res.json()

      if (!json.found) {
        alert('Não existe manutenção padrão para o cadastro atual.')
        setIsStandard('nao')
        setLoadingStandard(false)
        return
      }

      const stdPlan = json.data

      // Pré-preencher campos da manutenção
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

      // Pré-preencher tarefas e etapas
      if (stdPlan.tasks && stdPlan.tasks.length > 0) {
        setTasks(stdPlan.tasks.map((t: any) => ({
          key: crypto.randomUUID(),
          description: t.description || '',
          executionTime: t.executionTime ?? '',
          steps: (t.steps || []).map((s: any) => ({ stepId: s.stepId, order: s.order })),
          resources: (t.resources || []).map((r: any) => ({
            resourceId: r.resourceId,
            resourceCount: r.resourceCount ?? 1,
            quantity: r.quantity ?? 0,
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
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      if (t.steps.some(s => s.stepId === stepId)) return t
      return { ...t, steps: [...t.steps, { stepId, order: t.steps.length }] }
    }))
  }

  const removeStepFromTask = (taskKey: string, stepId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      return { ...t, steps: t.steps.filter(s => s.stepId !== stepId) }
    }))
  }

  const addResourceToTask = (taskKey: string, resourceId: string) => {
    const res = resources.find((r: any) => r.id === resourceId)
    const defaultUnit = res?.unit || 'UN'
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      if (t.resources.some(r => r.resourceId === resourceId)) return t
      return { ...t, resources: [...t.resources, { resourceId, resourceCount: 1, quantity: 0, unit: defaultUnit }] }
    }))
  }

  const removeResourceFromTask = (taskKey: string, resourceId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      return { ...t, resources: t.resources.filter(r => r.resourceId !== resourceId) }
    }))
  }

  const updateResource = (taskKey: string, resourceId: string, patch: Partial<TaskResource>) => {
    setTasks(prev => prev.map(t => {
      if (t.key !== taskKey) return t
      return { ...t, resources: t.resources.map(r => r.resourceId === resourceId ? { ...r, ...patch } : r) }
    }))
  }

  /* ---------------------------------------------------------------- */
  /*  Save                                                             */
  /* ---------------------------------------------------------------- */

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...formData,
        isStandard: isStandard === 'sim',
      }

      let planId: string

      if (editingId) {
        // Atualizar plano existente
        const planRes = await fetch(`/api/maintenance-plans/asset/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const planResult = await planRes.json()
        if (!planRes.ok) { setError(planResult.error || 'Erro ao atualizar plano'); setSaving(false); return }
        planId = editingId
      } else {
        // Criar plano
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

      // Salvar tarefas (se houver tarefas preenchidas)
      const validTasks = tasks.filter(t => t.description.trim())
      if (validTasks.length > 0) {
        const tasksPayload = validTasks.map((t, i) => ({
          description: t.description.trim(),
          order: i,
          executionTime: t.executionTime !== '' ? Number(t.executionTime) : null,
          steps: t.steps.map((s, j) => ({ stepId: s.stepId, order: j })),
          resources: t.resources.map(r => ({
            resourceId: r.resourceId,
            resourceCount: r.resourceCount,
            quantity: r.quantity,
            unit: r.unit,
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
          loadData()
          return
        }
      }

      setShowFormModal(false)
      loadData()
    } catch { setError('Erro de conexão') }
    setSaving(false)
  }

  /* ---------------------------------------------------------------- */
  /*  Delete                                                           */
  /* ---------------------------------------------------------------- */

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este plano?')) return
    try {
      const res = await fetch(`/api/maintenance-plans/asset/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error || 'Erro ao excluir plano')
        return
      }
      if (selectedPlan?.id === id) setSelectedPlan(null)
      loadData()
    } catch {
      alert('Erro de conexão ao excluir plano')
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Derived                                                          */
  /* ---------------------------------------------------------------- */

  const canEdit = role && hasPermission(role as UserRole, 'maintenance-plan', 'create')

  const filteredAsset = assetPlans.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.asset?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.asset?.protheusCode?.toLowerCase().includes(search.toLowerCase()) ||
    p.asset?.tag?.toLowerCase().includes(search.toLowerCase())
  )

  /* ---------------------------------------------------------------- */
  /*  Loading                                                          */
  /* ---------------------------------------------------------------- */

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex items-center justify-center flex-1">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        </div>
      </PageContainer>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Manutenção do Bem"
          description="Planos de manutenção por bem/ativo individual"
          actions={
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {canEdit && (
                <Button onClick={openCreate} size="sm">
                  <Icon name="add" className="text-base mr-1" /> Novo Plano
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Tabela + Painel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <div className={`${selectedPlan ? 'w-1/2 min-w-0' : 'w-full'} transition-all overflow-hidden flex flex-col`}>
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 bg-secondary z-10">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Código</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome do Bem</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo Serviço</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Seq.</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome Manutenção</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Frequência</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo de Controle</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ativa?</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-gray-200">
                  {filteredAsset.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">Nenhum plano de manutenção do bem cadastrado.</td></tr>
                  ) : filteredAsset.map(p => (
                    <tr key={p.id} className={`hover:bg-secondary cursor-pointer transition-colors ${selectedPlan?.id === p.id ? 'bg-secondary' : ''}`} onClick={() => handleSelectPlan(p.id)}>
                      <td className="px-6 py-3 text-sm font-mono">
                        {p.asset?.protheusCode || '-'}
                        {p.asset?.tag && <span className="ml-1 text-xs text-muted-foreground">({p.asset.tag})</span>}
                      </td>
                      <td className="px-6 py-3 text-sm">{p.asset?.name}</td>
                      <td className="px-6 py-3 text-sm">{p.serviceType?.name}</td>
                      <td className="px-6 py-3 text-sm">{p.sequence}</td>
                      <td className="px-6 py-3 text-sm font-medium">{p.name || '-'}</td>
                      <td className="px-6 py-3 text-sm">{p.maintenanceTime ? `${p.maintenanceTime} ${p.timeUnit}` : '-'}</td>
                      <td className="px-6 py-3 text-sm">{p.trackingType === 'HORIMETER' ? 'Horímetro' : 'Tempo'}</td>
                      <td className="px-6 py-3 text-sm">{p.isActive ? 'Sim' : 'Não'}</td>
                      <td className="px-6 py-3 text-sm text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button onClick={() => openEdit(p.id)} className="p-1.5 hover:bg-muted rounded transition-colors"><Icon name="edit" className="text-base text-muted-foreground" /></button>
                          )}
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-danger-light rounded"><Icon name="delete" className="text-base text-danger" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Painel de detalhe */}
          {selectedPlan && (
            <div className="w-1/2 min-w-0">
              {loadingDetail ? (
                <div className="h-full flex items-center justify-center bg-card border-l border-border">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
                    <p className="mt-2 text-muted-foreground">Carregando...</p>
                  </div>
                </div>
              ) : (
                <AssetPlanDetailPanel
                  plan={selectedPlan}
                  onClose={() => setSelectedPlan(null)}
                  onEdit={(planId) => { setSelectedPlan(null); openEdit(planId) }}
                  onDelete={(planId) => { setSelectedPlan(null); handleDelete(planId) }}
                  canEdit={!!canEdit}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de criação/edição */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingId ? 'Editar Plano do Bem' : 'Novo Plano do Bem'} size="wide">
        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
          <div className="p-4 space-y-3">
            {error && <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">{error}</div>}

            {/* ============ CLASSIFICAÇÃO ============ */}
            <ModalSection title="Classificação">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Bem/Ativo */}
                <div>
                  <label className={labelCls}>Bem/Ativo <span className="text-danger">*</span></label>
                  <select value={formData.assetId || ''} onChange={e => setFormData({ ...formData, assetId: e.target.value })} className={selectCls}>
                    <option value="">Selecione...</option>
                    {assets.map((a: any) => <option key={a.id} value={a.id}>{a.tag ? `[${a.tag}] ` : ''}{a.name}</option>)}
                  </select>
                </div>

                {/* Família de Bens (auto) */}
                <div>
                  <label className={labelCls}>Família de Bens</label>
                  <input
                    type="text"
                    readOnly
                    value={assetFamily ? `${assetFamily.code} - ${assetFamily.name}` : '-'}
                    className={`${inputCls} bg-muted cursor-not-allowed`}
                  />
                </div>

                {/* Tipo Modelo (auto) */}
                <div>
                  <label className={labelCls}>Tipo Modelo</label>
                  <input
                    type="text"
                    readOnly
                    value={assetFamilyModel ? assetFamilyModel.name : 'Genérico'}
                    className={`${inputCls} bg-muted cursor-not-allowed`}
                  />
                </div>

                {/* Tipo de Serviço */}
                <div>
                  <label className={labelCls}>Tipo de Serviço <span className="text-danger">*</span></label>
                  <select value={formData.serviceTypeId || ''} onChange={e => setFormData({ ...formData, serviceTypeId: e.target.value })} className={selectCls}>
                    <option value="">Selecione...</option>
                    {serviceTypes.map((st: any) => <option key={st.id} value={st.id}>{st.code} - {st.name}</option>)}
                  </select>
                </div>

                {/* Área de Manutenção (auto) */}
                <div>
                  <label className={labelCls}>Área de Manutenção</label>
                  <input
                    type="text"
                    readOnly
                    value={derivedArea?.name || '-'}
                    className={`${inputCls} bg-muted cursor-not-allowed`}
                  />
                </div>

                {/* Tipo de Manutenção (auto) */}
                <div>
                  <label className={labelCls}>Tipo de Manutenção</label>
                  <input
                    type="text"
                    readOnly
                    value={derivedMaintType?.name || '-'}
                    className={`${inputCls} bg-muted cursor-not-allowed`}
                  />
                </div>

                {/* Sequência (auto) */}
                <div>
                  <label className={labelCls}>Sequência</label>
                  <input
                    type="text"
                    readOnly
                    value={loadingSeq ? '...' : (nextSequence ?? '-')}
                    className={`${inputCls} bg-muted cursor-not-allowed`}
                  />
                </div>

                {/* Manutenção Padrão? */}
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
                {/* Nome da Manutenção */}
                <div className="col-span-2 md:col-span-3">
                  <label className={labelCls}>Nome da Manutenção</label>
                  <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Manutenção Prev. Mec. 28 Dias" className={inputCls} />
                </div>

                {/* Calendário */}
                <div className="col-span-2 md:col-span-3">
                  <label className={labelCls}>Calendário</label>
                  <select value={formData.calendarId || ''} onChange={e => setFormData({ ...formData, calendarId: e.target.value })} className={selectCls}>
                    <option value="">Nenhum</option>
                    {calendars.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Tipo de Controle */}
                <div>
                  <label className={labelCls}>Tipo de Controle</label>
                  <select value={formData.trackingType || 'TIME'} onChange={e => setFormData({ ...formData, trackingType: e.target.value })} className={selectCls}>
                    <option value="TIME">Tempo Pré-determinado</option>
                    <option value="HORIMETER">Horímetro</option>
                  </select>
                </div>

                {/* Tempo */}
                <div>
                  <label className={labelCls}>Tempo</label>
                  <input type="number" value={formData.maintenanceTime || ''} onChange={e => setFormData({ ...formData, maintenanceTime: Number(e.target.value) })}
                    placeholder="Ex: 28" className={inputCls} />
                </div>

                {/* Unidade */}
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

                {/* Período */}
                <div>
                  <label className={labelCls}>Período</label>
                  <select value={formData.period || ''} onChange={e => setFormData({ ...formData, period: e.target.value })} className={selectCls}>
                    <option value="">Selecione...</option>
                    <option value="Repetitiva">Repetitiva</option>
                    <option value="Unica">Única</option>
                  </select>
                </div>

                {/* Data da Última Manutenção */}
                <div>
                  <label className={labelCls}>Data da Última Manutenção</label>
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
                    {/* Header da tarefa */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Tarefa {idx + 1}</span>
                      <div className="flex-1" />
                      {tasks.length > 1 && (
                        <button type="button" onClick={() => removeTask(task.key)} className="p-1 hover:bg-danger-light rounded">
                          <Icon name="close" className="text-base text-danger" />
                        </button>
                      )}
                    </div>

                    {/* Descrição + Tempo de execução */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-3">
                        <label className={labelCls}>Descrição da Tarefa <span className="text-danger">*</span></label>
                        <input type="text" value={task.description} onChange={e => updateTask(task.key, { description: e.target.value })}
                          placeholder="Ex: Inspecionar correia transportadora" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Tempo Execução (min)</label>
                        <input type="number" value={task.executionTime} onChange={e => updateTask(task.key, { executionTime: e.target.value === '' ? '' : Number(e.target.value) })}
                          placeholder="Ex: 60" className={inputCls} />
                      </div>
                    </div>

                    {/* Etapas */}
                    <div>
                      <label className={labelCls}>Etapas</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {task.steps.map(s => {
                          const step = genericSteps.find((gs: any) => gs.id === s.stepId)
                          return (
                            <span key={s.stepId} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded-[4px]">
                              {step?.name || s.stepId}
                              <button type="button" onClick={() => removeStepFromTask(task.key, s.stepId)} className="hover:text-danger">
                                <Icon name="close" className="text-xs" />
                              </button>
                            </span>
                          )
                        })}
                      </div>
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
                            .filter((gs: any) => !task.steps.some(s => s.stepId === gs.id))
                            .filter((gs: any) => !query || gs.name.toLowerCase().includes(query))
                          return available.length > 0 ? (
                            <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-input rounded-[4px] shadow-lg">
                              {available.map((gs: any) => (
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

                    {/* Recursos */}
                    <div>
                      <label className={labelCls}>Recursos</label>
                      {task.resources.length > 0 && (
                        <div className="space-y-2 mb-2">
                          {task.resources.map(r => {
                            const res = resources.find((rs: any) => rs.id === r.resourceId)
                            const isMaoDeObra = res?.type === 'MAO_DE_OBRA' || res?.type === 'LABOR'
                            return (
                              <div key={r.resourceId} className="flex items-center gap-2 p-2 bg-muted rounded-[4px]">
                                <span className="text-sm flex-1 min-w-0 truncate">{res?.name || r.resourceId}</span>
                                <div className="flex items-center gap-1">
                                  <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                                  <input type="number" min={0} step={0.01} value={r.resourceCount}
                                    onChange={e => updateResource(task.key, r.resourceId, { resourceCount: e.target.value === '' ? 0 : Number(e.target.value) })}
                                    className="w-20 px-2 py-1 text-xs border border-input rounded-[4px]" />
                                </div>
                                <div className="flex items-center gap-1">
                                  <label className="text-xs text-muted-foreground whitespace-nowrap">Und:</label>
                                  <input type="text" value={r.unit}
                                    onChange={e => updateResource(task.key, r.resourceId, { unit: e.target.value })}
                                    placeholder="Ex: UN, KG, L"
                                    className="w-20 px-2 py-1 text-xs border border-input rounded-[4px]" />
                                </div>
                                {isMaoDeObra && (
                                  <div className="flex items-center gap-1">
                                    <label className="text-xs text-muted-foreground whitespace-nowrap">Horas:</label>
                                    <input type="number" min={0} step={0.5} value={r.quantity}
                                      onChange={e => updateResource(task.key, r.resourceId, { quantity: Number(e.target.value) || 0 })}
                                      className="w-16 px-2 py-1 text-xs border border-input rounded-[4px]" />
                                  </div>
                                )}
                                <button type="button" onClick={() => removeResourceFromTask(task.key, r.resourceId)} className="p-0.5 hover:text-danger">
                                  <Icon name="close" className="text-sm" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <select
                        value=""
                        onChange={e => { if (e.target.value) addResourceToTask(task.key, e.target.value) }}
                        className={selectCls}
                      >
                        <option value="">+ Adicionar recurso...</option>
                        {resources
                          .filter((rs: any) => !task.resources.some(r => r.resourceId === rs.id))
                          .map((rs: any) => <option key={rs.id} value={rs.id}>{rs.name} ({rs.type})</option>)}
                      </select>
                    </div>
                  </div>
                ))}

                {/* Botão adicionar tarefa */}
                <button type="button" onClick={addTask}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium">
                  <Icon name="add" className="text-base" />
                  Adicionar Tarefa
                </button>
              </div>
            </ModalSection>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-4 py-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setShowFormModal(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Icon name="save" className="text-base mr-2" />
              {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  )
}
