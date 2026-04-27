import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { recalculateRafStatus } from '@/lib/rafs/recalculateStatus'
import type { ActionPlanItem } from '@/types/raf'
import { recordAudit } from '@/lib/audit/recordAudit'

// GET - Buscar RAF por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'rafs', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params

    const { data: raf, error } = await supabase
      .from('FailureAnalysisReport')
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        finalizedBy:User!finalizedById(id, firstName, lastName),
        workOrder:WorkOrder!workOrderId(
          id,
          internalId,
          title,
          status,
          osType,
          type,
          maintenanceArea:MaintenanceArea(id, name, code),
          serviceType:ServiceType(id, code, name),
          asset:Asset(id, name, tag, protheusCode)
        ),
        request:Request!requestId(
          id,
          requestNumber,
          title,
          status,
          asset:Asset(id, name, tag, protheusCode),
          maintenanceArea:MaintenanceArea(id, name, code)
        )
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (error) throw error

    if (!raf) {
      return NextResponse.json({ error: 'RAF não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: raf })
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'PGRST116') {
      return NextResponse.json({ error: 'RAF não encontrado' }, { status: 404 })
    }
    console.error('Error fetching RAF:', error)
    return NextResponse.json({ error: 'Erro ao buscar RAF' }, { status: 500 })
  }
}

// PUT - Atualizar RAF
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'rafs', 'PUT')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params
    const rawBody = normalizeTextPayload(await request.json())

    // Regra de seguranca: status da RAF e derivado server-side.
    // Cliente nao pode setar status, finalizedAt, finalizedById direto.
    const {
      status: _ignoredStatus,
      finalizedAt: _ignoredFinalizedAt,
      finalizedById: _ignoredFinalizedById,
      finalizedBy: _ignoredFinalizedBy,
      ...body
    } = rawBody as Record<string, unknown>
    void _ignoredStatus; void _ignoredFinalizedAt; void _ignoredFinalizedById; void _ignoredFinalizedBy

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString()
    }

    // Campos opcionais - atualizar apenas os enviados
    if (body.occurrenceDate !== undefined) updateData.occurrenceDate = new Date(body.occurrenceDate as string).toISOString()
    if (body.occurrenceTime !== undefined) updateData.occurrenceTime = body.occurrenceTime
    if (body.panelOperator !== undefined) updateData.panelOperator = body.panelOperator
    if (body.stopExtension !== undefined) updateData.stopExtension = body.stopExtension
    if (body.failureBreakdown !== undefined) updateData.failureBreakdown = body.failureBreakdown
    if (body.productionLost !== undefined) updateData.productionLost = body.productionLost ? parseFloat(body.productionLost as string) : null
    if (body.failureDescription !== undefined) updateData.failureDescription = body.failureDescription
    if (body.observation !== undefined) updateData.observation = body.observation
    if (body.immediateAction !== undefined) updateData.immediateAction = body.immediateAction
    if (body.fiveWhys !== undefined) updateData.fiveWhys = body.fiveWhys
    if (body.hypothesisTests !== undefined) updateData.hypothesisTests = body.hypothesisTests
    if (body.failureType !== undefined) updateData.failureType = body.failureType
    if (body.actionPlan !== undefined) updateData.actionPlan = body.actionPlan

    // Recalcular status derivado. Se actionPlan nao veio no body,
    // precisamos buscar o atual para nao perder o tracking.
    // Sempre busca o estado completo para auditoria abaixo.
    const { data: prevRaf } = await supabase
      .from('FailureAnalysisReport')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    let effectiveActionPlan = body.actionPlan as ActionPlanItem[] | undefined
    if (effectiveActionPlan === undefined) {
      effectiveActionPlan = (prevRaf?.actionPlan as ActionPlanItem[] | null) || undefined
    }

    const { status, finalizedAt, finalizedById } = recalculateRafStatus(
      effectiveActionPlan ?? [],
      session.id
    )
    updateData.status = status
    updateData.finalizedAt = finalizedAt
    updateData.finalizedById = finalizedById

    const { data: raf, error } = await supabase
      .from('FailureAnalysisReport')
      .update(updateData)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        finalizedBy:User!finalizedById(id, firstName, lastName),
        workOrder:WorkOrder!workOrderId(
          id,
          internalId,
          title,
          status,
          osType,
          type,
          maintenanceArea:MaintenanceArea(id, name, code),
          serviceType:ServiceType(id, code, name),
          asset:Asset(id, name, tag, protheusCode)
        ),
        request:Request!requestId(
          id,
          requestNumber,
          title,
          status,
          asset:Asset(id, name, tag, protheusCode),
          maintenanceArea:MaintenanceArea(id, name, code)
        )
      `)
      .single()

    if (error) throw error

    if (prevRaf) {
      await recordAudit({
        session,
        entity: 'FailureAnalysisReport',
        entityId: id,
        entityLabel: prevRaf.rafNumber ?? null,
        action: 'UPDATE',
        before: prevRaf as Record<string, unknown>,
        after: raf as Record<string, unknown>,
        companyId: prevRaf.companyId ?? session.companyId,
        unitId: prevRaf.unitId ?? session.unitId,
      })
    }

    return NextResponse.json({ data: raf })
  } catch (error) {
    console.error('Error updating RAF:', error)
    return NextResponse.json({ error: 'Erro ao atualizar RAF' }, { status: 500 })
  }
}

// DELETE - Deletar RAF
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'rafs', 'DELETE')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params

    const { data: prev } = await supabase
      .from('FailureAnalysisReport')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    const { error } = await supabase
      .from('FailureAnalysisReport')
      .delete()
      .eq('id', id)
      .eq('companyId', session.companyId)

    if (error) throw error

    if (prev) {
      await recordAudit({
        session,
        entity: 'FailureAnalysisReport',
        entityId: id,
        entityLabel: prev.rafNumber ?? null,
        action: 'DELETE',
        before: prev as Record<string, unknown>,
        companyId: prev.companyId ?? session.companyId,
        unitId: prev.unitId ?? session.unitId,
      })
    }

    return NextResponse.json({ message: 'RAF deletado com sucesso' })
  } catch (error) {
    console.error('Error deleting RAF:', error)
    return NextResponse.json({ error: 'Erro ao deletar RAF' }, { status: 500 })
  }
}
