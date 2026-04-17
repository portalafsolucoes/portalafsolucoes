import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apenas técnicos podem ver suas atribuições
    if (!['MECANICO', 'ELETRICISTA', 'OPERADOR', 'CONSTRUTOR_CIVIL'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Apenas técnicos podem ver atribuições' },
        { status: 403 }
      )
    }

    const { data: requests, error, count: total } = await supabase
      .from('Request')
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        approvedBy:User!approvedById(id, firstName, lastName, email),
        asset:Asset(id, name),
        location:Location(id, name),
        files:File(*)
      `, { count: 'exact' })
      .eq('companyId', session.companyId)
      .eq('status', 'APPROVED')
      .eq('assignedToId', session.id)
      .eq('convertToWorkOrder', false)
      .order('approvedAt', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      data: requests || [],
      total: total || 0
    })
  } catch (error) {
    console.error('Get my assignments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
