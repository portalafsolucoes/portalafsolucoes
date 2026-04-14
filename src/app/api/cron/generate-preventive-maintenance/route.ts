import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { generateSequentialId } from '@/lib/workOrderUtils'
import { getCalendarsForPlans } from '@/lib/calendarData'
import { adjustToWorkingDay, WorkDays } from '@/lib/calendarUtils'
import { copyWorkOrderResources, copyWorkOrderTasks } from '@/lib/woResourceCopy'

// Função para calcular próxima data de execução
function calculateNextExecutionDate(frequency: string, value: number, fromDate: Date = new Date()): Date {
  const nextDate = new Date(fromDate)

  switch (frequency) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + value)
      break
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + (value * 7))
      break
    case 'BIWEEKLY':
      nextDate.setDate(nextDate.getDate() + (value * 14))
      break
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + value)
      break
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + (value * 3))
      break
    case 'SEMI_ANNUAL':
      nextDate.setMonth(nextDate.getMonth() + (value * 6))
      break
    case 'ANNUAL':
      nextDate.setFullYear(nextDate.getFullYear() + value)
      break
    default:
      nextDate.setMonth(nextDate.getMonth() + value)
  }

  return nextDate
}

/**
 * Ajusta a data calculada para um dia útil no calendário do plano.
 * Se não houver calendário, retorna a data original.
 */
function adjustToCalendarWorkingDay(date: Date, calendarWorkDays: WorkDays | null): Date {
  if (!calendarWorkDays) return date
  return adjustToWorkingDay(calendarWorkDays, date)
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('CRON_SECRET nao configurado no ambiente')
      return NextResponse.json({ error: 'Configuracao do servidor ausente' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization') || ''
    const expected = `Bearer ${cronSecret}`

    if (authHeader.length !== expected.length) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Buscar OS preventivas que precisam ser geradas
    const { data: preventiveWorkOrders, error: fetchError } = await supabase
      .from('WorkOrder')
      .select('*')
      .eq('type', 'PREVENTIVE')
      .not('maintenanceFrequency', 'is', null)
      .lte('nextExecutionDate', today.toISOString())
      .in('status', ['COMPLETE', 'PENDING'])

    if (fetchError) throw fetchError

    // Buscar calendários dos planos de manutenção associados (batch)
    const planIds = (preventiveWorkOrders || [])
      .map(wo => wo.assetMaintenancePlanId)
      .filter((id): id is string => !!id)
    const uniquePlanIds = [...new Set(planIds)]
    const planCalendars = await getCalendarsForPlans(uniquePlanIds)

    const generatedOrders = []
    const calendarAdjustments: { woId: string; originalDate: string; adjustedDate: string; calendarName: string }[] = []

    for (const wo of (preventiveWorkOrders || [])) {
      // Buscar equipes e usuários atribuídos (many-to-many)
      const { data: assignedTeamLinks } = await supabase
        .from('_TeamWorkOrders')
        .select('B')
        .eq('A', wo.id)

      const { data: assignedUserLinks } = await supabase
        .from('_UserWorkOrders')
        .select('B')
        .eq('A', wo.id)

      // Obter calendário do plano de manutenção (se existir)
      const planCalendar = wo.assetMaintenancePlanId
        ? planCalendars.get(wo.assetMaintenancePlanId)
        : null
      const calendarWorkDays = planCalendar?.workDays || null

      // Se a OS está completa, criar uma nova baseada nela
      if (wo.status === 'COMPLETE' && wo.maintenanceFrequency && wo.frequencyValue) {
        const rawNextDate = calculateNextExecutionDate(
          wo.maintenanceFrequency,
          wo.frequencyValue
        )
        const adjustedNextDate = adjustToCalendarWorkingDay(rawNextDate, calendarWorkDays)

        // Registrar ajuste se a data mudou
        if (calendarWorkDays && rawNextDate.getTime() !== adjustedNextDate.getTime()) {
          calendarAdjustments.push({
            woId: wo.id,
            originalDate: rawNextDate.toISOString().split('T')[0],
            adjustedDate: adjustedNextDate.toISOString().split('T')[0],
            calendarName: planCalendar?.calendarName || 'Calendário',
          })
        }

        const cronExternalId = await generateSequentialId()

        const newWoData = {
          id: generateId(),
          externalId: cronExternalId,
          internalId: null as string | null,
          systemStatus: 'IN_SYSTEM' as const,
          title: wo.title,
          description: wo.description,
          type: 'PREVENTIVE',
          priority: wo.priority,
          status: 'PENDING',
          companyId: wo.companyId,
          assetId: wo.assetId,
          locationId: wo.locationId,
          categoryId: wo.categoryId,
          createdById: wo.createdById,
          assignedToId: wo.assignedToId,
          maintenanceFrequency: wo.maintenanceFrequency,
          frequencyValue: wo.frequencyValue,
          lastExecutionDate: new Date().toISOString(),
          nextExecutionDate: adjustedNextDate.toISOString(),
          parentPreventiveMaintenanceId: wo.id,
          assetMaintenancePlanId: wo.assetMaintenancePlanId || null,
        }

        const { data: newWorkOrder, error: createError } = await supabase
          .from('WorkOrder')
          .insert(newWoData)
          .select()
          .single()

        if (createError) throw createError

        // Copiar relações many-to-many para a nova OS
        if (assignedTeamLinks && assignedTeamLinks.length > 0) {
          const teamLinks = assignedTeamLinks.map((link: any) => ({
            A: newWorkOrder.id,
            B: link.B
          }))
          await supabase.from('_TeamWorkOrders').insert(teamLinks)
        }

        if (assignedUserLinks && assignedUserLinks.length > 0) {
          const userLinks = assignedUserLinks.map((link: any) => ({
            A: newWorkOrder.id,
            B: link.B
          }))
          await supabase.from('_UserWorkOrders').insert(userLinks)
        }

        // Copiar recursos e tarefas da OS original para a nova
        await copyWorkOrderResources(wo.id, newWorkOrder.id)
        await copyWorkOrderTasks(wo.id, newWorkOrder.id)

        // Atualizar a OS original para indicar que foi gerada uma nova
        const rawOriginalNext = calculateNextExecutionDate(
          wo.maintenanceFrequency,
          wo.frequencyValue
        )
        const adjustedOriginalNext = adjustToCalendarWorkingDay(rawOriginalNext, calendarWorkDays)

        const { error: updateOrigError } = await supabase
          .from('WorkOrder')
          .update({
            lastExecutionDate: new Date().toISOString(),
            nextExecutionDate: adjustedOriginalNext.toISOString()
          })
          .eq('id', wo.id)

        if (updateOrigError) throw updateOrigError

        generatedOrders.push({
          original: wo.id,
          new: newWorkOrder.id,
          title: newWorkOrder.title,
          calendarAdjusted: rawNextDate.getTime() !== adjustedNextDate.getTime(),
        })
      }
      // Se a OS está aberta e passou da data, apenas atualizar nextExecutionDate
      else if (wo.status === 'PENDING' && wo.maintenanceFrequency && wo.frequencyValue) {
        const rawNextDate = calculateNextExecutionDate(
          wo.maintenanceFrequency,
          wo.frequencyValue,
          wo.nextExecutionDate ? new Date(wo.nextExecutionDate) : new Date()
        )
        const adjustedNextDate = adjustToCalendarWorkingDay(rawNextDate, calendarWorkDays)

        const { error: updateError } = await supabase
          .from('WorkOrder')
          .update({
            nextExecutionDate: adjustedNextDate.toISOString()
          })
          .eq('id', wo.id)

        if (updateError) throw updateError
      }
    }

    return NextResponse.json({
      message: 'Preventive maintenance generation completed',
      generated: generatedOrders.length,
      orders: generatedOrders,
      calendarAdjustments: calendarAdjustments.length > 0 ? calendarAdjustments : undefined,
    })
  } catch (error) {
    console.error('Generate preventive maintenance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
