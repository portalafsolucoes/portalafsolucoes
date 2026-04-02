import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar programações de OS
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data, error } = await supabase
      .from('WorkOrderSchedule')
      .select('*, createdBy:User!createdById(id, firstName, lastName)')
      .eq('companyId', session.companyId)
      .order('scheduleNumber', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar programações' }, { status: 500 })
  }
}

// POST - Criar programação
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { description, startDate, endDate, unitId, items } = body

    if (!description || !startDate || !endDate || !unitId) {
      return NextResponse.json({ error: 'description, startDate, endDate e unitId são obrigatórios' }, { status: 400 })
    }

    // Criar a programação
    const { data: schedule, error: schedError } = await supabase
      .from('WorkOrderSchedule')
      .insert({
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status: 'DRAFT',
        createdById: session.id,
        companyId: session.companyId,
        unitId,
      })
      .select('*, createdBy:User!createdById(id, firstName, lastName)')
      .single()

    if (schedError) throw schedError

    // Inserir itens (OSs programadas) se fornecidos
    if (items && Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        scheduleId: schedule.id,
        workOrderId: item.workOrderId,
        scheduledDate: new Date(item.scheduledDate).toISOString(),
        status: 'PENDING',
      }))

      const { error: itemsError } = await supabase
        .from('WorkOrderScheduleItem')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError
    }

    return NextResponse.json({ data: schedule, message: 'Programação criada' }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao criar programação' }, { status: 500 })
  }
}
