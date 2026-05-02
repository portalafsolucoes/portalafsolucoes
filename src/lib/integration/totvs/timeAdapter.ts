// Adapter de tempo na borda da integracao TOTVS/Protheus.
// Internamente o portal armazena duracoes em HORAS DECIMAIS (Decimal(10,2)).
// Algumas tabelas Protheus historicamente trabalham em MINUTOS inteiros.
// Toda conversao com o ERP deve passar por este modulo.

import { hoursToMinutes, minutesToHours } from '@/lib/units/time'

export function protheusMinutesToHours(min: number | null | undefined): number | null {
  return minutesToHours(min)
}

export function hoursToProtheusMinutes(hours: number | null | undefined): number | null {
  return hoursToMinutes(hours)
}

export const PROTHEUS_TIME_FIELDS_BY_TABLE: Record<string, string[]> = {
  WorkOrder: ['estimatedDuration', 'actualDuration'],
  Task: ['executionTime'],
  StandardMaintenanceTask: ['executionTime'],
  AssetMaintenanceTask: ['executionTime'],
  Labor: ['duration'],
}

export function convertHoursRowToProtheusMinutes<T extends Record<string, unknown>>(
  row: T,
  table: string,
): T {
  const fields = PROTHEUS_TIME_FIELDS_BY_TABLE[table]
  if (!fields || !row) return row
  const out: Record<string, unknown> = { ...row }
  for (const f of fields) {
    if (f in out) {
      out[f] = hoursToProtheusMinutes(out[f] as number | null)
    }
  }
  return out as T
}
