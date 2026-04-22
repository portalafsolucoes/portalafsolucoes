import { NextRequest, NextResponse } from 'next/server'
import { generateId, supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { normalizeUserRole } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'

/**
 * POST /api/admin/companies/[id]/reject
 *
 * Apenas SUPER_ADMIN. Move empresa PENDING_APPROVAL → REJECTED, registra motivo obrigatório,
 * copia PII para RejectedCompanyLog (auditoria permanente) e anonimiza o usuário admin
 * (soft-delete). O índice parcial único em Company.cnpj WHERE status != 'REJECTED' libera
 * o CNPJ/e-mail para nova tentativa.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeUserRole(session) !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = normalizeTextPayload(await request.json().catch(() => ({}))) as { reason?: string }
  const reason = body.reason?.toString().trim()

  if (!reason) {
    return NextResponse.json({ error: 'Motivo da rejeição é obrigatório' }, { status: 400 })
  }

  const { data: company, error } = await supabase
    .from('Company')
    .select('id, name, status, cnpj, razaoSocial, signupPayload')
    .eq('id', id)
    .maybeSingle()

  if (error || !company) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
  }

  if (company.status !== 'PENDING_APPROVAL') {
    return NextResponse.json(
      { error: `Empresa está com status ${company.status}; rejeição não aplicável.` },
      { status: 409 }
    )
  }

  const now = new Date().toISOString()

  // Coletar admin original para log + notificação
  const { data: adminUser } = await supabase
    .from('User')
    .select('id, email, firstName, lastName, phone')
    .eq('companyId', id)
    .in('role', ['ADMIN', 'GESTOR'])
    .order('createdAt', { ascending: true })
    .limit(1)
    .maybeSingle()

  // 1. Persistir log de auditoria
  await supabase.from('RejectedCompanyLog').insert({
    id: generateId(),
    cnpj: company.cnpj,
    razaoSocial: company.razaoSocial ?? company.name,
    originalEmail: adminUser?.email ?? null,
    originalFirstName: adminUser?.firstName ?? null,
    originalLastName: adminUser?.lastName ?? null,
    originalPhone: adminUser?.phone ?? null,
    rejectedReason: reason,
    rejectedById: session.id,
    originalPayload: company.signupPayload ?? null,
    createdAt: now,
  })

  // 2. Marcar empresa como REJECTED
  await supabase
    .from('Company')
    .update({
      status: 'REJECTED',
      rejectedAt: now,
      rejectedById: session.id,
      rejectedReason: reason,
      updatedAt: now,
    })
    .eq('id', id)

  // 3. Anonimizar usuário admin (libera e-mail para reuso)
  if (adminUser) {
    const shortId = adminUser.id.slice(-6)
    await supabase
      .from('User')
      .update({
        firstName: 'Usuario',
        lastName: `Rejeitado #${shortId}`,
        email: `${adminUser.id}@rejected.local`,
        username: `rejected-${shortId}`,
        phone: null,
        image: null,
        password: '',
        enabled: false,
        status: 'REJECTED_USER',
        updatedAt: now,
      })
      .eq('id', adminUser.id)

    // 4. E-mail orientando novo cadastro
    await supabase.from('EmailOutbox').insert({
      id: generateId(),
      to: adminUser.email,
      cc: ['felipe_duru@hotmail.com', 'adw733@gmail.com'],
      subject: 'Cadastro não aprovado no Portal AF Soluções',
      body: `Olá ${adminUser.firstName},\n\nInfelizmente seu cadastro da empresa ${company.razaoSocial ?? company.name} não foi aprovado.\n\nMotivo: ${reason}\n\nSe desejar, você pode realizar um novo cadastro corrigindo os pontos indicados.`,
      template: 'signup.rejected',
      payload: { companyId: id, reason },
      status: 'PENDING',
      attempts: 0,
      scheduledFor: now,
      createdAt: now,
      updatedAt: now,
    })
  }

  return NextResponse.json({ data: { id, status: 'REJECTED', rejectedAt: now, reason } })
}
