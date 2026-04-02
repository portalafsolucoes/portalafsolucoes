import { supabase } from './supabase'

/**
 * Gera o próximo código interno para Work Order no formato MAN-XXXXXX
 */
export async function generateInternalId(): Promise<string> {
  // Buscar a última OS com código interno
  const { data: workOrders, error } = await supabase
    .from('WorkOrder')
    .select('internalId')
    .like('internalId', 'MAN-%')
    .order('internalId', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error generating internal work order id:', error)
    throw new Error('Failed to generate internal work order id')
  }

  const lastWorkOrder = workOrders?.[0]

  let nextNumber = 1

  if (lastWorkOrder?.internalId) {
    // Extrair o número do código (MAN-000001 -> 000001)
    const currentNumber = parseInt(lastWorkOrder.internalId.replace('MAN-', ''))
    nextNumber = currentNumber + 1
  }

  // Formatar com 6 dígitos
  const paddedNumber = nextNumber.toString().padStart(6, '0')
  return `MAN-${paddedNumber}`
}

/**
 * Valida se um número externo está no formato correto (6 dígitos numéricos)
 */
export function isValidExternalId(externalId: string): boolean {
  return /^\d{6}$/.test(externalId)
}

/**
 * Determina o systemStatus baseado no externalId
 */
export function determineSystemStatus(externalId: string | null | undefined): 'IN_SYSTEM' | 'OUT_OF_SYSTEM' {
  if (externalId && isValidExternalId(externalId)) {
    return 'IN_SYSTEM'
  }
  return 'OUT_OF_SYSTEM'
}

/**
 * Retorna o ID de exibição da OS (externalId se existir, senão internalId)
 */
export function getDisplayId(workOrder: { externalId?: string | null, internalId?: string | null, id: string }): string {
  return workOrder.externalId || workOrder.internalId || workOrder.id.slice(0, 8)
}
