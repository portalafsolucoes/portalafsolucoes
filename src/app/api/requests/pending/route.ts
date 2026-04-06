import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se usuário pode ver aprovações
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
      return NextResponse.json(
        { error: 'Apenas administradores podem ver aprovações' },
        { status: 403 }
      )
    }

    // ADMIN e SUPER_ADMIN podem ver todas as solicitações pendentes da empresa
    const whereClause: any = {
      companyId: session.companyId,
      status: 'PENDING'
    }

    const { data: requests, error, count: total } = await supabase
      .from('Request')
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        team:Team(id, name),
        asset:Asset(id, name),
        location:Location!locationId(id, name),
        files:File(*)
      `, { count: 'exact' })
      .eq('companyId', session.companyId)
      .eq('status', 'PENDING')
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: requests || [],
      total: total || 0,
      userRole: session.role
    })
  } catch (error) {
    console.error('Get pending requests error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
