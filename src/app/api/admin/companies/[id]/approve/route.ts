import { NextRequest, NextResponse } from 'next/server'
import { generateId, supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { normalizeUserRole } from '@/lib/user-roles'
import { linkAllCompanyAdminsToUnit } from '@/lib/admin-scope'

/**
 * POST /api/admin/companies/[id]/approve
 *
 * Apenas SUPER_ADMIN (staff Portal AF). Promove a empresa de PENDING_APPROVAL para ACTIVE,
 * registra approvedAt/approvedById, notifica o admin da empresa e enfileira e-mail.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeUserRole(session) !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: company, error } = await supabase
    .from('Company')
    .select('id, name, status, razaoSocial')
    .eq('id', id)
    .maybeSingle()

  if (error || !company) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
  }

  if (company.status !== 'PENDING_APPROVAL') {
    return NextResponse.json(
      { error: `Empresa está com status ${company.status}; aprovação não aplicável.` },
      { status: 409 }
    )
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('Company')
    .update({
      status: 'ACTIVE',
      approvedAt: now,
      approvedById: session.id,
      rejectedAt: null,
      rejectedById: null,
      rejectedReason: null,
      updatedAt: now,
    })
    .eq('id', id)

  if (updateError) {
    console.error('Approve company error:', updateError)
    return NextResponse.json({ error: 'Falha ao aprovar empresa' }, { status: 500 })
  }

  // Garantir invariante de ADMIN: vincular a todas as unidades raiz já existentes
  const { data: rootUnits } = await supabase
    .from('Location')
    .select('id')
    .eq('companyId', id)
    .is('parentId', null)

  for (const unit of rootUnits || []) {
    await linkAllCompanyAdminsToUnit(id, unit.id)
  }

  // Popular CompanyModule com todos os módulos habilitados (a sidebar filtra por esta tabela).
  // Idempotente: só insere módulos que ainda não existem para a empresa.
  const [{ data: allModules }, { data: existingModules }] = await Promise.all([
    supabase.from('Module').select('id'),
    supabase.from('CompanyModule').select('moduleId').eq('companyId', id),
  ])
  const existingModuleIds = new Set(
    (existingModules || []).map((m: { moduleId: string }) => m.moduleId)
  )
  const modulesToInsert = (allModules || [])
    .filter((m: { id: string }) => !existingModuleIds.has(m.id))
    .map((m: { id: string }) => ({
      id: generateId(),
      companyId: id,
      moduleId: m.id,
      enabled: true,
    }))
  if (modulesToInsert.length > 0) {
    const { error: cmError } = await supabase.from('CompanyModule').insert(modulesToInsert)
    if (cmError) {
      console.error('Approve company — CompanyModule insert error:', cmError)
    }
  }

  // Popular CompanyProduct com todos os produtos (o Hub filtra por esta tabela).
  // Idempotente: só insere produtos ainda não presentes. ACTIVE entra enabled=true;
  // COMING_SOON/DISABLED entram enabled=false (aparecem no Hub como indisponíveis).
  const [{ data: allProducts }, { data: existingProducts }] = await Promise.all([
    supabase.from('Product').select('id, status'),
    supabase.from('CompanyProduct').select('productId').eq('companyId', id),
  ])
  const existingProductIds = new Set(
    (existingProducts || []).map((p: { productId: string }) => p.productId)
  )
  const productsToInsert = (allProducts || [])
    .filter((p: { id: string }) => !existingProductIds.has(p.id))
    .map((p: { id: string; status: string }) => ({
      id: generateId(),
      companyId: id,
      productId: p.id,
      enabled: p.status === 'ACTIVE',
      activatedAt: now,
      createdAt: now,
      updatedAt: now,
    }))
  if (productsToInsert.length > 0) {
    const { error: cpError } = await supabase.from('CompanyProduct').insert(productsToInsert)
    if (cpError) {
      console.error('Approve company — CompanyProduct insert error:', cpError)
    }
  }

  // Notificar admin(s) da empresa aprovada
  const { data: admins } = await supabase
    .from('User')
    .select('id, email, firstName')
    .eq('companyId', id)
    .in('role', ['ADMIN', 'GESTOR'])
    .eq('status', 'ACTIVE')

  const notifications = (admins || []).map((a: { id: string }) => ({
    id: generateId(),
    userId: a.id,
    type: 'COMPANY_APPROVED',
    title: 'Cadastro aprovado',
    message: `Sua empresa ${company.razaoSocial ?? company.name} foi aprovada. Acesse o Portal para começar.`,
    href: '/login',
    read: false,
    createdAt: now,
  }))
  if (notifications.length > 0) {
    await supabase.from('Notification').insert(notifications)
  }

  const outboxEntries = (admins || []).map((a: { email: string; firstName: string }) => ({
    id: generateId(),
    to: a.email,
    cc: ['felipe_duru@hotmail.com', 'adw733@gmail.com'],
    subject: 'Cadastro aprovado no Portal AF Soluções',
    body: `Olá ${a.firstName},\n\nSeu cadastro da empresa ${company.razaoSocial ?? company.name} foi aprovado.\nAcesse o Portal para iniciar a operação.`,
    template: 'signup.approved',
    payload: { companyId: id },
    status: 'PENDING',
    attempts: 0,
    scheduledFor: now,
    createdAt: now,
    updatedAt: now,
  }))
  if (outboxEntries.length > 0) {
    await supabase.from('EmailOutbox').insert(outboxEntries)
  }

  return NextResponse.json({ data: { id, status: 'ACTIVE', approvedAt: now } })
}
