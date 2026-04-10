import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar tarefas com etapas (incluindo optionType e options)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id: planId } = await params

    const { data: tasks, error } = await supabase
      .from('AssetMaintenanceTask')
      .select(`
        id, taskCode, description, order, executionTime,
        steps:AssetMaintenanceTaskStep(
          id, order, stepId,
          step:GenericStep!stepId(id, name, optionType, options:GenericStepOption(id, label, order))
        ),
        resources:AssetMaintenanceTaskResource(
          id, resourceId, resourceCount, quantity, unit,
          resource:Resource!resourceId(id, name, type, unit)
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
    const body = await request.json()
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
          executionTime: task.executionTime || null,
          isActive: true,
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
        const { error: stepsError } = await supabase.from('AssetMaintenanceTaskStep').insert(stepsToInsert)
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
        const { error: resError } = await supabase.from('AssetMaintenanceTaskResource').insert(resourcesToInsert)
        if (resError) throw resError
      }
    }

    return NextResponse.json({ message: 'Tarefas salvas com sucesso' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao salvar tarefas' }, { status: 500 })
  }
}
