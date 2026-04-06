import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
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

    const { data: workOrders, error } = await supabase
      .from('WorkOrder')
      .select(`
        *,
        asset:Asset(id, name),
        location:Location(id, name),
        createdBy:User!createdById(id, firstName, lastName, email),
        assignedTo:User!assignedToId(id, firstName, lastName, email),
        sourceRequest:Request(id, title),
        files:File(*)
      `)
      .eq('companyId', session.companyId)
      .eq('assignedToId', session.id)
      .order('createdAt', { ascending: false })

    if (error) throw error

    const total = workOrders?.length || 0

    return NextResponse.json({
      data: workOrders || [],
      total
    })
  } catch (error) {
    console.error('Get my work orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
