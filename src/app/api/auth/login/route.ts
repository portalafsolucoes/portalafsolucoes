import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPassword } from '@/lib/auth'
import { createSession } from '@/lib/session'
import { normalizeUserRole } from '@/lib/user-roles'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Login attempt - Headers:', {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    })

    const body = await request.json()
    const { email, password } = body

    console.log('📧 Login email:', email)

    if (!email || !password) {
      console.log('❌ Missing credentials')
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    console.log('🔍 Searching user in database...')
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*, company:Company(*)')
      .eq('email', email)
      .single()

    if (userError || !user) {
      console.log('❌ User not found:', email, userError)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('✅ User found:', { id: user.id, email: user.email, enabled: user.enabled })

    if (!user.enabled) {
      console.log('❌ User disabled')
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      )
    }

    console.log('🔑 Verifying password...')
    const isPasswordValid = await verifyPassword(password, user.password)

    if (!isPasswordValid) {
      console.log('❌ Invalid password')
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('✅ Password valid')

    // Update last login
    console.log('📝 Updating last login...')
    await supabase
      .from('User')
      .update({ lastLogin: new Date().toISOString() })
      .eq('id', user.id)

    const canonicalRole = normalizeUserRole({
      role: user.role,
      email: user.email,
      username: user.username,
      jobTitle: user.jobTitle,
    })

    // Buscar unidades disponíveis para o usuário
    let unitIds: string[] = []
    if (user.role === 'SUPER_ADMIN') {
      // Admin vê todas as unidades da empresa (Location raiz = sem parentId)
      const { data: units } = await supabase
        .from('Location')
        .select('id')
        .eq('companyId', user.companyId)
        .is('parentId', null)
      unitIds = (units || []).map((u: { id: string }) => u.id)
    } else {
      // Não-admin: apenas unidades vinculadas via UserUnit
      const { data: userUnits } = await supabase
        .from('UserUnit')
        .select('unitId')
        .eq('userId', user.id)
      unitIds = (userUnits || []).map((uu: { unitId: string }) => uu.unitId)
    }

    // Definir unidade ativa: activeUnitId existente, ou primeira disponível
    const activeUnitId = user.activeUnitId && unitIds.includes(user.activeUnitId)
      ? user.activeUnitId
      : unitIds[0] || null

    // Se mudou, persistir a unidade ativa
    if (activeUnitId && activeUnitId !== user.activeUnitId) {
      await supabase
        .from('User')
        .update({ activeUnitId })
        .eq('id', user.id)
    }

    // Create session com dados expandidos
    console.log('🍪 Creating session...')
    await createSession({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      canonicalRole,
      companyId: user.companyId,
      companyName: user.company?.name || '',
      unitId: activeUnitId,
      unitIds,
    })

    console.log('✅ Login successful!')

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: canonicalRole,
        legacyRole: user.role,
        company: user.company,
        unitId: activeUnitId,
        unitIds,
      }
    })
  } catch (error) {
    console.error('💥 Login error:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
