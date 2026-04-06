import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Detalhe do plano padrão com tarefas, etapas e recursos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params

    const { data: plan, error } = await supabase
      .from('StandardMaintenancePlan')
      .select(`
        *,
        family:AssetFamily!familyId(id, code, name),
        familyModel:AssetFamilyModel!familyModelId(id, name),
        serviceType:ServiceType!serviceTypeId(id, code, name),
        calendar:Calendar!calendarId(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
      throw error
    }

    // Buscar tarefas com etapas e recursos
    const { data: tasks } = await supabase
      .from('StandardMaintenanceTask')
      .select('*')
      .eq('planId', id)
      .order('order')

    if (tasks) {
      for (const task of tasks) {
        const [stepsRes, resourcesRes] = await Promise.all([
          supabase.from('StandardMaintenanceTaskStep')
            .select('*, step:GenericStep!stepId(id, name, protheusCode, optionType, options:GenericStepOption(id, label, order))')
            .eq('taskId', task.id)
            .order('order'),
          supabase.from('StandardMaintenanceTaskResource')
            .select('*, resource:Resource!resourceId(id, name, type, unit)')
            .eq('taskId', task.id),
        ])
        task.steps = stepsRes.data || []
        task.resources = resourcesRes.data || []
      }
    }

    return NextResponse.json({ data: { ...plan, tasks: tasks || [] } })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - Atualizar plano padrão
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params
    const body = await request.json()

    delete body.id
    delete body.companyId
    delete body.createdAt
    delete body.family
    delete body.familyModel
    delete body.serviceType
    delete body.calendar
    delete body.tasks
    body.updatedAt = new Date().toISOString()

    const { data, error } = await supabase
      .from('StandardMaintenancePlan')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: 'Plano atualizado' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params

    const { error } = await supabase.from('StandardMaintenancePlan').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'Plano excluído' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
