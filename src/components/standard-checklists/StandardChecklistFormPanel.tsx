'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { GenericStepCombobox } from '@/components/standard-checklists/GenericStepCombobox'

interface WorkCenterOption { id: string; name: string; protheusCode: string | null }
interface ServiceTypeOption { id: string; code: string | null; name: string }
interface FamilyModelPair {
  assetFamilyId: string
  familyModelId: string
  assetFamily: { id: string; code: string | null; name: string }
  familyModel: { id: string; name: string }
  assetCount: number
}
interface GenericStepOption { id: string; name: string; protheusCode: string | null }

interface FamilyGroupRow {
  key: string
  assetFamilyId: string
  familyModelId: string
  assetFamilyName: string
  familyModelName: string
  steps: Array<{ key: string; genericStepId: string }>
}

interface Props {
  editingId?: string | null
  inPage?: boolean
  onClose: () => void
  onSuccess: () => void
}

const labelCls = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'
const inputCls = 'w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls

export default function StandardChecklistFormPanel({ editingId, onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [workCenterId, setWorkCenterId] = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [workCenters, setWorkCenters] = useState<WorkCenterOption[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeOption[]>([])
  const [genericSteps, setGenericSteps] = useState<GenericStepOption[]>([])

  const [familyGroups, setFamilyGroups] = useState<FamilyGroupRow[]>([])
  const [loadingFamilies, setLoadingFamilies] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedStepsByGroup, setSelectedStepsByGroup] = useState<Record<string, Set<string>>>({})
  const [copyMenuOpenFor, setCopyMenuOpenFor] = useState<string | null>(null)
  const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set())

  const copyMenuRef = useRef<HTMLDivElement | null>(null)

  // load catalogos
  useEffect(() => {
    void (async () => {
      try {
        const [wcRes, stRes, gsRes] = await Promise.all([
          fetch('/api/basic-registrations/work-centers'),
          fetch('/api/basic-registrations/service-types'),
          fetch('/api/basic-registrations/generic-steps'),
        ])
        const [wc, st, gs] = await Promise.all([wcRes.json(), stRes.json(), gsRes.json()])
        setWorkCenters(wc.data || [])
        setServiceTypes(st.data || [])
        setGenericSteps(gs.data || [])
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  // se editar, carrega checklist
  useEffect(() => {
    if (!editingId) return
    void (async () => {
      try {
        const res = await fetch(`/api/maintenance-plans/standard-checklists/${editingId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erro ao carregar')
        const cl = json.data
        setName(cl.name || '')
        setWorkCenterId(cl.workCenterId || '')
        setServiceTypeId(cl.serviceTypeId || '')
        setIsActive(cl.isActive !== false)
        const groups: FamilyGroupRow[] = (cl.familyGroups || []).map((g: {
          assetFamilyId: string
          familyModelId: string
          assetFamily?: { code?: string | null; name?: string }
          familyModel?: { name?: string }
          steps?: Array<{ genericStepId: string }>
        }) => ({
          key: crypto.randomUUID(),
          assetFamilyId: g.assetFamilyId,
          familyModelId: g.familyModelId,
          assetFamilyName: `${g.assetFamily?.code ? g.assetFamily.code + ' - ' : ''}${g.assetFamily?.name || ''}`,
          familyModelName: g.familyModel?.name || '',
          steps: (g.steps || []).map((s) => ({ key: crypto.randomUUID(), genericStepId: s.genericStepId })),
        }))
        setFamilyGroups(groups)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar'
        setError(msg)
      }
    })()
  }, [editingId])

  // detecta familias do WC
  const detectFamiliesFromWC = useCallback(async (wcId: string) => {
    if (!wcId) return
    setLoadingFamilies(true)
    try {
      const res = await fetch(`/api/work-centers/${wcId}/family-models`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao detectar familias')
      const pairs: FamilyModelPair[] = json.data || []

      // mantem grupos existentes; adiciona novos pares ainda nao mapeados
      setFamilyGroups(prev => {
        const known = new Set(prev.map(g => `${g.assetFamilyId}:${g.familyModelId}`))
        const additions: FamilyGroupRow[] = []
        for (const p of pairs) {
          const key = `${p.assetFamilyId}:${p.familyModelId}`
          if (known.has(key)) continue
          additions.push({
            key: crypto.randomUUID(),
            assetFamilyId: p.assetFamilyId,
            familyModelId: p.familyModelId,
            assetFamilyName: `${p.assetFamily.code ? p.assetFamily.code + ' - ' : ''}${p.assetFamily.name}`,
            familyModelName: p.familyModel.name,
            steps: [],
          })
        }
        return [...prev, ...additions]
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingFamilies(false)
    }
  }, [])

  useEffect(() => {
    if (!editingId && workCenterId) {
      void detectFamiliesFromWC(workCenterId)
    }
  }, [workCenterId, editingId, detectFamiliesFromWC])

  // click outside / ESC para fechar popover de copia
  useEffect(() => {
    if (!copyMenuOpenFor) return
    const onMouseDown = (ev: MouseEvent) => {
      const node = copyMenuRef.current
      if (node && !node.contains(ev.target as Node)) {
        setCopyMenuOpenFor(null)
        setCopyTargets(new Set())
      }
    }
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setCopyMenuOpenFor(null)
        setCopyTargets(new Set())
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [copyMenuOpenFor])

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const validStepCount = (group: FamilyGroupRow) =>
    group.steps.filter(s => s.genericStepId).length

  const selectionCount = (groupKey: string) =>
    selectedStepsByGroup[groupKey]?.size ?? 0

  const isStepSelected = (groupKey: string, stepKey: string) =>
    selectedStepsByGroup[groupKey]?.has(stepKey) ?? false

  const toggleStepSelection = (groupKey: string, stepKey: string) => {
    setSelectedStepsByGroup(prev => {
      const cur = new Set(prev[groupKey] ?? [])
      if (cur.has(stepKey)) cur.delete(stepKey)
      else cur.add(stepKey)
      return { ...prev, [groupKey]: cur }
    })
  }

  const toggleSelectAllInGroup = (groupKey: string) => {
    const group = familyGroups.find(g => g.key === groupKey)
    if (!group) return
    const validKeys = group.steps.filter(s => s.genericStepId).map(s => s.key)
    const cur = selectedStepsByGroup[groupKey] ?? new Set()
    const allSelected = validKeys.length > 0 && validKeys.every(k => cur.has(k))
    setSelectedStepsByGroup(prev => ({
      ...prev,
      [groupKey]: allSelected ? new Set() : new Set(validKeys),
    }))
  }

  const moveStepUp = (groupKey: string, idx: number) => {
    if (idx <= 0) return
    setFamilyGroups(gs => gs.map(g => {
      if (g.key !== groupKey) return g
      const next = [...g.steps]
      const tmp = next[idx - 1]
      next[idx - 1] = next[idx]
      next[idx] = tmp
      return { ...g, steps: next }
    }))
  }

  const moveStepDown = (groupKey: string, idx: number) => {
    setFamilyGroups(gs => gs.map(g => {
      if (g.key !== groupKey) return g
      if (idx >= g.steps.length - 1) return g
      const next = [...g.steps]
      const tmp = next[idx + 1]
      next[idx + 1] = next[idx]
      next[idx] = tmp
      return { ...g, steps: next }
    }))
  }

  const openCopyMenu = (groupKey: string) => {
    setCopyMenuOpenFor(groupKey)
    setCopyTargets(new Set())
  }

  const closeCopyMenu = () => {
    setCopyMenuOpenFor(null)
    setCopyTargets(new Set())
  }

  const toggleCopyTarget = (groupKey: string) => {
    setCopyTargets(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const performCopy = (sourceGroupKey: string) => {
    const sourceGroup = familyGroups.find(g => g.key === sourceGroupKey)
    if (!sourceGroup) return
    const selectedKeys = selectedStepsByGroup[sourceGroupKey] ?? new Set()
    const stepsToCopy = sourceGroup.steps.filter(s => selectedKeys.has(s.key) && s.genericStepId)
    if (stepsToCopy.length === 0 || copyTargets.size === 0) return

    setFamilyGroups(gs => gs.map(g => {
      if (!copyTargets.has(g.key)) return g
      const existing = new Set(g.steps.map(s => s.genericStepId).filter(Boolean))
      const additions: FamilyGroupRow['steps'] = []
      for (const step of stepsToCopy) {
        if (existing.has(step.genericStepId)) continue
        existing.add(step.genericStepId)
        additions.push({ key: crypto.randomUUID(), genericStepId: step.genericStepId })
      }
      if (additions.length === 0) return g
      return { ...g, steps: [...g.steps, ...additions] }
    }))

    setExpandedGroups(prev => {
      const next = new Set(prev)
      for (const k of copyTargets) next.add(k)
      return next
    })

    setSelectedStepsByGroup(prev => ({ ...prev, [sourceGroupKey]: new Set() }))
    closeCopyMenu()
  }

  const addStep = (groupKey: string) => {
    setFamilyGroups(gs => gs.map(g => g.key === groupKey
      ? { ...g, steps: [...g.steps, { key: crypto.randomUUID(), genericStepId: '' }] }
      : g))
  }

  const updateStep = (groupKey: string, stepKey: string, genericStepId: string) => {
    setFamilyGroups(gs => gs.map(g => g.key === groupKey
      ? { ...g, steps: g.steps.map(s => s.key === stepKey ? { ...s, genericStepId } : s) }
      : g))
  }

  const removeStep = (groupKey: string, stepKey: string) => {
    setFamilyGroups(gs => gs.map(g => g.key === groupKey
      ? { ...g, steps: g.steps.filter(s => s.key !== stepKey) }
      : g))
    setSelectedStepsByGroup(prev => {
      const cur = prev[groupKey]
      if (!cur || !cur.has(stepKey)) return prev
      const next = new Set(cur)
      next.delete(stepKey)
      return { ...prev, [groupKey]: next }
    })
  }

  const removeGroup = (groupKey: string) => {
    setFamilyGroups(gs => gs.filter(g => g.key !== groupKey))
    setSelectedStepsByGroup(prev => {
      if (!(groupKey in prev)) return prev
      const next = { ...prev }
      delete next[groupKey]
      return next
    })
    setExpandedGroups(prev => {
      if (!prev.has(groupKey)) return prev
      const next = new Set(prev)
      next.delete(groupKey)
      return next
    })
    if (copyMenuOpenFor === groupKey) closeCopyMenu()
    setCopyTargets(prev => {
      if (!prev.has(groupKey)) return prev
      const next = new Set(prev)
      next.delete(groupKey)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name || !workCenterId || !serviceTypeId) {
      setError('Preencha nome, centro de trabalho e tipo de servico.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        workCenterId,
        serviceTypeId,
        isActive,
        familyGroups: familyGroups.map((g, idx) => ({
          assetFamilyId: g.assetFamilyId,
          familyModelId: g.familyModelId,
          order: idx,
          steps: g.steps
            .filter(s => s.genericStepId)
            .map((s, sIdx) => ({ genericStepId: s.genericStepId, order: sIdx })),
        })),
      }
      const url = editingId
        ? `/api/maintenance-plans/standard-checklists/${editingId}`
        : '/api/maintenance-plans/standard-checklists'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar')
      onSuccess()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-black text-gray-900">
          {editingId ? 'Editar Check List Padrao' : 'Novo Check List Padrao'}
        </h2>
        <button onClick={onClose} className="flex items-center justify-center p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors">
          <Icon name="close" className="text-xl" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-danger-light border border-danger/30 text-danger text-sm p-3 rounded-[4px]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome do Check List</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="EX: INSPECAO DIARIA WC-100"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Centro de Trabalho</label>
              <select
                value={workCenterId}
                onChange={e => setWorkCenterId(e.target.value)}
                className={selectCls}
                required
                disabled={!!editingId}
              >
                <option value="">Selecione...</option>
                {workCenters.map(wc => (
                  <option key={wc.id} value={wc.id}>
                    {wc.protheusCode ? `${wc.protheusCode} - ` : ''}{wc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tipo de Servico</label>
              <select
                value={serviceTypeId}
                onChange={e => setServiceTypeId(e.target.value)}
                className={selectCls}
                required
                disabled={!!editingId}
              >
                <option value="">Selecione...</option>
                {serviceTypes.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.code ? `${st.code} - ` : ''}{st.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                <span>Ativo</span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Familias e Etapas</h3>
              {workCenterId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => detectFamiliesFromWC(workCenterId)}
                  disabled={loadingFamilies}
                  className="text-xs"
                >
                  <Icon name="sync" className="text-base mr-1" />
                  {loadingFamilies ? 'Detectando...' : 'Detectar familias do WC'}
                </Button>
              )}
            </div>

            {familyGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                {workCenterId
                  ? 'Selecione um WC com bens cadastrados (familia e modelo) ou clique em "Detectar familias".'
                  : 'Selecione um centro de trabalho para detectar as familias dos bens.'}
              </p>
            ) : (
              <div className="space-y-3">
                {familyGroups.map(group => {
                  const isOpen = expandedGroups.has(group.key)
                  const selCount = selectionCount(group.key)
                  const validCount = validStepCount(group)
                  const validKeys = group.steps.filter(s => s.genericStepId).map(s => s.key)
                  const allSelected = validKeys.length > 0 && validKeys.every(k => selectedStepsByGroup[group.key]?.has(k))
                  const someSelected = selCount > 0 && !allSelected
                  const otherGroups = familyGroups.filter(g => g.key !== group.key)
                  const canCopy = selCount > 0 && otherGroups.length > 0
                  const isMenuOpen = copyMenuOpenFor === group.key

                  return (
                    <div key={group.key} className="border border-gray-200 rounded-[4px] bg-gray-50/40">
                      <div className="flex items-center gap-2 bg-gray-100 border-b border-gray-200">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="flex-1 flex items-center gap-2 px-3 py-2 hover:bg-gray-200 transition-colors text-left"
                        >
                          <Icon name={isOpen ? 'expand_more' : 'chevron_right'} className="text-base text-gray-600" />
                          <span className="flex-1 text-[12px] font-bold text-gray-900 uppercase tracking-wider">
                            {group.assetFamilyName} / {group.familyModelName}
                          </span>
                          <span className="text-[11px] text-muted-foreground normal-case font-normal">
                            ({validCount} {validCount === 1 ? 'etapa' : 'etapas'})
                          </span>
                        </button>
                        <div className="flex items-center gap-2 pr-3 relative">
                          {canCopy && (
                            <>
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation()
                                  if (isMenuOpen) closeCopyMenu()
                                  else openCopyMenu(group.key)
                                }}
                                className="text-xs text-gray-700 hover:text-foreground hover:underline transition-colors flex items-center gap-1"
                              >
                                <Icon name="content_copy" className="text-base" />
                                Copiar para ({selCount})
                              </button>
                              {isMenuOpen && (
                                <div
                                  ref={copyMenuRef}
                                  className="absolute right-0 top-full mt-1 z-20 bg-card border border-gray-200 rounded-[4px] shadow-lg w-80 p-3"
                                  onClick={(ev) => ev.stopPropagation()}
                                >
                                  <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-2">
                                    Copiar {selCount} {selCount === 1 ? 'etapa' : 'etapas'} para:
                                  </div>
                                  <div className="border-t border-gray-200 -mx-3" />
                                  <div className="max-h-60 overflow-y-auto py-2 space-y-1">
                                    {otherGroups.map(other => {
                                      const checked = copyTargets.has(other.key)
                                      const otherValid = validStepCount(other)
                                      return (
                                        <label
                                          key={other.key}
                                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleCopyTarget(other.key)}
                                          />
                                          <span className="flex-1 text-foreground truncate">
                                            {other.assetFamilyName} / {other.familyModelName}
                                          </span>
                                          <span className="text-[11px] text-muted-foreground">
                                            ({otherValid})
                                          </span>
                                        </label>
                                      )
                                    })}
                                  </div>
                                  <div className="border-t border-gray-200 -mx-3" />
                                  <div className="flex gap-2 pt-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={closeCopyMenu}
                                      className="flex-1 text-xs"
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => performCopy(group.key)}
                                      disabled={copyTargets.size === 0}
                                      className="flex-1 text-xs bg-gray-900 text-white hover:bg-gray-800"
                                    >
                                      Copiar ({copyTargets.size})
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation()
                              removeGroup(group.key)
                            }}
                            className="text-xs text-muted-foreground hover:text-danger transition-colors"
                          >
                            Remover grupo
                          </button>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="p-3 space-y-2">
                          {group.steps.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Nenhuma etapa adicionada.</p>
                          )}
                          {validKeys.length > 0 && (
                            <label className="flex items-center gap-2 px-1 pb-1 text-[11px] text-muted-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => { if (el) el.indeterminate = someSelected }}
                                onChange={() => toggleSelectAllInGroup(group.key)}
                              />
                              <span>Selecionar todas</span>
                            </label>
                          )}
                          {group.steps.map((step, idx) => (
                            <div key={step.key} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isStepSelected(group.key, step.key)}
                                onChange={() => toggleStepSelection(group.key, step.key)}
                              />
                              <span className="text-xs text-muted-foreground min-w-[24px]">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <GenericStepCombobox
                                value={step.genericStepId}
                                options={genericSteps}
                                onChange={(id) => updateStep(group.key, step.key, id)}
                                className="flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => moveStepUp(group.key, idx)}
                                disabled={idx === 0}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 disabled:opacity-30 disabled:hover:text-muted-foreground"
                                title="Mover para cima"
                              >
                                <Icon name="arrow_upward" className="text-base" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveStepDown(group.key, idx)}
                                disabled={idx === group.steps.length - 1}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 disabled:opacity-30 disabled:hover:text-muted-foreground"
                                title="Mover para baixo"
                              >
                                <Icon name="arrow_downward" className="text-base" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeStep(group.key, step.key)}
                                className="text-muted-foreground hover:text-danger transition-colors p-1"
                                title="Remover etapa"
                              >
                                <Icon name="close" className="text-base" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addStep(group.key)}
                            className="text-xs text-foreground hover:underline flex items-center gap-1 mt-2"
                          >
                            <Icon name="add" className="text-base" /> Adicionar etapa
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
            disabled={saving}
          >
            <Icon name="save" className="text-base mr-2" />
            {saving ? 'Salvando...' : (editingId ? 'Salvar Alteracoes' : 'Salvar')}
          </Button>
        </div>
      </form>
    </div>
  )
}
