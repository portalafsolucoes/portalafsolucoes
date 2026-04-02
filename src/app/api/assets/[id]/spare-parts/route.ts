import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar peças de reposição do ativo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const { data, error } = await supabase
      .from('AssetSparePart')
      .select('*')
      .eq('assetId', id)
      .order('productCode', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Adicionar peça de reposição
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { productCode, quantity, criticality, warrantyTime, warrantyUnit } = body

    if (!productCode) {
      return NextResponse.json({ error: 'productCode é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('AssetSparePart')
      .insert({
        assetId: id,
        productCode,
        quantity: quantity || 0,
        criticality: criticality || 'LOW',
        warrantyTime: warrantyTime || 0,
        warrantyUnit,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, message: 'Peça adicionada' }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
