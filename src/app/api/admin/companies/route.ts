import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase, generateId } from '@/lib/supabase'
import { hash } from 'bcryptjs'
import { toPersistedUserRole } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'

/**
 * GET /api/admin/companies
 * Lista todas as empresas do portal.
 * Apenas SUPER_ADMIN pode acessar.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: companies, error } = await supabase
    .from('Company')
    .select(`
      id,
      name,
      email,
      phone,
      website,
      logo,
      createdAt,
      status,
      cnpj,
      razaoSocial,
      nomeFantasia,
      cidade,
      uf,
      approvedAt,
      rejectedAt,
      rejectedReason,
      signupPayload
    `)
    .order('createdAt', { ascending: false })

  if (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }

  // Para cada empresa, buscar contagem de usuários e módulos habilitados
  const enriched = await Promise.all(
    (companies || []).map(async (company: { id: string }) => {
      const [usersResult, modulesResult] = await Promise.all([
        supabase
          .from('User')
          .select('id', { count: 'exact', head: true })
          .eq('companyId', company.id),
        supabase
          .from('CompanyModule')
          .select('id', { count: 'exact', head: true })
          .eq('companyId', company.id)
          .eq('enabled', true),
      ])

      return {
        ...company,
        userCount: usersResult.count || 0,
        moduleCount: modulesResult.count || 0,
      }
    })
  )

  return NextResponse.json(enriched)
}

/**
 * POST /api/admin/companies
 * Cria uma nova empresa com um ADMIN inicial.
 * Apenas SUPER_ADMIN (staff Portal AF) pode criar empresas.
 *
 * Invariantes:
 * - O usuário criado é ADMIN da empresa cliente (NUNCA SUPER_ADMIN, que é staff Portal AF).
 * - O ADMIN é vinculado automaticamente à unidade principal recém-criada via UserUnit.
 *   Quando novas unidades forem criadas para esta empresa, devem auto-vincular todos os ADMINs
 *   (ver helper ensureAdminUnitAccess em src/lib/admin-scope.ts).
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = normalizeTextPayload(await request.json())
  const {
    companyName,
    companyEmail,
    companyPhone,
    adminEmail,
    adminFirstName,
    adminLastName,
    adminPassword,
    enabledModuleSlugs,
  } = body

  // Validações
  if (!companyName || !adminEmail || !adminFirstName || !adminLastName || !adminPassword) {
    return NextResponse.json(
      { error: 'companyName, adminEmail, adminFirstName, adminLastName and adminPassword are required' },
      { status: 400 }
    )
  }

  if (adminPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Verificar se email do admin já existe
  const { data: existingUser } = await supabase
    .from('User')
    .select('id')
    .eq('email', adminEmail)
    .single()

  if (existingUser) {
    return NextResponse.json({ error: 'Admin email already exists' }, { status: 409 })
  }

  // Criar empresa
  const companyId = generateId()
  const { error: companyError } = await supabase.from('Company').insert({
    id: companyId,
    name: companyName,
    email: companyEmail || null,
    phone: companyPhone || null,
  })

  if (companyError) {
    console.error('Error creating company:', companyError)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }

  // Criar localização principal
  const locationId = generateId()
  const { error: locationError } = await supabase.from('Location').insert({
    id: locationId,
    name: `Unidade Principal ${companyName}`,
    companyId,
  })

  if (locationError) {
    console.error('Error creating location:', locationError)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }

  // Criar admin da empresa
  const passwordHash = await hash(adminPassword, 12)
  const adminId = generateId()
  const adminUsername = adminEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '.')

  // Persistido como GESTOR (mapping legado de ADMIN canônico) — ver toPersistedUserRole.
  const persistedRole = toPersistedUserRole('ADMIN')
  const { error: userError } = await supabase.from('User').insert({
    id: adminId,
    email: adminEmail,
    password: passwordHash,
    firstName: adminFirstName,
    lastName: adminLastName,
    username: adminUsername,
    role: persistedRole,
    enabled: true,
    companyId,
    locationId,
    activeUnitId: locationId,
  })

  if (userError) {
    console.error('Error creating admin user:', userError)
    return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 })
  }

  // Vincular ADMIN à unidade principal (invariante: ADMIN tem UserUnit para todas as Units da empresa).
  await supabase.from('UserUnit').insert({
    id: generateId(),
    userId: adminId,
    unitId: locationId,
  })

  // Habilitar módulos selecionados (ou todos se não especificado)
  const { data: allModules } = await supabase.from('Module').select('id, slug')
  const modulesToEnable = enabledModuleSlugs
    ? (allModules || []).filter((m: { id: string; slug: string }) => enabledModuleSlugs.includes(m.slug))
    : allModules || []

  for (const mod of modulesToEnable) {
    await supabase.from('CompanyModule').insert({
      id: generateId(),
      companyId,
      moduleId: mod.id,
      enabled: true,
    })
  }

  return NextResponse.json(
    {
      company: { id: companyId, name: companyName },
      admin: { id: adminId, email: adminEmail, role: 'ADMIN' as const },
      location: { id: locationId },
      modulesEnabled: modulesToEnable.length,
    },
    { status: 201 }
  )
}
