import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { recordAudit } from '@/lib/audit/recordAudit'

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

    const body = normalizeTextPayload(await request.json())
    const { familyId, familyModelId, serviceTypeId, name, calendarId,
            maintenanceTime, timeUnit, period, priority, stopsAsset, toleranceDays, trackingType } = body

    if (!familyId || !serviceTypeId || !name || !maintenanceTime || !timeUnit || !period) {
      return NextResponse.json({ error: 'Campos obrigatórios: familyId, serviceTypeId, name, maintenanceTime, timeUnit, period' }, { status: 400 })
    }

    // Calcular próxima sequência por família + tipo modelo + tipo serviço
    let seqQuery = supabase
      .from('StandardMaintenancePlan')
      .select('sequence')
      .eq('familyId', familyId)
      .eq('serviceTypeId', serviceTypeId)
    if (familyModelId) {
      seqQuery = seqQuery.eq('familyModelId', familyModelId)
    } else {
      seqQuery = seqQuery.is('familyModelId', null)
    }
    const { data: existing } = await seqQuery
      .order('sequence', { ascending: false })
      .limit(1)
    const nextSequence = (existing && existing.length > 0) ? existing[0].sequence + 1 : 1

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('StandardMaintenancePlan')
      .insert({
        id: generateId(),
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
        createdAt: now,
        updatedAt: now,
      })
      .select(`
        *,
        family:AssetFamily!familyId(id, code, name),
        serviceType:ServiceType!serviceTypeId(id, code, name)
      `)
      .single()

    if (error) throw error

    await recordAudit({
      session,
      entity: 'StandardMaintenancePlan',
      entityId: data.id,
      entityLabel: data.name ?? null,
      action: 'CREATE',
      after: data as Record<string, unknown>,
      companyId: data.companyId ?? session.companyId,
      unitId: session.unitId,
    })

    return NextResponse.json({ data, message: 'Plano padrão criado' }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao criar plano padrão' }, { status: 500 })
  }
}
