import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { generateRafNumber } from '@/lib/rafUtils'
import { recordAudit } from '@/lib/audit/recordAudit'

// POST /api/requests/[id]/generate-raf
// Cria um RAF vinculado diretamente a uma SS (sem precisar de OS).
// Suporta dois modos:
//  - Modo "rascunho rapido": sem body, gera RAF inicial herdando dados da SS para o usuario completar via /rafs
//  - Modo "completo": com body contendo os campos do RAFFormModal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'rafs', 'POST')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params

    // Buscar SS aprovada (RAF so faz sentido em SS aprovada que descreve uma falha real)
    const { data: ss, error: fetchError } = await supabase
      .from('Request')
      .select(`
        *,
        asset:Asset(id, name, tag, protheusCode),
        maintenanceArea:MaintenanceArea(id, name, code)
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (fetchError || !ss) {
      return NextResponse.json(
        { error: 'Solicitacao nao encontrada' },
        { status: 404 }
      )
    }

    if (ss.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Apenas solicitacoes aprovadas podem gerar RAF' },
        { status: 400 }
      )
    }

    // Verificar se ja existe RAF para essa SS
    const { data: existingRaf } = await supabase
      .from('FailureAnalysisReport')
      .select('id, rafNumber')
      .eq('requestId', id)
      .eq('companyId', session.companyId)
      .maybeSingle()

    if (existingRaf) {
      return NextResponse.json(
        { error: 'Esta solicitacao ja possui RAF vinculada', data: existingRaf },
        { status: 409 }
      )
    }

    // Body opcional com campos do form completo
    let body: Record<string, unknown> = {}
    try {
      const text = await request.text()
      if (text) body = JSON.parse(text)
    } catch {
      body = {}
    }

    const now = new Date().toISOString()

    // RAF gerada via SS herda a Area de Manutencao da propria SS (campo obrigatorio na SS).
    const rafNumber = await generateRafNumber(
      ss.asset?.id || null,
      ss.maintenanceAreaId || null,
      session.companyId
    )

    const occurrenceDate = body.occurrenceDate
      ? new Date(String(body.occurrenceDate)).toISOString()
      : (ss.createdAt || now)
    const occurrenceTime = body.occurrenceTime
      ? String(body.occurrenceTime)
      : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const panelOperator = body.panelOperator
      ? String(body.panelOperator)
      : (session.firstName ? `${session.firstName} ${session.lastName || ''}`.trim() : 'N/A')

    const insertPayload: Record<string, unknown> = {
      id: generateId(),
      rafNumber,
      occurrenceDate,
      occurrenceTime,
      panelOperator,
      stopExtension: body.stopExtension === true,
      failureBreakdown: body.failureBreakdown === true,
      productionLost: body.productionLost != null && body.productionLost !== ''
        ? Number(body.productionLost)
        : null,
      failureDescription: body.failureDescription
        ? String(body.failureDescription)
        : (ss.description || ss.title),
      observation: body.observation ? String(body.observation) : null,
      immediateAction: body.immediateAction ? String(body.immediateAction) : null,
      fiveWhys: Array.isArray(body.fiveWhys) ? body.fiveWhys : null,
      hypothesisTests: Array.isArray(body.hypothesisTests) ? body.hypothesisTests : null,
      failureType: body.failureType === 'REPETITIVE' ? 'REPETITIVE' : 'RANDOM',
      actionPlan: Array.isArray(body.actionPlan) ? body.actionPlan : null,
      status: 'ABERTA',
      finalizedAt: null,
      finalizedById: null,
      companyId: session.companyId,
      unitId: session.unitId || null,
      createdById: session.id,
      requestId: ss.id,
      workOrderId: null,
      createdAt: now,
      updatedAt: now,
    }

    const { data: raf, error: rafError } = await supabase
      .from('FailureAnalysisReport')
      .insert(insertPayload)
      .select('id, rafNumber, requestId')
      .single()

    if (rafError || !raf) {
      console.error('Create RAF from request error:', rafError)
      return NextResponse.json(
        { error: 'Erro ao criar RAF a partir da solicitacao' },
        { status: 500 }
      )
    }

    await recordAudit({
      session,
      entity: 'FailureAnalysisReport',
      entityId: raf.id,
      entityLabel: raf.rafNumber ?? null,
      action: 'CREATE',
      after: insertPayload as Record<string, unknown>,
      companyId: session.companyId,
      unitId: session.unitId,
      metadata: { event: 'CREATED_FROM_REQUEST', requestId: ss.id, requestNumber: ss.requestNumber ?? null },
    })

    return NextResponse.json(
      { data: raf, message: 'RAF criada com sucesso a partir da solicitacao' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Generate RAF from request error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
