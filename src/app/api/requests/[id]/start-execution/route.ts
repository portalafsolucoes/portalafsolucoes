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

    const { id } = await params
    const body = await request.json()
    const { beforePhotoUrl } = body

    // Buscar a solicitação
    const { data: maintenanceRequest, error: fetchError } = await supabase
      .from('Request')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .eq('status', 'APPROVED')
      .eq('assignedToId', session.id)
      .eq('convertToWorkOrder', false)
      .single()

    if (fetchError || !maintenanceRequest) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada ou você não tem permissão para executá-la' },
        { status: 404 }
      )
    }

    // Verificar se já foi iniciada
    if (maintenanceRequest.executionStartedAt) {
      return NextResponse.json(
        { error: 'Execução já foi iniciada anteriormente' },
        { status: 400 }
      )
    }

    // Atualizar com início de execução
    const { data: updatedRequest } = await supabase
      .from('Request')
      .update({
        executionStartedAt: new Date().toISOString(),
        beforePhotoUrl: beforePhotoUrl || null
      })
      .eq('id', id)
      .select('*, assignedTo:User!assignedToId(id, firstName, lastName, email)')
      .single()

    return NextResponse.json({
      message: 'Execução iniciada com sucesso',
      data: updatedRequest
    })
  } catch (error) {
    console.error('Start execution error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
