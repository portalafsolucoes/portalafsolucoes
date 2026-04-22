import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { verifyPassword } from '@/lib/auth'
import { getSession } from '@/lib/session'

/**
 * POST /api/auth/change-password
 * Fluxo auto-servico de troca de senha. Usado tanto em Configuracoes > Seguranca
 * quanto no fluxo forcado apos reset manual (mustChangePassword=true).
 * Body: { currentPassword, newPassword, confirmPassword }
 * NAO aplicar normalizeTextPayload neste body (senhas sao preservadas).
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }

  const { currentPassword, newPassword, confirmPassword } = body

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: 'Informe a senha atual, a nova senha e a confirmacao.' },
      { status: 400 }
    )
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'A nova senha e a confirmacao nao coincidem.' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: 'A nova senha deve ser diferente da senha atual.' },
      { status: 400 }
    )
  }

  const { data: user, error: findError } = await supabase
    .from('User')
    .select('id, password, email')
    .eq('id', session.id)
    .single()

  if (findError || !user) {
    return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
  }

  const isValid = await verifyPassword(currentPassword, user.password)
  if (!isValid) {
    return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 })
  }

  if (newPassword === user.email) {
    return NextResponse.json({ error: 'A senha nao pode ser igual ao e-mail.' }, { status: 400 })
  }

  const passwordHash = await hash(newPassword, 12)

  const { error: updateError } = await supabase
    .from('User')
    .update({
      password: passwordHash,
      mustChangePassword: false,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('Error changing password:', updateError)
    return NextResponse.json({ error: 'Falha ao atualizar a senha' }, { status: 500 })
  }

  return NextResponse.json({ data: { success: true } })
}
