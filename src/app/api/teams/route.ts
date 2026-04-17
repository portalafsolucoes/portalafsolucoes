import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeTextPayload } from '@/lib/textNormalizer'

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

    const body = normalizeTextPayload(await request.json())
    const { name, description, memberIds } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Validar que os usuarios selecionados nao estao em outra equipe
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      const { data: existing, error: existingErr } = await supabase
        .from('TeamMember')
        .select('userId, team:Team(name)')
        .in('userId', memberIds)
      if (existingErr) {
        console.error('Check membership error:', existingErr)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }
      if (existing && existing.length > 0) {
        const conflicts = existing.map((m: { userId: string; team: { name: string } | { name: string }[] }) => ({
          userId: m.userId,
          teamName: Array.isArray(m.team) ? m.team[0]?.name : m.team?.name,
        }))
        return NextResponse.json(
          { error: 'Um ou mais usuarios ja pertencem a outra equipe', conflicts },
          { status: 409 }
        )
      }
    }

    const now = new Date().toISOString()
    const { data: team, error: createError } = await supabase
      .from('Team')
      .insert({
        id: generateId(),
        name,
        description,
        companyId: session.companyId,
        createdAt: now,
        updatedAt: now,
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
