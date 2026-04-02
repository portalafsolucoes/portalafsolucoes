import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// POST - Confirmar programação (muda status das OSs de PENDING para RELEASED)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params

    // Buscar itens da programação
    const { data: items, error: itemsError } = await supabase
      .from('WorkOrderScheduleItem')
      .select('workOrderId')
      .eq('scheduleId', id)

    if (itemsError) throw itemsError

    if (items && items.length > 0) {
      const woIds = items.map((i: any) => i.workOrderId)

      // Atualizar status das OSs para RELEASED
      const { error: updateError } = await supabase
        .from('WorkOrder')
        .update({ status: 'RELEASED' })
        .in('id', woIds)
        .eq('status', 'PENDING')

      if (updateError) throw updateError

      // Atualizar status dos itens
      await supabase
        .from('WorkOrderScheduleItem')
        .update({ status: 'RELEASED' })
        .eq('scheduleId', id)
    }

    // Atualizar status da programação
    const { data, error } = await supabase
      .from('WorkOrderSchedule')
      .update({ status: 'CONFIRMED', updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, message: `Programação confirmada. ${items?.length || 0} OS(s) liberada(s).` })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao confirmar programação' }, { status: 500 })
  }
}
