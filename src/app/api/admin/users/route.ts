import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase, generateId } from '@/lib/supabase'
import { hashPassword, normalizeEmail, validateEmail, validatePassword } from '@/lib/auth'
import { isAdminRole, toPersistedUserRole } from '@/lib/user-roles'
import { resolveJobTitleSelection } from '@/lib/job-titles'
import { normalizeTextPayload } from '@/lib/textNormalizer'

type AdminUserRow = {
  id: string
  [key: string]: unknown
}

type UnitSummary = {
  id: string
  name: string
}

type UserUnitRow = {
  userId: string
  unitId: string
  unit: UnitSummary | UnitSummary[] | null
}

type EnrichedAdminUser = AdminUserRow & {
  units: UnitSummary[]
}

/**
 * GET /api/admin/users
 * Lista usuários da empresa com informações de unidades.
 * Apenas SUPER_ADMIN e ADMIN.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdminRole(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const roleFilter = searchParams.get('role')
  const unitFilter = searchParams.get('unitId')
  const enabledFilter = searchParams.get('enabled')

  let query = supabase
    .from('User')
    .select(`
      id, email, firstName, lastName, phone, jobTitle, jobTitleId, username,
      role, image, rate, enabled, lastLogin, locationId, activeUnitId,
      createdAt, updatedAt
    `)
    .eq('companyId', session.companyId)
    .order('firstName')

  if (roleFilter) {
    const roles = roleFilter.split(',').map(r => r.trim()).filter(Boolean)
    if (roles.length === 1) {
      query = query.eq('role', roles[0])
    } else {
      query = query.in('role', roles)
    }
  }

  if (enabledFilter !== null && enabledFilter !== undefined) {
    query = query.eq('enabled', enabledFilter === 'true')
  }

  const { data: users, error } = await query

  if (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Buscar vínculos UserUnit para cada usuário
  const userIds = ((users || []) as AdminUserRow[]).map((u) => u.id)

  const { data: userUnits } = await supabase
    .from('UserUnit')
    .select('userId, unitId, unit:Location!unitId(id, name)')
    .in('userId', userIds.length > 0 ? userIds : ['__none__'])

  // Mapear unidades por usuário
  const unitsByUser: Record<string, UnitSummary[]> = {}
  for (const uu of (userUnits || []) as UserUnitRow[]) {
    if (!unitsByUser[uu.userId]) unitsByUser[uu.userId] = []
    if (uu.unit) {
      const units = Array.isArray(uu.unit) ? uu.unit : [uu.unit]
      unitsByUser[uu.userId].push(...units)
    }
  }

  let enriched: EnrichedAdminUser[] = ((users || []) as AdminUserRow[]).map((u) => ({
    ...u,
    units: unitsByUser[u.id] || [],
  }))

  // Filtrar por unidade se solicitado
  if (unitFilter) {
    enriched = enriched.filter((u) =>
      u.units.some((unit) => unit.id === unitFilter)
    )
  }

  return NextResponse.json({ data: enriched })
}

/**
 * POST /api/admin/users
 * Cria um novo usuário com role e unidades vinculadas.
 * Apenas SUPER_ADMIN e ADMIN.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdminRole(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = normalizeTextPayload(await request.json())
  const {
    email, password, firstName, lastName, role,
    phone, jobTitle, jobTitleId, rate, calendarId, locationId,
    unitIds, // string[] - unidades a vincular
  } = body
  const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : ''

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: 'Campos obrigatórios: email, senha, nome e sobrenome' }, { status: 400 })
  }

  if (!validateEmail(normalizedEmail)) {
    return NextResponse.json({ error: 'Informe um email válido com domínio completo, por exemplo nome@empresa.com' }, { status: 400 })
  }

  const passwordValidation = validatePassword(password)
  if (!passwordValidation.valid) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres' }, { status: 400 })
  }

  if (normalizedEmail === password.trim().toLowerCase()) {
    return NextResponse.json({ error: 'Email e senha não podem ser iguais' }, { status: 400 })
  }

  // Verificar email duplicado
  const { data: existing } = await supabase
    .from('User')
    .select('id')
    .eq('email', normalizedEmail)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Este email já está em uso' }, { status: 409 })
  }

  const hashedPassword = await hashPassword(password)
  let username = normalizedEmail.split('@')[0]

  const { data: existingUsername } = await supabase
    .from('User')
    .select('id')
    .eq('username', username)
    .single()

  if (existingUsername) {
    username = normalizedEmail.replace('@', '_at_').replace(/\./g, '_')
  }

  const userId = generateId()
  const now = new Date().toISOString()

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
      return NextResponse.json({ error: 'Cargo inválido para a empresa ativa' }, { status: 400 })
    }
    throw error
  }

  // Definir activeUnitId como a primeira unidade
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
      enabled: true,
      companyId: session.companyId,
      calendarId: calendarId || null,
      locationId: locationId || null,
      activeUnitId,
      createdAt: now,
      updatedAt: now,
    })
    .select('id, email, firstName, lastName, role, jobTitle, jobTitleId, enabled')
    .single()

  if (createError) {
    console.error('Error creating admin user:', createError)
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }

  // Criar vínculos UserUnit
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

  return NextResponse.json({ data: user }, { status: 201 })
}
