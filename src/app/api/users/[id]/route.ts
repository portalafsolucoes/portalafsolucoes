import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { hashPassword } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15+ requires awaiting params
    const { id } = await params
    console.log('API GET /api/users/[id] - Received ID:', id)
    console.log('API GET /api/users/[id] - Company ID:', session.companyId)

    // Buscar usuário de forma simples primeiro
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !user) {
      console.log('API GET /api/users/[id] - User not found')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validação de empresa
    if (user.companyId !== session.companyId) {
      console.log('API GET /api/users/[id] - Different company')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('API GET /api/users/[id] - Found user:', user.firstName, user.lastName)

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
    const { password, ...userSafe } = user
    const userData = {
      ...userSafe,
      location,
      teamMemberships: teamMemberships || []
    }

    console.log('API GET /api/users/[id] - Returning complete data')
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

    const { id } = await params
    const body = await request.json()
    const { email, password, firstName, lastName, role, phone, jobTitle, rate, enabled, locationId } = body

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

    // Verificar se o email já está em uso por outro usuário
    if (email && email !== existingUser.email) {
      const { data: emailExists } = await supabase
        .from('User')
        .select('id')
        .eq('email', email)
        .single()

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        )
      }
    }

    const updateData: any = {
      firstName,
      lastName,
      email,
      role,
      phone,
      jobTitle,
      rate,
      enabled,
      locationId
    }

    // Se uma nova senha foi fornecida, fazer hash
    if (password) {
      updateData.password = await hashPassword(password)
    }

    // Atualizar username se o email mudou
    if (email && email !== existingUser.email) {
      updateData.username = email.split('@')[0]
    }

    const { data: user, error: updateError } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', id)
      .select('id, email, firstName, lastName, phone, jobTitle, username, role, rate, enabled, locationId, updatedAt')
      .single()

    if (updateError) throw updateError

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

    const { id } = await params

    // Verificar se o usuário existe e pertence à empresa
    const { data: user, error: findError } = await supabase
      .from('User')
      .select('id, companyId')
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

    const { error: deleteError } = await supabase
      .from('User')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

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
