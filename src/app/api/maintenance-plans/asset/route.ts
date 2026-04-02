import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar planos de manutenção do bem
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')

    let query = supabase
      .from('AssetMaintenancePlan')
      .select(`
        *,
        asset:Asset!assetId(id, name, tag),
        serviceType:ServiceType!serviceTypeId(id, code, name),
        maintenanceArea:MaintenanceArea!maintenanceAreaId(id, name),
        maintenanceType:MaintenanceType!maintenanceTypeId(id, name),
        calendar:Calendar!calendarId(id, name)
      `)
      .eq('companyId', session.companyId)
      .order('createdAt', { ascending: false })

    if (assetId) query = query.eq('assetId', assetId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar planos' }, { status: 500 })
  }
}

// POST - Criar plano de manutenção do bem
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { assetId, serviceTypeId, name, maintenanceAreaId, maintenanceTypeId,
            lastMaintenanceDate, calendarId, maintenanceTime, timeUnit, period,
            isStandard, standardPlanId, toleranceDays, considerPlanning } = body

    if (!assetId || !serviceTypeId) {
      return NextResponse.json({ error: 'assetId e serviceTypeId são obrigatórios' }, { status: 400 })
    }

    // Calcular próxima sequência para este ativo + serviceType
    const { data: existing } = await supabase
      .from('AssetMaintenancePlan')
      .select('sequence')
      .eq('assetId', assetId)
      .eq('serviceTypeId', serviceTypeId)
      .order('sequence', { ascending: false })
      .limit(1)
    const nextSequence = (existing && existing.length > 0) ? existing[0].sequence + 1 : 1

    // Se é manutenção padrão, buscar dados do plano padrão para pré-preencher
    let standardData: any = null
    if (isStandard && standardPlanId) {
      const { data: stdPlan } = await supabase
        .from('StandardMaintenancePlan')
        .select('*')
        .eq('id', standardPlanId)
        .single()
      standardData = stdPlan
    }

    const insertData: any = {
      sequence: nextSequence,
      name: name || standardData?.name || null,
      isStandard: isStandard || false,
      standardPlanId: standardPlanId || null,
      standardSequence: standardData?.sequence || null,
      lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate).toISOString() : null,
      maintenanceTime: maintenanceTime || standardData?.maintenanceTime || null,
      timeUnit: timeUnit || standardData?.timeUnit || null,
      period: period || standardData?.period || null,
      isActive: true,
      toleranceDays: toleranceDays ?? standardData?.toleranceDays ?? 0,
      considerPlanning: considerPlanning !== false,
      assetId,
      serviceTypeId,
      maintenanceAreaId: maintenanceAreaId || null,
      maintenanceTypeId: maintenanceTypeId || null,
      calendarId: calendarId || standardData?.calendarId || null,
      companyId: session.companyId,
    }

    const { data, error } = await supabase
      .from('AssetMaintenancePlan')
      .insert(insertData)
      .select(`
        *,
        asset:Asset!assetId(id, name, tag),
        serviceType:ServiceType!serviceTypeId(id, code, name)
      `)
      .single()

    if (error) throw error

    // Se veio de plano padrão, copiar tarefas/etapas/recursos
    if (isStandard && standardPlanId && data) {
      const { data: stdTasks } = await supabase
        .from('StandardMaintenanceTask')
        .select('*')
        .eq('planId', standardPlanId)
        .order('order')

      if (stdTasks) {
        for (const stdTask of stdTasks) {
          const { data: newTask } = await supabase
            .from('AssetMaintenanceTask')
            .insert({
              planId: data.id,
              taskCode: stdTask.taskCode,
              description: stdTask.description,
              order: stdTask.order,
              executionTime: stdTask.executionTime,
              isActive: true,
            })
            .select()
            .single()

          if (newTask) {
            // Copiar etapas
            const { data: stdSteps } = await supabase
              .from('StandardMaintenanceTaskStep')
              .select('*')
              .eq('taskId', stdTask.id)
            if (stdSteps && stdSteps.length > 0) {
              await supabase.from('AssetMaintenanceTaskStep').insert(
                stdSteps.map((s: any) => ({ taskId: newTask.id, stepId: s.stepId, order: s.order }))
              )
            }

            // Copiar recursos
            const { data: stdRes } = await supabase
              .from('StandardMaintenanceTaskResource')
              .select('*')
              .eq('taskId', stdTask.id)
            if (stdRes && stdRes.length > 0) {
              await supabase.from('AssetMaintenanceTaskResource').insert(
                stdRes.map((r: any) => ({
                  taskId: newTask.id, resourceId: r.resourceId, resourceCount: r.resourceCount,
                  quantity: r.quantity, unit: r.unit, generatesReserve: r.generatesReserve,
                }))
              )
            }
          }
        }
      }
    }

    return NextResponse.json({ data, message: 'Plano do bem criado' }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao criar plano' }, { status: 500 })
  }
}
