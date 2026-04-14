import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

// GET - Listar itens da programação com dados completos das OSs
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    // Verificar que a programação pertence à empresa
    const { data: schedule, error: schedError } = await supabase
      .from('WorkOrderSchedule')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (schedError || !schedule) {
      return NextResponse.json({ error: 'Programação não encontrada' }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from('WorkOrderScheduleItem')
      .select(`
        id, scheduledDate, status,
        workOrder:WorkOrder!workOrderId(
          id, externalId, internalId, title, description, status, priority, type,
          dueDate, plannedStartDate, estimatedDuration,
          asset:Asset!assetId(id, name, tag),
          serviceType:ServiceType!serviceTypeId(id, name)
        )
      `)
      .eq('scheduleId', id)
      .order('scheduledDate', { ascending: true })

    if (itemsError) throw itemsError

    return NextResponse.json({ data: items || [] })
  } catch (error) {
    console.error('Error fetching schedule items:', error)
    return NextResponse.json({ error: 'Erro ao buscar itens da programação' }, { status: 500 })
  }
}

// PUT - Atualizar itens da programação (adicionar/remover OSs, alterar datas)
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
    const { items } = body // Array de { workOrderId, scheduledDate }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items deve ser um array' }, { status: 400 })
    }

    // Verificar que a programação existe e está editável
    const { data: schedule, error: schedError } = await supabase
      .from('WorkOrderSchedule')
      .select('id, status')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (schedError || !schedule) {
      return NextResponse.json({ error: 'Programação não encontrada' }, { status: 404 })
    }

    if (schedule.status !== 'DRAFT' && schedule.status !== 'REPROGRAMMING') {
      return NextResponse.json(
        { error: 'Apenas programações em rascunho ou reprogramação podem ter itens alterados' },
        { status: 409 }
      )
    }

    // Remover itens existentes
    const { error: deleteError } = await supabase
      .from('WorkOrderScheduleItem')
      .delete()
      .eq('scheduleId', id)

    if (deleteError) throw deleteError

    // Inserir novos itens
    if (items.length > 0) {
      const newItems = items.map((item: { workOrderId: string; scheduledDate: string }) => {
        // Preservar a data exata sem deslocamento de timezone
        const dateStr = item.scheduledDate.split('T')[0]
        return {
          id: generateId(),
          scheduleId: id,
          workOrderId: item.workOrderId,
          scheduledDate: `${dateStr}T12:00:00.000Z`,
          status: 'PENDING',
        }
      })

      const { error: insertError } = await supabase
        .from('WorkOrderScheduleItem')
        .insert(newItems)

      if (insertError) throw insertError
    }

    // Atualizar timestamp da programação
    await supabase
      .from('WorkOrderSchedule')
      .update({ updatedAt: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({
      message: `${items.length} item(ns) atualizado(s)`,
      itemCount: items.length,
    })
  } catch (error) {
    console.error('Error updating schedule items:', error)
    return NextResponse.json({ error: 'Erro ao atualizar itens da programação' }, { status: 500 })
  }
}
