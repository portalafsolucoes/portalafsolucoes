import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

// POST - Confirmar programação (muda status das OSs de PENDING para RELEASED)
// Inclui validação de recursos e retorna avisos de indisponibilidade
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'schedules', 'POST')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    const { id } = await params

    // Verificar body para flag de força (pular validação de recursos)
    let forceConfirm = false
    try {
      const body = await request.json()
      forceConfirm = body?.force === true
    } catch {
      // Body vazio é permitido (confirmação simples)
    }

    // Buscar programação
    const { data: schedule, error: schedError } = await supabase
      .from('WorkOrderSchedule')
      .select('id, status, startDate, endDate')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (schedError || !schedule) {
      return NextResponse.json({ error: 'Programação não encontrada' }, { status: 404 })
    }

    if (schedule.status !== 'DRAFT' && schedule.status !== 'REPROGRAMMING') {
      return NextResponse.json(
        { error: 'Apenas programações em rascunho ou reprogramação podem ser confirmadas' },
        { status: 409 }
      )
    }

    // Buscar itens da programação
    const { data: items, error: itemsError } = await supabase
      .from('WorkOrderScheduleItem')
      .select('id, workOrderId, scheduledDate')
      .eq('scheduleId', id)

    if (itemsError) throw itemsError

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Não é possível confirmar uma programação sem OSs' },
        { status: 400 }
      )
    }

    const woIds = items.map(i => i.workOrderId)

    // Validação de recursos (se não for forçada)
    const resourceWarnings: Array<{
      workOrderId: string
      workOrderTitle: string
      type: string
      message: string
    }> = []

    if (!forceConfirm) {
      // Buscar recursos das OSs programadas
      const { data: resources } = await supabase
        .from('WorkOrderResource')
        .select(`
          id, resourceType, quantity, hours, workOrderId,
          resource:Resource!resourceId(id, name, type),
          jobTitle:JobTitle!jobTitleId(id, name),
          user:User!userId(id, firstName, lastName)
        `)
        .in('workOrderId', woIds)

      // Buscar títulos das OSs para mensagens
      const { data: workOrders } = await supabase
        .from('WorkOrder')
        .select('id, title')
        .in('id', woIds)

      const woTitleMap = new Map((workOrders || []).map(wo => [wo.id, wo.title]))

      // Verificar conflitos de mão de obra: mesmo usuário em OSs diferentes na mesma data
      const laborByUserDate = new Map<string, Array<{ workOrderId: string; hours: number }>>()

      // Helper para normalizar relacionamento que o Supabase pode retornar como array
      const pickOne = <T>(value: T | T[] | null | undefined): T | null => {
        if (!value) return null
        return Array.isArray(value) ? (value[0] ?? null) : value
      }

      for (const r of (resources || [])) {
        const rUser = pickOne(r.user) as { id: string; firstName: string; lastName: string } | null
        if (r.resourceType === 'LABOR' && rUser) {
          const item = items.find(i => i.workOrderId === r.workOrderId)
          if (!item) continue
          const dateKey = new Date(item.scheduledDate).toISOString().split('T')[0]
          const key = `${rUser.id}_${dateKey}`

          if (!laborByUserDate.has(key)) {
            laborByUserDate.set(key, [])
          }
          laborByUserDate.get(key)!.push({
            workOrderId: r.workOrderId,
            hours: r.hours || 0,
          })
        }
      }

      // Verificar se algum técnico está alocado em mais de 8h no mesmo dia
      for (const [key, allocations] of laborByUserDate) {
        const totalHours = allocations.reduce((sum, a) => sum + a.hours, 0)
        if (totalHours > 8 || allocations.length > 1) {
          const userId = key.split('_')[0]
          const date = key.split('_')[1]
          const userResource = (resources || []).find(r => {
            const u = pickOne(r.user) as { id: string } | null
            return r.resourceType === 'LABOR' && u?.id === userId
          })
          const user = pickOne(userResource?.user) as { id: string; firstName: string; lastName: string } | null
          const userName = user ? `${user.firstName} ${user.lastName}` : 'Técnico'

          for (const alloc of allocations) {
            resourceWarnings.push({
              workOrderId: alloc.workOrderId,
              workOrderTitle: woTitleMap.get(alloc.workOrderId) || '',
              type: 'LABOR_CONFLICT',
              message: `${userName} alocado(a) em ${totalHours}h no dia ${date} (${allocations.length} OS${allocations.length > 1 ? 's' : ''})`,
            })
          }
        }
      }

      // Verificar OSs sem recursos atribuídos
      const wosWithResources = new Set((resources || []).map(r => r.workOrderId))
      for (const woId of woIds) {
        if (!wosWithResources.has(woId)) {
          resourceWarnings.push({
            workOrderId: woId,
            workOrderTitle: woTitleMap.get(woId) || '',
            type: 'NO_RESOURCES',
            message: 'OS sem recursos atribuídos',
          })
        }
      }

      // Se houver avisos e não for forçado, retornar avisos sem confirmar
      if (resourceWarnings.length > 0) {
        return NextResponse.json({
          requiresConfirmation: true,
          message: 'Existem avisos de recursos. Deseja realmente seguir com a programação?',
          warnings: resourceWarnings,
          scheduledCount: items.length,
        })
      }
    }

    // Confirmar: atualizar status das OSs para RELEASED
    // OSs em REPROGRAMMED permanecem nesse status para preservar o rastro de reprogramacao
    const { error: updateWoError } = await supabase
      .from('WorkOrder')
      .update({ status: 'RELEASED', updatedAt: new Date().toISOString() })
      .in('id', woIds)
      .in('status', ['PENDING', 'RELEASED']) // Aceitar ambos para reprogramações

    if (updateWoError) throw updateWoError

    // Atualizar status dos itens
    const { error: updateItemsError } = await supabase
      .from('WorkOrderScheduleItem')
      .update({ status: 'RELEASED' })
      .eq('scheduleId', id)

    if (updateItemsError) throw updateItemsError

    // Atualizar status da programação
    const { data: confirmed, error: confirmError } = await supabase
      .from('WorkOrderSchedule')
      .update({ status: 'CONFIRMED', updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (confirmError) throw confirmError

    return NextResponse.json({
      data: confirmed,
      message: `Programação confirmada. ${items.length} OS(s) liberada(s).`,
      releasedCount: items.length,
      warnings: resourceWarnings.length > 0 ? resourceWarnings : undefined,
    })
  } catch (error) {
    console.error('Error confirming schedule:', error)
    return NextResponse.json({ error: 'Erro ao confirmar programação' }, { status: 500 })
  }
}
