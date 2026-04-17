import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import {
  parseWorkDays,
  getAvailableHoursForDate,
  getAvailabilityInRange,
  getWeeklySummary,
  getWeeklyHours,
  isWorkingDay,
  validateTimeAgainstCalendar,
  formatDateLocal,
} from '@/lib/calendarUtils'

/**
 * GET /api/resources/availability
 *
 * Query params:
 *   - resourceIds: comma-separated resource IDs (obrigatório)
 *   - date: "YYYY-MM-DD" para verificar um dia específico
 *   - startDate + endDate: "YYYY-MM-DD" para intervalo
 *   - startTime + endTime: "HH:MM" para validar horários específicos
 *
 * Retorna a disponibilidade dos recursos com base em seus calendários.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const resourceIdsParam = searchParams.get('resourceIds')
    const dateParam = searchParams.get('date')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const startTimeParam = searchParams.get('startTime')
    const endTimeParam = searchParams.get('endTime')

    if (!resourceIdsParam) {
      return NextResponse.json({ error: 'resourceIds é obrigatório' }, { status: 400 })
    }

    const resourceIds = resourceIdsParam.split(',').map(id => id.trim()).filter(Boolean)

    // Buscar recursos com calendários
    const { data: resources, error } = await supabase
      .from('Resource')
      .select('id, name, calendarId, calendar:Calendar!calendarId(id, name, workDays)')
      .in('id', resourceIds)
      .eq('companyId', session.companyId)

    if (error) throw error

    const result: Record<string, unknown>[] = []

    for (const resource of (resources || [])) {
      const calendar = resource.calendar as { name?: string; workDays?: unknown } | null
      const workDays = calendar ? parseWorkDays(calendar.workDays) : null

      const entry: Record<string, unknown> = {
        resourceId: resource.id,
        resourceName: resource.name,
        hasCalendar: !!workDays,
        calendarName: calendar?.name || null,
      }

      if (workDays) {
        // Resumo semanal
        entry.weeklySummary = getWeeklySummary(workDays)
        entry.weeklyHours = getWeeklyHours(workDays)

        // Disponibilidade para uma data específica
        if (dateParam) {
          const date = new Date(dateParam + 'T12:00:00')
          entry.dateAvailability = {
            date: dateParam,
            isWorkingDay: isWorkingDay(workDays, date),
            availableHours: getAvailableHoursForDate(workDays, date),
          }

          // Validar horários específicos
          if (startTimeParam || endTimeParam) {
            entry.timeValidation = validateTimeAgainstCalendar(
              workDays, date, startTimeParam || undefined, endTimeParam || undefined
            )
          }
        }

        // Disponibilidade em intervalo
        if (startDateParam && endDateParam) {
          const start = new Date(startDateParam + 'T00:00:00')
          const end = new Date(endDateParam + 'T23:59:59')
          entry.rangeAvailability = getAvailabilityInRange(workDays, start, end)
        }

        // Próximos feriados (se houver)
        const today = formatDateLocal(new Date())
        entry.upcomingHolidays = workDays.holidays
          .filter(h => h.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 5)
      }

      result.push(entry)
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error fetching resource availability:', error)
    return NextResponse.json({ error: 'Erro ao buscar disponibilidade' }, { status: 500 })
  }
}
