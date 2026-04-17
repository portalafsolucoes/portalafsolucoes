import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { normalizeTextPayload } from '@/lib/textNormalizer'

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
    const body = normalizeTextPayload(await request.json())
    const { afterPhotoUrl, executionNotes, executionData } = body

    // Validações
    if (!afterPhotoUrl) {
      return NextResponse.json(
        { error: 'Foto após execução é obrigatória' },
        { status: 400 }
      )
    }

    if (!executionNotes || executionNotes.trim() === '') {
      return NextResponse.json(
        { error: 'Notas de execução são obrigatórias' },
        { status: 400 }
      )
    }

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

    // Verificar se execução foi iniciada
    if (!maintenanceRequest.executionStartedAt) {
      return NextResponse.json(
        { error: 'Você precisa iniciar a execução antes de completá-la' },
        { status: 400 }
      )
    }

    // Verificar se já foi completada
    if (maintenanceRequest.executionCompletedAt) {
      return NextResponse.json(
        { error: 'Execução já foi completada anteriormente' },
        { status: 400 }
      )
    }

    // Atualizar com conclusão de execução
    const { data: updatedRequest } = await supabase
      .from('Request')
      .update({
        executionCompletedAt: new Date().toISOString(),
        afterPhotoUrl,
        executionNotes,
        executionData: executionData || null
      })
      .eq('id', id)
      .select('*, assignedTo:User!assignedToId(id, firstName, lastName, email), createdBy:User!createdById(id, firstName, lastName, email)')
      .single()

    return NextResponse.json({
      message: 'Execução completada com sucesso',
      data: updatedRequest
    })
  } catch (error) {
    console.error('Complete execution error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
