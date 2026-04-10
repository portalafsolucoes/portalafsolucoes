import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Buscar plano padrão por família + tipo modelo + tipo de serviço + sequência
// Usado pelo fluxo "Manutenção Padrão?" no cadastro de plano do bem
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')
    const familyModelId = searchParams.get('familyModelId')
    const serviceTypeId = searchParams.get('serviceTypeId')
    const sequence = searchParams.get('sequence')

    if (!familyId || !serviceTypeId) {
      return NextResponse.json({ error: 'familyId e serviceTypeId são obrigatórios' }, { status: 400 })
    }

    let query = supabase
      .from('StandardMaintenancePlan')
      .select(`
        *,
        family:AssetFamily!familyId(id, code, name),
        familyModel:AssetFamilyModel!familyModelId(id, name),
        serviceType:ServiceType!serviceTypeId(id, code, name),
        calendar:Calendar!calendarId(id, name)
      `)
      .eq('familyId', familyId)
      .eq('serviceTypeId', serviceTypeId)
      .eq('companyId', session.companyId)

    if (familyModelId) {
      query = query.eq('familyModelId', familyModelId)
    } else {
      query = query.is('familyModelId', null)
    }

    if (sequence) {
      query = query.eq('sequence', Number(sequence))
    }

    const { data, error } = await query.order('sequence').limit(1)

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json({ data: null, found: false })
    }

    const plan = data[0]

    // Buscar tarefas com etapas e recursos
    const { data: tasks } = await supabase
      .from('StandardMaintenanceTask')
      .select('*')
      .eq('planId', plan.id)
      .order('order')

    if (tasks) {
      for (const task of tasks) {
        const [stepsRes, resourcesRes] = await Promise.all([
          supabase.from('StandardMaintenanceTaskStep')
            .select('*, step:GenericStep!stepId(id, name)')
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

    return NextResponse.json({ data: { ...plan, tasks: tasks || [] }, found: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar plano padrão' }, { status: 500 })
  }
}
