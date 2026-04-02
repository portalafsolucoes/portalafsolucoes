import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar planos de manutenção padrão
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data, error } = await supabase
      .from('StandardMaintenancePlan')
      .select(`
        *,
        family:AssetFamily!familyId(id, code, name),
        familyModel:AssetFamilyModel!familyModelId(id, name),
        serviceType:ServiceType!serviceTypeId(id, code, name),
        calendar:Calendar!calendarId(id, name)
      `)
      .eq('companyId', session.companyId)
      .order('createdAt', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar planos padrão' }, { status: 500 })
  }
}

// POST - Criar plano de manutenção padrão
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { familyId, familyModelId, serviceTypeId, name, calendarId,
            maintenanceTime, timeUnit, period, priority, stopsAsset, toleranceDays, trackingType } = body

    if (!familyId || !serviceTypeId || !name || !maintenanceTime || !timeUnit || !period) {
      return NextResponse.json({ error: 'Campos obrigatórios: familyId, serviceTypeId, name, maintenanceTime, timeUnit, period' }, { status: 400 })
    }

    // Calcular próxima sequência
    const { data: existing } = await supabase
      .from('StandardMaintenancePlan')
      .select('sequence')
      .eq('familyId', familyId)
      .eq('serviceTypeId', serviceTypeId)
      .order('sequence', { ascending: false })
      .limit(1)
    const nextSequence = (existing && existing.length > 0) ? existing[0].sequence + 1 : 1

    const { data, error } = await supabase
      .from('StandardMaintenancePlan')
      .insert({
        sequence: nextSequence,
        name,
        maintenanceTime,
        timeUnit,
        period,
        priority: priority || 'ZZZ',
        stopsAsset: stopsAsset || false,
        toleranceDays: toleranceDays || 0,
        trackingType: trackingType || 'TIME',
        calendarId: calendarId || null,
        familyId,
        familyModelId: familyModelId || null,
        serviceTypeId,
        companyId: session.companyId,
      })
      .select(`
        *,
        family:AssetFamily!familyId(id, code, name),
        serviceType:ServiceType!serviceTypeId(id, code, name)
      `)
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: 'Plano padrão criado' }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao criar plano padrão' }, { status: 500 })
  }
}
