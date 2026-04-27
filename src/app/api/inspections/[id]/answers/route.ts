import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeUserRole, requireCompanyScope } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'

type RouteContext = { params: Promise<{ id: string }> }

const VALID_ANSWERS = new Set(['OK', 'NOK', 'NA'])

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

    const { data: inspection, error: loadError } = await supabase
      .from('AreaInspection')
      .select('id, status, assignedToId, companyId, unitId')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .maybeSingle()
    if (loadError) {
      console.error('Load inspection error:', loadError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    if (!inspection) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

    if (session.unitId && inspection.unitId !== session.unitId) {
      return NextResponse.json({ error: 'Inspeção fora da unidade ativa' }, { status: 403 })
    }

    const canonicalRole = normalizeUserRole(session)
    const isAssignee = inspection.assignedToId === session.id
    const isManagerRole = canonicalRole !== 'MANUTENTOR'

    // Regras:
    // - RASCUNHO: manutentor atribuído OU gestor
    // - EM_REVISAO: somente gestor
    // - FINALIZADO: bloqueado
    if (inspection.status === 'FINALIZADO') {
      return NextResponse.json(
        { error: 'Inspeção finalizada não pode receber respostas. Reabra antes.' },
        { status: 409 }
      )
    }
    if (inspection.status === 'RASCUNHO' && !(isAssignee || isManagerRole)) {
      return NextResponse.json({ error: 'Sem permissão para preencher esta inspeção' }, { status: 403 })
    }
    if (inspection.status === 'EM_REVISAO' && !isManagerRole) {
      return NextResponse.json(
        { error: 'Apenas gestores podem editar respostas em revisão' },
        { status: 403 }
      )
    }

    const body = normalizeTextPayload(await request.json()) as {
      answers?: Array<{
        stepId: string
        answer: 'OK' | 'NOK' | 'NA' | null
        notes?: string | null
      }>
    }

    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return NextResponse.json({ error: 'Lista de respostas vazia' }, { status: 400 })
    }

    // Carrega steps validos da inspecao para garantir escopo
    const { data: validSteps, error: stepsError } = await supabase
      .from('AreaInspectionStep')
      .select('id, inspectionAsset:AreaInspectionAsset!inspectionAssetId(inspectionId)')
      .in('id', body.answers.map((a) => a.stepId))
    if (stepsError) {
      console.error('Steps fetch error:', stepsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    type StepRow = { id: string; inspectionAsset: { inspectionId: string } | null }
    const validIds = new Set(
      ((validSteps || []) as unknown as StepRow[])
        .filter((s) => s.inspectionAsset?.inspectionId === id)
        .map((s) => s.id)
    )

    const now = new Date().toISOString()
    let updated = 0
    for (const ans of body.answers) {
      if (!validIds.has(ans.stepId)) continue
      const answerValue =
        ans.answer === null || typeof ans.answer === 'undefined'
          ? null
          : VALID_ANSWERS.has(ans.answer)
          ? ans.answer
          : null
      const updates: Record<string, unknown> = {
        answer: answerValue,
        notes: typeof ans.notes === 'string' ? ans.notes : null,
        updatedAt: now,
      }
      if (answerValue) {
        updates.answeredById = session.id
        updates.answeredAt = now
      } else {
        updates.answeredById = null
        updates.answeredAt = null
      }
      const { error: updateError } = await supabase
        .from('AreaInspectionStep')
        .update(updates)
        .eq('id', ans.stepId)
      if (updateError) {
        console.error('Update step error:', updateError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }
      updated++
    }

    await supabase.from('AreaInspection').update({ updatedAt: now }).eq('id', id)

    return NextResponse.json({ data: { updated } })
  } catch (error) {
    console.error('Save answers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
