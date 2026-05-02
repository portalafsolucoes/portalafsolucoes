import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { markAsOverridden } from '@/lib/maintenance-plans/standardSync'
import { toDecimalHours } from '@/lib/units/time'

// GET - Listar tarefas com etapas (incluindo optionType e options)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id: planId } = await params

    const { data: plan, error: planError } = await supabase
      .from('AssetMaintenancePlan')
      .select('id')
      .eq('id', planId)
      .eq('companyId', session.companyId)
      .single()
    if (planError || !plan) {
      return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
    }

    const { data: tasks, error } = await supabase
      .from('AssetMaintenanceTask')
      .select(`
        id, taskCode, description, order, executionTime,
        steps:AssetMaintenanceTaskStep(
          id, order, stepId,
          step:GenericStep!stepId(id, name, optionType, options:GenericStepOption(id, label, order))
        ),
        resources:AssetMaintenanceTaskResource(
          id, resourceType, resourceId, jobTitleId, userId, resourceCount, quantity, hours, unit,
          resource:Resource(id, name, type, unit),
          jobTitle:JobTitle(id, name),
          user:User(id, firstName, lastName, jobTitle)
        )
      `)
      .eq('planId', planId)
      .order('order')

    if (error) throw error

    return NextResponse.json({ data: tasks || [] })
  } catch (error) {
    console.error('Error fetching asset plan tasks:', error)
    return NextResponse.json({ error: 'Erro ao buscar tarefas do plano' }, { status: 500 })
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
      .from('AssetMaintenancePlan')
      .select('id')
      .eq('id', planId)
      .eq('companyId', session.companyId)
      .single()
    if (planError || !plan) {
      return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
    }

    const body = normalizeTextPayload(await request.json())
    const { tasks } = body

    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: 'tasks deve ser um array' }, { status: 400 })
    }

    // Deletar tarefas existentes (cascade deleta steps e resources)
    await supabase.from('AssetMaintenanceTask').delete().eq('planId', planId)

    // Inserir novas tarefas
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      const { data: newTask, error: taskError } = await supabase
        .from('AssetMaintenanceTask')
        .insert({
          id: generateId(),
          planId,
          taskCode: task.taskCode || i,
          description: task.description,
          order: task.order || i,
          executionTime: toDecimalHours(task.executionTime ?? null),
          isActive: true,
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
        const { error: stepsError } = await supabase.from('AssetMaintenanceTaskStep').insert(stepsToInsert)
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
        const { error: resError } = await supabase.from('AssetMaintenanceTaskResource').insert(resourcesToInsert)
        if (resError) throw resError
      }
    }

    // Fase 4: editar tasks/steps/resources marca o plano como customizado
    // (se vier de padrao). No-op quando standardPlanId e null ou ja esta marcado.
    if (session.companyId) {
      await markAsOverridden(planId, session.id, session.companyId)
    }

    return NextResponse.json({ message: 'Tarefas salvas com sucesso' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao salvar tarefas' }, { status: 500 })
  }
}
