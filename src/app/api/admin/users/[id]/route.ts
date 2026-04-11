import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { hashPassword, normalizeEmail, validateEmail, validatePassword } from '@/lib/auth'
import { isAdminRole, toPersistedUserRole } from '@/lib/user-roles'
import { resolveJobTitleSelection } from '@/lib/job-titles'

type UnitSummary = {
  id: string
  name: string
}

type UserUnitRow = {
  unitId: string
  unit: UnitSummary | UnitSummary[] | null
}

type UserUpdateData = Record<string, unknown> & {
  password?: string
  username?: string
}

/**
 * GET /api/admin/users/[id]
 * Detalhes de um usuário com suas unidades.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdminRole(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const { data: user, error } = await supabase
    .from('User')
    .select('*')
    .eq('id', id)
    .eq('companyId', session.companyId)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Buscar unidades vinculadas
  const { data: userUnits } = await supabase
    .from('UserUnit')
    .select('unitId, unit:Location!unitId(id, name)')
    .eq('userId', id)

  const userSafe = { ...user }
  delete userSafe.password

  return NextResponse.json({
    data: {
      ...userSafe,
      units: ((userUnits || []) as UserUnitRow[]).flatMap((uu) => {
        if (!uu.unit) return []
        return Array.isArray(uu.unit) ? uu.unit : [uu.unit]
      }),
      unitIds: ((userUnits || []) as UserUnitRow[]).map((uu) => uu.unitId),
    },
  })
}

/**
 * PUT /api/admin/users/[id]
 * Atualiza usuário e suas unidades.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdminRole(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const {
    email, password, firstName, lastName, role,
    phone, jobTitle, jobTitleId, rate, enabled, calendarId, locationId,
    unitIds, // string[] - novas unidades
  } = body
  const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : undefined

  // Verificar que o usuário existe na empresa
  const { data: existing } = await supabase
    .from('User')
    .select('id, email')
    .eq('id', id)
    .eq('companyId', session.companyId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  if (!firstName || !lastName || !normalizedEmail) {
    return NextResponse.json({ error: 'Campos obrigatórios: email, nome e sobrenome' }, { status: 400 })
  }

  if (!validateEmail(normalizedEmail)) {
    return NextResponse.json({ error: 'Informe um email válido com domínio completo, por exemplo nome@empresa.com' }, { status: 400 })
  }

  if (password) {
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres' }, { status: 400 })
    }

    if (normalizedEmail === password.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Email e senha não podem ser iguais' }, { status: 400 })
    }
  }

  // Verificar email duplicado
  if (normalizedEmail !== existing.email) {
    const { data: emailExists } = await supabase
      .from('User')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (emailExists) {
      return NextResponse.json({ error: 'Email já está em uso' }, { status: 409 })
    }
  }

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

  const updateData: UserUpdateData = {
    updatedAt: new Date().toISOString(),
  }

  if (firstName !== undefined) updateData.firstName = firstName
  if (lastName !== undefined) updateData.lastName = lastName
  if (normalizedEmail !== undefined) updateData.email = normalizedEmail
  if (role !== undefined) updateData.role = toPersistedUserRole(role)
  if (phone !== undefined) updateData.phone = phone || null
  updateData.jobTitle = resolvedJobTitle
  updateData.jobTitleId = resolvedJobTitleId
  if (rate !== undefined) updateData.rate = rate
  if (enabled !== undefined) updateData.enabled = enabled
  if (calendarId !== undefined) updateData.calendarId = calendarId || null
  if (locationId !== undefined) updateData.locationId = locationId || null

  if (password) {
    updateData.password = await hashPassword(password)
  }

  if (normalizedEmail !== existing.email) {
    updateData.username = normalizedEmail.split('@')[0]
  }

  const { error: updateError } = await supabase
    .from('User')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    console.error('Error updating user:', updateError)
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }

  // Atualizar vínculos UserUnit se unitIds fornecidos
  if (unitIds !== undefined) {
    // Remover vínculos antigos
    await supabase.from('UserUnit').delete().eq('userId', id)

    // Criar novos vínculos
    if (unitIds.length > 0) {
      const { generateId } = await import('@/lib/supabase')
      const now = new Date().toISOString()
      const rows = unitIds.map((unitId: string) => ({
        id: generateId(),
        userId: id,
        unitId,
        createdAt: now,
      }))

      await supabase.from('UserUnit').insert(rows)
    }

    // Atualizar activeUnitId se a unidade ativa foi removida
    if (unitIds.length > 0) {
      await supabase
        .from('User')
        .update({ activeUnitId: unitIds[0] })
        .eq('id', id)
        .is('activeUnitId', null)
    }
  }

  return NextResponse.json({ message: 'Usuário atualizado com sucesso' })
}

/**
 * DELETE /api/admin/users/[id]
 * Exclui um usuário.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdminRole(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  if (id === session.id) {
    return NextResponse.json({ error: 'Não é possível excluir sua própria conta' }, { status: 400 })
  }

  const { data: user } = await supabase
    .from('User')
    .select('id')
    .eq('id', id)
    .eq('companyId', session.companyId)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Remover vínculos UserUnit
  await supabase.from('UserUnit').delete().eq('userId', id)

  const { error } = await supabase.from('User').delete().eq('id', id)

  if (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Usuário excluído com sucesso' })
}
