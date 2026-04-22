import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, validateEmail, validatePassword, verifyPassword } from '@/lib/auth'
import { createSession, getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { normalizeUserRole } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user, error } = await supabase
      .from('User')
      .select(`
        id,
        email,
        firstName,
        lastName,
        phone,
        jobTitle,
        username,
        role,
        enabled,
        locationId,
        activeUnitId,
        createdAt,
        company:Company!companyId(id, name, logo),
        location:Location(id, name)
      `)
      .eq('id', session.id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ data: { ...user, unitIds: session.unitIds } })
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = normalizeTextPayload(await request.json())
    const {
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      locationId,
      currentPassword,
      newPassword,
    } = body

    const { data: existingUser, error: findError } = await supabase
      .from('User')
      .select('*')
      .eq('id', session.id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    const wantsProfileUpdate =
      firstName !== undefined ||
      lastName !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      jobTitle !== undefined ||
      locationId !== undefined

    if (wantsProfileUpdate) {
      if (!firstName || !lastName || !email) {
        return NextResponse.json(
          { error: 'Nome, sobrenome e email são obrigatórios.' },
          { status: 400 }
        )
      }

      if (!validateEmail(email)) {
        return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
      }

      if (email !== existingUser.email) {
        const { data: emailInUse } = await supabase
          .from('User')
          .select('id')
          .eq('email', email)
          .neq('id', session.id)
          .maybeSingle()

        if (emailInUse) {
          return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
        }
      }

      if (locationId) {
        const { data: location, error: locationError } = await supabase
          .from('Location')
          .select('id')
          .eq('id', locationId)
          .eq('companyId', session.companyId)
          .maybeSingle()

        if (locationError || !location) {
          return NextResponse.json(
            { error: 'Localização principal inválida para a empresa ativa.' },
            { status: 400 }
          )
        }
      }

      updateData.firstName = firstName.trim()
      updateData.lastName = lastName.trim()
      updateData.email = email.trim().toLowerCase()
      updateData.phone = phone?.trim() || null
      updateData.jobTitle = jobTitle?.trim() || null
      updateData.locationId = locationId || null
    }

    if (newPassword !== undefined || currentPassword !== undefined) {
      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: 'Informe a senha atual e a nova senha.' },
          { status: 400 }
        )
      }

      const validCurrentPassword = await verifyPassword(currentPassword, existingUser.password)
      if (!validCurrentPassword) {
        return NextResponse.json({ error: 'A senha atual está incorreta.' }, { status: 400 })
      }

      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: 'A nova senha deve ter pelo menos 8 caracteres.' },
          { status: 400 }
        )
      }

      updateData.password = await hashPassword(newPassword)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhuma alteração informada.' }, { status: 400 })
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', session.id)
      .eq('companyId', session.companyId)
      .select(`
        id,
        email,
        firstName,
        lastName,
        role,
        companyId,
        activeUnitId
      `)
      .single()

    if (updateError || !updatedUser) {
      console.error('Profile update error:', updateError)

      if (updateError?.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe outro registro com os dados informados.' },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: 'Erro ao atualizar perfil.' }, { status: 500 })
    }

    await createSession({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      canonicalRole: normalizeUserRole({
        role: updatedUser.role,
        email: updatedUser.email,
      }),
      companyId: session.companyId,
      companyName: session.companyName,
      unitId: updatedUser.activeUnitId || session.unitId,
      unitIds: session.unitIds || [],
    })

    return NextResponse.json({
      data: updatedUser,
      message: 'Perfil atualizado com sucesso.',
    })
  } catch (error) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
