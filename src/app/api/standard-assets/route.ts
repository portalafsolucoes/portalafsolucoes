import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

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

    const record = {
      id: generateId(),
      companyId: session.companyId,
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
        .filter((c: any) => c.characteristicId && c.value)
        .map((c: any) => ({
          id: generateId(),
          standardAssetId: data.id,
          characteristicId: c.characteristicId,
          value: c.value,
          unit: c.unit || null,
        }))
      if (charRecords.length > 0) {
        await supabase.from('StandardAssetCharacteristic').insert(charRecords)
      }
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
