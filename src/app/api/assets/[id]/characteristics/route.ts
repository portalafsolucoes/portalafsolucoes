import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar características do ativo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const { data, error } = await supabase
      .from('AssetCharacteristicValue')
      .select('*, characteristic:Characteristic!characteristicId(id, name, infoType, protheusCode)')
      .eq('assetId', id)

    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Adicionar/atualizar característica do ativo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { characteristicId, value, unit, operator } = body

    if (!characteristicId || !value) {
      return NextResponse.json({ error: 'characteristicId e value são obrigatórios' }, { status: 400 })
    }

    // Upsert: se já existe, atualiza; se não, cria
    const { data: existing } = await supabase
      .from('AssetCharacteristicValue')
      .select('id')
      .eq('assetId', id)
      .eq('characteristicId', characteristicId)
      .single()

    let data, error
    if (existing) {
      ({ data, error } = await supabase
        .from('AssetCharacteristicValue')
        .update({ value, unit, operator: operator || 'EQUAL' })
        .eq('id', existing.id)
        .select('*, characteristic:Characteristic!characteristicId(id, name, infoType)')
        .single())
    } else {
      ({ data, error } = await supabase
        .from('AssetCharacteristicValue')
        .insert({ assetId: id, characteristicId, value, unit, operator: operator || 'EQUAL' })
        .select('*, characteristic:Characteristic!characteristicId(id, name, infoType)')
        .single())
    }

    if (error) throw error

    return NextResponse.json({ data, message: 'Característica salva' }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
