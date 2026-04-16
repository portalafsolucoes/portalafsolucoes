'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { ScheduleCalendar } from './ScheduleCalendar'
import { ScheduleReportsPanel } from './ScheduleReportsPanel'
import { WorkOrdersBatchPrintView } from '@/components/work-orders/WorkOrdersBatchPrintView'
import { formatDate } from '@/lib/utils'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'

// ==========================================
// Types
// ==========================================

interface ScheduleData {
  id: string
  scheduleNumber?: number
  description?: string
  startDate?: string
  endDate?: string
  status?: string
}

interface WorkOrderItem {
  id: string
  externalId?: string
  internalId?: string
  title: string
  status: string
  priority: string
  type: string
  dueDate?: string
  plannedStartDate?: string
  estimatedDuration?: number
  asset?: { id: string; name: string; tag?: string; workCenterId?: string | null }
  serviceType?: { id: string; name: string; maintenanceTypeId?: string | null }
  maintenancePlanExecId?: string | null
  maintenanceAreaId?: string | null
  maintenancePlanExec?: { id: string; planNumber?: number } | null
  maintenanceArea?: { id: string; name: string } | null
  inOtherSchedule?: {
    scheduleId: string
    scheduleNumber?: number
    scheduleStatus: string
    scheduledDate: string
    isOverdue: boolean
  }
}

interface ReferenceOption {
  id: string
  label: string
}

interface Q1Filters {
  maintenancePlanExecIds: string[]
  serviceTypeIds: string[]
  maintenanceTypeIds: string[]
  maintenanceAreaIds: string[]
  workCenterIds: string[]
  startDate: string
  endDate: string
  showAllOpen: boolean
}

const EMPTY_Q1_FILTERS: Q1Filters = {
  maintenancePlanExecIds: [],
  serviceTypeIds: [],
  maintenanceTypeIds: [],
  maintenanceAreaIds: [],
  workCenterIds: [],
  startDate: '',
  endDate: '',
  showAllOpen: false,
}

interface ScheduledItem {
  id: string
  scheduledDate: string
  status: string
  workOrder: WorkOrderItem
}

interface ResourceSummary {
  totalHours: number
  totalCost: number
  totalItems: number
  scheduledWorkOrders: number
  byType: Record<string, { totalHours: number; totalQuantity: number; totalCost: number; items: ResourceDetail[] }>
}

interface ResourceDetail {
  id: string
  resourceType: string
  quantity: number | null
  hours: number | null
  workOrderId: string
  resource?: { id: string; name: string; unitCost?: number } | null
  jobTitle?: { id: string; name: string } | null
  user?: { id: string; firstName: string; lastName: string; hourlyRate?: number } | null
}

interface ScheduleWorkspaceProps {
  scheduleId: string
  onBack: () => void
  onConfirm: (id: string) => void
}

const WO_PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'border-l-red-500',
  MEDIUM: 'border-l-amber-500',
  LOW: 'border-l-blue-500',
  NONE: 'border-l-gray-300',
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  SPECIALTY: 'Especialidades',
  LABOR: 'Mão de Obra',
  MATERIAL: 'Materiais',
  TOOL: 'Ferramentas',
}

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  SPECIALTY: 'engineering',
  LABOR: 'person',
  MATERIAL: 'inventory_2',
  TOOL: 'construction',
}

// Formata "Mes de YYYY" a partir de uma data ISO, com a primeira letra maiuscula.
// Usa construcao local (new Date(y, m-1, 1)) para evitar deslocamento de timezone.
function formatMonthYear(dateStr: string): string {
  const iso = dateStr.split('T')[0]
  const [y, m] = iso.split('-').map(Number)
  if (!y || !m) return ''
  const date = new Date(y, m - 1, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// ==========================================
// Component
// ==========================================

type WorkspaceTab = 'available' | 'calendar' | 'scheduled' | 'resources'

export function ScheduleWorkspace({ scheduleId, onBack, onConfirm }: ScheduleWorkspaceProps) {
  const { isPhone, isCompact, isWide } = useResponsiveLayout()
  const [schedule, setSchedule] = useState<ScheduleData | null>(null)
  const [availableWOs, setAvailableWOs] = useState<WorkOrderItem[]>([])
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([])
  const [resourceSummary, setResourceSummary] = useState<ResourceSummary | null>(null)
  const [resourceDetails, setResourceDetails] = useState<ResourceDetail[]>([])
  const [jobTitleCapacity, setJobTitleCapacity] = useState<Record<string, { id: string; name: string; userCount: number }>>({})
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [reportsExpanded, setReportsExpanded] = useState(false)
  const [q4DetailView, setQ4DetailView] = useState(false)
  const [searchQ1, setSearchQ1] = useState('')
  const [q1FiltersOpen, setQ1FiltersOpen] = useState(false)
  const [q1Filters, setQ1Filters] = useState<Q1Filters>(EMPTY_Q1_FILTERS)
  const [q1PlanOptions, setQ1PlanOptions] = useState<ReferenceOption[]>([])
  const [q1ServiceTypeOptions, setQ1ServiceTypeOptions] = useState<ReferenceOption[]>([])
  const [q1MaintenanceTypeOptions, setQ1MaintenanceTypeOptions] = useState<ReferenceOption[]>([])
  const [q1MaintenanceAreaOptions, setQ1MaintenanceAreaOptions] = useState<ReferenceOption[]>([])
  const [q1WorkCenterOptions, setQ1WorkCenterOptions] = useState<ReferenceOption[]>([])
  const q1FiltersRef = useRef<Q1Filters>(EMPTY_Q1_FILTERS)
  useEffect(() => { q1FiltersRef.current = q1Filters }, [q1Filters])
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('available')
  const [selectedScheduledWOId, setSelectedScheduledWOId] = useState<string | null>(null)
  const [selectedScheduledIds, setSelectedScheduledIds] = useState<Set<string>>(new Set())
  const [batchPrintIds, setBatchPrintIds] = useState<string[] | null>(null)

  // ==========================================
  // Data Loading
  // ==========================================

  // Monta query string de filtros do Q1. Regras:
  // - Se `showAllOpen` estiver marcado, envia `includeAllOpen=true` e omite
  //   startDate/endDate (API ignora periodo).
  // - Caso contrario, usa as datas do filtro Q1 ou, na ausencia delas, o
  //   periodo da programacao atual.
  // - Um grupo multi-select so e enviado quando o usuario NAO marcou todas
  //   as opcoes (semantica "todos marcados = sem filtro"). Tambem omite
  //   quando o grupo esta vazio.
  const buildAvailableWOQuery = useCallback(
    (schedData: ScheduleData | null, filters: Q1Filters) => {
      const params = new URLSearchParams({ scheduleId })

      if (filters.showAllOpen) {
        params.set('includeAllOpen', 'true')
      } else {
        const effectiveStart = filters.startDate || schedData?.startDate || ''
        const effectiveEnd = filters.endDate || schedData?.endDate || ''
        if (effectiveStart) params.set('startDate', effectiveStart)
        if (effectiveEnd) params.set('endDate', effectiveEnd)
      }

      const appendIfPartial = (key: string, values: string[], totalOptions: number) => {
        if (values.length === 0) return
        if (totalOptions > 0 && values.length >= totalOptions) return
        for (const id of values) params.append(key, id)
      }

      appendIfPartial('maintenancePlanExecId', filters.maintenancePlanExecIds, q1PlanOptions.length)
      appendIfPartial('serviceTypeId', filters.serviceTypeIds, q1ServiceTypeOptions.length)
      appendIfPartial('maintenanceTypeId', filters.maintenanceTypeIds, q1MaintenanceTypeOptions.length)
      appendIfPartial('maintenanceAreaId', filters.maintenanceAreaIds, q1MaintenanceAreaOptions.length)
      appendIfPartial('workCenterId', filters.workCenterIds, q1WorkCenterOptions.length)

      return params
    },
    [
      scheduleId,
      q1PlanOptions.length,
      q1ServiceTypeOptions.length,
      q1MaintenanceTypeOptions.length,
      q1MaintenanceAreaOptions.length,
      q1WorkCenterOptions.length,
    ]
  )

  const loadAvailableWOs = useCallback(
    async (schedData: ScheduleData | null, filters: Q1Filters) => {
      const params = buildAvailableWOQuery(schedData, filters)
      try {
        const res = await fetch(`/api/planning/schedules/available-work-orders?${params}`)
        const json = await res.json()
        setAvailableWOs(json.data || [])
      } catch (err) {
        console.error('Error loading available work orders:', err)
      }
    },
    [buildAvailableWOQuery]
  )

  const loadQ1References = useCallback(async () => {
    try {
      const [plansRes, serviceTypesRes, maintenanceTypesRes, maintenanceAreasRes, workCentersRes] = await Promise.all([
        fetch('/api/planning/plans'),
        fetch('/api/basic-registrations/service-types'),
        fetch('/api/basic-registrations/maintenance-types'),
        fetch('/api/basic-registrations/maintenance-areas'),
        fetch('/api/basic-registrations/work-centers'),
      ])

      const [plansJson, serviceTypesJson, maintenanceTypesJson, maintenanceAreasJson, workCentersJson] = await Promise.all([
        plansRes.json(),
        serviceTypesRes.json(),
        maintenanceTypesRes.json(),
        maintenanceAreasRes.json(),
        workCentersRes.json(),
      ])

      setQ1PlanOptions(
        (plansJson.data || []).map((p: { id: string; planNumber?: number; description?: string }) => ({
          id: p.id,
          label: p.planNumber
            ? `Plano #${p.planNumber}${p.description ? ` — ${p.description}` : ''}`
            : p.description || p.id,
        }))
      )
      setQ1ServiceTypeOptions(
        (serviceTypesJson.data || []).map((s: { id: string; name: string; code?: string }) => ({
          id: s.id,
          label: s.code ? `${s.code} — ${s.name}` : s.name,
        }))
      )
      setQ1MaintenanceTypeOptions(
        (maintenanceTypesJson.data || []).map((m: { id: string; name: string }) => ({ id: m.id, label: m.name }))
      )
      setQ1MaintenanceAreaOptions(
        (maintenanceAreasJson.data || []).map((m: { id: string; name: string }) => ({ id: m.id, label: m.name }))
      )
      setQ1WorkCenterOptions(
        (workCentersJson.data || []).map((w: { id: string; name: string }) => ({ id: w.id, label: w.name }))
      )
    } catch (err) {
      console.error('Error loading Q1 reference data:', err)
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [schedRes, itemsRes] = await Promise.all([
        fetch(`/api/planning/schedules/${scheduleId}`),
        fetch(`/api/planning/schedules/${scheduleId}/items`),
      ])

      const schedJson = await schedRes.json()
      const itemsJson = await itemsRes.json()

      const schedData = schedJson.data || {}
      setSchedule(schedData)
      setScheduledItems(itemsJson.data || [])

      const [, resRes] = await Promise.all([
        loadAvailableWOs(schedData, q1FiltersRef.current),
        fetch(`/api/planning/schedules/${scheduleId}/resources`),
      ])

      const resJson = await resRes.json()
      setResourceSummary(resJson.data?.summary || null)
      setResourceDetails(resJson.data?.resources || [])
      setJobTitleCapacity(resJson.data?.jobTitleCapacity || {})
    } catch (err) {
      console.error('Error loading workspace data:', err)
    }
    setLoading(false)
  }, [scheduleId, loadAvailableWOs])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadQ1References() }, [loadQ1References])

  // Recarrega apenas a lista de OSs disponiveis quando os filtros do Q1 mudam.
  // Usa debounce leve para evitar requisicao em cada digitacao de data.
  const initialFiltersEffectRef = useRef(true)
  useEffect(() => {
    if (!schedule) return
    if (initialFiltersEffectRef.current) {
      initialFiltersEffectRef.current = false
      return
    }
    const handle = setTimeout(() => {
      loadAvailableWOs(schedule, q1Filters)
    }, 250)
    return () => clearTimeout(handle)
  }, [q1Filters, schedule, loadAvailableWOs])

  // ==========================================
  // Q1: OSs Disponíveis
  // ==========================================

  const filteredAvailableWOs = useMemo(() => {
    // Excluir OSs que já estão programadas nesta programação
    const scheduledWoIds = new Set(scheduledItems.map(item => item.workOrder?.id).filter(Boolean))
    let filtered = availableWOs.filter(wo => !scheduledWoIds.has(wo.id))
    if (searchQ1.trim()) {
      const q = searchQ1.toLowerCase()
      filtered = filtered.filter(wo =>
        (wo.title && wo.title.toLowerCase().includes(q)) ||
        (wo.internalId && wo.internalId.toLowerCase().includes(q)) ||
        (wo.externalId && wo.externalId.toLowerCase().includes(q)) ||
        (wo.asset?.name && wo.asset.name.toLowerCase().includes(q)) ||
        (wo.asset?.tag && wo.asset.tag.toLowerCase().includes(q))
      )
    }
    return filtered
  }, [availableWOs, scheduledItems, searchQ1])

  const q1ActiveFilterCount = useMemo(() => {
    return (
      q1Filters.maintenancePlanExecIds.length +
      q1Filters.serviceTypeIds.length +
      q1Filters.maintenanceTypeIds.length +
      q1Filters.maintenanceAreaIds.length +
      q1Filters.workCenterIds.length +
      (q1Filters.startDate ? 1 : 0) +
      (q1Filters.endDate ? 1 : 0) +
      (q1Filters.showAllOpen ? 1 : 0)
    )
  }, [q1Filters])

  const toggleQ1FilterId = (key: keyof Q1Filters, id: string) => {
    setQ1Filters(prev => {
      const current = prev[key]
      if (!Array.isArray(current)) return prev
      const exists = current.includes(id)
      return {
        ...prev,
        [key]: exists ? current.filter(v => v !== id) : [...current, id],
      }
    })
  }

  const clearQ1Filters = () => setQ1Filters(EMPTY_Q1_FILTERS)

  const toggleAvailableSelection = (woId: string) => {
    setSelectedAvailableIds(prev => {
      const next = new Set(prev)
      if (next.has(woId)) next.delete(woId)
      else next.add(woId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedAvailableIds.size === filteredAvailableWOs.length) {
      setSelectedAvailableIds(new Set())
    } else {
      setSelectedAvailableIds(new Set(filteredAvailableWOs.map(wo => wo.id)))
    }
  }

  const addSelectedToSchedule = async () => {
    if (selectedAvailableIds.size === 0 || !schedule) return
    setSaving(true)

    const existingItems = scheduledItems.map(item => ({
      workOrderId: item.workOrder.id,
      scheduledDate: item.scheduledDate.split('T')[0],
    }))

    // Usar a data selecionada no calendário ou startDate
    const targetDate = (selectedCalendarDate || schedule.startDate || new Date().toISOString()).split('T')[0]

    const newItems = Array.from(selectedAvailableIds).map(woId => ({
      workOrderId: woId,
      scheduledDate: targetDate,
    }))

    try {
      const res = await fetch(`/api/planning/schedules/${scheduleId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [...existingItems, ...newItems] }),
      })
      if (res.ok) {
        setSelectedAvailableIds(new Set())
        await loadData()
      }
    } catch (err) {
      console.error('Error adding items:', err)
    }
    setSaving(false)
  }

  // ==========================================
  // Q3: OSs Programadas
  // ==========================================

  const removeScheduledItem = async (workOrderId: string) => {
    setSaving(true)
    const remainingItems = scheduledItems
      .filter(item => item.workOrder.id !== workOrderId)
      .map(item => ({
        workOrderId: item.workOrder.id,
        scheduledDate: item.scheduledDate.split('T')[0],
      }))

    try {
      const res = await fetch(`/api/planning/schedules/${scheduleId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: remainingItems }),
      })
      if (res.ok) await loadData()
    } catch (err) {
      console.error('Error removing item:', err)
    }
    setSaving(false)
  }

  const changeItemDate = async (workOrderId: string, newDate: string) => {
    setSaving(true)
    const updatedItems = scheduledItems.map(item => ({
      workOrderId: item.workOrder.id,
      scheduledDate: item.workOrder.id === workOrderId ? newDate.split('T')[0] : item.scheduledDate.split('T')[0],
    }))

    try {
      const res = await fetch(`/api/planning/schedules/${scheduleId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems }),
      })
      if (res.ok) await loadData()
    } catch (err) {
      console.error('Error changing date:', err)
    }
    setSaving(false)
  }

  // ==========================================
  // Calendar: drag-and-drop
  // ==========================================

  const handleCalendarMoveItem = async (itemId: string, newDate: string) => {
    const item = scheduledItems.find(i => i.id === itemId)
    if (!item) return
    await changeItemDate(item.workOrder.id, newDate)
  }

  // Q3: Filtered scheduled items by selected calendar date
  const filteredScheduledItems = useMemo(() => {
    if (!selectedCalendarDate) return scheduledItems
    const selectedDateStr = selectedCalendarDate.split('T')[0]
    return scheduledItems.filter(item => item.scheduledDate.split('T')[0] === selectedDateStr)
  }, [scheduledItems, selectedCalendarDate])

  // Transform scheduled items for calendar
  const calendarItems = useMemo(() =>
    scheduledItems.map(item => ({
      itemId: item.id,
      workOrderId: item.workOrder.id,
      title: item.workOrder.title,
      internalId: item.workOrder.internalId,
      externalId: item.workOrder.externalId,
      priority: item.workOrder.priority,
      scheduledDate: item.scheduledDate,
    })),
    [scheduledItems]
  )

  // Rotulo de Mes/Ano exibido no cabecalho do Q2 Calendario.
  // Quando ha data selecionada, usa o mes/ano dessa data; caso contrario deriva do periodo da programacao.
  // Se o periodo cruzar meses diferentes, mostra ambos separados por "—".
  const calendarPeriodLabel = useMemo(() => {
    if (selectedCalendarDate) return formatMonthYear(selectedCalendarDate)
    if (!schedule?.startDate || !schedule?.endDate) return ''
    const startLabel = formatMonthYear(schedule.startDate)
    const endLabel = formatMonthYear(schedule.endDate)
    if (!startLabel || !endLabel) return startLabel || endLabel
    if (startLabel === endLabel) return startLabel
    return `${startLabel} — ${endLabel}`
  }, [selectedCalendarDate, schedule])

  // ==========================================
  // Q4: Resources grouped by WO
  // ==========================================

  const resourcesByWO = useMemo(() => {
    const map = new Map<string, { woTitle: string; woId: string; resources: ResourceDetail[] }>()
    for (const r of resourceDetails) {
      if (!map.has(r.workOrderId)) {
        const item = scheduledItems.find(i => i.workOrder.id === r.workOrderId)
        map.set(r.workOrderId, {
          woId: r.workOrderId,
          woTitle: item?.workOrder.title || r.workOrderId,
          resources: [],
        })
      }
      map.get(r.workOrderId)!.resources.push(r)
    }
    return Array.from(map.values())
  }, [resourceDetails, scheduledItems])

  // Determina quais OSs estão "em foco" para a Q4. Precedência:
  //   1) Clique unico em card da Q3 (selectedScheduledWOId)
  //   2) Checkboxes multi-selecao da Q3 (selectedScheduledIds)
  //   3) Data selecionada no calendario (selectedCalendarDate)
  //   4) Sem filtro (mostra todas) -> retorna null
  const activeWorkOrderIds = useMemo<Set<string> | null>(() => {
    if (selectedScheduledWOId) return new Set([selectedScheduledWOId])
    if (selectedScheduledIds.size > 0) return new Set(selectedScheduledIds)
    if (selectedCalendarDate) {
      const dateStr = selectedCalendarDate.split('T')[0]
      const ids = scheduledItems
        .filter(item => item.scheduledDate.split('T')[0] === dateStr)
        .map(item => item.workOrder.id)
      return new Set(ids)
    }
    return null
  }, [selectedScheduledWOId, selectedScheduledIds, selectedCalendarDate, scheduledItems])

  // Recursos filtrados para o escopo ativo (null = todos)
  const filteredResourceDetails = useMemo(() => {
    if (!activeWorkOrderIds) return resourceDetails
    return resourceDetails.filter(r => activeWorkOrderIds.has(r.workOrderId))
  }, [resourceDetails, activeWorkOrderIds])

  // Sumario recalculado a partir dos recursos filtrados
  const filteredResourceSummary = useMemo<ResourceSummary | null>(() => {
    if (!activeWorkOrderIds) return resourceSummary
    let totalHours = 0, totalCost = 0
    const byType: Record<string, { totalHours: number; totalQuantity: number; totalCost: number; items: ResourceDetail[] }> = {}
    for (const r of filteredResourceDetails) {
      const h = r.hours || 0
      const q = r.quantity || 0
      totalHours += h
      let cost = 0
      if (r.resourceType === 'LABOR' && r.user?.hourlyRate) cost = h * r.user.hourlyRate
      else if ((r.resourceType === 'MATERIAL' || r.resourceType === 'TOOL') && r.resource?.unitCost) cost = q * r.resource.unitCost
      totalCost += cost
      if (!byType[r.resourceType]) byType[r.resourceType] = { totalHours: 0, totalQuantity: 0, totalCost: 0, items: [] }
      byType[r.resourceType].totalHours += h
      byType[r.resourceType].totalQuantity += q
      byType[r.resourceType].totalCost += cost
      byType[r.resourceType].items.push(r)
    }
    return {
      totalHours,
      totalCost,
      totalItems: filteredResourceDetails.length,
      scheduledWorkOrders: activeWorkOrderIds.size,
      byType,
    }
  }, [activeWorkOrderIds, resourceSummary, filteredResourceDetails])

  const isEditable = schedule?.status === 'DRAFT' || schedule?.status === 'REPROGRAMMING'

  // ==========================================
  // Render
  // ==========================================

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
          <p className="mt-2 text-muted-foreground">Carregando workspace...</p>
        </div>
      </div>
    )
  }

  // ==========================================
  // Tab config for compact/phone modes
  // ==========================================

  const TAB_CONFIG: { key: WorkspaceTab; icon: string; label: string; shortLabel: string; count?: number }[] = [
    { key: 'available', icon: 'list_alt', label: 'Disponíveis', shortLabel: 'Disp.', count: filteredAvailableWOs.length },
    { key: 'calendar', icon: 'calendar_month', label: 'Calendário', shortLabel: 'Cal.' },
    { key: 'scheduled', icon: 'assignment', label: 'Programadas', shortLabel: 'Prog.', count: filteredScheduledItems.length },
    { key: 'resources', icon: 'inventory_2', label: 'Recursos', shortLabel: 'Rec.' },
  ]

  // ==========================================
  // Quadrant content (reusable across layouts)
  // ==========================================

  const renderQ1MultiSelect = (
    label: string,
    key: keyof Q1Filters,
    options: ReferenceOption[]
  ) => {
    const selected = q1Filters[key] as string[]
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center justify-between gap-1">
          <span className="truncate">{label}</span>
          {selected.length > 0 && (
            <span className="text-[9px] font-medium text-blue-600 normal-case tracking-normal">
              {selected.length}
            </span>
          )}
        </label>
        <div className="max-h-28 overflow-auto border border-gray-200 rounded-[4px] bg-white px-1 py-1 space-y-0.5">
          {options.length === 0 ? (
            <p className="text-[10px] text-muted-foreground px-1 py-0.5">Sem opções</p>
          ) : (
            options.map(opt => (
              <label
                key={opt.id}
                className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.id)}
                  onChange={() => toggleQ1FilterId(key, opt.id)}
                  className="h-3 w-3 rounded border-gray-300 accent-blue-600 flex-shrink-0"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      </div>
    )
  }

  const q1FiltersPanel = q1FiltersOpen ? (
    <div className="border-b border-gray-200 bg-white px-3 py-2 flex-shrink-0">
      <label className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-[4px] cursor-pointer hover:bg-blue-100 transition-colors">
        <input
          type="checkbox"
          checked={q1Filters.showAllOpen}
          onChange={e => setQ1Filters(prev => ({ ...prev, showAllOpen: e.target.checked }))}
          className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-600 flex-shrink-0"
        />
        <span className="text-[11px] font-medium text-blue-900">
          Mostrar todas as OSs abertas
        </span>
        <span className="text-[10px] text-blue-700">
          (ignora o período da programação)
        </span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {renderQ1MultiSelect('Plano de Manutenção', 'maintenancePlanExecIds', q1PlanOptions)}
        {renderQ1MultiSelect('Tipo de Serviço', 'serviceTypeIds', q1ServiceTypeOptions)}
        {renderQ1MultiSelect('Tipo de Manutenção', 'maintenanceTypeIds', q1MaintenanceTypeOptions)}
        {renderQ1MultiSelect('Área de Manutenção', 'maintenanceAreaIds', q1MaintenanceAreaOptions)}
        {renderQ1MultiSelect('Centro de Trabalho', 'workCenterIds', q1WorkCenterOptions)}
        <div className={`flex flex-col gap-1 min-w-0 ${q1Filters.showAllOpen ? 'opacity-50' : ''}`}>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Período</label>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={q1Filters.startDate}
              disabled={q1Filters.showAllOpen}
              onChange={e => setQ1Filters(prev => ({ ...prev, startDate: e.target.value }))}
              className="flex-1 min-w-0 px-1.5 py-1 text-[11px] border border-gray-200 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-gray-50"
            />
            <span className="text-[10px] text-muted-foreground">até</span>
            <input
              type="date"
              value={q1Filters.endDate}
              disabled={q1Filters.showAllOpen}
              onChange={e => setQ1Filters(prev => ({ ...prev, endDate: e.target.value }))}
              className="flex-1 min-w-0 px-1.5 py-1 text-[11px] border border-gray-200 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>
      {q1ActiveFilterCount > 0 && (
        <div className="flex justify-end mt-2">
          <button
            onClick={clearQ1Filters}
            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Icon name="filter_alt_off" className="text-sm" />
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  ) : null

  const q1Content = (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0 gap-2">
        {isWide && (
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
            <Icon name="list_alt" className="text-base" />
            <span className="hidden md:inline">Disponíveis</span> ({filteredAvailableWOs.length})
          </h3>
        )}
        <div className={`flex items-center gap-2 ${isWide ? 'flex-1 justify-end' : 'w-full'}`}>
          <div className={`relative ${isWide ? 'w-32 xl:w-40' : 'flex-1'}`}>
            <Icon name="search" className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQ1}
              onChange={e => setSearchQ1(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setQ1FiltersOpen(v => !v)}
            className={`flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-[4px] border whitespace-nowrap transition-colors ${
              q1FiltersOpen || q1ActiveFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
            title="Filtros"
          >
            <Icon name="filter_list" className="text-sm" />
            {q1ActiveFilterCount > 0 && (
              <span className="text-[10px] font-bold">{q1ActiveFilterCount}</span>
            )}
          </button>
          {filteredAvailableWOs.length > 0 && (
            <>
              <button
                onClick={toggleSelectAll}
                className="text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                {selectedAvailableIds.size === filteredAvailableWOs.length ? 'Limpar' : 'Todas'}
              </button>
              {selectedAvailableIds.size > 0 && (
                <>
                  <Button
                    onClick={() => setBatchPrintIds(Array.from(selectedAvailableIds))}
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2 min-h-[44px] sm:min-h-0 sm:h-7"
                    title="Imprimir OSs selecionadas"
                  >
                    <Icon name="print" className="text-sm" />
                    <span className="ml-1">{selectedAvailableIds.size}</span>
                  </Button>
                  {isEditable && (
                    <Button
                      onClick={addSelectedToSchedule}
                      size="sm"
                      disabled={saving}
                      className="text-xs h-8 px-3 min-h-[44px] sm:min-h-0 sm:h-7 sm:px-2"
                      title="Adicionar à programação"
                    >
                      <Icon name="arrow_forward" className="text-sm" />
                      <span className="ml-1">{selectedAvailableIds.size}</span>
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      {q1FiltersPanel}
      <div className="flex-1 overflow-auto p-1.5 space-y-1">
        {filteredAvailableWOs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
            <Icon name="check_circle" className="text-3xl mb-2" />
            <p className="text-sm">{searchQ1 ? 'Nenhuma OS encontrada' : 'Todas as OSs já foram programadas'}</p>
          </div>
        ) : (
          filteredAvailableWOs.map(wo => (
            <div
              key={wo.id}
              onClick={() => toggleAvailableSelection(wo.id)}
              className={`border rounded-[4px] p-2.5 sm:p-2 cursor-pointer transition-colors border-l-4 min-h-[44px] ${
                WO_PRIORITY_COLORS[wo.priority] || 'border-l-gray-300'
              } ${
                selectedAvailableIds.has(wo.id)
                  ? 'bg-blue-50 border-blue-300'
                  : wo.inOtherSchedule?.isOverdue
                    ? 'bg-red-50 border-red-200 hover:bg-red-100'
                    : wo.inOtherSchedule
                      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedAvailableIds.has(wo.id)}
                  onChange={e => { e.stopPropagation(); toggleAvailableSelection(wo.id) }}
                  onClick={e => e.stopPropagation()}
                  className="h-4 w-4 sm:h-3.5 sm:w-3.5 rounded border-gray-300 accent-blue-600 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-600 truncate">
                      {wo.internalId || wo.externalId || '—'}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1 flex-shrink-0">
                      {wo.plannedStartDate ? formatDate(wo.plannedStartDate) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-foreground truncate">{wo.title}</p>
                  {wo.asset && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {wo.asset.tag ? `${wo.asset.tag} — ` : ''}{wo.asset.name}
                    </p>
                  )}
                  {wo.inOtherSchedule && (() => {
                    const ref = wo.inOtherSchedule
                    const progLabel = ref.scheduleNumber ? ` — Prog. #${ref.scheduleNumber}` : ''
                    const dateLabel = formatDate(ref.scheduledDate)
                    let badgeClass = ''
                    let icon = 'event'
                    let label = ''
                    let title = ''
                    if (ref.isOverdue) {
                      badgeClass = 'bg-red-100 text-red-700 border-red-200'
                      icon = 'schedule'
                      label = `Atrasada${progLabel}`
                      title = `Originada da Programação #${ref.scheduleNumber ?? '?'} em ${dateLabel}`
                    } else if (ref.scheduleStatus === 'DRAFT' || ref.scheduleStatus === 'REPROGRAMMING') {
                      badgeClass = 'bg-blue-100 text-blue-700 border-blue-200'
                      icon = 'edit_calendar'
                      label = `Em rascunho${progLabel}`
                      title = `Em rascunho na Programação #${ref.scheduleNumber ?? '?'} para ${dateLabel}`
                    } else {
                      badgeClass = 'bg-amber-100 text-amber-700 border-amber-200'
                      icon = 'event'
                      label = `Já programada${progLabel}`
                      title = `Já programada na Programação #${ref.scheduleNumber ?? '?'} para ${dateLabel}`
                    }
                    return (
                      <div className="mt-1 flex items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeClass}`}
                          title={title}
                        >
                          <Icon name={icon} className="text-[11px]" />
                          {label}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const q2Content = (
    <div className="flex flex-col overflow-hidden h-full">
      {isWide && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="calendar_month" className="text-base" />
            Calendário
            {calendarPeriodLabel && (
              <span className="text-[10px] font-medium text-gray-500 normal-case tracking-normal ml-1">
                — {calendarPeriodLabel}
              </span>
            )}
          </h3>
          {selectedCalendarDate && (
            <button
              onClick={() => setSelectedCalendarDate(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Limpar seleção
            </button>
          )}
        </div>
      )}
      {!isWide && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0 bg-gray-50">
          <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
            <Icon name="calendar_month" className="text-sm align-middle" />
            {calendarPeriodLabel}
          </span>
          {selectedCalendarDate && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-blue-700 font-medium">
                <Icon name="today" className="text-xs mr-1 align-middle" />
                {formatDate(selectedCalendarDate)}
              </span>
              <button
                onClick={() => setSelectedCalendarDate(null)}
                className="text-[10px] text-blue-600 hover:text-blue-800"
              >
                Limpar
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        {schedule?.startDate && schedule?.endDate ? (
          <ScheduleCalendar
            startDate={schedule.startDate}
            endDate={schedule.endDate}
            items={calendarItems}
            selectedDate={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
            onMoveItem={isEditable ? handleCalendarMoveItem : undefined}
            isEditable={isEditable}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Período não definido</p>
          </div>
        )}
      </div>
    </div>
  )

  const toggleScheduledSelection = (woId: string) => {
    setSelectedScheduledIds(prev => {
      const next = new Set(prev)
      if (next.has(woId)) next.delete(woId)
      else next.add(woId)
      return next
    })
  }

  const toggleSelectAllScheduled = () => {
    if (selectedScheduledIds.size === filteredScheduledItems.length) {
      setSelectedScheduledIds(new Set())
    } else {
      setSelectedScheduledIds(new Set(filteredScheduledItems.map(i => i.workOrder.id)))
    }
  }

  const removeSelectedScheduledItems = async () => {
    if (selectedScheduledIds.size === 0) return
    setSaving(true)
    const remainingItems = scheduledItems
      .filter(item => !selectedScheduledIds.has(item.workOrder.id))
      .map(item => ({
        workOrderId: item.workOrder.id,
        scheduledDate: item.scheduledDate.split('T')[0],
      }))
    try {
      const res = await fetch(`/api/planning/schedules/${scheduleId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: remainingItems }),
      })
      if (res.ok) {
        setSelectedScheduledIds(new Set())
        setSelectedScheduledWOId(null)
        await loadData()
      }
    } catch (err) {
      console.error('Error removing items:', err)
    }
    setSaving(false)
  }

  const q3Content = (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0 gap-2">
        {isWide && (
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
            <Icon name="assignment" className="text-base" />
            Programadas ({filteredScheduledItems.length}{selectedCalendarDate ? `/${scheduledItems.length}` : ''})
          </h3>
        )}
        <div className={`flex items-center gap-2 ${isWide ? 'flex-1 justify-end' : 'w-full justify-between'}`}>
          {!isWide && (
            <span className="text-xs text-gray-600">
              {filteredScheduledItems.length}{selectedCalendarDate ? `/${scheduledItems.length}` : ''} OS(s)
            </span>
          )}
          {selectedCalendarDate && (
            <button
              onClick={() => setSelectedCalendarDate(null)}
              className="text-[10px] text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              Ver todas
            </button>
          )}
          {filteredScheduledItems.length > 0 && (
            <>
              <button
                onClick={toggleSelectAllScheduled}
                className="text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                {selectedScheduledIds.size === filteredScheduledItems.length ? 'Limpar' : 'Todas'}
              </button>
              {selectedScheduledIds.size > 0 && (
                <>
                  <Button
                    onClick={() => setBatchPrintIds(Array.from(selectedScheduledIds))}
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2 min-h-[44px] sm:min-h-0 sm:h-7"
                    title="Imprimir OSs selecionadas"
                  >
                    <Icon name="print" className="text-sm" />
                    <span className="ml-1">{selectedScheduledIds.size}</span>
                  </Button>
                  {isEditable && (
                    <Button
                      onClick={removeSelectedScheduledItems}
                      size="sm"
                      disabled={saving}
                      variant="outline"
                      className="text-xs h-7 px-2 text-red-600 border-red-300 hover:bg-red-50 min-h-[44px] sm:min-h-0 sm:h-7"
                    >
                      <Icon name="delete" className="text-sm" />
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-1.5 space-y-1">
        {filteredScheduledItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
            <Icon name="assignment" className="text-3xl mb-2" />
            <p className="text-sm">{selectedCalendarDate ? 'Nenhuma OS nesta data' : 'Nenhuma OS programada'}</p>
            {!selectedCalendarDate && (
              <p className="text-xs mt-1">Selecione OSs na aba Disponíveis e adicione</p>
            )}
          </div>
        ) : (
          filteredScheduledItems.map(item => {
            const wo = item.workOrder
            const isSelected = selectedScheduledWOId === wo.id
            return (
              <div
                key={item.id}
                onClick={() => setSelectedScheduledWOId(isSelected ? null : wo.id)}
                className={`border rounded-[4px] p-2.5 sm:p-2 border-l-4 min-h-[44px] cursor-pointer transition-colors ${
                  WO_PRIORITY_COLORS[wo.priority] || 'border-l-gray-300'
                } ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedScheduledIds.has(wo.id)}
                      onChange={e => { e.stopPropagation(); toggleScheduledSelection(wo.id) }}
                      onClick={e => e.stopPropagation()}
                      className="h-4 w-4 sm:h-3.5 sm:w-3.5 rounded border-gray-300 accent-blue-600 flex-shrink-0"
                    />
                    <span className="text-[11px] font-bold text-gray-600">
                      {wo.internalId || wo.externalId || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditable ? (
                      <input
                        type="date"
                        value={item.scheduledDate.split('T')[0]}
                        onChange={e => { e.stopPropagation(); changeItemDate(wo.id, e.target.value) }}
                        onClick={e => e.stopPropagation()}
                        disabled={saving}
                        className="text-[10px] border border-gray-200 rounded px-1 py-0.5 w-[105px] focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(item.scheduledDate)}
                      </span>
                    )}
                    {isEditable && (
                      <button
                        onClick={e => { e.stopPropagation(); removeScheduledItem(wo.id) }}
                        disabled={saving}
                        className="p-1 sm:p-0.5 hover:bg-red-50 rounded transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                        title="Remover da programação"
                      >
                        <Icon name="close" className="text-sm text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-foreground truncate">{wo.title}</p>
                {wo.asset && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {wo.asset.tag ? `${wo.asset.tag} — ` : ''}{wo.asset.name}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  // Dados ativos da Q4 ja vem do estado filtrado unificado acima.
  const activeResourceSummary = filteredResourceSummary
  const activeResourceDetails = filteredResourceDetails
  const activeResourcesByWO = activeWorkOrderIds
    ? resourcesByWO.filter(g => activeWorkOrderIds.has(g.woId))
    : resourcesByWO

  // Rotulo que descreve o escopo atual da Q4 (OS unica / multi / data / todas)
  const activeResourceScopeLabel = (() => {
    if (selectedScheduledWOId) {
      const item = scheduledItems.find(i => i.workOrder.id === selectedScheduledWOId)
      const label = item?.workOrder.internalId || item?.workOrder.externalId
      return label ? `OS ${label}` : null
    }
    if (selectedScheduledIds.size > 0) {
      const n = selectedScheduledIds.size
      return `${n} OS${n > 1 ? 's' : ''} selecionada${n > 1 ? 's' : ''}`
    }
    if (selectedCalendarDate) {
      return formatDate(selectedCalendarDate)
    }
    return null
  })()

  const hasActiveResourceFilter = !!(selectedScheduledWOId || selectedScheduledIds.size > 0 || selectedCalendarDate)

  const q4Content = (
    <div className="flex flex-col overflow-hidden h-full">
      {isWide && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="inventory_2" className="text-base" />
            Recursos
            {activeResourceScopeLabel && (
              <span className="text-[10px] font-medium text-blue-600 normal-case tracking-normal ml-1">
                — {activeResourceScopeLabel}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {hasActiveResourceFilter && (
              <button
                onClick={() => {
                  setSelectedScheduledWOId(null)
                  setSelectedScheduledIds(new Set())
                  setSelectedCalendarDate(null)
                }}
                className="text-[10px] text-blue-600 hover:text-blue-800"
              >
                Ver todos
              </button>
            )}
            <button
              onClick={() => setQ4DetailView(!q4DetailView)}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Icon name={q4DetailView ? 'expand_less' : 'expand_more'} className="text-base" />
              {q4DetailView ? 'Resumo' : 'Detalhes'}
            </button>
          </div>
        </div>
      )}
      {!isWide && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            {activeResourceScopeLabel && (
              <span className="text-[10px] text-blue-600 font-medium">{activeResourceScopeLabel}</span>
            )}
            {hasActiveResourceFilter && (
              <button
                onClick={() => {
                  setSelectedScheduledWOId(null)
                  setSelectedScheduledIds(new Set())
                  setSelectedCalendarDate(null)
                }}
                className="text-[10px] text-blue-600 hover:text-blue-800"
              >
                Ver todos
              </button>
            )}
          </div>
          <button
            onClick={() => setQ4DetailView(!q4DetailView)}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Icon name={q4DetailView ? 'expand_less' : 'expand_more'} className="text-base" />
            {q4DetailView ? 'Resumo' : 'Detalhes'}
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto p-2">
        {!activeResourceSummary || activeResourceSummary.totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
            <Icon name="inventory_2" className="text-3xl mb-2" />
            <p className="text-sm">Nenhum recurso associado</p>
            {selectedScheduledWOId && (
              <p className="text-xs mt-1">Esta OS não possui recursos cadastrados</p>
            )}
          </div>
        ) : !q4DetailView ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-gray-200 rounded-[4px] p-2.5 bg-white">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Total Horas</p>
                <p className="text-lg font-bold text-gray-900">{activeResourceSummary.totalHours.toFixed(1)}h</p>
              </div>
              <div className="border border-gray-200 rounded-[4px] p-2.5 bg-white">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Custo Estimado</p>
                <p className="text-lg font-bold text-gray-900">
                  {activeResourceSummary.totalCost > 0
                    ? `R$ ${activeResourceSummary.totalCost.toFixed(2)}`
                    : '—'}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {Object.entries(activeResourceSummary.byType).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between py-1.5 px-2.5 bg-gray-50 rounded-[4px]">
                  <span className="text-[11px] font-medium text-gray-700 flex items-center gap-1.5">
                    <Icon name={RESOURCE_TYPE_ICONS[type] || 'category'} className="text-sm" />
                    {RESOURCE_TYPE_LABELS[type] || type}
                  </span>
                  <div className="text-[11px] text-gray-900 font-medium">
                    {data.totalHours > 0 && <span>{data.totalHours.toFixed(1)}h</span>}
                    {data.totalQuantity > 0 && <span className="ml-1.5">{data.totalQuantity} un.</span>}
                  </div>
                </div>
              ))}
            </div>
            {!selectedScheduledWOId && (
              <div className="border-t border-gray-200 pt-2 space-y-1 text-[11px] text-gray-600">
                <div className="flex justify-between">
                  <span>OSs {hasActiveResourceFilter ? 'no escopo' : 'programadas'}</span>
                  <span className="font-medium">{activeResourceSummary.scheduledWorkOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total de recursos</span>
                  <span className="font-medium">{activeResourceSummary.totalItems}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeResourcesByWO.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum recurso detalhado disponível
              </p>
            ) : (
              activeResourcesByWO.map(group => (
                <div key={group.woId} className="border border-gray-200 rounded-[4px] overflow-hidden">
                  <div className="bg-gray-50 px-2.5 py-1.5 border-b border-gray-200">
                    <p className="text-[11px] font-bold text-gray-700 truncate">{group.woTitle}</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.resources.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-2.5 py-2 sm:py-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Icon
                            name={RESOURCE_TYPE_ICONS[r.resourceType] || 'category'}
                            className="text-sm text-gray-500 flex-shrink-0"
                          />
                          <span className="text-[11px] text-gray-700 truncate">
                            {r.resourceType === 'LABOR' && r.user
                              ? `${r.user.firstName} ${r.user.lastName}`
                              : r.resourceType === 'SPECIALTY' && r.jobTitle
                              ? r.jobTitle.name
                              : r.resource?.name || '—'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 flex-shrink-0 ml-2">
                          {r.hours ? `${r.hours}h` : ''}
                          {r.hours && r.quantity ? ' / ' : ''}
                          {r.quantity ? `${r.quantity} un.` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className={`flex flex-col h-full ${reportsExpanded && isWide ? 'overflow-auto' : 'overflow-hidden'}`}>
      {/* ========== Collapsible Header ========== */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 md:px-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <Icon name="arrow_back" className="text-base" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
            <div className="h-5 w-px bg-gray-300 hidden sm:block" />
            <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
              {schedule?.scheduleNumber ? `#${schedule.scheduleNumber}` : 'Programação'}
            </h2>
            {schedule?.status && (
              <span className={`px-2 py-0.5 rounded text-[10px] sm:text-xs flex-shrink-0 ${
                schedule.status === 'CONFIRMED' ? 'bg-success-light text-success-light-foreground' :
                schedule.status === 'REPROGRAMMING' ? 'bg-amber-100 text-amber-700' :
                'bg-muted text-muted-foreground'
              }`}>
                {schedule.status === 'CONFIRMED' ? 'Confirmada' :
                 schedule.status === 'REPROGRAMMING' ? 'Reprog.' : 'Rascunho'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Reports toggle — hidden on phone (not enough space) */}
            <button
              onClick={() => setReportsExpanded(!reportsExpanded)}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-[4px] transition-colors ${
                reportsExpanded
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={reportsExpanded ? 'Fechar relatório' : 'Abrir relatório'}
            >
              <Icon name="analytics" className="text-sm" />
              <span className="hidden md:inline">Relatório</span>
            </button>
            {isEditable && scheduledItems.length > 0 && (
              <Button
                onClick={() => onConfirm(scheduleId)}
                className="bg-success text-white hover:bg-success/90 min-h-[44px] sm:min-h-0"
                size="sm"
              >
                <Icon name="check_circle" className="text-base sm:mr-1" />
                <span className="hidden sm:inline">Confirmar</span>
              </Button>
            )}
            {!isPhone && (
              <button
                onClick={() => setHeaderCollapsed(!headerCollapsed)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title={headerCollapsed ? 'Expandir cabeçalho' : 'Recolher cabeçalho'}
              >
                <Icon name={headerCollapsed ? 'expand_more' : 'expand_less'} className="text-xl text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {!headerCollapsed && !isPhone && schedule && (
          <div className="px-4 pb-3 md:px-6 flex items-center gap-4 sm:gap-6 text-sm text-muted-foreground flex-wrap">
            <span className="truncate max-w-[200px] sm:max-w-none">{schedule.description}</span>
            <span className="hidden sm:inline">
              <Icon name="date_range" className="text-base mr-1 align-middle" />
              {formatDate(schedule.startDate || '')} - {formatDate(schedule.endDate || '')}
            </span>
            <span className="hidden md:inline">
              {scheduledItems.length} OS(s) programada(s)
            </span>
            {selectedCalendarDate && (
              <span className="text-blue-600 font-medium">
                <Icon name="today" className="text-base mr-1 align-middle" />
                {formatDate(selectedCalendarDate)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========== Compact/Phone: Tab bar ========== */}
      {isCompact && (
        <div className="flex-shrink-0 border-b border-border bg-card overflow-x-auto">
          <div className="flex min-w-max">
            {TAB_CONFIG.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                  activeTab === tab.key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
              >
                <Icon name={tab.icon} className="text-sm" />
                <span>{isPhone ? tab.shortLabel : tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
            {/* Reports toggle on phone (in tab bar) */}
            {isPhone && (
              <button
                onClick={() => setReportsExpanded(!reportsExpanded)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                  reportsExpanded
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name="analytics" className="text-sm" />
                <span>Rel.</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========== Desktop (Wide): 4 Quadrants Grid ========== */}
      {isWide && (
        <div className={`overflow-hidden grid grid-cols-2 grid-rows-2 gap-0 ${
          reportsExpanded ? 'flex-shrink-0' : 'flex-1'
        }`} style={reportsExpanded ? { height: 'calc(100vh - 120px)', minHeight: '500px' } : undefined}>
          <div className="border-r border-b border-border flex flex-col overflow-hidden">{q1Content}</div>
          <div className="border-b border-border flex flex-col overflow-hidden">{q2Content}</div>
          <div className="border-r border-border flex flex-col overflow-hidden">{q3Content}</div>
          <div className="flex flex-col overflow-hidden">{q4Content}</div>
        </div>
      )}

      {/* ========== Compact/Phone: Single tab content ========== */}
      {isCompact && !reportsExpanded && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'available' && q1Content}
          {activeTab === 'calendar' && q2Content}
          {activeTab === 'scheduled' && q3Content}
          {activeTab === 'resources' && q4Content}
        </div>
      )}

      {/* ========== Reports Panel (expandable bottom / full on compact) ========== */}
      {reportsExpanded && schedule?.startDate && schedule?.endDate && (
        <div className={isCompact ? 'flex-1 overflow-hidden' : 'flex-shrink-0'}>
          <ScheduleReportsPanel
            startDate={schedule.startDate}
            endDate={schedule.endDate}
            scheduledItems={scheduledItems}
            resources={resourceDetails}
            jobTitleCapacity={jobTitleCapacity}
            selectedDate={selectedCalendarDate}
            onClose={() => setReportsExpanded(false)}
            inline={isWide}
          />
        </div>
      )}

      {/* ========== Batch Print ========== */}
      {batchPrintIds && batchPrintIds.length > 0 && (
        <WorkOrdersBatchPrintView
          workOrderIds={batchPrintIds}
          scheduledDate={selectedCalendarDate}
          onClose={() => setBatchPrintIds(null)}
        />
      )}
    </div>
  )
}
