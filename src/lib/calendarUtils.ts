// =============================================================================
// Calendar Utility Library
// Funções puras para cálculos de disponibilidade baseados em calendário.
// Usável tanto no servidor (API routes) quanto no cliente (componentes).
// =============================================================================

// --- Tipos -------------------------------------------------------------------

export interface Shift {
  start: string // "HH:MM"
  end: string   // "HH:MM"
}

export interface DayConfig {
  day: string    // 'monday' | 'tuesday' | ... | 'sunday'
  label: string  // Nome em português
  active: boolean
  shifts: Shift[]
}

export interface Holiday {
  date: string   // "YYYY-MM-DD"
  name: string
}

export interface WorkDays {
  weekDays: DayConfig[]
  holidays: Holiday[]
}

export interface DailyAvailability {
  date: string    // "YYYY-MM-DD"
  dayName: string
  isWorkingDay: boolean
  isHoliday: boolean
  holidayName?: string
  hours: number
  shifts: Shift[]
}

export interface RangeAvailability {
  totalHours: number
  workingDays: number
  totalDays: number
  details: DailyAvailability[]
}

// --- Constantes --------------------------------------------------------------

const JS_DAY_TO_NAME: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

// --- Funções de parsing ------------------------------------------------------

/**
 * Parse seguro do campo workDays (pode ser string JSON ou objeto).
 */
export function parseWorkDays(raw: any): WorkDays | null {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && Array.isArray(parsed.weekDays)) {
      return {
        weekDays: parsed.weekDays,
        holidays: Array.isArray(parsed.holidays) ? parsed.holidays : [],
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Converte minutos em "HH:MM" a partir de um time string.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// --- Funções de dia ----------------------------------------------------------

/**
 * Retorna o nome do dia da semana (em inglês, lowercase) para uma Date.
 */
export function getDayOfWeekName(date: Date): string {
  return JS_DAY_TO_NAME[date.getDay()] || 'monday'
}

/**
 * Formata uma Date para "YYYY-MM-DD" (local).
 */
export function formatDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Verifica se uma data é feriado no calendário.
 */
export function isHoliday(workDays: WorkDays, date: Date): { is: boolean; name?: string } {
  const dateStr = formatDateLocal(date)
  const holiday = workDays.holidays.find(h => h.date === dateStr)
  return holiday ? { is: true, name: holiday.name } : { is: false }
}

/**
 * Verifica se uma data é dia útil (dia ativo e não é feriado).
 */
export function isWorkingDay(workDays: WorkDays, date: Date): boolean {
  const holidayCheck = isHoliday(workDays, date)
  if (holidayCheck.is) return false

  const dayName = getDayOfWeekName(date)
  const dayConfig = workDays.weekDays.find(d => d.day === dayName)
  return dayConfig?.active ?? false
}

/**
 * Retorna os turnos configurados para uma data específica.
 * Retorna array vazio se não for dia útil ou for feriado.
 */
export function getShiftsForDate(workDays: WorkDays, date: Date): Shift[] {
  if (!isWorkingDay(workDays, date)) return []
  const dayName = getDayOfWeekName(date)
  const dayConfig = workDays.weekDays.find(d => d.day === dayName)
  return dayConfig?.shifts || []
}

// --- Funções de cálculo de horas ---------------------------------------------

/**
 * Calcula a duração total de um array de turnos em horas.
 * Suporta turnos noturnos (end < start => considera virada de dia).
 */
export function calculateShiftHours(shifts: Shift[]): number {
  let total = 0
  for (const shift of shifts) {
    const startMin = timeToMinutes(shift.start)
    const endMin = timeToMinutes(shift.end)
    let duration = endMin - startMin
    if (duration <= 0) duration += 24 * 60 // turno noturno
    total += duration
  }
  return total / 60
}

/**
 * Retorna as horas disponíveis para uma data específica.
 */
export function getAvailableHoursForDate(workDays: WorkDays, date: Date): number {
  const shifts = getShiftsForDate(workDays, date)
  return calculateShiftHours(shifts)
}

/**
 * Calcula as horas disponíveis por dia da semana (resumo semanal).
 */
export function getWeeklySummary(workDays: WorkDays): { day: string; label: string; hours: number; active: boolean }[] {
  return workDays.weekDays.map(d => ({
    day: d.day,
    label: d.label || DAY_LABELS[d.day] || d.day,
    hours: d.active ? calculateShiftHours(d.shifts) : 0,
    active: d.active,
  }))
}

/**
 * Calcula o total de horas disponíveis por semana (sem feriados).
 */
export function getWeeklyHours(workDays: WorkDays): number {
  return workDays.weekDays
    .filter(d => d.active)
    .reduce((sum, d) => sum + calculateShiftHours(d.shifts), 0)
}

/**
 * Calcula a disponibilidade detalhada em um intervalo de datas.
 */
export function getAvailabilityInRange(workDays: WorkDays, startDate: Date, endDate: Date): RangeAvailability {
  const details: DailyAvailability[] = []
  let totalHours = 0
  let workingDays = 0

  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  while (current <= end) {
    const dateStr = formatDateLocal(current)
    const dayName = getDayOfWeekName(current)
    const holidayCheck = isHoliday(workDays, current)
    const working = isWorkingDay(workDays, current)
    const shifts = working ? getShiftsForDate(workDays, current) : []
    const hours = working ? calculateShiftHours(shifts) : 0

    details.push({
      date: dateStr,
      dayName: DAY_LABELS[dayName] || dayName,
      isWorkingDay: working,
      isHoliday: holidayCheck.is,
      holidayName: holidayCheck.name,
      hours,
      shifts,
    })

    if (working) {
      totalHours += hours
      workingDays++
    }

    current.setDate(current.getDate() + 1)
  }

  return {
    totalHours,
    workingDays,
    totalDays: details.length,
    details,
  }
}

// --- Funções de navegação de dias úteis --------------------------------------

/**
 * Encontra o próximo dia útil a partir de uma data (incluindo a própria data).
 */
export function adjustToWorkingDay(workDays: WorkDays, targetDate: Date): Date {
  const date = new Date(targetDate)
  date.setHours(0, 0, 0, 0)
  let maxAttempts = 365 // segurança contra loop infinito
  while (!isWorkingDay(workDays, date) && maxAttempts > 0) {
    date.setDate(date.getDate() + 1)
    maxAttempts--
  }
  return date
}

/**
 * Encontra o próximo dia útil APÓS uma data.
 */
export function getNextWorkingDay(workDays: WorkDays, fromDate: Date): Date {
  const date = new Date(fromDate)
  date.setDate(date.getDate() + 1)
  return adjustToWorkingDay(workDays, date)
}

/**
 * Conta dias úteis entre duas datas (inclusive).
 */
export function getWorkingDaysBetween(workDays: WorkDays, start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)
  const endDate = new Date(end)
  endDate.setHours(23, 59, 59, 999)

  while (current <= endDate) {
    if (isWorkingDay(workDays, current)) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

/**
 * Calcula quantos dias úteis serão necessários para cumprir X horas de trabalho,
 * dado um calendário com turnos variáveis.
 */
export function estimateWorkingDaysForHours(workDays: WorkDays, totalHours: number, fromDate: Date = new Date()): {
  days: number
  endDate: Date
  totalAvailableHours: number
} {
  let remaining = totalHours
  let days = 0
  let totalAvailable = 0
  const current = new Date(fromDate)
  current.setHours(0, 0, 0, 0)

  while (remaining > 0 && days < 365) {
    if (isWorkingDay(workDays, current)) {
      const dayHours = getAvailableHoursForDate(workDays, current)
      remaining -= dayHours
      totalAvailable += dayHours
      days++
    }
    if (remaining > 0) {
      current.setDate(current.getDate() + 1)
    }
  }

  return { days, endDate: new Date(current), totalAvailableHours: totalAvailable }
}

// --- Funções de validação ----------------------------------------------------

/**
 * Verifica se um horário cai dentro de algum turno do calendário para uma data.
 * Retorna avisos se o horário está fora do expediente.
 */
export function validateTimeAgainstCalendar(
  workDays: WorkDays,
  date: Date,
  startTime?: string,
  endTime?: string
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []
  const dateStr = formatDateLocal(date)
  const dayLabel = DAY_LABELS[getDayOfWeekName(date)] || getDayOfWeekName(date)

  const holidayCheck = isHoliday(workDays, date)
  if (holidayCheck.is) {
    warnings.push(`${dateStr} é feriado (${holidayCheck.name})`)
    return { valid: false, warnings }
  }

  if (!isWorkingDay(workDays, date)) {
    warnings.push(`${dateStr} (${dayLabel}) não é dia útil neste calendário`)
    return { valid: false, warnings }
  }

  const shifts = getShiftsForDate(workDays, date)
  if (shifts.length === 0) {
    warnings.push(`${dateStr} não possui turnos configurados`)
    return { valid: false, warnings }
  }

  // Verificar se o horário de início está dentro de algum turno
  if (startTime) {
    const startMin = timeToMinutes(startTime)
    const inShift = shifts.some(s => {
      const sMin = timeToMinutes(s.start)
      const eMin = timeToMinutes(s.end)
      return startMin >= sMin && startMin <= eMin
    })
    if (!inShift) {
      const shiftsStr = shifts.map(s => `${s.start}-${s.end}`).join(', ')
      warnings.push(`Hora início ${startTime} está fora dos turnos (${shiftsStr})`)
    }
  }

  // Verificar se o horário de fim está dentro de algum turno
  if (endTime) {
    const endMin = timeToMinutes(endTime)
    const inShift = shifts.some(s => {
      const sMin = timeToMinutes(s.start)
      const eMin = timeToMinutes(s.end)
      return endMin >= sMin && endMin <= eMin
    })
    if (!inShift) {
      const shiftsStr = shifts.map(s => `${s.start}-${s.end}`).join(', ')
      warnings.push(`Hora fim ${endTime} está fora dos turnos (${shiftsStr})`)
    }
  }

  return { valid: warnings.length === 0, warnings }
}

/**
 * Calcula horas efetivas dentro dos turnos para um período start-end.
 * Se o recurso trabalha das 08:00-12:00 e 13:00-17:00, e o registro é
 * 10:00-15:00, as horas efetivas são 2h (10-12) + 2h (13-15) = 4h.
 */
export function calculateEffectiveHours(
  workDays: WorkDays,
  startDate: Date,
  startTime: string,
  endDate: Date,
  endTime: string
): { effectiveHours: number; totalRegisteredHours: number; efficiency: number } {
  const startDateStr = formatDateLocal(startDate)
  const endDateStr = formatDateLocal(endDate)

  // Se é o mesmo dia
  if (startDateStr === endDateStr) {
    const startMin = timeToMinutes(startTime)
    const endMin = timeToMinutes(endTime)
    const totalRegisteredHours = Math.max(0, (endMin - startMin) / 60)

    const shifts = getShiftsForDate(workDays, startDate)
    let effectiveMin = 0
    for (const shift of shifts) {
      const shiftStart = timeToMinutes(shift.start)
      const shiftEnd = timeToMinutes(shift.end)
      const overlapStart = Math.max(startMin, shiftStart)
      const overlapEnd = Math.min(endMin, shiftEnd)
      if (overlapEnd > overlapStart) {
        effectiveMin += overlapEnd - overlapStart
      }
    }

    const effectiveHours = effectiveMin / 60
    return {
      effectiveHours,
      totalRegisteredHours,
      efficiency: totalRegisteredHours > 0 ? (effectiveHours / totalRegisteredHours) * 100 : 0,
    }
  }

  // Se abrange múltiplos dias
  let effectiveTotal = 0
  const current = new Date(startDate)
  const end = new Date(endDate)
  let totalRegisteredHours = 0

  while (current <= end) {
    const currentStr = formatDateLocal(current)
    const isFirst = currentStr === startDateStr
    const isLast = currentStr === endDateStr
    const dayStart = isFirst ? startTime : '00:00'
    const dayEnd = isLast ? endTime : '23:59'
    const dayStartMin = timeToMinutes(dayStart)
    const dayEndMin = timeToMinutes(dayEnd)

    totalRegisteredHours += Math.max(0, (dayEndMin - dayStartMin) / 60)

    const shifts = getShiftsForDate(workDays, current)
    for (const shift of shifts) {
      const shiftStart = timeToMinutes(shift.start)
      const shiftEnd = timeToMinutes(shift.end)
      const overlapStart = Math.max(dayStartMin, shiftStart)
      const overlapEnd = Math.min(dayEndMin, shiftEnd)
      if (overlapEnd > overlapStart) {
        effectiveTotal += overlapEnd - overlapStart
      }
    }

    current.setDate(current.getDate() + 1)
  }

  const effectiveHours = effectiveTotal / 60
  return {
    effectiveHours,
    totalRegisteredHours,
    efficiency: totalRegisteredHours > 0 ? (effectiveHours / totalRegisteredHours) * 100 : 0,
  }
}
