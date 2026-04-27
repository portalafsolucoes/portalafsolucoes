import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { recordAudit } from '@/lib/audit/recordAudit'

// GET - lista checklists padrao da empresa, com filtros opcionais ?workCenterId= e ?serviceTypeId=
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const permissionError = checkApiPermission(session, 'standard-checklists', 'GET')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const workCenterId = searchParams.get('workCenterId')
    const serviceTypeId = searchParams.get('serviceTypeId')

    let query = supabase
      .from('StandardChecklist')
      .select(`
        *,
        workCenter:WorkCenter!workCenterId(id, name, protheusCode),
        serviceType:ServiceType!serviceTypeId(id, code, name),
        unit:Location!unitId(id, name),
        createdBy:User!createdById(id, firstName, lastName)
      `)
      .eq('companyId', session.companyId)
      .order('createdAt', { ascending: false })

    if (session.unitId) query = query.eq('unitId', session.unitId)
    if (workCenterId) query = query.eq('workCenterId', workCenterId)
    if (serviceTypeId) query = query.eq('serviceTypeId', serviceTypeId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error listing standard checklists:', error)
    return NextResponse.json({ error: 'Erro ao buscar check lists padrao' }, { status: 500 })
  }
}

// POST - cria checklist padrao com seus grupos (familia+modelo) e etapas
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const permissionError = checkApiPermission(session, 'standard-checklists', 'POST')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    const body = normalizeTextPayload(await request.json())
    const { name, workCenterId, serviceTypeId, isActive, familyGroups } = body as {
      name?: string
      workCenterId?: string
      serviceTypeId?: string
      isActive?: boolean
      familyGroups?: Array<{
        assetFamilyId: string
        familyModelId: string
        order?: number
        steps?: Array<{ genericStepId: string; order?: number }>
      }>
    }

    if (!name || !workCenterId || !serviceTypeId) {
      return NextResponse.json({ error: 'Campos obrigatorios: name, workCenterId, serviceTypeId' }, { status: 400 })
    }

    // valida WC pertence a empresa
    const { data: wc } = await supabase
      .from('WorkCenter')
      .select('id, unitId, companyId')
      .eq('id', workCenterId)
      .eq('companyId', session.companyId)
      .single()
    if (!wc) return NextResponse.json({ error: 'Centro de trabalho nao encontrado' }, { status: 404 })

    // valida ServiceType pertence a empresa
    const { data: st } = await supabase
      .from('ServiceType')
      .select('id, companyId')
      .eq('id', serviceTypeId)
      .eq('companyId', session.companyId)
      .single()
    if (!st) return NextResponse.json({ error: 'Tipo de servico nao encontrado' }, { status: 404 })

    // valida unicidade (workCenterId, serviceTypeId)
    const { data: existing } = await supabase
      .from('StandardChecklist')
      .select('id')
      .eq('workCenterId', workCenterId)
      .eq('serviceTypeId', serviceTypeId)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'Ja existe um check list padrao para este WC e tipo de servico' }, { status: 409 })
    }

    const now = new Date().toISOString()
    const checklistId = generateId()

    const { error: insertError } = await supabase
      .from('StandardChecklist')
      .insert({
        id: checklistId,
        name,
        isActive: isActive !== false,
        workCenterId,
        serviceTypeId,
        unitId: wc.unitId,
        companyId: session.companyId,
        createdById: session.id,
        createdAt: now,
        updatedAt: now,
      })
    if (insertError) throw insertError

    if (Array.isArray(familyGroups) && familyGroups.length > 0) {
      for (const [groupIdx, group] of familyGroups.entries()) {
        if (!group.assetFamilyId || !group.familyModelId) continue
        const groupId = generateId()
        const { error: groupError } = await supabase
          .from('StandardChecklistFamilyGroup')
          .insert({
            id: groupId,
            order: typeof group.order === 'number' ? group.order : groupIdx,
            checklistId,
            assetFamilyId: group.assetFamilyId,
            familyModelId: group.familyModelId,
            createdAt: now,
            updatedAt: now,
          })
        if (groupError) throw groupError

        if (Array.isArray(group.steps) && group.steps.length > 0) {
          const stepRows = group.steps
            .filter(s => s && s.genericStepId)
            .map((s, sIdx) => ({
              id: generateId(),
              order: typeof s.order === 'number' ? s.order : sIdx,
              groupId,
              genericStepId: s.genericStepId,
              createdAt: now,
            }))
          if (stepRows.length > 0) {
            const { error: stepError } = await supabase
              .from('StandardChecklistStep')
              .insert(stepRows)
            if (stepError) throw stepError
          }
        }
      }
    }

    await recordAudit({
      session,
      entity: 'StandardChecklist',
      entityId: checklistId,
      entityLabel: name ?? null,
      action: 'CREATE',
      after: { id: checklistId, name, workCenterId, serviceTypeId, unitId: wc.unitId, isActive: isActive !== false, familyGroups: familyGroups || [] },
      companyId: session.companyId,
      unitId: wc.unitId,
    })

    return NextResponse.json({ data: { id: checklistId }, message: 'Check list padrao criado' }, { status: 201 })
  } catch (error) {
    console.error('Error creating standard checklist:', error)
    return NextResponse.json({ error: 'Erro ao criar check list padrao' }, { status: 500 })
  }
}
