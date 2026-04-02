import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Primeiro verificar se a equipe pertence à empresa do usuário
    const { data: team, error: teamError } = await supabase
      .from('Team')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { data: members, error: membersError } = await supabase
      .from('TeamMember')
      .select('*, user:User!userId(id, firstName, lastName, email, jobTitle)')
      .eq('teamId', id)

    if (membersError) throw membersError

    return NextResponse.json({ data: members || [] })
  } catch (error) {
    console.error('Get team members error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
