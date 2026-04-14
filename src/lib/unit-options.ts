/**
 * Unidades de medida padrão para recursos do tipo MATERIAL.
 * Usada no ResourceSelector como opções do select de unidade.
 */
export const UNIT_OPTIONS = [
  { value: 'un', label: 'un (Unidade)' },
  { value: 'pç', label: 'pç (Peça)' },
  { value: 'kg', label: 'kg (Quilograma)' },
  { value: 'g', label: 'g (Grama)' },
  { value: 'L', label: 'L (Litro)' },
  { value: 'mL', label: 'mL (Mililitro)' },
  { value: 'm', label: 'm (Metro)' },
  { value: 'm²', label: 'm² (Metro²)' },
  { value: 'm³', label: 'm³ (Metro³)' },
  { value: 'cx', label: 'cx (Caixa)' },
  { value: 'rl', label: 'rl (Rolo)' },
  { value: 'gl', label: 'gl (Galão)' },
  { value: 'tb', label: 'tb (Tubo)' },
  { value: 'ct', label: 'ct (Cartucho)' },
  { value: 'pt', label: 'pt (Pacote)' },
  { value: 'par', label: 'par (Par)' },
  { value: 'jg', label: 'jg (Jogo/Kit)' },
] as const

export type UnitValue = typeof UNIT_OPTIONS[number]['value']
