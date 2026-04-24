import type { AssetOption } from '@/types/catalog'

export interface ParentInheritedValues {
  areaId: string
  workCenterId: string
  costCenterId: string
  positionId: string
  shiftCode: string
  gutGravity: number
  gutUrgency: number
  gutTendency: number
}

const clampGut = (value: number | null | undefined): number => {
  const n = typeof value === 'number' ? value : 1
  if (!Number.isFinite(n) || n < 1) return 1
  if (n > 5) return 5
  return Math.trunc(n)
}

// Espelha 1:1 os campos de Localização/Organização e Matriz GUT do pai.
// Retorna string vazia quando o pai não tem o campo preenchido — o UI mantém
// o campo vazio e bloqueado enquanto o pai estiver vinculado.
export function pickParentInheritedValues(parent: AssetOption | null | undefined): ParentInheritedValues {
  return {
    areaId: parent?.areaId || '',
    workCenterId: parent?.workCenterId || '',
    costCenterId: parent?.costCenterId || '',
    positionId: parent?.positionId || '',
    shiftCode: parent?.shiftCode || '',
    gutGravity: clampGut(parent?.gutGravity),
    gutUrgency: clampGut(parent?.gutUrgency),
    gutTendency: clampGut(parent?.gutTendency),
  }
}
