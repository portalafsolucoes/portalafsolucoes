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
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { executionNotes, beforePhotoUrl, afterPhotoUrl } = body

    // Validar fotos obrigatórias
    if (!beforePhotoUrl || !afterPhotoUrl) {
      return NextResponse.json(
        { error: 'Fotos antes e depois são obrigatórias' },
        { status: 400 }
      )
    }

    // Buscar Work Order
    const { data: workOrder, error: findError } = await supabase
      .from('WorkOrder')
      .select(`
        *,
        assignedTo:User!WorkOrder_assignedToId_fkey(id, firstName, lastName, email)
      `)
      .eq('id', id)
      .single()

    if (findError || !workOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o usuário é o executante atribuído
    if (workOrder.assignedToId !== session.id) {
      return NextResponse.json(
        { error: 'Você não é o executante desta ordem de serviço' },
        { status: 403 }
      )
    }

    // Verificar se já foi executada
    if (workOrder.status === 'COMPLETE') {
      return NextResponse.json(
        { error: 'Esta ordem de serviço já foi concluída' },
        { status: 400 }
      )
    }

    // Atualizar Work Order com informações de execução
    const { data: updatedWorkOrder, error: updateError } = await supabase
      .from('WorkOrder')
      .update({
        executionNotes,
        beforePhotoUrl,
        afterPhotoUrl,
        status: 'COMPLETE',
        completedOn: new Date().toISOString(),
        completedById: session.id
      })
      .eq('id', id)
      .select(`
        *,
        createdBy:User!WorkOrder_createdById_fkey(id, firstName, lastName, email),
        assignedTo:User!WorkOrder_assignedToId_fkey(id, firstName, lastName, email),
        completedBy:User!WorkOrder_completedById_fkey(id, firstName, lastName, email),
        asset:Asset(*),
        location:Location(*),
        files:File(*)
      `)
      .single()

    if (updateError) throw updateError

    // Buscar equipes atribuídas
    const { data: teamLinks } = await supabase
      .from('_WorkOrderTeams')
      .select('B')
      .eq('A', id)

    let assignedTeams: any[] = []
    if (teamLinks && teamLinks.length > 0) {
      const teamIds = teamLinks.map((t: any) => t.B)
      const { data: teams } = await supabase
        .from('Team')
        .select('*')
        .in('id', teamIds)
      assignedTeams = teams || []
    }

    return NextResponse.json({
      success: true,
      data: { ...updatedWorkOrder, assignedTeams }
    })
  } catch (error) {
    console.error('Error executing work order:', error)
    return NextResponse.json(
      { error: 'Erro ao executar ordem de serviço' },
      { status: 500 }
    )
  }
}
