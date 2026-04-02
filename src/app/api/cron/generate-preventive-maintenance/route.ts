import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

export async function POST(request: NextRequest) {
  try {
    // Verificar chave de segurança (para proteger o endpoint)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here'

    if (authHeader !== `Bearer ${cronSecret}`) {
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

    const generatedOrders = []

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

      // Se a OS está completa, criar uma nova baseada nela
      if (wo.status === 'COMPLETE' && wo.maintenanceFrequency && wo.frequencyValue) {
        const newWoData = {
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
          nextExecutionDate: calculateNextExecutionDate(
            wo.maintenanceFrequency,
            wo.frequencyValue
          ).toISOString(),
          parentPreventiveMaintenanceId: wo.id
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

        // Atualizar a OS original para indicar que foi gerada uma nova
        const { error: updateOrigError } = await supabase
          .from('WorkOrder')
          .update({
            lastExecutionDate: new Date().toISOString(),
            nextExecutionDate: calculateNextExecutionDate(
              wo.maintenanceFrequency,
              wo.frequencyValue
            ).toISOString()
          })
          .eq('id', wo.id)

        if (updateOrigError) throw updateOrigError

        generatedOrders.push({
          original: wo.id,
          new: newWorkOrder.id,
          title: newWorkOrder.title
        })
      }
      // Se a OS está aberta e passou da data, apenas atualizar nextExecutionDate
      else if (wo.status === 'PENDING' && wo.maintenanceFrequency && wo.frequencyValue) {
        const { error: updateError } = await supabase
          .from('WorkOrder')
          .update({
            nextExecutionDate: calculateNextExecutionDate(
              wo.maintenanceFrequency,
              wo.frequencyValue,
              wo.nextExecutionDate ? new Date(wo.nextExecutionDate) : new Date()
            ).toISOString()
          })
          .eq('id', wo.id)

        if (updateError) throw updateError
      }
    }

    return NextResponse.json({
      message: 'Preventive maintenance generation completed',
      generated: generatedOrders.length,
      orders: generatedOrders
    })
  } catch (error) {
    console.error('Generate preventive maintenance error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}

// GET para testar manualmente (remover em produção)
export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to generate preventive maintenance',
    info: 'Add Authorization header with Bearer token'
  })
}
