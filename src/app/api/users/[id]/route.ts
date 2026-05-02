import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { hashPassword, normalizeEmail, validateEmail, validatePassword } from '@/lib/auth'
import { checkApiPermission } from '@/lib/permissions'
import { resolveJobTitleSelection } from '@/lib/job-titles'
import { normalizeUserRole, toPersistedUserRole } from '@/lib/user-roles'
import { ensureAdminUnitAccess } from '@/lib/admin-scope'
import { countUserReferences } from '@/lib/users/userReferences'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { recordAudit } from '@/lib/audit/recordAudit'
import { isSyntheticEmail } from '@/lib/users/syntheticEmail'

type UserUpdateData = Record<string, unknown> & {
  password?: string
  username?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'people-teams', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    // Next.js 15+ requires awaiting params
    const { id } = await params

    // Buscar usuário de forma simples primeiro
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validação de empresa
    if (user.companyId !== session.companyId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Buscar relacionamentos separadamente para evitar erro 500
    let location = null
    if (user.locationId) {
      const { data: loc } = await supabase
        .from('Location')
        .select('*')
        .eq('id', user.locationId)
        .single()
      location = loc
    }

    const { data: teamMemberships, error: tmError } = await supabase
      .from('TeamMember')
      .select('*, team:Team!teamId(*)')
      .eq('userId', user.id)

    if (tmError) throw tmError

    // Montar resposta completa
    const userSafe = { ...user }
    delete userSafe.password
    const userData = {
      ...userSafe,
      location,
      teamMemberships: teamMemberships || []
    }

    return NextResponse.json({ data: userData })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'people-teams', 'PUT')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params
    const body = normalizeTextPayload(await request.json())
    let { email } = body
    const { password, firstName, lastName, role, phone, jobTitle, jobTitleId, rate, enabled, locationId, calendarId, unitIds } = body

    // Apenas staff Portal AF pode atribuir SUPER_ADMIN. ADMIN da empresa cliente nunca pode promover ninguém a SUPER_ADMIN.
    const requestedCanonical = normalizeUserRole(role)
    const sessionCanonical = normalizeUserRole(session)
    if (requestedCanonical === 'SUPER_ADMIN' && sessionCanonical !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Apenas staff Portal AF pode atribuir SUPER_ADMIN' }, { status: 403 })
    }

    // Verificar se o usuário existe e pertence à empresa
    const { data: existingUser, error: findError } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Promocao de MANUTENTOR sintetico: ao mudar o papel para algo diferente de MANUTENTOR,
    // exigir email e senha reais no payload (o email sintetico @noemail.local nao serve para login).
    const wasSyntheticEmail = isSyntheticEmail(existingUser.email)
    const willBeManutentor = requestedCanonical === 'MANUTENTOR'
    if (wasSyntheticEmail && !willBeManutentor) {
      if (!email || isSyntheticEmail(email)) {
        return NextResponse.json(
          { error: 'Promover este usuario exige definir um email real' },
          { status: 400 }
        )
      }
      if (!password) {
        return NextResponse.json(
          { error: 'Promover este usuario exige definir uma senha' },
          { status: 400 }
        )
      }
    }

    // MANUTENTOR sintetico mantendo o papel: aceitar email vazio no payload e preservar o existente.
    if (willBeManutentor && wasSyntheticEmail && !email) {
      email = existingUser.email
    }

    const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : undefined

    // PLANEJADOR so pode editar usuarios PLANEJADOR ou MANUTENTOR e manter o papel dentro desse mesmo conjunto
    if (sessionCanonical === 'PLANEJADOR') {
      const existingCanonical = normalizeUserRole(existingUser.role)
      if (existingCanonical !== 'PLANEJADOR' && existingCanonical !== 'MANUTENTOR') {
        return NextResponse.json({ error: 'Planejador nao pode editar Administradores' }, { status: 403 })
      }
      if (requestedCanonical !== 'PLANEJADOR' && requestedCanonical !== 'MANUTENTOR') {
        return NextResponse.json({ error: 'Planejador so pode atribuir papel Planejador ou Manutentor' }, { status: 403 })
      }
    }

    if (!firstName || !lastName || !normalizedEmail) {
      return NextResponse.json(
        { error: 'Nome, sobrenome e email são obrigatórios' },
        { status: 400 }
      )
    }

    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Informe um email válido com domínio completo, por exemplo nome@empresa.com' },
        { status: 400 }
      )
    }

    if (password) {
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
    }

    // Verificar se o email já está em uso por outro usuário
    if (normalizedEmail !== existingUser.email) {
      const { data: emailExists } = await supabase
        .from('User')
        .select('id')
        .eq('email', normalizedEmail)
        .single()

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        )
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
        return NextResponse.json(
          { error: 'Cargo inválido para a empresa ativa' },
          { status: 400 }
        )
      }
      throw error
    }

    const updateData: UserUpdateData = {
      firstName,
      lastName,
      email: normalizedEmail,
      role: toPersistedUserRole(role),
      phone: phone || null,
      jobTitle: resolvedJobTitle,
      jobTitleId: resolvedJobTitleId,
      rate,
      enabled,
      locationId: locationId !== undefined ? (locationId || null) : undefined,
      calendarId: calendarId !== undefined ? (calendarId || null) : undefined
    }

    // Se uma nova senha foi fornecida, fazer hash
    if (password) {
      updateData.password = await hashPassword(password)
    }

    // Atualizar username se o email mudou
    if (normalizedEmail !== existingUser.email) {
      updateData.username = normalizedEmail.split('@')[0]
    }

    const { data: user, error: updateError } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', id)
      .select('id, email, firstName, lastName, phone, jobTitle, jobTitleId, username, role, rate, enabled, locationId, updatedAt')
      .single()

    if (updateError) throw updateError

    // Atualizar vínculos UserUnit se unitIds fornecidos
    if (Array.isArray(unitIds)) {
      await supabase.from('UserUnit').delete().eq('userId', id)

      if (unitIds.length > 0) {
        const now = new Date().toISOString()
        const rows = unitIds.map((unitId: string) => ({
          id: generateId(),
          userId: id,
          unitId,
          createdAt: now,
        }))
        await supabase.from('UserUnit').insert(rows)
      }

      // Atualizar activeUnitId se necessário
      if (unitIds.length > 0) {
        const { data: currentUser } = await supabase
          .from('User')
          .select('activeUnitId')
          .eq('id', id)
          .single()

        if (currentUser && (!currentUser.activeUnitId || !unitIds.includes(currentUser.activeUnitId))) {
          await supabase
            .from('User')
            .update({ activeUnitId: unitIds[0] })
            .eq('id', id)
        }
      }
    }

    // Invariante: ADMIN tem acesso a todas as unidades raiz da empresa.
    if (requestedCanonical === 'ADMIN') {
      await ensureAdminUnitAccess(session.companyId, id)
    }

    await recordAudit({
      session,
      entity: 'User',
      entityId: id,
      entityLabel: `${existingUser.firstName ?? ''} ${existingUser.lastName ?? ''}`.trim() || existingUser.email || null,
      action: 'UPDATE',
      before: existingUser as Record<string, unknown>,
      after: user as Record<string, unknown>,
      companyId: existingUser.companyId ?? session.companyId,
      unitId: existingUser.activeUnitId ?? null,
    })

    return NextResponse.json(
      { data: user, message: 'User updated successfully' }
    )
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'people-teams', 'DELETE')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params

    // Verificar se o usuário existe e pertence à empresa (capturando estado completo para auditoria)
    const { data: user, error: findError } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Não permitir que o usuário delete a si mesmo
    if (user.id === session.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Hard delete so e permitido se nao houver historico operacional
    const refs = await countUserReferences(id)
    if (refs.hasHistory) {
      return NextResponse.json(
        {
          error: 'Usuario possui historico operacional e nao pode ser excluido. Use Desativar ou Anonimizar.',
          references: refs.counts,
          total: refs.total,
        },
        { status: 409 }
      )
    }

    const { error: deleteError } = await supabase
      .from('User')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    await recordAudit({
      session,
      entity: 'User',
      entityId: id,
      entityLabel: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || null,
      action: 'DELETE',
      before: user as Record<string, unknown>,
      companyId: user.companyId ?? session.companyId,
      unitId: user.activeUnitId ?? null,
    })

    return NextResponse.json({
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
