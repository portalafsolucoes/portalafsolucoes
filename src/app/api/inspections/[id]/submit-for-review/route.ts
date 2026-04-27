import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeUserRole, requireCompanyScope } from '@/lib/user-roles'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permError = checkApiPermission(session, 'area-inspections', 'PUT')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatória' }, { status: 403 })
    }

    const { id } = await context.params

    const { data: inspection } = await supabase
      .from('AreaInspection')
      .select('id, status, assignedToId, unitId')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .maybeSingle()
    if (!inspection) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

    if (session.unitId && inspection.unitId !== session.unitId) {
      return NextResponse.json({ error: 'Inspeção fora da unidade ativa' }, { status: 403 })
    }

    const canonicalRole = normalizeUserRole(session)
    const isAssignee = inspection.assignedToId === session.id
    const isManagerRole = canonicalRole !== 'MANUTENTOR'
    if (!isAssignee && !isManagerRole) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (inspection.status !== 'RASCUNHO') {
      return NextResponse.json(
        { error: 'Apenas inspeções em preenchimento podem ser enviadas para revisão' },
        { status: 409 }
      )
    }

    // Valida que todos os steps tem answer preenchida
    const { data: assets } = await supabase
      .from('AreaInspectionAsset')
      .select('id')
      .eq('inspectionId', id)
    const assetIds = ((assets || []) as Array<{ id: string }>).map((a) => a.id)
    if (assetIds.length === 0) {
      return NextResponse.json({ error: 'Inspeção sem bens' }, { status: 400 })
    }

    const { data: pendingSteps, count: pendingCount } = await supabase
      .from('AreaInspectionStep')
      .select('id', { count: 'exact' })
      .in('inspectionAssetId', assetIds)
      .is('answer', null)

    if ((pendingCount ?? (pendingSteps?.length || 0)) > 0) {
      return NextResponse.json(
        {
          error: `Existem ${pendingCount ?? pendingSteps?.length} etapa(s) sem resposta. Preencha todas antes de enviar.`,
          pending: pendingCount ?? pendingSteps?.length ?? 0,
        },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('AreaInspection')
      .update({
        status: 'EM_REVISAO',
        submittedForReviewAt: now,
        submittedForReviewById: session.id,
        updatedAt: now,
      })
      .eq('id', id)
    if (updateError) {
      console.error('Submit for review error:', updateError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ data: { id, status: 'EM_REVISAO' } })
  } catch (error) {
    console.error('Submit for review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
