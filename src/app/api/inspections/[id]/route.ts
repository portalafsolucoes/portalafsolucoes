import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeUserRole, requireCompanyScope } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { recordAudit } from '@/lib/audit/recordAudit'

type RouteContext = { params: Promise<{ id: string }> }

async function loadInspectionForSession(id: string, companyId: string) {
  const { data, error } = await supabase
    .from('AreaInspection')
    .select(`
      *,
      assignedTo:User!assignedToId(id, firstName, lastName, email),
      submittedForReviewBy:User!submittedForReviewById(id, firstName, lastName),
      finalizedBy:User!finalizedById(id, firstName, lastName),
      reopenedBy:User!reopenedById(id, firstName, lastName),
      createdBy:User!createdById(id, firstName, lastName),
      standardChecklist:StandardChecklist!standardChecklistId(id, name),
      assets:AreaInspectionAsset(
        *,
        steps:AreaInspectionStep(
          *,
          answeredBy:User!answeredById(id, firstName, lastName),
          request:Request!requestId(id, requestNumber, status)
        )
      )
    `)
    .eq('id', id)
    .eq('companyId', companyId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permError = checkApiPermission(session, 'area-inspections', 'GET')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatória' }, { status: 403 })
    }

    const { id } = await context.params
    const inspection = await loadInspectionForSession(id, session.companyId)
    if (!inspection) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const canonicalRole = normalizeUserRole(session)
    const i = inspection as { unitId: string; assignedToId: string }

    // MANUTENTOR só pode ver inspeções atribuídas a ele
    if (canonicalRole === 'MANUTENTOR' && i.assignedToId !== session.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Restringir cross-unit (manter consistência com listagem)
    if (session.unitId && i.unitId !== session.unitId) {
      return NextResponse.json({ error: 'Inspeção fora da unidade ativa' }, { status: 403 })
    }

    // Ordena assets/steps deterministicamente (Supabase nested order não é trivial)
    const enriched = inspection as {
      assets?: Array<{ order: number; steps?: Array<{ order: number }> }>
    }
    if (enriched.assets) {
      enriched.assets.sort((a, b) => a.order - b.order)
      for (const asset of enriched.assets) {
        if (asset.steps) asset.steps.sort((a, b) => a.order - b.order)
      }
    }

    // Status virtual ATRASADO
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdueThreshold = new Date(today)
    overdueThreshold.setDate(overdueThreshold.getDate() - 1)
    const r = inspection as { status: string; dueDate: string }
    const due = new Date(r.dueDate)
    due.setHours(0, 0, 0, 0)
    const isOverdue =
      (r.status === 'RASCUNHO' || r.status === 'EM_REVISAO') &&
      due.getTime() < overdueThreshold.getTime()

    return NextResponse.json({ data: { ...inspection, isOverdue } })
  } catch (error) {
    console.error('Get inspection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permError = checkApiPermission(session, 'area-inspections', 'PUT')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatória' }, { status: 403 })
    }

    const { id } = await context.params
    const inspection = await loadInspectionForSession(id, session.companyId)
    if (!inspection) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const i = inspection as { status: string; assignedToId: string }
    const canonicalRole = normalizeUserRole(session)

    // Apenas gestores podem editar dados básicos
    if (canonicalRole === 'MANUTENTOR') {
      return NextResponse.json({ error: 'Sem permissão para editar' }, { status: 403 })
    }

    if (i.status === 'FINALIZADO') {
      return NextResponse.json(
        { error: 'Inspeção finalizada não pode ser editada. Reabra antes de editar.' },
        { status: 409 }
      )
    }

    const body = normalizeTextPayload(await request.json()) as {
      description?: string
      dueDate?: string
      assignedToId?: string
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (typeof body.description === 'string' && body.description.trim()) updates.description = body.description
    if (body.dueDate) updates.dueDate = new Date(body.dueDate).toISOString()
    if (body.assignedToId) {
      const { data: assignee } = await supabase
        .from('User')
        .select('id')
        .eq('id', body.assignedToId)
        .eq('companyId', session.companyId)
        .maybeSingle()
      if (!assignee) return NextResponse.json({ error: 'Manutentor inválido' }, { status: 400 })
      updates.assignedToId = body.assignedToId
    }

    const { error: updateError } = await supabase
      .from('AreaInspection')
      .update(updates)
      .eq('id', id)
    if (updateError) {
      console.error('Update inspection error:', updateError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    await recordAudit({
      session,
      entity: 'AreaInspection',
      entityId: id,
      entityLabel: (inspection as { number?: string }).number ?? null,
      action: 'UPDATE',
      before: inspection as Record<string, unknown>,
      after: { ...(inspection as Record<string, unknown>), ...updates },
      companyId: (inspection as { companyId?: string }).companyId ?? session.companyId,
      unitId: (inspection as { unitId?: string }).unitId ?? session.unitId,
    })

    return NextResponse.json({ data: { id }, message: 'Inspeção atualizada' })
  } catch (error) {
    console.error('Put inspection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permError = checkApiPermission(session, 'area-inspections', 'DELETE')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatória' }, { status: 403 })
    }

    const { id } = await context.params
    const inspection = await loadInspectionForSession(id, session.companyId)
    if (!inspection) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const i = inspection as { status: string }
    if (i.status === 'FINALIZADO') {
      return NextResponse.json(
        { error: 'Inspeção finalizada não pode ser excluída' },
        { status: 409 }
      )
    }

    const { error: deleteError } = await supabase
      .from('AreaInspection')
      .delete()
      .eq('id', id)
    if (deleteError) {
      console.error('Delete inspection error:', deleteError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    await recordAudit({
      session,
      entity: 'AreaInspection',
      entityId: id,
      entityLabel: (inspection as { number?: string }).number ?? null,
      action: 'DELETE',
      before: inspection as Record<string, unknown>,
      companyId: (inspection as { companyId?: string }).companyId ?? session.companyId,
      unitId: (inspection as { unitId?: string }).unitId ?? session.unitId,
    })

    return NextResponse.json({ data: { id }, message: 'Inspeção removida' })
  } catch (error) {
    console.error('Delete inspection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
