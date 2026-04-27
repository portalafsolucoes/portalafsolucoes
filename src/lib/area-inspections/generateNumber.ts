import { supabase } from '@/lib/supabase'

/**
 * Gera o proximo numero sequencial de inspecao para o par (companyId, unitId).
 * Padrao: 6 digitos zerados ("000001", "000002", ...). Sequencia comeca do zero por unidade.
 *
 * Pode haver colisao em criacao concorrente; o caller deve tratar erro de UNIQUE
 * com retry. UNIQUE: ("companyId", "unitId", "number") em AreaInspection.
 */
export async function generateInspectionNumber(
  companyId: string,
  unitId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('AreaInspection')
    .select('number')
    .eq('companyId', companyId)
    .eq('unitId', unitId)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  let next = 1
  if (data?.number) {
    const parsed = parseInt(String(data.number), 10)
    if (!Number.isNaN(parsed)) next = parsed + 1
  }
  return String(next).padStart(6, '0')
}
