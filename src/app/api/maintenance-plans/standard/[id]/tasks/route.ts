import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { parseWorkDays, getWeeklyHours, getWeeklySummary } from '@/lib/calendarUtils'

// GET - Listar tarefas com etapas, recursos e info de calendário
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id: planId } = await params

    const { data: plan, error: planError } = await supabase
      .from('StandardMaintenancePlan')
      .select('id')
      .eq('id', planId)
      .eq('companyId', session.companyId)
      .single()
    if (planError || !plan) {
      return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
    }

    const { data: tasks, error } = await supabase
      .from('StandardMaintenanceTask')
      .select(`
        *,
        steps:StandardMaintenanceTaskStep(*, step:GenericStep!stepId(id, name, optionType, options:GenericStepOption(id, label, order))),
        resources:StandardMaintenanceTaskResource(
          *,
          resource:Resource!resourceId(
            id, name, type, unit, unitCost, calendarId,
            calendar:Calendar!calendarId(id, name, workDays)
          )
        )
      `)
      .eq('planId', planId)
      .order('order')

    if (error) throw error

    // Enriquecer recursos com dados de calendário
    const enrichedTasks = (tasks || []).map((task: any) => ({
      ...task,
      resources: (task.resources || []).map((tr: any) => {
        const resource = tr.resource as any
        const workDays = resource?.calendar?.workDays ? parseWorkDays(resource.calendar.workDays) : null
        return {
          ...tr,
          resource: resource ? {
            id: resource.id,
            name: resource.name,
            type: resource.type,
            unit: resource.unit,
            unitCost: resource.unitCost,
            calendarId: resource.calendarId,
            calendarName: resource.calendar?.name || null,
            weeklyHours: workDays ? Math.round(getWeeklyHours(workDays) * 10) / 10 : null,
            weeklySummary: workDays ? getWeeklySummary(workDays) : null,
          } : null,
        }
      }),
    }))

    return NextResponse.json({ data: enrichedTasks })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar tarefas' }, { status: 500 })
  }
}

// POST - Salvar tarefas com etapas e recursos (batch upsert)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id: planId } = await params

    const { data: plan, error: planError } = await supabase
      .from('StandardMaintenancePlan')
      .select('id')
      .eq('id', planId)
      .eq('companyId', session.companyId)
      .single()
    if (planError || !plan) {
      return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { tasks } = body // Array de { description, taskCode, order, executionTime, steps: [{stepId, order}], resources: [{resourceId, resourceCount, quantity, unit}] }

    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: 'tasks deve ser um array' }, { status: 400 })
    }

    // Deletar tarefas existentes (cascade deleta steps e resources)
    await supabase.from('StandardMaintenanceTask').delete().eq('planId', planId)

    // Inserir novas tarefas
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      const { data: newTask, error: taskError } = await supabase
        .from('StandardMaintenanceTask')
        .insert({
          id: generateId(),
          planId,
          taskCode: task.taskCode || i,
          description: task.description,
          order: task.order || i,
          executionTime: task.executionTime || null,
        })
        .select()
        .single()

      if (taskError) throw taskError

      // Inserir etapas
      if (task.steps && task.steps.length > 0) {
        const stepsToInsert = task.steps.map((s: any, j: number) => ({
          id: generateId(),
          taskId: newTask.id,
          stepId: s.stepId,
          order: s.order || j,
        }))
        const { error: stepsError } = await supabase.from('StandardMaintenanceTaskStep').insert(stepsToInsert)
        if (stepsError) throw stepsError
      }

      // Inserir recursos
      if (task.resources && task.resources.length > 0) {
        const resourcesToInsert = task.resources.map((r: any) => ({
          id: generateId(),
          taskId: newTask.id,
          resourceId: r.resourceId,
          resourceCount: r.resourceCount || 1,
          quantity: r.quantity || 0,
          unit: r.unit || 'H',
          generatesReserve: r.generatesReserve !== false,
        }))
        const { error: resError } = await supabase.from('StandardMaintenanceTaskResource').insert(resourcesToInsert)
        if (resError) throw resError
      }
    }

    return NextResponse.json({ message: 'Tarefas salvas com sucesso' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao salvar tarefas' }, { status: 500 })
  }
}
