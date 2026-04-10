import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth'
import { getSession } from '@/lib/session'

/**
 * POST /api/auth/register
 * Registro público DESABILITADO.
 * Apenas SUPER_ADMIN pode criar empresas (via /api/admin/companies).
 * Mantido para uso interno futuro (admin cria empresas com usuário inicial).
 */
export async function POST(request: NextRequest) {
  try {
    // Bloquear registro público - apenas admin autenticado pode registrar
    const session = await getSession()
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Public registration is disabled. Contact your administrator.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, firstName, lastName, companyName } = body

    if (!email || !password || !firstName || !lastName || !companyName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Create company and user
    const hashedPassword = await hashPassword(password)
    const username = email.split('@')[0]

    const now = new Date().toISOString()

    // Create company first
    const { data: company, error: companyError } = await supabase
      .from('Company')
      .insert({
        id: generateId(),
        name: companyName,
        email: email,
        createdAt: now,
        updatedAt: now
      })
      .select()
      .single()

    if (companyError || !company) {
      console.error('Create company error:', companyError)
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    }

    // Create user
    const { data: user, error: userError } = await supabase
      .from('User')
      .insert({
        id: generateId(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username,
        role: 'ADMIN',
        companyId: company.id,
        enabled: true,
        createdAt: now,
        updatedAt: now
      })
      .select()
      .single()

    if (userError || !user) {
      console.error('Create user error:', userError)
      // Rollback: delete company
      await supabase.from('Company').delete().eq('id', company.id)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const result = { company, user }

    return NextResponse.json({
      data: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        companyId: result.company.id
      },
      message: 'Account created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
