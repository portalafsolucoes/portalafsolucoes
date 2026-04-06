import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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
          id, order,
          step:GenericStep!stepId(id, name, optionType, options:GenericStepOption(id, label, order))
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
