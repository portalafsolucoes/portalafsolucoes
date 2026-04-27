import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { isAdminRole } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { recordAudit } from '@/lib/audit/recordAudit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se usuário é admin
    if (!isAdminRole(session)) {
      return NextResponse.json(
        { error: 'Apenas administradores podem rejeitar solicitações' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = normalizeTextPayload(await request.json())
    const { reason } = body

    // Buscar a solicitação
    const { data: maintenanceRequest, error: fetchError } = await supabase
      .from('Request')
      .select('*, team:Team(*)')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .eq('status', 'PENDING')
      .single()

    if (fetchError || !maintenanceRequest) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada ou já processada' },
        { status: 404 }
      )
    }

    // Atualizar Request para REJECTED
    const { data: updatedRequest } = await supabase
      .from('Request')
      .update({
        status: 'REJECTED',
        teamApprovalStatus: 'REJECTED',
        approvedAt: new Date().toISOString(),
        approvedById: session.id,
        rejectionReason: reason || 'Sem motivo especificado'
      })
      .eq('id', id)
      .select(`
        *,
        createdBy:User(*),
        team:Team(*),
        approvedBy:User!approvedById(*)
      `)
      .single()

    await recordAudit({
      session,
      entity: 'Request',
      entityId: id,
      entityLabel: maintenanceRequest.requestNumber ?? null,
      action: 'UPDATE',
      before: maintenanceRequest as Record<string, unknown>,
      after: (updatedRequest ?? {
        ...maintenanceRequest,
        status: 'REJECTED',
        teamApprovalStatus: 'REJECTED',
        approvedById: session.id,
        rejectionReason: reason || 'Sem motivo especificado',
      }) as Record<string, unknown>,
      companyId: maintenanceRequest.companyId ?? session.companyId,
      unitId: maintenanceRequest.unitId ?? session.unitId,
      metadata: { event: 'REJECTED' },
    })

    return NextResponse.json({
      message: 'Solicitação rejeitada com sucesso',
      data: updatedRequest
    })
  } catch (error) {
    console.error('Reject request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
