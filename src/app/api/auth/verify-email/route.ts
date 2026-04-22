import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/auth/verify-email?token=...
 *
 * Consome o emailVerificationToken gerado em /api/auth/register.
 * Marca User.emailVerifiedAt e Company.emailVerifiedAt. Não altera status da empresa
 * (ainda depende de aprovação do SUPER_ADMIN).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token ausente' }, { status: 400 })
  }

  const { data: user, error } = await supabase
    .from('User')
    .select('id, companyId, emailVerificationExpires, emailVerifiedAt')
    .eq('emailVerificationToken', token)
    .maybeSingle()

  if (error || !user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ data: { alreadyVerified: true } })
  }

  if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
    return NextResponse.json({ error: 'Token expirado. Solicite um novo cadastro.' }, { status: 410 })
  }

  const now = new Date().toISOString()

  await supabase
    .from('User')
    .update({
      emailVerifiedAt: now,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      updatedAt: now,
    })
    .eq('id', user.id)

  if (user.companyId) {
    await supabase
      .from('Company')
      .update({ emailVerifiedAt: now, updatedAt: now })
      .eq('id', user.companyId)
  }

  return NextResponse.json({ data: { verified: true } })
}
