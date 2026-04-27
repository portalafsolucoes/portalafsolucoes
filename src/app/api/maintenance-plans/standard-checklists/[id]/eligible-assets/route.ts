import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { requireCompanyScope } from '@/lib/user-roles'

type RouteContext = { params: Promise<{ id: string }> }

type ChecklistRow = {
  id: string
  unitId: string
  workCenterId: string
  familyGroups: Array<{ id: string; assetFamilyId: string; familyModelId: string }>
}

type AssetRow = {
  id: string
  name: string
  tag: string | null
  protheusCode: string | null
  familyId: string | null
  familyModelId: string | null
  family: { id: string; name: string } | null
  familyModel: { id: string; name: string } | null
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permError = checkApiPermission(session, 'standard-checklists', 'GET')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatória' }, { status: 403 })
    }

    if (!session.unitId) {
      return NextResponse.json({ error: 'Unidade ativa obrigatória' }, { status: 400 })
    }

    const { id } = await context.params

    const { data: rawChecklist, error: checklistError } = await supabase
      .from('StandardChecklist')
      .select(`
        id, unitId, workCenterId,
        familyGroups:StandardChecklistFamilyGroup(id, assetFamilyId, familyModelId)
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .maybeSingle()

    if (checklistError || !rawChecklist) {
      return NextResponse.json({ error: 'Check list padrão não encontrado' }, { status: 404 })
    }

    const checklist = rawChecklist as unknown as ChecklistRow

    if (checklist.unitId !== session.unitId) {
      return NextResponse.json(
        { error: 'Check list padrão pertence a outra unidade' },
        { status: 403 }
      )
    }

    const groupPairs = checklist.familyGroups
      .filter((g) => g.assetFamilyId && g.familyModelId)
      .map((g) => ({ familyId: g.assetFamilyId, familyModelId: g.familyModelId }))

    if (groupPairs.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const familyIds = Array.from(new Set(groupPairs.map((p) => p.familyId)))
    const familyModelIds = Array.from(new Set(groupPairs.map((p) => p.familyModelId)))

    const { data: rawAssets, error: assetsError } = await supabase
      .from('Asset')
      .select(`
        id, name, tag, protheusCode, familyId, familyModelId,
        family:AssetFamily!familyId(id, name),
        familyModel:AssetFamilyModel!familyModelId(id, name)
      `)
      .eq('companyId', session.companyId)
      .eq('unitId', session.unitId)
      .eq('workCenterId', checklist.workCenterId)
      .eq('archived', false)
      .in('familyId', familyIds)
      .in('familyModelId', familyModelIds)
      .order('name', { ascending: true })

    if (assetsError) {
      console.error('Eligible assets error:', assetsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const pairKey = (f: string | null, m: string | null) => `${f || ''}::${m || ''}`
    const validPairs = new Set(groupPairs.map((p) => pairKey(p.familyId, p.familyModelId)))
    const compatible = ((rawAssets || []) as unknown as AssetRow[]).filter((a) =>
      validPairs.has(pairKey(a.familyId, a.familyModelId))
    )

    return NextResponse.json({ data: compatible })
  } catch (error) {
    console.error('Get eligible assets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
