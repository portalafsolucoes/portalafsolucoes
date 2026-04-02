import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

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
