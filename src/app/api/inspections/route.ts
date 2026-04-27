import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeUserRole, requireCompanyScope } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { generateInspectionNumber } from '@/lib/area-inspections/generateNumber'

type StandardChecklistRow = {
  id: string
  name: string
  unitId: string
  companyId: string
  workCenterId: string
  serviceTypeId: string
  workCenter: { id: string; name: string } | null
  serviceType: { id: string; name: string } | null
  familyGroups: Array<{
    id: string
    assetFamilyId: string
    familyModelId: string
    assetFamily: { id: string; name: string } | null
    familyModel: { id: string; name: string } | null
    steps: Array<{
      id: string
      order: number
      genericStepId: string
      genericStep: { id: string; name: string; protheusCode: string | null; optionType: string } | null
    }>
  }>
}

type AssetForSnapshot = {
  id: string
  name: string
  tag: string | null
  protheusCode: string | null
  familyId: string | null
  familyModelId: string | null
  family: { id: string; name: string } | null
  familyModel: { id: string; name: string } | null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permError = checkApiPermission(session, 'area-inspections', 'GET')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatória' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedToId = searchParams.get('assignedToId')
    const canonicalRole = normalizeUserRole(session)

    let query = supabase
      .from('AreaInspection')
      .select(`
        *,
        assignedTo:User!assignedToId(id, firstName, lastName, email),
        finalizedBy:User!finalizedById(id, firstName, lastName),
        createdBy:User!createdById(id, firstName, lastName),
        standardChecklist:StandardChecklist!standardChecklistId(id, name)
      `)
      .eq('companyId', session.companyId)
      .order('createdAt', { ascending: false })

    const unitIdParam = searchParams.get('unitId')
    const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)
    if (effectiveUnitId) query = query.eq('unitId', effectiveUnitId)

    if (status) query = query.eq('status', status)
    if (assignedToId) query = query.eq('assignedToId', assignedToId)
    if (canonicalRole === 'MANUTENTOR') query = query.eq('assignedToId', session.id)

    const { data: inspections, error } = await query
    if (error) {
      console.error('List inspections error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Conta SSs vinculadas por inspection (uma query agregada)
    const ids = (inspections || []).map((i) => (i as { id: string }).id)
    const requestCounts: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: requestRows } = await supabase
        .from('Request')
        .select('id, inspectionId')
        .in('inspectionId', ids)
      for (const row of (requestRows || []) as Array<{ inspectionId: string }>) {
        requestCounts[row.inspectionId] = (requestCounts[row.inspectionId] || 0) + 1
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdueThreshold = new Date(today)
    overdueThreshold.setDate(overdueThreshold.getDate() - 1)

    const enriched = (inspections || []).map((row) => {
      const r = row as Record<string, unknown> & { id: string; status: string; dueDate: string }
      const due = new Date(r.dueDate)
      due.setHours(0, 0, 0, 0)
      const isOverdue =
        (r.status === 'RASCUNHO' || r.status === 'EM_REVISAO') &&
        due.getTime() < overdueThreshold.getTime()
      return {
        ...r,
        requestCount: requestCounts[r.id] || 0,
        isOverdue,
      }
    })

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Get inspections error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permError = checkApiPermission(session, 'area-inspections', 'POST')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatória' }, { status: 403 })
    }

    if (!session.unitId) {
      return NextResponse.json({ error: 'Unidade ativa obrigatória' }, { status: 400 })
    }

    const body = normalizeTextPayload(await request.json()) as {
      standardChecklistId?: string
      description?: string
      dueDate?: string
      assignedToId?: string
    }
    const { standardChecklistId, description, dueDate, assignedToId } = body

    if (!standardChecklistId || !description || !dueDate || !assignedToId) {
      return NextResponse.json(
        { error: 'standardChecklistId, description, dueDate e assignedToId são obrigatórios' },
        { status: 400 }
      )
    }

    // Carrega checklist com family groups e steps
    const { data: checklistRaw, error: checklistError } = await supabase
      .from('StandardChecklist')
      .select(`
        id, name, unitId, companyId, workCenterId, serviceTypeId,
        workCenter:WorkCenter!workCenterId(id, name),
        serviceType:ServiceType!serviceTypeId(id, name),
        familyGroups:StandardChecklistFamilyGroup(
          id, assetFamilyId, familyModelId,
          assetFamily:AssetFamily!assetFamilyId(id, name),
          familyModel:AssetFamilyModel!familyModelId(id, name),
          steps:StandardChecklistStep(
            id, order, genericStepId,
            genericStep:GenericStep!genericStepId(id, name, protheusCode, optionType)
          )
        )
      `)
      .eq('id', standardChecklistId)
      .eq('companyId', session.companyId)
      .maybeSingle()

    if (checklistError || !checklistRaw) {
      return NextResponse.json({ error: 'Check list padrão não encontrado' }, { status: 404 })
    }

    const checklist = checklistRaw as unknown as StandardChecklistRow

    if (checklist.unitId !== session.unitId) {
      return NextResponse.json(
        { error: 'Check list padrão pertence a outra unidade' },
        { status: 403 }
      )
    }

    // Valida assignedTo
    const { data: assignee } = await supabase
      .from('User')
      .select('id, companyId')
      .eq('id', assignedToId)
      .eq('companyId', session.companyId)
      .maybeSingle()
    if (!assignee) {
      return NextResponse.json({ error: 'Manutentor inválido para esta empresa' }, { status: 400 })
    }

    // Coleta pares (familyId, familyModelId) dos grupos
    const groupPairs = checklist.familyGroups
      .filter((g) => g.assetFamilyId && g.familyModelId)
      .map((g) => ({ familyId: g.assetFamilyId, familyModelId: g.familyModelId, group: g }))

    if (groupPairs.length === 0) {
      return NextResponse.json(
        { error: 'Check list padrão não tem grupos de família/modelo configurados' },
        { status: 400 }
      )
    }

    // Busca bens compativeis: WC do checklist + unidade ativa + arquivado=false +
    // par (familyId, familyModelId) presente em algum grupo
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

    if (assetsError) {
      console.error('Eligible assets error:', assetsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Filtra apenas pares (family, familyModel) que casam com algum grupo
    const pairKey = (f: string | null, m: string | null) => `${f || ''}::${m || ''}`
    const validPairs = new Set(groupPairs.map((p) => pairKey(p.familyId, p.familyModelId)))
    const compatibleAssets = ((rawAssets || []) as unknown as AssetForSnapshot[]).filter((a) =>
      validPairs.has(pairKey(a.familyId, a.familyModelId))
    )

    if (compatibleAssets.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum bem compatível encontrado para este check list na unidade ativa' },
        { status: 400 }
      )
    }

    // Mapa pair -> grupo (com seus steps)
    const groupByPair = new Map<string, StandardChecklistRow['familyGroups'][number]>()
    for (const p of groupPairs) {
      groupByPair.set(pairKey(p.familyId, p.familyModelId), p.group)
    }

    // Gera numero (com retry uma vez em caso de UNIQUE collision)
    let attempts = 0
    let inspectionId = generateId()
    let number = await generateInspectionNumber(session.companyId, session.unitId)
    const now = new Date().toISOString()

    while (attempts < 2) {
      const { error: insertError } = await supabase
        .from('AreaInspection')
        .insert({
          id: inspectionId,
          number,
          description,
          dueDate: new Date(dueDate).toISOString(),
          status: 'RASCUNHO',
          standardChecklistId: checklist.id,
          checklistName: checklist.name,
          workCenterId: checklist.workCenterId,
          workCenterName: checklist.workCenter?.name || '',
          serviceTypeId: checklist.serviceTypeId,
          serviceTypeName: checklist.serviceType?.name || '',
          assignedToId,
          companyId: session.companyId,
          unitId: session.unitId,
          createdById: session.id,
          createdAt: now,
          updatedAt: now,
        })
      if (!insertError) break
      attempts++
      // 23505 = unique violation
      const code = (insertError as { code?: string }).code
      if (code === '23505' && attempts < 2) {
        inspectionId = generateId()
        number = await generateInspectionNumber(session.companyId, session.unitId)
        continue
      }
      console.error('Insert inspection error:', insertError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Insere bens snapshotados + steps
    const assetsToInsert = compatibleAssets.map((a, idx) => ({
      id: generateId(),
      order: idx,
      inspectionId,
      assetId: a.id,
      assetName: a.name,
      assetTag: a.tag || null,
      assetProtheusCode: a.protheusCode || null,
      familyId: a.familyId || null,
      familyModelId: a.familyModelId || null,
      familyName: a.family?.name || null,
      familyModelName: a.familyModel?.name || null,
      createdAt: now,
    }))

    const { error: assetInsertError } = await supabase
      .from('AreaInspectionAsset')
      .insert(assetsToInsert)
    if (assetInsertError) {
      console.error('Insert inspection assets error:', assetInsertError)
      // Rollback: deleta inspection (cascade limpa tudo)
      await supabase.from('AreaInspection').delete().eq('id', inspectionId)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Steps por bem
    const stepRows: Record<string, unknown>[] = []
    for (let i = 0; i < compatibleAssets.length; i++) {
      const asset = compatibleAssets[i]
      const inspectionAsset = assetsToInsert[i]
      const group = groupByPair.get(pairKey(asset.familyId, asset.familyModelId))
      if (!group) continue
      const sortedSteps = [...group.steps].sort((a, b) => a.order - b.order)
      sortedSteps.forEach((s, idx) => {
        if (!s.genericStep) return
        stepRows.push({
          id: generateId(),
          order: idx,
          inspectionAssetId: inspectionAsset.id,
          genericStepId: s.genericStepId,
          stepName: s.genericStep.name,
          stepProtheusCode: s.genericStep.protheusCode || null,
          optionType: s.genericStep.optionType || 'NONE',
          createdAt: now,
          updatedAt: now,
        })
      })
    }

    if (stepRows.length > 0) {
      // Insere em chunks de 100 para evitar payload grande
      const chunkSize = 100
      for (let i = 0; i < stepRows.length; i += chunkSize) {
        const chunk = stepRows.slice(i, i + chunkSize)
        const { error: stepInsertError } = await supabase
          .from('AreaInspectionStep')
          .insert(chunk)
        if (stepInsertError) {
          console.error('Insert inspection steps error:', stepInsertError)
          await supabase.from('AreaInspection').delete().eq('id', inspectionId)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
      }
    }

    return NextResponse.json(
      {
        data: { id: inspectionId, number },
        message: 'Inspeção criada com sucesso',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create inspection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
