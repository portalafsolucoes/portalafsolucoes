import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Agregar recursos de todas as OSs da programação
// Retorna totais por tipo (SPECIALTY, LABOR, MATERIAL, TOOL) e detalhes individuais
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

    // Buscar todos os workOrderIds da programação
    const { data: items, error: itemsError } = await supabase
      .from('WorkOrderScheduleItem')
      .select('workOrderId')
      .eq('scheduleId', id)

    if (itemsError) throw itemsError

    const woIds = (items || []).map(i => i.workOrderId)

    if (woIds.length === 0) {
      return NextResponse.json({
        data: {
          summary: { totalHours: 0, totalItems: 0, byType: {} },
          resources: [],
        },
      })
    }

    // Buscar WorkOrderResource de todas as OSs programadas
    const { data: resources, error: resError } = await supabase
      .from('WorkOrderResource')
      .select(`
        id, resourceType, quantity, hours, unit, workOrderId,
        resource:Resource!resourceId(id, name, type, unitCost),
        jobTitle:JobTitle!jobTitleId(id, name),
        user:User!userId(id, firstName, lastName, rate)
      `)
      .in('workOrderId', woIds)

    if (resError) throw resError

    // Agregar por tipo
    const byType: Record<string, { totalHours: number; totalQuantity: number; totalCost: number; items: unknown[] }> = {}
    let totalHours = 0
    let totalCost = 0

    for (const r of (resources || [])) {
      const type = r.resourceType || 'MATERIAL'
      if (!byType[type]) {
        byType[type] = { totalHours: 0, totalQuantity: 0, totalCost: 0, items: [] }
      }

      const hours = r.hours || 0
      const qty = r.quantity || 0
      let cost = 0

      if (type === 'LABOR' && r.user?.rate) {
        cost = hours * r.user.rate
      } else if (type === 'SPECIALTY' && r.jobTitle) {
        // Especialidade: custo é horas * quantidade (equipe)
        cost = 0 // Sem custo unitário definido no cadastro de cargo
      } else if ((type === 'MATERIAL' || type === 'TOOL') && r.resource?.unitCost) {
        cost = qty * r.resource.unitCost
      }

      totalHours += hours
      totalCost += cost
      byType[type].totalHours += hours
      byType[type].totalQuantity += qty
      byType[type].totalCost += cost
      byType[type].items.push(r)
    }

    return NextResponse.json({
      data: {
        summary: {
          totalHours,
          totalCost,
          totalItems: (resources || []).length,
          scheduledWorkOrders: woIds.length,
          byType,
        },
        resources: resources || [],
      },
    })
  } catch (error) {
    console.error('Error fetching schedule resources:', error)
    return NextResponse.json({ error: 'Erro ao buscar recursos da programação' }, { status: 500 })
  }
}
