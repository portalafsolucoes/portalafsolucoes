import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'

// GET - lista pares (familia, modelo) presentes nos bens vinculados ao WC.
// Bens sem familia OU sem familyModel sao ignorados (so retorna pares completos).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    const { id: workCenterId } = await params

    // valida WC pertence a empresa
    const { data: wc } = await supabase
      .from('WorkCenter')
      .select('id, companyId')
      .eq('id', workCenterId)
      .eq('companyId', session.companyId)
      .single()
    if (!wc) return NextResponse.json({ error: 'Centro de trabalho nao encontrado' }, { status: 404 })

    const { data: assets, error } = await supabase
      .from('Asset')
      .select(`
        id,
        familyId,
        familyModelId,
        family:AssetFamily!familyId(id, code, name),
        familyModel:AssetFamilyModel!familyModelId(id, name)
      `)
      .eq('workCenterId', workCenterId)
      .eq('companyId', session.companyId)
      .eq('archived', false)
      .not('familyId', 'is', null)
      .not('familyModelId', 'is', null)

    if (error) throw error

    type AssetRow = {
      familyId: string | null
      familyModelId: string | null
      family: { id: string; code: string | null; name: string } | { id: string; code: string | null; name: string }[] | null
      familyModel: { id: string; name: string } | { id: string; name: string }[] | null
    }
    const pickOne = <T,>(v: T | T[] | null): T | null => Array.isArray(v) ? (v[0] || null) : v

    const map = new Map<string, {
      assetFamilyId: string
      familyModelId: string
      assetFamily: { id: string; code: string | null; name: string }
      familyModel: { id: string; name: string }
      assetCount: number
    }>()

    for (const a of (assets as AssetRow[] || [])) {
      if (!a.familyId || !a.familyModelId) continue
      const family = pickOne(a.family)
      const familyModel = pickOne(a.familyModel)
      if (!family || !familyModel) continue
      const key = `${a.familyId}:${a.familyModelId}`
      const cur = map.get(key)
      if (cur) {
        cur.assetCount += 1
      } else {
        map.set(key, {
          assetFamilyId: a.familyId,
          familyModelId: a.familyModelId,
          assetFamily: family,
          familyModel,
          assetCount: 1,
        })
      }
    }

    const items = Array.from(map.values()).sort((a, b) => {
      const fa = a.assetFamily.name.localeCompare(b.assetFamily.name)
      return fa !== 0 ? fa : a.familyModel.name.localeCompare(b.familyModel.name)
    })

    return NextResponse.json({ data: items })
  } catch (error) {
    console.error('Error listing WC family-models:', error)
    return NextResponse.json({ error: 'Erro ao buscar familias do centro de trabalho' }, { status: 500 })
  }
}
