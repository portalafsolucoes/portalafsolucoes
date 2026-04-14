import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

// GET - Detalhe da programação com itens e OSs
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    // Buscar programação com criador
    const { data: schedule, error: schedError } = await supabase
      .from('WorkOrderSchedule')
      .select('*, createdBy:User!createdById(id, firstName, lastName)')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (schedError || !schedule) {
      return NextResponse.json({ error: 'Programação não encontrada' }, { status: 404 })
    }

    // Buscar itens com dados da OS e ativo
    const { data: items, error: itemsError } = await supabase
      .from('WorkOrderScheduleItem')
      .select(`
        id, scheduledDate, status,
        workOrder:WorkOrder!workOrderId(
          id, externalId, internalId, title, status, priority, type,
          dueDate, plannedStartDate,
          asset:Asset!assetId(id, name, tag),
          serviceType:ServiceType!serviceTypeId(id, name)
        )
      `)
      .eq('scheduleId', id)
      .order('scheduledDate', { ascending: true })

    if (itemsError) throw itemsError

    return NextResponse.json({
      data: {
        ...schedule,
        items: items || [],
      },
    })
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json({ error: 'Erro ao buscar programação' }, { status: 500 })
  }
}

// PUT - Atualizar programação (apenas DRAFT ou REPROGRAMMING)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'schedules', 'PUT')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { description, startDate, endDate } = body

    // Verificar se a programação existe e está editável
    const { data: existing, error: fetchError } = await supabase
      .from('WorkOrderSchedule')
      .select('id, status')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Programação não encontrada' }, { status: 404 })
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REPROGRAMMING') {
      return NextResponse.json(
        { error: 'Apenas programações em rascunho ou reprogramação podem ser editadas' },
        { status: 409 }
      )
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (description !== undefined) updateData.description = description
    if (startDate !== undefined) updateData.startDate = new Date(startDate).toISOString()
    if (endDate !== undefined) updateData.endDate = new Date(endDate).toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('WorkOrderSchedule')
      .update(updateData)
      .eq('id', id)
      .select('*, createdBy:User!createdById(id, firstName, lastName)')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ data: updated, message: 'Programação atualizada' })
  } catch (error) {
    console.error('Error updating schedule:', error)
    return NextResponse.json({ error: 'Erro ao atualizar programação' }, { status: 500 })
  }
}

// DELETE - Excluir programação (apenas DRAFT)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'schedules', 'DELETE')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    const { id } = await params

    // Verificar se a programação existe e é rascunho
    const { data: existing, error: fetchError } = await supabase
      .from('WorkOrderSchedule')
      .select('id, status')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Programação não encontrada' }, { status: 404 })
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Apenas programações em rascunho podem ser excluídas' },
        { status: 409 }
      )
    }

    // Itens são deletados em cascata (onDelete: Cascade no schema)
    const { error: deleteError } = await supabase
      .from('WorkOrderSchedule')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Programação excluída' })
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json({ error: 'Erro ao excluir programação' }, { status: 500 })
  }
}
