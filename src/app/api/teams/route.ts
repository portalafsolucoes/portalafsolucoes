import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'people-teams', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { data: teams, error } = await supabase
      .from('Team')
      .select(`
        *,
        members:TeamMember(
          *,
          user:User(id, firstName, lastName, email, image)
        )
      `)
      .eq('companyId', session.companyId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ data: teams || [] })
  } catch (error) {
    console.error('Get teams error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'people-teams', 'POST')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, memberIds } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const { data: team, error: createError } = await supabase
      .from('Team')
      .insert({
        id: generateId(),
        name,
        description,
        companyId: session.companyId
      })
      .select(`
        *,
        members:TeamMember(
          *,
          user:User(id, firstName, lastName, email)
        )
      `)
      .single()

    if (createError) {
      console.error('Create team error:', createError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Insert members separately if provided
    if (memberIds && memberIds.length > 0 && team) {
      const memberInserts = memberIds.map((userId: string) => ({
        id: generateId(),
        teamId: team.id,
        userId
      }))
      
      await supabase.from('TeamMember').insert(memberInserts).select()
    }

    return NextResponse.json(
      { data: team, message: 'Team created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create team error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
