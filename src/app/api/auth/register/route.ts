import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase, generateId } from '@/lib/supabase'
import { hashPassword, validateEmail, validatePassword, normalizeEmail } from '@/lib/auth'
import { normalizeTextPayload } from '@/lib/textNormalizer'

/**
 * POST /api/auth/register
 *
 * Registro público de empresa. Cria:
 *   - Company com status = PENDING_APPROVAL, CNPJ/endereço, payload original em signupPayload
 *   - User como ADMIN (persistido como GESTOR) com emailVerificationToken
 *   - EmailOutbox entries (verificação para o admin, notificação para SUPER_ADMINs)
 *   - Notification in-app para todos os SUPER_ADMIN
 *
 * Fluxo posterior:
 *   1. Usuário confirma e-mail via GET /api/auth/verify-email?token=...
 *   2. SUPER_ADMIN aprova via POST /api/admin/companies/[id]/approve
 *   3. Usuário passa a conseguir fazer login
 */
export async function POST(request: NextRequest) {
  try {
    const raw = await request.json()
    // Preservamos o payload bruto para auditoria antes da normalização.
    const rawPayload = { ...raw }
    const body = normalizeTextPayload(raw)

    const {
      // Dados da empresa
      cnpj,
      razaoSocial,
      nomeFantasia,
      companyEmail,
      companyPhone,
      // Endereço
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      // Admin inicial
      firstName,
      lastName,
      email,
      password,
      phone,
      // Módulos escolhidos
      products,
    } = body as Record<string, string | string[] | undefined>

    // Campos obrigatórios mínimos
    const required = { cnpj, razaoSocial, firstName, lastName, email, password }
    const missing = Object.entries(required)
      .filter(([, v]) => !v || (typeof v === 'string' && v.trim() === ''))
      .map(([k]) => k)

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Campos obrigatórios ausentes: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const emailNorm = normalizeEmail(String(email))
    if (!validateEmail(emailNorm)) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    }

    const passwordValidation = validatePassword(String(password))
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.message }, { status: 400 })
    }

    const cnpjDigits = String(cnpj).replace(/\D/g, '')
    if (cnpjDigits.length !== 14) {
      return NextResponse.json({ error: 'CNPJ deve conter 14 dígitos' }, { status: 400 })
    }

    // Checagens de duplicidade (ignorando registros REJECTED — índice parcial)
    const { data: existingCompany } = await supabase
      .from('Company')
      .select('id, status')
      .eq('cnpj', cnpjDigits)
      .neq('status', 'REJECTED')
      .maybeSingle()

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Já existe uma empresa ativa com este CNPJ.' },
        { status: 409 }
      )
    }

    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('email', emailNorm)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este e-mail.' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const companyId = generateId()
    const userId = generateId()
    const hashedPassword = await hashPassword(String(password))
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // 1. Criar empresa em PENDING_APPROVAL
    const { data: company, error: companyError } = await supabase
      .from('Company')
      .insert({
        id: companyId,
        name: razaoSocial, // name continua sendo a razaoSocial para compat
        cnpj: cnpjDigits,
        razaoSocial,
        nomeFantasia: nomeFantasia ?? null,
        email: companyEmail ?? emailNorm,
        phone: companyPhone ?? null,
        cep: cep ?? null,
        logradouro: logradouro ?? null,
        numero: numero ?? null,
        complemento: complemento ?? null,
        bairro: bairro ?? null,
        cidade: cidade ?? null,
        uf: uf ?? null,
        status: 'PENDING_APPROVAL',
        signupPayload: rawPayload,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (companyError || !company) {
      console.error('Create company (signup) error:', companyError)
      return NextResponse.json({ error: 'Falha ao criar empresa' }, { status: 500 })
    }

    // 2. Criar admin inicial (persistido como GESTOR = role canônico ADMIN)
    const username = emailNorm.split('@')[0]
    const { data: user, error: userError } = await supabase
      .from('User')
      .insert({
        id: userId,
        email: emailNorm,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone ?? null,
        username,
        role: 'GESTOR',
        companyId,
        enabled: true,
        status: 'ACTIVE',
        mustChangePassword: false,
        emailVerificationToken,
        emailVerificationExpires,
        emailVerifiedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (userError || !user) {
      console.error('Create user (signup) error:', userError)
      await supabase.from('Company').delete().eq('id', companyId)
      return NextResponse.json({ error: 'Falha ao criar usuário administrador' }, { status: 500 })
    }

    // 3. Módulos escolhidos pelo usuário (quando informados)
    if (Array.isArray(products) && products.length > 0) {
      const productRows = products.map((p) => ({
        id: generateId(),
        companyId,
        product: String(p).toUpperCase(),
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      }))
      await supabase.from('CompanyProduct').insert(productRows)
    }

    // 4. EmailOutbox: verificação de e-mail para o admin
    const verifyUrl = `${request.nextUrl.origin}/register/verify?token=${emailVerificationToken}`
    await supabase.from('EmailOutbox').insert({
      id: generateId(),
      to: emailNorm,
      cc: ['felipe_duru@hotmail.com', 'adw733@gmail.com'],
      subject: `Confirme seu cadastro — ${razaoSocial}`,
      body: `Olá ${firstName},\n\nConfirme seu e-mail acessando: ${verifyUrl}\n\nO link expira em 24 horas.`,
      template: 'signup.verify-email',
      payload: { companyId, userId, verifyUrl },
      status: 'PENDING',
      attempts: 0,
      scheduledFor: now,
      createdAt: now,
      updatedAt: now,
    })

    // 5. Notificar SUPER_ADMINs (in-app + outbox)
    const { data: superAdmins } = await supabase
      .from('User')
      .select('id, email')
      .eq('role', 'SUPER_ADMIN')
      .is('companyId', null)
      .eq('status', 'ACTIVE')

    if (superAdmins && superAdmins.length > 0) {
      const notifications = superAdmins.map((sa: { id: string }) => ({
        id: generateId(),
        userId: sa.id,
        type: 'COMPANY_SIGNUP',
        title: 'Nova empresa aguardando aprovação',
        message: `${razaoSocial} (CNPJ ${cnpjDigits}) solicitou cadastro no Portal.`,
        href: `/admin/portal?company=${companyId}`,
        read: false,
        createdAt: now,
      }))
      await supabase.from('Notification').insert(notifications)

      const outboxEntries = superAdmins.map((sa: { email: string }) => ({
        id: generateId(),
        to: sa.email,
        cc: ['felipe_duru@hotmail.com', 'adw733@gmail.com'],
        subject: `Novo cadastro: ${razaoSocial}`,
        body: `Nova empresa aguardando aprovação.\n\nRazão social: ${razaoSocial}\nCNPJ: ${cnpjDigits}\nAdmin: ${firstName} ${lastName} <${emailNorm}>\n\nAprovar: ${request.nextUrl.origin}/admin/portal?company=${companyId}`,
        template: 'signup.new-company-for-superadmin',
        payload: { companyId, razaoSocial, cnpj: cnpjDigits },
        status: 'PENDING',
        attempts: 0,
        scheduledFor: now,
        createdAt: now,
        updatedAt: now,
      }))
      await supabase.from('EmailOutbox').insert(outboxEntries)
    }

    return NextResponse.json(
      {
        data: {
          companyId: company.id,
          userId: user.id,
          status: 'PENDING_APPROVAL',
        },
        message: 'Cadastro recebido. Verifique seu e-mail e aguarde a aprovação do Portal.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
