import { supabase } from '@/lib/supabase'

/**
 * Gera o número da RAF no formato RAF-{tag}-{areaCode}-{seq}
 * Exemplo: RAF-TC01-MEC-0001
 *
 * O sequencial é único por combinação de tag + areaCode dentro da empresa.
 */
export async function generateRafNumber(
  assetId: string | null,
  maintenanceAreaId: string | null,
  companyId: string
): Promise<string> {
  let assetTag = 'SEM'
  let areaCode = 'GER'

  // Buscar tag do ativo (com fallback para protheusCode quando tag nao estiver preenchida)
  if (assetId) {
    const { data: asset } = await supabase
      .from('Asset')
      .select('tag, protheusCode')
      .eq('id', assetId)
      .single()
    if (asset?.tag) {
      assetTag = asset.tag.toUpperCase()
    } else if (asset?.protheusCode) {
      assetTag = asset.protheusCode.toUpperCase()
    }
  }

  // Buscar código da área de manutenção
  if (maintenanceAreaId) {
    const { data: area } = await supabase
      .from('MaintenanceArea')
      .select('code, name')
      .eq('id', maintenanceAreaId)
      .single()
    if (area?.code) {
      areaCode = area.code.toUpperCase()
    } else if (area?.name) {
      // Fallback: pegar as 3 primeiras letras do nome
      areaCode = area.name.substring(0, 3).toUpperCase()
    }
  }

  const prefix = `RAF-${assetTag}-${areaCode}-`

  // Contar RAFs existentes com esse prefixo na empresa
  const { data: existing } = await supabase
    .from('FailureAnalysisReport')
    .select('rafNumber')
    .eq('companyId', companyId)
    .like('rafNumber', `${prefix}%`)
    .order('rafNumber', { ascending: false })
    .limit(1)

  let nextSeq = 1
  if (existing && existing.length > 0) {
    const lastNumber = existing[0].rafNumber
    const seqPart = lastNumber.replace(prefix, '')
    const parsed = parseInt(seqPart, 10)
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`
}
