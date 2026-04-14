'use client'

import { useMemo } from 'react'
import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/lib/utils'

// ==========================================
// Types
// ==========================================

interface ScheduledItem {
  id: string
  scheduledDate: string
  workOrder: {
    id: string
    title: string
    internalId?: string
    externalId?: string
    priority: string
  }
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

interface ScheduleReportsPanelProps {
  startDate: string
  endDate: string
  scheduledItems: ScheduledItem[]
  resources: ResourceDetail[]
  onClose: () => void
  inline?: boolean
}

// ==========================================
// Helpers
// ==========================================

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toDateKey(s: string): string {
  return s.split('T')[0]
}

function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = parseLocalDate(start)
  const endD = parseLocalDate(end)
  while (cursor <= endD) {
    dates.push(cursor.toISOString().split('T')[0])
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

const DAY_NAMES_SHORT: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  SPECIALTY: 'Especialidades',
  LABOR: 'Mão de Obra',
  MATERIAL: 'Materiais',
  TOOL: 'Ferramentas',
}

// ==========================================
// Component
// ==========================================

export function ScheduleReportsPanel({
  startDate, endDate, scheduledItems, resources, onClose, inline,
}: ScheduleReportsPanelProps) {
  const dateRange = useMemo(() => generateDateRange(startDate, endDate), [startDate, endDate])

  // OSs por dia
  const itemsByDate = useMemo(() => {
    const map = new Map<string, ScheduledItem[]>()
    for (const item of scheduledItems) {
      const key = toDateKey(item.scheduledDate)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [scheduledItems])

  // Recursos por WO (para cruzar com datas)
  const resourcesByWO = useMemo(() => {
    const map = new Map<string, ResourceDetail[]>()
    for (const r of resources) {
      if (!map.has(r.workOrderId)) map.set(r.workOrderId, [])
      map.get(r.workOrderId)!.push(r)
    }
    return map
  }, [resources])

  // ==========================================
  // 1. Resumo diário: horas, custo e OSs por dia
  // ==========================================
  const dailyBreakdown = useMemo(() => {
    return dateRange.map(dateStr => {
      const dayItems = itemsByDate.get(dateStr) || []
      let hours = 0
      let cost = 0

      for (const item of dayItems) {
        const woResources = resourcesByWO.get(item.workOrder.id) || []
        for (const r of woResources) {
          const h = r.hours || 0
          const q = r.quantity || 0
          hours += h

          if (r.resourceType === 'LABOR' && r.user?.hourlyRate) {
            cost += h * r.user.hourlyRate
          } else if ((r.resourceType === 'MATERIAL' || r.resourceType === 'TOOL') && r.resource?.unitCost) {
            cost += q * r.resource.unitCost
          }
        }
      }

      const d = parseLocalDate(dateStr)
      const dayOfWeek = d.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      return {
        date: dateStr,
        dayName: DAY_NAMES_SHORT[dayOfWeek],
        dayNumber: d.getDate(),
        woCount: dayItems.length,
        hours,
        cost,
        isWeekend,
      }
    })
  }, [dateRange, itemsByDate, resourcesByWO])

  // ==========================================
  // 2. Alocação de MO: horas por pessoa por dia
  // ==========================================
  const laborAllocation = useMemo(() => {
    // Mapa: userId -> { name, hourlyRate, days: { date -> hours } }
    const people = new Map<string, {
      name: string
      hourlyRate: number
      days: Map<string, number>
      totalHours: number
    }>()

    for (const item of scheduledItems) {
      const dateKey = toDateKey(item.scheduledDate)
      const woResources = resourcesByWO.get(item.workOrder.id) || []

      for (const r of woResources) {
        if (r.resourceType === 'LABOR' && r.user) {
          const uid = r.user.id
          if (!people.has(uid)) {
            people.set(uid, {
              name: `${r.user.firstName} ${r.user.lastName}`,
              hourlyRate: r.user.hourlyRate || 0,
              days: new Map(),
              totalHours: 0,
            })
          }
          const person = people.get(uid)!
          const existing = person.days.get(dateKey) || 0
          person.days.set(dateKey, existing + (r.hours || 0))
          person.totalHours += (r.hours || 0)
        }
      }
    }

    return Array.from(people.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalHours - a.totalHours)
  }, [scheduledItems, resourcesByWO])

  // ==========================================
  // 3. Requisitos de material/ferramenta
  // ==========================================
  const materialRequirements = useMemo(() => {
    const map = new Map<string, {
      name: string
      type: string
      totalQuantity: number
      totalCost: number
      unitCost: number
    }>()

    for (const r of resources) {
      if (r.resourceType !== 'MATERIAL' && r.resourceType !== 'TOOL') continue
      if (!r.resource) continue

      const key = r.resource.id
      if (!map.has(key)) {
        map.set(key, {
          name: r.resource.name,
          type: r.resourceType,
          totalQuantity: 0,
          totalCost: 0,
          unitCost: r.resource.unitCost || 0,
        })
      }
      const item = map.get(key)!
      item.totalQuantity += (r.quantity || 0)
      item.totalCost += (r.quantity || 0) * (r.resource.unitCost || 0)
    }

    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
  }, [resources])

  // ==========================================
  // 4. Totais gerais
  // ==========================================
  const totals = useMemo(() => {
    const totalHours = dailyBreakdown.reduce((s, d) => s + d.hours, 0)
    const totalCost = dailyBreakdown.reduce((s, d) => s + d.cost, 0)
    const workingDays = dailyBreakdown.filter(d => !d.isWeekend && d.woCount > 0).length
    const totalWOs = scheduledItems.length
    const laborHours = resources
      .filter(r => r.resourceType === 'LABOR')
      .reduce((s, r) => s + (r.hours || 0), 0)
    const specialtyHours = resources
      .filter(r => r.resourceType === 'SPECIALTY')
      .reduce((s, r) => s + (r.hours || 0), 0)

    return { totalHours, totalCost, workingDays, totalWOs, laborHours, specialtyHours }
  }, [dailyBreakdown, scheduledItems, resources])

  // Maior valor de horas num dia (para barra relativa)
  const maxDayHours = Math.max(...dailyBreakdown.map(d => d.hours), 1)

  return (
    <div className={`flex flex-col bg-card border-t border-gray-300 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] ${inline ? '' : 'h-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <Icon name="analytics" className="text-base" />
          Relatório da Programação
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
        >
          <Icon name="close" className="text-lg text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className={inline ? '' : 'flex-1 overflow-auto'}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-0 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">

          {/* Col 1: Resumo de Horas + Breakdown Diário */}
          <div className="p-3 sm:p-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              <div className="border border-gray-200 rounded-[4px] p-2.5 bg-white text-center">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Horas MO</p>
                <p className="text-lg font-bold text-gray-900">{totals.laborHours.toFixed(1)}h</p>
              </div>
              <div className="border border-gray-200 rounded-[4px] p-2.5 bg-white text-center">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Horas Espec.</p>
                <p className="text-lg font-bold text-gray-900">{totals.specialtyHours.toFixed(1)}h</p>
              </div>
              <div className="border border-gray-200 rounded-[4px] p-2.5 bg-white text-center">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Custo Total</p>
                <p className="text-lg font-bold text-gray-900">
                  {totals.totalCost > 0 ? `R$ ${totals.totalCost.toFixed(0)}` : '—'}
                </p>
              </div>
            </div>

            {/* Daily breakdown */}
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
              Distribuição Diária
            </h4>
            <div className="space-y-0.5">
              {dailyBreakdown.map(day => (
                <div
                  key={day.date}
                  className={`flex items-center gap-2 py-1 px-1.5 rounded text-[11px] ${
                    day.isWeekend ? 'text-gray-400' : 'text-gray-700'
                  } ${day.woCount > 0 ? '' : 'opacity-50'}`}
                >
                  <span className="w-8 font-medium flex-shrink-0">{day.dayName}</span>
                  <span className="w-5 text-right flex-shrink-0">{day.dayNumber}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-sm overflow-hidden">
                    {day.hours > 0 && (
                      <div
                        className="h-full bg-blue-400 rounded-sm transition-all"
                        style={{ width: `${Math.min((day.hours / maxDayHours) * 100, 100)}%` }}
                      />
                    )}
                  </div>
                  <span className="w-10 text-right flex-shrink-0 font-medium">
                    {day.hours > 0 ? `${day.hours.toFixed(1)}h` : '—'}
                  </span>
                  <span className="w-6 text-right flex-shrink-0 text-gray-400">
                    {day.woCount > 0 ? `${day.woCount}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: Alocação de Mão de Obra */}
          <div className="p-3 sm:p-4">
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">
              Alocação de Mão de Obra
            </h4>

            {laborAllocation.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma mão de obra alocada
              </p>
            ) : (
              <div className="space-y-3">
                {laborAllocation.map(person => (
                  <div key={person.id} className="border border-gray-200 rounded-[4px] p-2.5 bg-white">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-800 flex items-center gap-1.5">
                        <Icon name="person" className="text-sm text-gray-500" />
                        {person.name}
                      </span>
                      <span className="text-[11px] font-bold text-gray-600">
                        {person.totalHours.toFixed(1)}h total
                      </span>
                    </div>

                    {/* Mini calendar heatmap for this person */}
                    <div className="flex gap-0.5 flex-wrap">
                      {dateRange.map(dateStr => {
                        const hours = person.days.get(dateStr) || 0
                        const d = parseLocalDate(dateStr)
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6

                        return (
                          <div
                            key={dateStr}
                            title={`${formatDate(dateStr)}: ${hours > 0 ? `${hours}h` : 'Livre'}`}
                            className={`w-6 h-6 sm:w-5 sm:h-5 rounded-sm text-[8px] flex items-center justify-center font-medium ${
                              hours > 8 ? 'bg-red-500 text-white' :
                              hours > 4 ? 'bg-amber-400 text-white' :
                              hours > 0 ? 'bg-blue-400 text-white' :
                              isWeekend ? 'bg-gray-100 text-gray-300' :
                              'bg-gray-50 text-gray-400'
                            }`}
                          >
                            {d.getDate()}
                          </div>
                        )
                      })}
                    </div>

                    {/* Over-allocation warning */}
                    {Array.from(person.days.entries()).some(([, h]) => h > 8) && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red-600">
                        <Icon name="warning" className="text-sm" />
                        Sobrecarga detectada ({'>'}8h em algum dia)
                      </div>
                    )}

                    {person.hourlyRate > 0 && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Custo: R$ {(person.totalHours * person.hourlyRate).toFixed(2)}
                        <span className="ml-1">(R$ {person.hourlyRate.toFixed(2)}/h)</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Col 3: Requisitos de Materiais e Ferramentas */}
          <div className="p-3 sm:p-4">
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">
              Materiais e Ferramentas
            </h4>

            {materialRequirements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum material ou ferramenta requerido
              </p>
            ) : (
              <div className="space-y-1">
                {materialRequirements.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-2.5 border border-gray-200 rounded-[4px] bg-white"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        name={item.type === 'TOOL' ? 'construction' : 'inventory_2'}
                        className="text-sm text-gray-500 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {RESOURCE_TYPE_LABELS[item.type] || item.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-medium text-gray-800">{item.totalQuantity} un.</p>
                      {item.totalCost > 0 && (
                        <p className="text-[10px] text-gray-400">R$ {item.totalCost.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total */}
                {materialRequirements.some(m => m.totalCost > 0) && (
                  <div className="flex items-center justify-between py-2 px-2.5 bg-gray-50 rounded-[4px] border border-gray-200 mt-2">
                    <span className="text-xs font-bold text-gray-700">Total Materiais</span>
                    <span className="text-xs font-bold text-gray-900">
                      R$ {materialRequirements.reduce((s, m) => s + m.totalCost, 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Specialties summary */}
            {(() => {
              const specialties = resources.filter(r => r.resourceType === 'SPECIALTY' && r.jobTitle)
              if (specialties.length === 0) return null

              const specMap = new Map<string, { name: string; totalHours: number; totalQty: number }>()
              for (const r of specialties) {
                const key = r.jobTitle!.id
                if (!specMap.has(key)) {
                  specMap.set(key, { name: r.jobTitle!.name, totalHours: 0, totalQty: 0 })
                }
                const entry = specMap.get(key)!
                entry.totalHours += (r.hours || 0)
                entry.totalQty += (r.quantity || 0)
              }

              return (
                <>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 mt-4">
                    Especialidades Requeridas
                  </h4>
                  <div className="space-y-1">
                    {Array.from(specMap.values()).map((spec, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-2.5 border border-gray-200 rounded-[4px] bg-white">
                        <div className="flex items-center gap-2">
                          <Icon name="engineering" className="text-sm text-gray-500" />
                          <span className="text-xs text-gray-800">{spec.name}</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {spec.totalQty > 0 && <span>{spec.totalQty} prof.</span>}
                          {spec.totalHours > 0 && <span className="ml-1.5">{spec.totalHours.toFixed(1)}h</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
