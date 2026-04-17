import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { normalizeTextPayload } from '@/lib/textNormalizer'

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('StandardAsset')
      .select('*, family:AssetFamily!familyId(id, code, name), characteristics:StandardAssetCharacteristic(*, characteristic:Characteristic!characteristicId(id, name, unit, infoType))')
      .eq('companyId', session.companyId)
      .order('createdAt', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = normalizeTextPayload(await request.json())

    if (!body.familyId) {
      return NextResponse.json({ error: 'Família é obrigatória' }, { status: 400 })
    }

    // Verificar se já existe um Bem Padrão para esta família
    const { data: existing } = await supabase
      .from('StandardAsset')
      .select('id')
      .eq('familyId', body.familyId)
      .eq('companyId', session.companyId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Já existe um Bem Padrão cadastrado para esta família' }, { status: 409 })
    }

    const now = new Date().toISOString()
    const record = {
      id: generateId(),
      companyId: session.companyId,
      createdAt: now,
      updatedAt: now,
      familyId: body.familyId,
      name: body.name || null,
      costCenterCode: body.costCenterCode || null,
      costCenterName: body.costCenterName || null,
      shiftCode: body.shiftCode || null,
      workCenterCode: body.workCenterCode || null,
      workCenterName: body.workCenterName || null,
      supplierCode: body.supplierCode || null,
      supplierStore: body.supplierStore || null,
      modelType: body.modelType || null,
      manufacturer: body.manufacturer || null,
      modelName: body.modelName || null,
      serialNumber: body.serialNumber || null,
      warehouse: body.warehouse || null,
      priority: body.priority || null,
      hourlyCost: body.hourlyCost ? parseFloat(body.hourlyCost) : null,
      hasCounter: body.hasCounter || false,
      assetMovement: body.assetMovement || null,
      trackingPeriod: body.trackingPeriod || null,
      unitOfMeasure: body.unitOfMeasure || null,
      imageUrl: body.imageUrl || null,
      counterType: body.counterType || null,
      coupling: body.coupling || null,
      annualCoupValue: body.annualCoupValue ? parseFloat(body.annualCoupValue) : null,
    }

    const { data, error } = await supabase
      .from('StandardAsset')
      .insert(record)
      .select('*, family:AssetFamily!familyId(id, code, name)')
      .single()

    if (error) throw error

    // Salvar características se fornecidas
    if (body.characteristics && Array.isArray(body.characteristics) && data) {
      const charRecords = body.characteristics
        .filter((c: { characteristicId?: string; value?: string }) => c.characteristicId && c.value)
        .map((c: { characteristicId: string; value: string; unit?: string | null }) => ({
          id: generateId(),
          standardAssetId: data.id,
          characteristicId: c.characteristicId,
          value: c.value,
          unit: c.unit || null,
          createdAt: now,
          updatedAt: now,
        }))
      if (charRecords.length > 0) {
        await supabase.from('StandardAssetCharacteristic').insert(charRecords)
      }
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
