import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { generateSequentialId } from '@/lib/workOrderUtils'
import { isAdminRole } from '@/lib/user-roles'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminRole(session)) {
      return NextResponse.json(
        { error: 'Apenas administradores podem emitir OS' },
        { status: 403 }
      )
    }

    const { id } = await params
    const now = new Date().toISOString()

    // Buscar a SS aprovada sem OS vinculada
    const { data: ss, error: fetchError } = await supabase
      .from('Request')
      .select(`
        *,
        team:Team(*),
        files:File(*)
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .eq('status', 'APPROVED')
      .single()

    if (fetchError || !ss) {
      return NextResponse.json(
        { error: 'Solicitacao nao encontrada ou nao esta aprovada' },
        { status: 404 }
      )
    }

    if (ss.workOrderId) {
      return NextResponse.json(
        { error: 'Esta solicitacao ja possui uma OS vinculada' },
        { status: 400 }
      )
    }

    // Gerar numero sequencial da OS
    const externalId = await generateSequentialId()

    // Criar Work Order
    const { data: workOrder, error: woError } = await supabase
      .from('WorkOrder')
      .insert({
        id: generateId(),
        externalId,
        internalId: null,
        title: ss.title,
        description: ss.description || null,
        priority: ss.priority,
        status: 'PENDING',
        type: 'CORRECTIVE',
        systemStatus: 'IN_SYSTEM',
        dueDate: ss.dueDate || null,
        companyId: session.companyId,
        createdById: session.id,
        sourceRequestId: ss.id,
        assignedToId: ss.assignedToId || null,
        archived: false,
        createdAt: now,
        updatedAt: now
      })
      .select('*')
      .single()

    if (woError || !workOrder) {
      console.error('Create WO error:', woError)
      return NextResponse.json({ error: 'Erro ao criar OS' }, { status: 500 })
    }

    // Copiar arquivos se existirem
    if (ss.files && ss.files.length > 0) {
      const fileInserts = ss.files.map((file: any) => ({
        id: generateId(),
        name: file.name,
        url: file.url,
        type: file.type || null,
        size: file.size || 0,
        workOrderId: workOrder.id,
        createdAt: now,
        updatedAt: now
      }))
      await supabase.from('File').insert(fileInserts).select()
    }

    // Atualizar SS com referencia a OS
    await supabase
      .from('Request')
      .update({
        workOrderId: workOrder.id,
        convertToWorkOrder: true,
        updatedAt: now
      })
      .eq('id', id)

    return NextResponse.json({
      message: 'Ordem de servico criada com sucesso',
      data: { workOrder }
    })
  } catch (error) {
    console.error('Generate work order error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
