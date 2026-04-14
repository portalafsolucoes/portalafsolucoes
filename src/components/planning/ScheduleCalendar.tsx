'use client'

import { useMemo } from 'react'

// ==========================================
// Types
// ==========================================

interface CalendarWO {
  itemId: string
  workOrderId: string
  title: string
  internalId?: string
  externalId?: string
  priority: string
  scheduledDate: string
}

interface ScheduleCalendarProps {
  startDate: string
  endDate: string
  items: CalendarWO[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onMoveItem?: (itemId: string, newDate: string) => void
  isEditable: boolean
}

// ==========================================
// Helpers
// ==========================================

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const PRIORITY_DOT: Record<string, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-blue-500',
  NONE: 'bg-gray-400',
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

function generateCalendarDays(start: string, end: string): { date: Date; dateStr: string; inRange: boolean }[] {
  const startD = parseDate(start)
  const endD = parseDate(end)

  // Iniciar na segunda-feira anterior (ou no próprio dia se já for segunda)
  const calStart = new Date(startD)
  const dayOfWeek = calStart.getDay()
  // Ajustar para domingo como primeiro dia
  calStart.setDate(calStart.getDate() - dayOfWeek)

  // Terminar no sábado posterior
  const calEnd = new Date(endD)
  const endDayOfWeek = calEnd.getDay()
  if (endDayOfWeek < 6) {
    calEnd.setDate(calEnd.getDate() + (6 - endDayOfWeek))
  }

  const days: { date: Date; dateStr: string; inRange: boolean }[] = []
  const cursor = new Date(calStart)

  while (cursor <= calEnd) {
    const dateStr = toDateStr(cursor)
    const inRange = cursor >= startD && cursor <= endD
    days.push({ date: new Date(cursor), dateStr, inRange })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

// ==========================================
// Component
// ==========================================

export function ScheduleCalendar({
  startDate, endDate, items, selectedDate, onSelectDate, onMoveItem, isEditable,
}: ScheduleCalendarProps) {
  const today = toDateStr(new Date())

  const calendarDays = useMemo(
    () => generateCalendarDays(startDate, endDate),
    [startDate, endDate]
  )

  // Agrupar itens por data
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarWO[]>()
    for (const item of items) {
      const dateKey = item.scheduledDate.split('T')[0]
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(item)
    }
    return map
  }, [items])

  // Dividir em semanas
  const weeks = useMemo(() => {
    const result: typeof calendarDays[] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  const handleDayClick = (dateStr: string) => {
    onSelectDate(dateStr)
  }

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    if (!isEditable || !onMoveItem) return
    const itemId = e.dataTransfer.getData('text/plain')
    if (itemId) {
      onMoveItem(itemId, dateStr)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        {DAY_NAMES.map(day => (
          <div key={day} className="px-0.5 sm:px-1 py-1.5 text-center text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-100 min-h-[52px] sm:min-h-[60px]">
            {week.map(day => {
              const dayItems = itemsByDate.get(day.dateStr) || []
              const isToday = day.dateStr === today
              const isSelected = day.dateStr === selectedDate
              const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6

              return (
                <div
                  key={day.dateStr}
                  onClick={() => handleDayClick(day.dateStr)}
                  onDragOver={e => { e.preventDefault() }}
                  onDrop={e => handleDrop(e, day.dateStr)}
                  className={`
                    border-r border-gray-100 last:border-r-0 p-0.5 sm:p-1 cursor-pointer transition-colors min-h-[52px] sm:min-h-[60px]
                    ${!day.inRange ? 'bg-gray-50 opacity-50' : ''}
                    ${isWeekend && day.inRange ? 'bg-gray-50/50' : ''}
                    ${isSelected ? 'bg-blue-50 ring-1 ring-blue-400 ring-inset' : ''}
                    ${isToday ? 'bg-amber-50/50' : ''}
                    ${day.inRange && !isSelected ? 'hover:bg-gray-50' : ''}
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[10px] sm:text-[11px] font-medium ${
                      isToday ? 'bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]' :
                      !day.inRange ? 'text-gray-400' :
                      isWeekend ? 'text-gray-400' :
                      'text-gray-700'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[9px] font-bold text-gray-400">{dayItems.length}</span>
                    )}
                  </div>

                  {/* WO chips — show fewer on small screens */}
                  <div className="space-y-0.5 hidden sm:block">
                    {dayItems.slice(0, 3).map(item => (
                      <div
                        key={item.itemId}
                        draggable={isEditable}
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', item.itemId)
                        }}
                        className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-white border border-gray-200 truncate cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors"
                        title={`${item.internalId || item.externalId || ''} — ${item.title}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[item.priority] || 'bg-gray-400'}`} />
                        <span className="truncate text-gray-700">
                          {item.internalId || item.externalId || item.title.slice(0, 15)}
                        </span>
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-[9px] text-gray-400 pl-1">+{dayItems.length - 3} mais</span>
                    )}
                  </div>
                  {/* Mobile: just show priority dots */}
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {dayItems.slice(0, 5).map(item => (
                      <span
                        key={item.itemId}
                        className={`w-2 h-2 rounded-full ${PRIORITY_DOT[item.priority] || 'bg-gray-400'}`}
                        title={`${item.internalId || item.externalId || ''} — ${item.title}`}
                      />
                    ))}
                    {dayItems.length > 5 && (
                      <span className="text-[8px] text-gray-400">+{dayItems.length - 5}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
