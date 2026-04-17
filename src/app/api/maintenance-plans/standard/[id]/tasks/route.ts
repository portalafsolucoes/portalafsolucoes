import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { parseWorkDays, getWeeklyHours, getWeeklySummary } from '@/lib/calendarUtils'
import { normalizeTextPayload } from '@/lib/textNormalizer'

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
          resource:Resource(
            id, name, type, unit, unitCost, calendarId,
            calendar:Calendar!calendarId(id, name, workDays)
          ),
          jobTitle:JobTitle(id, name),
          user:User(id, firstName, lastName, jobTitle)
        )
      `)
      .eq('planId', planId)
      .order('order')

    if (error) throw error

    // Enriquecer recursos com dados de calendário
    type TaskResource = {
      resource?: {
        id: string
        name: string
        type: string
        unit: string
        unitCost: number
        calendarId: string | null
        calendar?: { name?: string; workDays?: unknown } | null
      } | null
    }
    const enrichedTasks = (tasks || []).map((task: Record<string, unknown> & { resources?: TaskResource[] }) => ({
      ...task,
      resources: (task.resources || []).map((tr: TaskResource) => {
        const resource = tr.resource
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

    const body = normalizeTextPayload(await request.json())
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
        const stepsToInsert = task.steps.map((s: { stepId: string; order?: number }, j: number) => ({
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
        const resourcesToInsert = task.resources.map((r: {
          resourceType?: string
          resourceId?: string | null
          jobTitleId?: string | null
          userId?: string | null
          resourceCount?: number
          quantity?: number
          hours?: number
          unit?: string
          generatesReserve?: boolean
        }) => ({
          id: generateId(),
          taskId: newTask.id,
          resourceType: r.resourceType || 'MATERIAL',
          resourceId: r.resourceId || null,
          jobTitleId: r.jobTitleId || null,
          userId: r.userId || null,
          resourceCount: r.resourceCount ?? r.quantity ?? 1,
          quantity: r.quantity || 0,
          hours: r.hours || 0,
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
