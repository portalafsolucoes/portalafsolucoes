// =============================================================================
// Calendar Data Fetcher (Server-side)
// Helpers para buscar dados de calendário via Supabase.
// =============================================================================

import { supabase } from '@/lib/supabase'
import { parseWorkDays, WorkDays } from '@/lib/calendarUtils'

/**
 * Busca o calendário de um recurso pelo ID do recurso.
 */
export async function getCalendarForResource(resourceId: string): Promise<{ calendarId: string | null; calendarName: string | null; workDays: WorkDays | null }> {
  const { data, error } = await supabase
    .from('Resource')
    .select('calendarId, calendar:Calendar!calendarId(id, name, workDays)')
    .eq('id', resourceId)
    .single()

  if (error || !data) return { calendarId: null, calendarName: null, workDays: null }

  const calendar = data.calendar as unknown as { id: string; name: string; workDays?: unknown } | null
  if (!calendar) return { calendarId: null, calendarName: null, workDays: null }

  return {
    calendarId: calendar.id,
    calendarName: calendar.name,
    workDays: parseWorkDays(calendar.workDays),
  }
}

/**
 * Busca calendários para múltiplos recursos (batch).
 * Retorna um Map de resourceId → { calendarName, workDays }.
 */
export async function getCalendarsForResources(resourceIds: string[]): Promise<Map<string, { calendarId: string; calendarName: string; workDays: WorkDays | null }>> {
  const result = new Map<string, { calendarId: string; calendarName: string; workDays: WorkDays | null }>()
  if (!resourceIds.length) return result

  const { data, error } = await supabase
    .from('Resource')
    .select('id, calendarId, calendar:Calendar!calendarId(id, name, workDays)')
    .in('id', resourceIds)

  if (error || !data) return result

  for (const resource of data) {
    const calendar = resource.calendar as unknown as { id: string; name: string; workDays?: unknown } | null
    if (calendar && resource.calendarId) {
      result.set(resource.id, {
        calendarId: resource.calendarId,
        calendarName: calendar.name,
        workDays: parseWorkDays(calendar.workDays),
      })
    }
  }

  return result
}

/**
 * Busca um calendário diretamente pelo ID.
 */
export async function getCalendarById(calendarId: string): Promise<{ name: string; workDays: WorkDays | null } | null> {
  const { data, error } = await supabase
    .from('Calendar')
    .select('id, name, workDays')
    .eq('id', calendarId)
    .single()

  if (error || !data) return null

  return {
    name: data.name,
    workDays: parseWorkDays(data.workDays),
  }
}

/**
 * Busca calendários de planos de manutenção de ativo (batch).
 */
export async function getCalendarsForPlans(planIds: string[]): Promise<Map<string, { calendarId: string; calendarName: string; workDays: WorkDays | null }>> {
  const result = new Map<string, { calendarId: string; calendarName: string; workDays: WorkDays | null }>()
  if (!planIds.length) return result

  const { data, error } = await supabase
    .from('AssetMaintenancePlan')
    .select('id, calendarId, calendar:Calendar!calendarId(id, name, workDays)')
    .in('id', planIds)

  if (error || !data) return result

  for (const plan of data) {
    const calendar = plan.calendar as unknown as { id: string; name: string; workDays?: unknown } | null
    if (calendar && plan.calendarId) {
      result.set(plan.id, {
        calendarId: plan.calendarId,
        calendarName: calendar.name,
        workDays: parseWorkDays(calendar.workDays),
      })
    }
  }

  return result
}
