import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
      return NextResponse.json(
        { error: 'Apenas administradores podem ver aprovações' },
        { status: 403 }
      )
    }

    const { data: requests, error, count: total } = await supabase
      .from('Request')
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        approvedBy:User!approvedById(id, firstName, lastName, email),
        team:Team(id, name),
        files:File(*)
      `, { count: 'exact' })
      .eq('companyId', session.companyId)
      .eq('status', 'REJECTED')
      .order('updatedAt', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      data: requests || [],
      total: total || 0
    })
  } catch (error) {
    console.error('Get rejected requests error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
