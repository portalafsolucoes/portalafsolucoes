import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar planos de manutenção emitidos
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data, error } = await supabase
      .from('MaintenancePlanExecution')
      .select('*')
      .eq('companyId', session.companyId)
      .order('planNumber', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar planos' }, { status: 500 })
  }
}

// POST - Criar plano e emitir OSs
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { description, startDate, endDate, unitId,
            costCenterFrom, costCenterTo, workCenterFrom, workCenterTo,
            serviceTypeFrom, serviceTypeTo, areaFrom, areaTo, familyFrom, familyTo } = body

    if (!description || !startDate || !endDate || !unitId) {
      return NextResponse.json({ error: 'description, startDate, endDate e unitId são obrigatórios' }, { status: 400 })
    }

    // Criar o plano
    const { data: plan, error: planError } = await supabase
      .from('MaintenancePlanExecution')
      .insert({
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status: 'OPEN',
        isFinished: false,
        costCenterFrom, costCenterTo, workCenterFrom, workCenterTo,
        serviceTypeFrom, serviceTypeTo, areaFrom, areaTo, familyFrom, familyTo,
        userId: session.id,
        companyId: session.companyId,
        unitId,
      })
      .select()
      .single()

    if (planError) throw planError

    // Buscar manutenções do bem que se encaixam nos filtros e período
    let assetPlansQuery = supabase
      .from('AssetMaintenancePlan')
      .select('*, asset:Asset!assetId(id, name, tag, unitId)')
      .eq('companyId', session.companyId)
      .eq('isActive', true)
      .eq('considerPlanning', true)

    const { data: assetPlans, error: apError } = await assetPlansQuery
    if (apError) throw apError

    const start = new Date(startDate)
    const end = new Date(endDate)
    let generatedCount = 0

    for (const ap of (assetPlans || [])) {
      // Verificar se o ativo pertence à unidade
      if (ap.asset?.unitId !== unitId) continue

      // Verificar se a manutenção está dentro do período
      if (!ap.lastMaintenanceDate || !ap.maintenanceTime || !ap.timeUnit) continue

      const lastDate = new Date(ap.lastMaintenanceDate)
      let nextDate = new Date(lastDate)

      // Calcular próxima data baseada na frequência
      switch (ap.timeUnit) {
        case 'Dia(s)': nextDate.setDate(nextDate.getDate() + ap.maintenanceTime); break
        case 'Semana(s)': nextDate.setDate(nextDate.getDate() + ap.maintenanceTime * 7); break
        case 'Mês(es)': nextDate.setMonth(nextDate.getMonth() + ap.maintenanceTime); break
        case 'Hora(s)': nextDate.setHours(nextDate.getHours() + ap.maintenanceTime); break
        default: nextDate.setDate(nextDate.getDate() + ap.maintenanceTime)
      }

      // Se a próxima data cai dentro do período do plano, gerar OS
      if (nextDate >= start && nextDate <= end) {
        const { error: woError } = await supabase
          .from('WorkOrder')
          .insert({
            title: ap.name || `Manutenção Preventiva - ${ap.asset?.name}`,
            description: `OS gerada pelo Plano #${plan.planNumber}`,
            type: 'PREVENTIVE',
            status: 'PENDING',
            priority: 'NONE',
            plannedStartDate: nextDate.toISOString(),
            assetId: ap.asset?.id,
            serviceTypeId: ap.serviceTypeId,
            assetMaintenancePlanId: ap.id,
            maintenancePlanExecId: plan.id,
            unitId,
            companyId: session.companyId,
          })

        if (!woError) generatedCount++
      }
    }

    return NextResponse.json({
      data: plan,
      message: `Plano criado com ${generatedCount} OS(s) gerada(s)`,
      generatedCount,
    }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao criar plano' }, { status: 500 })
  }
}
