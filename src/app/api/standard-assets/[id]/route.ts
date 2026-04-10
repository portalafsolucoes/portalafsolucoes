import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('StandardAsset')
      .select('*, family:AssetFamily!familyId(id, code, name), characteristics:StandardAssetCharacteristic(*, characteristic:Characteristic!characteristicId(id, name, unit, infoType))')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const updates: Record<string, any> = {}
    const allowedFields = [
      'name', 'costCenterCode', 'costCenterName', 'shiftCode',
      'workCenterCode', 'workCenterName', 'supplierCode', 'supplierStore',
      'modelType', 'manufacturer', 'modelName', 'serialNumber', 'warehouse',
      'priority', 'assetMovement', 'trackingPeriod', 'unitOfMeasure',
      'imageUrl', 'counterType', 'coupling',
    ]

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field] || null
      }
    }

    if ('hourlyCost' in body) updates.hourlyCost = body.hourlyCost ? parseFloat(body.hourlyCost) : null
    if ('annualCoupValue' in body) updates.annualCoupValue = body.annualCoupValue ? parseFloat(body.annualCoupValue) : null
    if ('hasCounter' in body) updates.hasCounter = !!body.hasCounter

    updates.updatedAt = new Date().toISOString()

    const { data, error } = await supabase
      .from('StandardAsset')
      .update(updates)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .select('*, family:AssetFamily!familyId(id, code, name)')
      .single()

    if (error) throw error

    // Sincronizar características se fornecidas
    if ('characteristics' in body && Array.isArray(body.characteristics)) {
      // Remover todas as existentes
      await supabase.from('StandardAssetCharacteristic').delete().eq('standardAssetId', id)
      // Inserir novas
      const charRecords = body.characteristics
        .filter((c: any) => c.characteristicId && c.value)
        .map((c: any) => {
          const now = new Date().toISOString()
          return {
            id: generateId(),
            standardAssetId: id,
            characteristicId: c.characteristicId,
            value: c.value,
            unit: c.unit || null,
            createdAt: now,
            updatedAt: now,
          }
        })
      if (charRecords.length > 0) {
        await supabase.from('StandardAssetCharacteristic').insert(charRecords)
      }
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('StandardAsset')
      .delete()
      .eq('id', id)
      .eq('companyId', session.companyId)

    if (error) throw error

    return NextResponse.json({ message: 'Bem Padrão excluído com sucesso' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
