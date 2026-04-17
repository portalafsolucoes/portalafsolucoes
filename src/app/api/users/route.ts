import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { hashPassword, normalizeEmail, validateEmail, validatePassword } from '@/lib/auth'
import { checkApiPermission } from '@/lib/permissions'
import { resolveJobTitleSelection } from '@/lib/job-titles'
import { toPersistedUserRole } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'

type UserListRow = Record<string, unknown> & {
  calendar?: {
    name?: string | null
  } | null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'people-teams', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const roleParam = searchParams.get('role')
    const enabled = searchParams.get('enabled')
    const brief = searchParams.get('brief')

    const isBrief = brief === 'true' || brief === 'resource'
    const briefSelect = `
      id, firstName, lastName, email, role, jobTitle, rate, enabled,
      jobTitleId,
      calendar:Calendar(name)
    `
    const fullSelect = `
      id, email, firstName, lastName, phone, jobTitle, jobTitleId, username,
      role, image, rate, enabled, lastLogin, locationId, calendarId,
      createdAt, updatedAt,
      calendar:Calendar(name),
      teamMemberships:TeamMember(*, team:Team(*))
    `

    let query = supabase
      .from('User')
      .select(isBrief ? briefSelect : fullSelect)
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

    const result = ((users || []) as unknown as UserListRow[]).map((u) => ({
      ...u,
      calendarName: u.calendar?.name || null,
    }))

    return NextResponse.json({ data: result })
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

    const permError = checkApiPermission(session, 'people-teams', 'POST')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = normalizeTextPayload(await request.json())
    const { email, password, firstName, lastName, role, phone, jobTitle, jobTitleId, rate, enabled, calendarId, locationId, unitIds } = body
    const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : ''

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      )
    }

    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Informe um email válido com domínio completo, por exemplo nome@empresa.com' },
        { status: 400 }
      )
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      )
    }

    if (normalizedEmail === password.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Email e senha não podem ser iguais' },
        { status: 400 }
      )
    }

    const { data: existingUser, error: checkError } = await supabase
      .from('User')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check user error:', checkError)
      return NextResponse.json(
        { error: 'Erro ao verificar usuário' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está em uso' },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)
    let username = normalizedEmail.split('@')[0]

    // Verificar se o username já existe e gerar um único
    const { data: existingUsername } = await supabase
      .from('User')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUsername) {
      username = normalizedEmail.replace('@', '_at_').replace(/\./g, '_')
    }

    const now = new Date().toISOString()
    const userId = generateId()

    let resolvedJobTitleId: string | null = null
    let resolvedJobTitle: string | null = null

    try {
      const resolvedJobTitleSelection = await resolveJobTitleSelection({
        companyId: session.companyId,
        jobTitleId,
        jobTitle,
      })
      resolvedJobTitleId = resolvedJobTitleSelection.jobTitleId
      resolvedJobTitle = resolvedJobTitleSelection.jobTitle
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_JOB_TITLE') {
        return NextResponse.json(
          { error: 'Cargo inválido para a empresa ativa' },
          { status: 400 }
        )
      }
      throw error
    }

    // Definir activeUnitId como a primeira unidade se fornecida
    const activeUnitId = unitIds && unitIds.length > 0 ? unitIds[0] : null

    const { data: user, error: createError } = await supabase
      .from('User')
      .insert({
        id: userId,
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        username,
        role: toPersistedUserRole(role),
        phone: phone || null,
        jobTitle: resolvedJobTitle,
        jobTitleId: resolvedJobTitleId,
        rate: rate || 0,
        enabled: enabled ?? true,
        companyId: session.companyId,
        calendarId: calendarId || null,
        locationId: locationId || null,
        activeUnitId,
        createdAt: now,
        updatedAt: now
      })
      .select('id, email, firstName, lastName, phone, jobTitle, jobTitleId, username, role, rate, enabled, createdAt')
      .single()

    if (createError) {
      console.error('Create user error:', createError)
      return NextResponse.json(
        { error: 'Erro ao criar usuário: ' + (createError.message || 'erro no banco de dados') },
        { status: 500 }
      )
    }

    // Criar vínculos UserUnit se unitIds fornecidos
    if (unitIds && unitIds.length > 0) {
      const userUnitRows = unitIds.map((unitId: string) => ({
        id: generateId(),
        userId,
        unitId,
        createdAt: now,
      }))

      const { error: uuError } = await supabase.from('UserUnit').insert(userUnitRows)
      if (uuError) {
        console.error('Error creating UserUnit links:', uuError)
      }
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
