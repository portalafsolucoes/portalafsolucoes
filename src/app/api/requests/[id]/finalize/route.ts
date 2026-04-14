import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

// POST - Finalizar uma Solicitação de Serviço
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'requests', 'PUT')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params

    // Buscar a SS com dados da OS vinculada
    const { data: ss, error: ssError } = await supabase
      .from('Request')
      .select('id, status, workOrderId')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (ssError || !ss) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    // Só pode finalizar SS que esteja APPROVED
    if (ss.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Solicitação já finalizada' }, { status: 400 })
    }

    if (ss.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Apenas solicitações aprovadas podem ser finalizadas' },
        { status: 400 }
      )
    }

    // Se há OS vinculada, verificar se está COMPLETE
    if (ss.workOrderId) {
      const { data: wo } = await supabase
        .from('WorkOrder')
        .select('id, status')
        .eq('id', ss.workOrderId)
        .single()

      if (wo && wo.status !== 'COMPLETE') {
        return NextResponse.json(
          { error: 'Não é possível finalizar a solicitação enquanto a OS vinculada estiver em aberto' },
          { status: 400 }
        )
      }
    }

    // Finalizar a SS
    const { data: updated, error: updateError } = await supabase
      .from('Request')
      .update({
        status: 'COMPLETED',
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error finalizing request:', updateError)
      return NextResponse.json({ error: 'Erro ao finalizar solicitação' }, { status: 500 })
    }

    return NextResponse.json({
      data: updated,
      message: 'Solicitação finalizada com sucesso'
    })
  } catch (error) {
    console.error('Error finalizing request:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
