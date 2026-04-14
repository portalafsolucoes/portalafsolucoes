'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { ScheduleCalendar } from './ScheduleCalendar'
import { ScheduleReportsPanel } from './ScheduleReportsPanel'
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
  asset?: { id: string; name: string; tag?: string }
  serviceType?: { id: string; name: string }
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
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [reportsExpanded, setReportsExpanded] = useState(false)
  const [q4DetailView, setQ4DetailView] = useState(false)
  const [searchQ1, setSearchQ1] = useState('')
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('available')
  const [selectedScheduledWOId, setSelectedScheduledWOId] = useState<string | null>(null)
  const [selectedScheduledIds, setSelectedScheduledIds] = useState<Set<string>>(new Set())

  // ==========================================
  // Data Loading
  // ==========================================

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

      const params = new URLSearchParams({ scheduleId })
      if (schedData.startDate) params.set('startDate', schedData.startDate)
      if (schedData.endDate) params.set('endDate', schedData.endDate)

      const [availRes, resRes] = await Promise.all([
        fetch(`/api/planning/schedules/available-work-orders?${params}`),
        fetch(`/api/planning/schedules/${scheduleId}/resources`),
      ])

      const availJson = await availRes.json()
      const resJson = await resRes.json()

      setAvailableWOs(availJson.data || [])
      setResourceSummary(resJson.data?.summary || null)
      setResourceDetails(resJson.data?.resources || [])
    } catch (err) {
      console.error('Error loading workspace data:', err)
    }
    setLoading(false)
  }, [scheduleId])

  useEffect(() => { loadData() }, [loadData])

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

  // Resources for selected WO (Q4 filtered view)
  const selectedWOResources = useMemo(() => {
    if (!selectedScheduledWOId) return null
    return resourceDetails.filter(r => r.workOrderId === selectedScheduledWOId)
  }, [resourceDetails, selectedScheduledWOId])

  const selectedWOResourceSummary = useMemo(() => {
    if (!selectedWOResources) return null
    let totalHours = 0, totalCost = 0
    const byType: Record<string, { totalHours: number; totalQuantity: number; totalCost: number; items: ResourceDetail[] }> = {}
    for (const r of selectedWOResources) {
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
    return { totalHours, totalCost, totalItems: selectedWOResources.length, scheduledWorkOrders: 1, byType }
  }, [selectedWOResources])

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
          {isEditable && filteredAvailableWOs.length > 0 && (
            <>
              <button
                onClick={toggleSelectAll}
                className="text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                {selectedAvailableIds.size === filteredAvailableWOs.length ? 'Limpar' : 'Todas'}
              </button>
              {selectedAvailableIds.size > 0 && (
                <Button
                  onClick={addSelectedToSchedule}
                  size="sm"
                  disabled={saving}
                  className="text-xs h-8 px-3 min-h-[44px] sm:min-h-0 sm:h-7 sm:px-2"
                >
                  <Icon name="arrow_forward" className="text-sm" />
                  <span className="ml-1">{selectedAvailableIds.size}</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
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
              onClick={() => isEditable && toggleAvailableSelection(wo.id)}
              className={`border rounded-[4px] p-2.5 sm:p-2 cursor-pointer transition-colors border-l-4 min-h-[44px] ${
                WO_PRIORITY_COLORS[wo.priority] || 'border-l-gray-300'
              } ${
                selectedAvailableIds.has(wo.id)
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {isEditable && (
                  <input
                    type="checkbox"
                    checked={selectedAvailableIds.has(wo.id)}
                    onChange={() => toggleAvailableSelection(wo.id)}
                    className="h-4 w-4 sm:h-3.5 sm:w-3.5 rounded border-gray-300 accent-blue-600 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
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
      {!isWide && selectedCalendarDate && (
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-200 flex-shrink-0">
          <span className="text-xs text-blue-700 font-medium">
            <Icon name="today" className="text-sm mr-1 align-middle" />
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
          {isEditable && filteredScheduledItems.length > 0 && (
            <>
              <button
                onClick={toggleSelectAllScheduled}
                className="text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                {selectedScheduledIds.size === filteredScheduledItems.length ? 'Limpar' : 'Todas'}
              </button>
              {selectedScheduledIds.size > 0 && (
                <Button
                  onClick={removeSelectedScheduledItems}
                  size="sm"
                  disabled={saving}
                  variant="outline"
                  className="text-xs h-7 px-2 text-red-600 border-red-300 hover:bg-red-50 min-h-[44px] sm:min-h-0 sm:h-7"
                >
                  <Icon name="delete" className="text-sm" />
                  <span className="ml-1">{selectedScheduledIds.size}</span>
                </Button>
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
                    {isEditable && (
                      <input
                        type="checkbox"
                        checked={selectedScheduledIds.has(wo.id)}
                        onChange={e => { e.stopPropagation(); toggleScheduledSelection(wo.id) }}
                        onClick={e => e.stopPropagation()}
                        className="h-4 w-4 sm:h-3.5 sm:w-3.5 rounded border-gray-300 accent-blue-600 flex-shrink-0"
                      />
                    )}
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

  // Determine which resource data to show in Q4
  const activeResourceSummary = selectedScheduledWOId ? selectedWOResourceSummary : resourceSummary
  const activeResourceDetails = selectedScheduledWOId
    ? selectedWOResources || []
    : resourceDetails
  const activeResourcesByWO = selectedScheduledWOId
    ? resourcesByWO.filter(g => g.woId === selectedScheduledWOId)
    : resourcesByWO

  const selectedWOLabel = selectedScheduledWOId
    ? scheduledItems.find(i => i.workOrder.id === selectedScheduledWOId)?.workOrder.internalId ||
      scheduledItems.find(i => i.workOrder.id === selectedScheduledWOId)?.workOrder.externalId || null
    : null

  const q4Content = (
    <div className="flex flex-col overflow-hidden h-full">
      {isWide && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="inventory_2" className="text-base" />
            Recursos
            {selectedWOLabel && (
              <span className="text-[10px] font-medium text-blue-600 normal-case tracking-normal ml-1">
                — OS {selectedWOLabel}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {selectedScheduledWOId && (
              <button
                onClick={() => setSelectedScheduledWOId(null)}
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
            {selectedWOLabel && (
              <span className="text-[10px] text-blue-600 font-medium">OS {selectedWOLabel}</span>
            )}
            {selectedScheduledWOId && (
              <button
                onClick={() => setSelectedScheduledWOId(null)}
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
                  <span>OSs programadas</span>
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
            onClose={() => setReportsExpanded(false)}
            inline={isWide}
          />
        </div>
      )}
    </div>
  )
}
