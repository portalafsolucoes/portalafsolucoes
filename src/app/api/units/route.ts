import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('Unit')
      .select('*')
      .eq('companyId', session.companyId)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching units:', error)
    return NextResponse.json({ error: 'Erro ao buscar unidades' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Apenas Super Admin pode criar unidades' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('Unit')
      .insert({
        name: body.name,
        code: body.code,
        protheusCode: body.protheusCode,
        address: body.address,
        phone: body.phone,
        email: body.email,
        companyId: session.companyId,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, message: 'Unidade criada com sucesso' }, { status: 201 })
  } catch (error) {
    console.error('Error creating unit:', error)
    return NextResponse.json({ error: 'Erro ao criar unidade' }, { status: 500 })
  }
}
