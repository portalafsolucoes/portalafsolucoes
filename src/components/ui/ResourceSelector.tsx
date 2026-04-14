'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { UNIT_OPTIONS } from '@/lib/unit-options'

/* ------------------------------------------------------------------ */
/*  Tipos                                                               */
/* ------------------------------------------------------------------ */

export type ResourceType = 'SPECIALTY' | 'LABOR' | 'MATERIAL' | 'TOOL'

export interface TaskResourceItem {
  resourceType: ResourceType
  resourceId?: string | null
  jobTitleId?: string | null
  userId?: string | null
  quantity?: number | null
  hours?: number | null
  unit?: string | null
  /** Nome para exibição (preenchido pelo componente) */
  displayName?: string
}

interface JobTitleOption { id: string; name: string }
interface UserOption { id: string; firstName: string; lastName: string; jobTitle?: string | null }
interface MaterialToolOption { id: string; name: string; type: string; unit?: string | null }

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  SPECIALTY: 'Especialidade',
  LABOR: 'Mão de Obra',
  MATERIAL: 'Material',
  TOOL: 'Ferramenta',
}

/* ------------------------------------------------------------------ */
/*  Campos condicionais por tipo                                        */
/*  SPECIALTY → Quantidade (nº pessoas)                                */
/*  LABOR     → (sem campos extras)                                    */
/*  MATERIAL  → Quantidade + Unidade                                   */
/*  TOOL      → Quantidade                                             */
/*  Horas são derivadas do executionTime da tarefa/OS, não informadas  */
/*  manualmente por recurso.                                           */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<ResourceType, { showQuantity: boolean; showHours: boolean }> = {
  SPECIALTY: { showQuantity: true, showHours: false },
  LABOR:     { showQuantity: false, showHours: false },
  MATERIAL:  { showQuantity: true, showHours: false },
  TOOL:      { showQuantity: true, showHours: false },
}

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface ResourceSelectorProps {
  /** Lista atual de recursos da tarefa/OS */
  resources: TaskResourceItem[]
  /** Callback chamado ao alterar a lista */
  onChange: (resources: TaskResourceItem[]) => void
  /** Classes CSS adicionais no container */
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Componente                                                          */
/* ------------------------------------------------------------------ */

export function ResourceSelector({ resources, onChange, className }: ResourceSelectorProps) {
  const { user } = useAuth()
  const companyId = user?.companyId

  // Listas de opções
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [materials, setMaterials] = useState<MaterialToolOption[]>([])
  const [tools, setTools] = useState<MaterialToolOption[]>([])
  const [loaded, setLoaded] = useState(false)

  // Estado do formulário de adição
  const [addType, setAddType] = useState<ResourceType | ''>('')
  const [addTarget, setAddTarget] = useState('')

  const fetchOptions = useCallback(async () => {
    if (!companyId) return
    try {
      const [jtRes, usersRes, resRes] = await Promise.all([
        fetch('/api/basic-registrations/job-titles'),
        fetch('/api/users?enabled=true&brief=resource'),
        fetch('/api/basic-registrations/resources'),
      ])
      const [jtData, usersData, resData] = await Promise.all([
        jtRes.json(), usersRes.json(), resRes.json(),
      ])
      setJobTitles(Array.isArray(jtData) ? jtData : jtData.data || [])
      setUsers(Array.isArray(usersData) ? usersData : usersData.data || [])
      const allResources: MaterialToolOption[] = Array.isArray(resData) ? resData : resData.data || []
      setMaterials(allResources.filter(r => r.type === 'MATERIAL'))
      setTools(allResources.filter(r => r.type === 'TOOL'))
      setLoaded(true)
    } catch {
      setLoaded(true)
    }
  }, [companyId])

  useEffect(() => { fetchOptions() }, [fetchOptions])

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                          */
  /* ---------------------------------------------------------------- */

  const getDisplayName = useCallback((item: TaskResourceItem): string => {
    if (item.resourceType === 'SPECIALTY') {
      const jt = jobTitles.find(j => j.id === item.jobTitleId)
      return jt?.name || 'Especialidade'
    }
    if (item.resourceType === 'LABOR') {
      const u = users.find(u => u.id === item.userId)
      return u ? `${u.firstName} ${u.lastName}` : 'Mão de Obra'
    }
    if (item.resourceType === 'MATERIAL') {
      const m = materials.find(m => m.id === item.resourceId)
      return m?.name || 'Material'
    }
    if (item.resourceType === 'TOOL') {
      const t = tools.find(t => t.id === item.resourceId)
      return t?.name || 'Ferramenta'
    }
    return ''
  }, [jobTitles, users, materials, tools])

  const handleAddResource = () => {
    if (!addType || !addTarget) return

    // Evitar duplicatas
    const isDuplicate = resources.some(r => {
      if (r.resourceType !== addType) return false
      if (addType === 'SPECIALTY') return r.jobTitleId === addTarget
      if (addType === 'LABOR') return r.userId === addTarget
      return r.resourceId === addTarget
    })
    if (isDuplicate) { setAddTarget(''); return }

    const config = TYPE_CONFIG[addType]
    const newItem: TaskResourceItem = {
      resourceType: addType,
      resourceId: (addType === 'MATERIAL' || addType === 'TOOL') ? addTarget : null,
      jobTitleId: addType === 'SPECIALTY' ? addTarget : null,
      userId: addType === 'LABOR' ? addTarget : null,
      quantity: config.showQuantity ? 1 : null,
      hours: config.showHours ? 0 : null,
      unit: addType === 'MATERIAL' ? (materials.find(m => m.id === addTarget)?.unit || 'un') : null,
    }

    onChange([...resources, newItem])
    setAddType('')
    setAddTarget('')
  }

  const handleRemove = (index: number) => {
    onChange(resources.filter((_, i) => i !== index))
  }

  const handleUpdate = (index: number, patch: Partial<TaskResourceItem>) => {
    onChange(resources.map((r, i) => i === index ? { ...r, ...patch } : r))
  }

  /* ---------------------------------------------------------------- */
  /*  Opções do segundo dropdown conforme tipo selecionado              */
  /* ---------------------------------------------------------------- */

  const getTargetOptions = (): { value: string; label: string }[] => {
    if (addType === 'SPECIALTY') {
      return jobTitles.map(jt => ({ value: jt.id, label: jt.name }))
    }
    if (addType === 'LABOR') {
      return users.map(u => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName}${u.jobTitle ? ` (${u.jobTitle})` : ''}`,
      }))
    }
    if (addType === 'MATERIAL') {
      return materials.map(m => ({ value: m.id, label: m.name }))
    }
    if (addType === 'TOOL') {
      return tools.map(t => ({ value: t.id, label: t.name }))
    }
    return []
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  const selectCls = 'w-full px-3 py-2 text-sm border border-input rounded-[4px] shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background'

  if (!loaded) {
    return <div className="text-xs text-muted-foreground">Carregando recursos...</div>
  }

  return (
    <div className={className}>
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">
        Recursos
      </label>

      {/* Lista de recursos adicionados */}
      {resources.length > 0 && (
        <div className="space-y-2 mb-2">
          {resources.map((r, idx) => {
            const config = TYPE_CONFIG[r.resourceType]
            const name = getDisplayName(r)
            return (
              <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-[4px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">
                  {RESOURCE_TYPE_LABELS[r.resourceType]}
                </span>
                <span className="text-sm flex-1 min-w-0 truncate">{name}</span>

                {config.showQuantity && (
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                    <input
                      type="number" min={0} step={0.01}
                      value={r.quantity ?? ''}
                      onChange={e => handleUpdate(idx, { quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-16 px-2 py-1 text-xs border border-input rounded-[4px]"
                    />
                  </div>
                )}

                {r.resourceType === 'MATERIAL' && (
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Und:</label>
                    <select
                      value={r.unit ?? 'un'}
                      onChange={e => handleUpdate(idx, { unit: e.target.value })}
                      className="w-20 px-2 py-1 text-xs border border-input rounded-[4px] bg-background"
                    >
                      {UNIT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.value}</option>
                      ))}
                      {r.unit && !UNIT_OPTIONS.some(o => o.value === r.unit) && (
                        <option value={r.unit}>{r.unit}</option>
                      )}
                    </select>
                  </div>
                )}

                {config.showHours && (
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Horas:</label>
                    <input
                      type="number" min={0} step={0.5}
                      value={r.hours ?? ''}
                      onChange={e => handleUpdate(idx, { hours: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-16 px-2 py-1 text-xs border border-input rounded-[4px]"
                    />
                  </div>
                )}

                <button type="button" onClick={() => handleRemove(idx)} className="p-0.5 hover:text-danger">
                  <Icon name="close" className="text-sm" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulário de adição */}
      <div className="flex items-center gap-2">
        <select
          value={addType}
          onChange={e => { setAddType(e.target.value as ResourceType | ''); setAddTarget('') }}
          className={selectCls + ' flex-1'}
        >
          <option value="">+ Tipo de recurso...</option>
          <option value="SPECIALTY">Especialidade</option>
          <option value="LABOR">Mão de Obra</option>
          <option value="MATERIAL">Material</option>
          <option value="TOOL">Ferramenta</option>
        </select>

        {addType && (
          <select
            value={addTarget}
            onChange={e => setAddTarget(e.target.value)}
            className={selectCls + ' flex-1'}
          >
            <option value="">Selecionar...</option>
            {getTargetOptions().map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}

        {addType && addTarget && (
          <button
            type="button"
            onClick={handleAddResource}
            className="p-1.5 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
          >
            <Icon name="add" className="text-base" />
          </button>
        )}
      </div>
    </div>
  )
}
