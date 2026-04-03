import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// Unidades agora são Localizações (Location).
// Este endpoint continua existindo para manter compatibilidade com as páginas
// que consomem /api/units (basic-registrations, kpi, planning, tree).

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('Location')
      .select('*')
      .eq('companyId', session.companyId)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching units (locations):', error)
    return NextResponse.json({ error: 'Erro ao buscar unidades' }, { status: 500 })
  }
}
