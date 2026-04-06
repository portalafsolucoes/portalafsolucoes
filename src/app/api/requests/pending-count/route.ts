import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Retorna apenas a contagem de requests pendentes (otimizado para sidebar badge)
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
      return NextResponse.json({ count: 0 })
    }

    const { count, error } = await supabase
      .from('Request')
      .select('id', { count: 'exact', head: true })
      .eq('companyId', session.companyId)
      .eq('status', 'PENDING')

    if (error) {
      console.error('Pending count error:', error)
      return NextResponse.json({ count: 0 })
    }

    const response = NextResponse.json({ count: count ?? 0 })
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
    return response
  } catch (error) {
    console.error('Pending count error:', error)
    return NextResponse.json({ count: 0 })
  }
}
