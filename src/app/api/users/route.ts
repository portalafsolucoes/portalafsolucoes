import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { hashPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roleParam = searchParams.get('role')
    const enabled = searchParams.get('enabled')

    const where: any = {
      companyId: session.companyId
    }

    if (roleParam) {
      // Suporta múltiplos roles separados por vírgula
      const roles = roleParam.split(',').map(r => r.trim())
      if (roles.length === 1) {
        where.role = roles[0]
      } else {
        where.role = { in: roles }
      }
    }

    if (enabled !== null) {
      where.enabled = enabled === 'true'
    }

    let query = supabase
      .from('User')
      .select(`
        id, email, firstName, lastName, phone, jobTitle, username,
        role, image, rate, enabled, lastLogin, locationId,
        createdAt, updatedAt,
        teamMemberships:TeamMember(*, team:Team(*))
      `)
      .eq('companyId', session.companyId)
      .order('firstName', { ascending: true })

    if (roleParam) {
      const roles = roleParam.split(',').map(r => r.trim())
      if (roles.length === 1) {
        query = query.eq('role', roles[0])
      } else {
        query = query.in('role', roles)
      }
    }

    if (enabled !== null) {
      query = query.eq('enabled', enabled === 'true')
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: users || [] })
  } catch (error) {
    console.error('Get users error:', error)
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

    const body = await request.json()
    const { email, password, firstName, lastName, role, phone, jobTitle, rate } = body

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      )
    }

    const { data: existingUser, error: checkError } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check user error:', checkError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)
    const username = email.split('@')[0]

    const { data: user, error: createError } = await supabase
      .from('User')
      .insert({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username,
        role: role || 'MECANICO',
        phone,
        jobTitle,
        rate: rate || 0,
        enabled: true,
        companyId: session.companyId
      })
      .select('id, email, firstName, lastName, phone, jobTitle, username, role, rate, enabled, createdAt')
      .single()

    if (createError) {
      console.error('Create user error:', createError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: user, message: 'User created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
