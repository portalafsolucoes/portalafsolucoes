import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeTextPayload } from '@/lib/textNormalizer'

// GET - Listar programações de OS
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const unitIdParam = searchParams.get('unitId')
    const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)

    let query = supabase
      .from('WorkOrderSchedule')
      .select('*, createdBy:User!createdById(id, firstName, lastName)')
      .eq('companyId', session.companyId)
      .order('scheduleNumber', { ascending: false })

    if (effectiveUnitId) query = query.eq('unitId', effectiveUnitId)

    const { data, error } = await query

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

    // Verificar permissão de criação
    const permError = checkApiPermission(session, 'schedules', 'POST')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = normalizeTextPayload(await request.json())
    const { description, startDate, endDate, unitId: unitIdBody, items } = body

    // unitId vem da session (non-admin) ou pode ser override via body (admin)
    const unitId = getEffectiveUnitId(session, unitIdBody)

    if (!description || !startDate || !endDate || !unitId) {
      return NextResponse.json({ error: 'description, startDate, endDate e unitId são obrigatórios' }, { status: 400 })
    }

    // Criar a programação
    const { data: schedule, error: schedError } = await supabase
      .from('WorkOrderSchedule')
      .insert({
        id: generateId(),
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status: 'DRAFT',
        createdById: session.id,
        companyId: session.companyId,
        unitId,
        updatedAt: new Date().toISOString(),
      })
      .select('*, createdBy:User!createdById(id, firstName, lastName)')
      .single()

    if (schedError) throw schedError

    // Inserir itens (OSs programadas) se fornecidos
    if (items && Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map((item: { workOrderId: string; scheduledDate: string }) => ({
        id: generateId(),
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
