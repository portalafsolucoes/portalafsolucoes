import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

// POST - Reprogramar uma programação confirmada
// CONFIRMED → REPROGRAMMING (reverte OSs para PENDING se ainda RELEASED)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'schedules', 'PUT')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    const { id } = await params

    // Buscar programação
    const { data: schedule, error: schedError } = await supabase
      .from('WorkOrderSchedule')
      .select('id, status')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (schedError || !schedule) {
      return NextResponse.json({ error: 'Programação não encontrada' }, { status: 404 })
    }

    if (schedule.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Apenas programações confirmadas podem ser reprogramadas' },
        { status: 409 }
      )
    }

    // Buscar itens da programação
    const { data: items, error: itemsError } = await supabase
      .from('WorkOrderScheduleItem')
      .select('workOrderId')
      .eq('scheduleId', id)

    if (itemsError) throw itemsError

    const woIds = (items || []).map(i => i.workOrderId)

    // Reverter OSs que ainda estão RELEASED para PENDING
    // OSs que já avançaram (IN_PROGRESS, COMPLETE) não são revertidas
    let revertedCount = 0
    if (woIds.length > 0) {
      const { data: reverted, error: revertError } = await supabase
        .from('WorkOrder')
        .update({ status: 'PENDING', updatedAt: new Date().toISOString() })
        .in('id', woIds)
        .eq('status', 'RELEASED')
        .select('id')

      if (revertError) throw revertError
      revertedCount = reverted?.length || 0
    }

    // Reverter status dos itens para PENDING
    await supabase
      .from('WorkOrderScheduleItem')
      .update({ status: 'PENDING' })
      .eq('scheduleId', id)

    // Atualizar status da programação para REPROGRAMMING
    const { data: updated, error: updateError } = await supabase
      .from('WorkOrderSchedule')
      .update({ status: 'REPROGRAMMING', updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      data: updated,
      message: `Programação em reprogramação. ${revertedCount} OS(s) revertida(s) para pendente.`,
      revertedCount,
      totalItems: woIds.length,
    })
  } catch (error) {
    console.error('Error reprogramming schedule:', error)
    return NextResponse.json({ error: 'Erro ao reprogramar' }, { status: 500 })
  }
}
