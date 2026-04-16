import { supabase } from './supabase'

/**
 * Gera o próximo ID sequencial para Work Order no formato XXXXXX (6 dígitos numéricos).
 * Todas as OSs usam externalId com 6 dígitos e ficam IN_SYSTEM.
 * Considera tanto internalId (legado MAN-) quanto externalId para evitar colisões.
 */
export async function generateSequentialId(): Promise<string> {
  const [internalResult, externalResult] = await Promise.all([
    supabase
      .from('WorkOrder')
      .select('internalId')
      .not('internalId', 'is', null),
    supabase
      .from('WorkOrder')
      .select('externalId')
      .not('externalId', 'is', null),
  ])

  if (internalResult.error) {
    console.error('Error generating sequential work order id:', internalResult.error)
    throw new Error('Failed to generate sequential work order id')
  }

  let maxNumber = 0

  // Considerar internalIds legados (MAN-XXXXXX ou numérico puro)
  for (const row of (internalResult.data || [])) {
    const cleaned = (row.internalId || '').replace('MAN-', '')
    const num = parseInt(cleaned)
    if (!isNaN(num) && num > maxNumber) maxNumber = num
  }

  // Considerar externalIds existentes
  for (const row of (externalResult.data || [])) {
    if (row.externalId && /^\d+$/.test(row.externalId)) {
      const num = parseInt(row.externalId)
      if (!isNaN(num) && num > maxNumber) maxNumber = num
    }
  }

  const nextNumber = maxNumber + 1
  return nextNumber.toString().padStart(6, '0')
}

/** @deprecated Use generateSequentialId() */
export const generateInternalId = generateSequentialId

/**
 * Valida se um ID está no formato correto (6 dígitos numéricos)
 */
export function isValidExternalId(externalId: string): boolean {
  return /^\d{6}$/.test(externalId)
}

/**
 * Retorna o ID de exibição da OS (externalId se existir, senão internalId legado)
 */
export function getDisplayId(workOrder: { externalId?: string | null, internalId?: string | null, customId?: string | null, id: string }): string {
  return workOrder.externalId || workOrder.internalId || workOrder.customId || workOrder.id.slice(0, 8)
}

/**
 * Calcula a prioridade da OS baseada no score GUT do ativo.
 * GUT = (Gravidade × Urgência × Tendência / 125) × 100
 */
export function getPriorityFromGut(gutGravity: number, gutUrgency: number, gutTendency: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  const gutScore = (gutGravity * gutUrgency * gutTendency / 125) * 100
  if (gutScore >= 70) return 'CRITICAL'
  if (gutScore >= 40) return 'HIGH'
  if (gutScore >= 20) return 'MEDIUM'
  return 'LOW'
}
