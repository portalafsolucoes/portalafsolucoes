import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { recordAudit } from '@/lib/audit/recordAudit'

// GET - detalhe do checklist com grupos (familia+modelo) e etapas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const permissionError = checkApiPermission(session, 'standard-checklists', 'GET')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    const { id } = await params

    const { data: checklist, error } = await supabase
      .from('StandardChecklist')
      .select(`
        *,
        workCenter:WorkCenter!workCenterId(id, name, protheusCode),
        serviceType:ServiceType!serviceTypeId(id, code, name),
        unit:Location!unitId(id, name),
        createdBy:User!createdById(id, firstName, lastName)
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
      throw error
    }

    const { data: groups } = await supabase
      .from('StandardChecklistFamilyGroup')
      .select(`
        *,
        assetFamily:AssetFamily!assetFamilyId(id, code, name),
        familyModel:AssetFamilyModel!familyModelId(id, name)
      `)
      .eq('checklistId', id)
      .order('order')

    const groupsWithSteps = []
    if (groups) {
      for (const group of groups) {
        const { data: steps } = await supabase
          .from('StandardChecklistStep')
          .select(`
            *,
            genericStep:GenericStep!genericStepId(id, name, protheusCode, optionType)
          `)
          .eq('groupId', group.id)
          .order('order')
        groupsWithSteps.push({ ...group, steps: steps || [] })
      }
    }

    return NextResponse.json({ data: { ...checklist, familyGroups: groupsWithSteps } })
  } catch (error) {
    console.error('Error fetching standard checklist:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - atualiza checklist (nome, isActive, e reescreve grupos+etapas)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const permissionError = checkApiPermission(session, 'standard-checklists', 'PUT')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    const { id } = await params
    const body = normalizeTextPayload(await request.json())
    const { name, isActive, familyGroups } = body as {
      name?: string
      isActive?: boolean
      familyGroups?: Array<{
        assetFamilyId: string
        familyModelId: string
        order?: number
        steps?: Array<{ genericStepId: string; order?: number }>
      }>
    }

    // valida ownership (capturando estado completo para auditoria)
    const { data: existing } = await supabase
      .from('StandardChecklist')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()
    if (!existing) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })

    const now = new Date().toISOString()
    const updatePayload: Record<string, unknown> = { updatedAt: now }
    if (typeof name === 'string') updatePayload.name = name
    if (typeof isActive === 'boolean') updatePayload.isActive = isActive

    const { error: updateError } = await supabase
      .from('StandardChecklist')
      .update(updatePayload)
      .eq('id', id)
    if (updateError) throw updateError

    // se familyGroups veio no body, faz reescrita completa (cascade delete remove steps)
    if (Array.isArray(familyGroups)) {
      const { error: deleteError } = await supabase
        .from('StandardChecklistFamilyGroup')
        .delete()
        .eq('checklistId', id)
      if (deleteError) throw deleteError

      for (const [groupIdx, group] of familyGroups.entries()) {
        if (!group.assetFamilyId || !group.familyModelId) continue
        const groupId = generateId()
        const { error: groupError } = await supabase
          .from('StandardChecklistFamilyGroup')
          .insert({
            id: groupId,
            order: typeof group.order === 'number' ? group.order : groupIdx,
            checklistId: id,
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
      entityId: id,
      entityLabel: existing.name ?? null,
      action: 'UPDATE',
      before: existing as Record<string, unknown>,
      after: { ...existing, ...updatePayload, familyGroups: familyGroups ?? undefined },
      companyId: existing.companyId ?? session.companyId,
      unitId: existing.unitId ?? session.unitId,
    })

    return NextResponse.json({ data: { id }, message: 'Check list atualizado' })
  } catch (error) {
    console.error('Error updating standard checklist:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - hard delete (cascade remove grupos e steps)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const permissionError = checkApiPermission(session, 'standard-checklists', 'DELETE')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    const { id } = await params

    const { data: existing } = await supabase
      .from('StandardChecklist')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()
    if (!existing) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })

    const { error } = await supabase.from('StandardChecklist').delete().eq('id', id)
    if (error) throw error

    await recordAudit({
      session,
      entity: 'StandardChecklist',
      entityId: id,
      entityLabel: existing.name ?? null,
      action: 'DELETE',
      before: existing as Record<string, unknown>,
      companyId: existing.companyId ?? session.companyId,
      unitId: existing.unitId ?? session.unitId,
    })

    return NextResponse.json({ message: 'Check list excluido' })
  } catch (error) {
    console.error('Error deleting standard checklist:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
