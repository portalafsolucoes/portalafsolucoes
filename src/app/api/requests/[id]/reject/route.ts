import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

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
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
      return NextResponse.json(
        { error: 'Apenas administradores podem rejeitar solicitações' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
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


    // Se for ADMIN (não SUPER_ADMIN), verificar se é líder da equipe atribuída
    if (session.role === 'GESTOR') {
      const { data: userTeams } = await supabase
        .from('Team')
        .select('id')
        .eq('leaderId', session.id)
        .eq('companyId', session.companyId)

      const isTeamLeader = userTeams?.some(team => team.id === maintenanceRequest.teamId) || false
      
      if (!isTeamLeader) {
        return NextResponse.json(
          { error: 'Você só pode rejeitar solicitações atribuídas à sua equipe' },
          { status: 403 }
        )
      }
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
        approvedBy:User!Request_approvedById_fkey(*)
      `)
      .single()

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
