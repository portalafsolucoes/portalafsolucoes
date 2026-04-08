import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase, generateId } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

/**
 * GET /api/admin/users
 * Lista usuários da empresa com informações de unidades.
 * Apenas SUPER_ADMIN e GESTOR.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const roleFilter = searchParams.get('role')
  const unitFilter = searchParams.get('unitId')
  const enabledFilter = searchParams.get('enabled')

  let query = supabase
    .from('User')
    .select(`
      id, email, firstName, lastName, phone, jobTitle, username,
      role, image, rate, enabled, lastLogin, locationId, activeUnitId,
      createdAt, updatedAt
    `)
    .eq('companyId', session.companyId)
    .order('firstName')

  if (roleFilter) {
    query = query.eq('role', roleFilter)
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
  const userIds = (users || []).map((u: any) => u.id)

  const { data: userUnits } = await supabase
    .from('UserUnit')
    .select('userId, unitId, unit:Location!unitId(id, name)')
    .in('userId', userIds.length > 0 ? userIds : ['__none__'])

  // Mapear unidades por usuário
  const unitsByUser: Record<string, any[]> = {}
  for (const uu of (userUnits || [])) {
    if (!unitsByUser[uu.userId]) unitsByUser[uu.userId] = []
    unitsByUser[uu.userId].push(uu.unit)
  }

  let enriched = (users || []).map((u: any) => ({
    ...u,
    units: unitsByUser[u.id] || [],
  }))

  // Filtrar por unidade se solicitado
  if (unitFilter) {
    enriched = enriched.filter((u: any) =>
      u.units.some((unit: any) => unit.id === unitFilter)
    )
  }

  return NextResponse.json({ data: enriched })
}

/**
 * POST /api/admin/users
 * Cria um novo usuário com role e unidades vinculadas.
 * Apenas SUPER_ADMIN e GESTOR.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const {
    email, password, firstName, lastName, role,
    phone, jobTitle, rate, calendarId, locationId,
    unitIds, // string[] - unidades a vincular
  } = body

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: 'Campos obrigatórios: email, senha, nome e sobrenome' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  // Verificar email duplicado
  const { data: existing } = await supabase
    .from('User')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Este email já está em uso' }, { status: 409 })
  }

  const hashedPassword = await hashPassword(password)
  let username = email.split('@')[0]

  const { data: existingUsername } = await supabase
    .from('User')
    .select('id')
    .eq('username', username)
    .single()

  if (existingUsername) {
    username = email.replace('@', '_at_').replace(/\./g, '_')
  }

  const userId = generateId()
  const now = new Date().toISOString()

  // Definir activeUnitId como a primeira unidade
  const activeUnitId = unitIds && unitIds.length > 0 ? unitIds[0] : null

  const { data: user, error: createError } = await supabase
    .from('User')
    .insert({
      id: userId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      username,
      role: role || 'MECANICO',
      phone: phone || null,
      jobTitle: jobTitle || null,
      rate: rate || 0,
      enabled: true,
      companyId: session.companyId,
      calendarId: calendarId || null,
      locationId: locationId || null,
      activeUnitId,
      createdAt: now,
      updatedAt: now,
    })
    .select('id, email, firstName, lastName, role, enabled')
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
