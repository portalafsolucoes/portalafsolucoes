import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

/**
 * POST /api/users/[id]/reset-password
 * Gera uma senha temporaria (one-time), grava o hash no usuario e seta
 * mustChangePassword=true para forcar a troca no proximo login.
 *
 * A senha em texto claro e retornada APENAS nesta resposta para que o admin
 * repasse ao usuario por canal seguro; nao e persistida em claro em lugar algum.
 * Apenas SUPER_ADMIN e ADMIN podem executar esta acao (matriz people-teams/DELETE).
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const symbols = '!@#$%&*'
  const pool = chars + lower + '0123456789'
  let pwd = ''
  pwd += chars[Math.floor(Math.random() * chars.length)]
  pwd += lower[Math.floor(Math.random() * lower.length)]
  pwd += '0123456789'[Math.floor(Math.random() * 10)]
  pwd += symbols[Math.floor(Math.random() * symbols.length)]
  for (let i = 0; i < 8; i++) {
    pwd += pool[Math.floor(Math.random() * pool.length)]
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permError = checkApiPermission(session, 'people-teams', 'DELETE')
  if (permError) {
    return NextResponse.json({ error: permError }, { status: 403 })
  }

  const { id } = await params

  if (id === session.id) {
    return NextResponse.json(
      { error: 'Voce nao pode resetar sua propria senha por aqui; use Configuracoes > Seguranca' },
      { status: 400 }
    )
  }

  let query = supabase
    .from('User')
    .select('id, status, companyId, firstName, lastName, email')
    .eq('id', id)

  if (session.companyId) {
    query = query.eq('companyId', session.companyId)
  }

  const { data: user, error: findError } = await query.single()
  if (findError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.status === 'ARCHIVED') {
    return NextResponse.json({ error: 'Usuario anonimizado nao pode ter senha resetada' }, { status: 409 })
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await hash(tempPassword, 12)

  const { error: updateError } = await supabase
    .from('User')
    .update({
      password: passwordHash,
      mustChangePassword: true,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error('Error resetting password:', updateError)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }

  await supabase.from('Notification').insert({
    id: crypto.randomUUID(),
    userId: id,
    title: 'Senha redefinida',
    message: `Sua senha foi redefinida por um administrador. Voce precisara troca-la no proximo login.`,
    href: '/change-password',
  })

  return NextResponse.json({
    data: {
      userId: id,
      tempPassword,
      mustChangePassword: true,
    },
  })
}
