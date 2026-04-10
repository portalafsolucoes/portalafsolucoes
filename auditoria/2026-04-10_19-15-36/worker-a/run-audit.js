const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('@playwright/test')

const baseURL = process.env.BASE_URL || 'http://localhost:3000'
const rootDir = path.resolve(process.cwd(), 'auditoria', '2026-04-10_19-15-36', 'worker-a')
const shotsDir = path.join(rootDir, 'screenshots')
const dataDir = path.join(rootDir, 'data')

fs.mkdirSync(shotsDir, { recursive: true })
fs.mkdirSync(dataDir, { recursive: true })

const companies = [
  {
    name: 'Cimento Vale do Norte SA',
    slug: 'valenorte',
    users: [
      { role: 'SUPER_ADMIN', email: 'super.admin@valenorte.local' },
      { role: 'ADMIN', email: 'admin@valenorte.local' },
      { role: 'TECHNICIAN', email: 'tecnico@valenorte.local' },
      { role: 'LIMITED_TECHNICIAN', email: 'tecnico.limitado@valenorte.local' },
      { role: 'REQUESTER', email: 'solicitante@valenorte.local' },
      { role: 'VIEW_ONLY', email: 'consulta@valenorte.local' },
    ],
  },
  {
    name: 'Polimix Concreto Ltda',
    slug: 'polimix',
    users: [
      { role: 'SUPER_ADMIN', email: 'super.admin@polimix.local' },
      { role: 'ADMIN', email: 'admin@polimix.local' },
      { role: 'TECHNICIAN', email: 'tecnico@polimix.local' },
      { role: 'LIMITED_TECHNICIAN', email: 'tecnico.limitado@polimix.local' },
      { role: 'REQUESTER', email: 'solicitante@polimix.local' },
      { role: 'VIEW_ONLY', email: 'consulta@polimix.local' },
    ],
  },
]

const expectedMenu = {
  SUPER_ADMIN: [
    'Dashboard',
    'Árvore',
    'Pessoas/Equipes',
    'Cadastros Básicos',
    'Ativos',
    'Plano de Manutenção',
    'Planejamento e Programação',
    'Ordens de Serviço (OS)',
    'Solicitações (SS)',
    'Aprovações',
    'RAF',
    'Localizações',
    'KPI - Indicadores',
    'Configurações',
  ],
  ADMIN: [
    'Dashboard',
    'Árvore',
    'Pessoas/Equipes',
    'Cadastros Básicos',
    'Ativos',
    'Plano de Manutenção',
    'Planejamento e Programação',
    'Ordens de Serviço (OS)',
    'Solicitações (SS)',
    'Aprovações',
    'RAF',
    'Localizações',
    'KPI - Indicadores',
  ],
  TECHNICIAN: [
    'Ordens de Serviço (OS)',
    'Solicitações (SS)',
    'Ativos',
  ],
  LIMITED_TECHNICIAN: [
    'Ordens de Serviço (OS)',
    'Solicitações (SS)',
  ],
  REQUESTER: [
    'Dashboard',
    'Solicitações (SS)',
  ],
  VIEW_ONLY: [
    'Dashboard',
    'Ordens de Serviço (OS)',
    'Solicitações (SS)',
    'Ativos',
    'Localizações',
    'Pessoas/Equipes',
    'KPI - Indicadores',
  ],
}

const forbiddenByRole = {
  SUPER_ADMIN: [],
  ADMIN: ['Configurações'],
  TECHNICIAN: ['Dashboard', 'Aprovações', 'RAF', 'Configurações', 'Árvore', 'Cadastros Básicos', 'Plano de Manutenção', 'Planejamento e Programação', 'Localizações', 'Pessoas/Equipes', 'KPI - Indicadores'],
  LIMITED_TECHNICIAN: ['Dashboard', 'Aprovações', 'RAF', 'Configurações', 'Árvore', 'Cadastros Básicos', 'Plano de Manutenção', 'Planejamento e Programação', 'Ativos', 'Localizações', 'Pessoas/Equipes', 'KPI - Indicadores'],
  REQUESTER: ['Árvore', 'Pessoas/Equipes', 'Cadastros Básicos', 'Ativos', 'Plano de Manutenção', 'Planejamento e Programação', 'Ordens de Serviço (OS)', 'Aprovações', 'RAF', 'Localizações', 'KPI - Indicadores', 'Configurações'],
  VIEW_ONLY: ['Árvore', 'Cadastros Básicos', 'Plano de Manutenção', 'Planejamento e Programação', 'Aprovações', 'RAF', 'Configurações'],
}

const routesToCheck = [
  { path: '/cmms', kind: 'redirect' },
  { path: '/dashboard', kind: 'page' },
  { path: '/work-orders', kind: 'page' },
  { path: '/requests', kind: 'page' },
  { path: '/requests/approvals', kind: 'page' },
  { path: '/approvals', kind: 'page' },
  { path: '/profile', kind: 'page' },
  { path: '/settings', kind: 'page' },
  { path: '/admin/portal', kind: 'page' },
  { path: '/admin/users', kind: 'page' },
  { path: '/admin/units', kind: 'page' },
  { path: '/team-dashboard', kind: 'page' },
  { path: '/parts', kind: 'page' },
  { path: '/gep', kind: 'page' },
]

const apiChecks = [
  '/api/auth/me',
  '/api/user/active-unit',
  '/api/requests/pending-count',
  '/api/requests/pending',
  '/api/requests/approved',
  '/api/requests/rejected',
  '/api/requests/my-assignments',
]

function sanitize(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

async function loginViaApi(context, email, password) {
  const response = await context.request.post(`${baseURL}/api/auth/login`, {
    data: { email, password },
  })
  const payload = await response.json()
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(payload)}`)
  }

  const headers = response.headersArray()
  const setCookie = headers.find((h) => h.name.toLowerCase() === 'set-cookie')?.value || ''
  const match = setCookie.match(/session=([^;]+)/)
  if (!match) {
    throw new Error(`Session cookie not found for ${email}`)
  }

  await context.addCookies([
    {
      name: 'session',
      value: match[1],
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])

  return payload.data
}

async function capture(page, fileName) {
  const filePath = path.join(shotsDir, fileName)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

async function collectSidebarText(page) {
  const sidebar = page.locator('aside')
  await sidebar.waitFor({ state: 'visible', timeout: 10000 })
  const text = await sidebar.innerText()
  return text.replace(/\s+/g, ' ').trim()
}

async function testUser(browser, company, user) {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  const result = {
    company: company.name,
    companySlug: company.slug,
    role: user.role,
    email: user.email,
    login: null,
    landing: null,
    routeResults: [],
    menu: { visible: [], missing: [] },
    settings: null,
    profile: null,
    api: [],
    logout: null,
    screenshots: [],
    issues: [],
  }

  page.on('pageerror', (error) => {
    result.issues.push({
      severity: 'high',
      area: 'runtime',
      title: `Unhandled page error for ${company.slug}/${user.role}`,
      details: error.message,
    })
  })

  page.on('console', (message) => {
    if (message.type() === 'error') {
      result.issues.push({
        severity: 'medium',
        area: 'console',
        title: `Console error for ${company.slug}/${user.role}`,
        details: message.text(),
      })
    }
  })

  const loginData = await loginViaApi(context, user.email, 'Teste@123')
  result.login = {
    id: loginData.id,
    canonicalRole: loginData.role,
    legacyRole: loginData.legacyRole,
    companyId: loginData.company?.id || loginData.companyId,
    unitId: loginData.unitId,
    unitIds: loginData.unitIds || [],
  }

  await page.goto('/cmms', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  result.landing = page.url()
  result.screenshots.push(await capture(page, `${sanitize(company.slug)}-${sanitize(user.role)}-cmms.png`))

  const me = await page.evaluate(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    return {
      status: res.status,
      headers: {
        cacheControl: res.headers.get('cache-control'),
        pragma: res.headers.get('pragma'),
      },
      body,
    }
  })
  result.api.push({ endpoint: '/api/auth/me', ...me })

  const activeUnit = await page.evaluate(async () => {
    const res = await fetch('/api/user/active-unit', { credentials: 'same-origin' })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, body }
  })
  result.api.push({ endpoint: '/api/user/active-unit', ...activeUnit })

  for (const endpoint of apiChecks.slice(2)) {
    const apiResult = await page.evaluate(async (url) => {
      const res = await fetch(url, { credentials: 'same-origin' })
      const body = await res.json().catch(() => ({}))
      return { status: res.status, body }
    }, endpoint)
    result.api.push({ endpoint, ...apiResult })
  }

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  result.routeResults.push({ path: '/dashboard', finalUrl: page.url() })
  result.screenshots.push(await capture(page, `${sanitize(company.slug)}-${sanitize(user.role)}-dashboard.png`))

  await page.goto('/settings', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  const settingsText = await page.locator('body').innerText()
  const settingsOk =
    settingsText.includes('Perfil') &&
    settingsText.includes('Segurança') &&
    !settingsText.includes('Preferências') &&
    !settingsText.includes('Empresa')
  result.settings = { finalUrl: page.url(), ok: settingsOk, text: settingsText.slice(0, 1000) }
  result.screenshots.push(await capture(page, `${sanitize(company.slug)}-${sanitize(user.role)}-settings.png`))
  if (!settingsOk) {
    result.issues.push({
      severity: 'medium',
      area: 'settings',
      title: `Settings tabs mismatch for ${company.slug}/${user.role}`,
      details: 'Tabs should contain only Perfil and Segurança',
    })
  }

  await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  const profileText = await page.locator('body').innerText()
  const profileOk = profileText.includes(company.name)
  result.profile = { finalUrl: page.url(), ok: profileOk }
  result.screenshots.push(await capture(page, `${sanitize(company.slug)}-${sanitize(user.role)}-profile.png`))
  if (!profileOk) {
    result.issues.push({
      severity: 'medium',
      area: 'profile',
      title: `Profile page missing company name for ${company.slug}/${user.role}`,
      details: `Expected ${company.name} in profile page`,
    })
  }

  const sidebarText = await collectSidebarText(page)
  const visible = expectedMenu[user.role].filter((item) => sidebarText.includes(item))
  const missing = expectedMenu[user.role].filter((item) => !sidebarText.includes(item))
  const forbiddenVisible = forbiddenByRole[user.role].filter((item) => sidebarText.includes(item))
  result.menu = { visible, missing, forbiddenVisible }
  if (missing.length || forbiddenVisible.length) {
    result.issues.push({
      severity: missing.length ? 'high' : 'medium',
      area: 'sidebar',
      title: `Sidebar mismatch for ${company.slug}/${user.role}`,
      details: `Missing: ${missing.join(', ') || 'none'} | Forbidden visible: ${forbiddenVisible.join(', ') || 'none'}`,
    })
  }

  for (const route of routesToCheck) {
    let routeError = null
    try {
      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
    } catch (error) {
      routeError = error.message
    }

    result.routeResults.push({ path: route.path, finalUrl: page.url(), error: routeError })

    if (route.path === '/requests/approvals' || route.path === '/approvals' || route.path === '/admin/portal' || route.path === '/admin/users' || route.path === '/admin/units' || route.path === '/parts' || route.path === '/gep' || route.path === '/team-dashboard') {
      try {
        await capture(page, `${sanitize(company.slug)}-${sanitize(user.role)}-${sanitize(route.path)}.png`)
      } catch (captureError) {
        result.issues.push({
          severity: 'low',
          area: 'screenshot',
          title: `Screenshot failed for ${company.slug}/${user.role} on ${route.path}`,
          details: captureError.message,
        })
      }
    }
  }

  await page.goto('/hub', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  const hubText = await page.locator('body').innerText()
  result.routeResults.push({ path: '/hub', finalUrl: page.url() })
  result.screenshots.push(await capture(page, `${sanitize(company.slug)}-${sanitize(user.role)}-hub.png`))

  const logoutApi = await page.evaluate(async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, body }
  })

  await page.goto('/hub', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  const hubAnonymousText = await page.locator('body').innerText()
  const loginVisible = await page.getByRole('button', { name: /entrar/i }).first().isVisible().catch(() => false)
  result.logout = { finalUrl: page.url(), logoutApi, loginVisible, hubText: hubAnonymousText.slice(0, 400) }
  if (!loginVisible) {
    result.issues.push({
      severity: 'medium',
      area: 'logout',
      title: `Hub did not return to anonymous state for ${company.slug}/${user.role}`,
      details: 'Login button was not visible after /api/auth/logout',
    })
  }

  await context.close()
  return result
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const companyResults = await Promise.all(
    companies.map(async (company) => {
      const results = []
      for (const user of company.users) {
        results.push(await testUser(browser, company, user))
      }
      return results
    })
  )

  await browser.close()

  const flatResults = companyResults.flat()
  const issues = flatResults.flatMap((item) => item.issues)

  const summaryLines = []
  summaryLines.push('# Resultado da Auditoria E2E - Worker A')
  summaryLines.push('')
  summaryLines.push(`- Base URL: \`${baseURL}\``)
  summaryLines.push(`- Executado em: ${new Date().toISOString()}`)
  summaryLines.push(`- Contextos testados: ${flatResults.length}`)
  summaryLines.push(`- Issues encontradas: ${issues.length}`)
  summaryLines.push('')
  summaryLines.push('## Casos Executados')
  for (const item of flatResults) {
    summaryLines.push(`- ${item.company} / ${item.role}: login role=${item.login.canonicalRole}, legacyRole=${item.login.legacyRole}, landing=${item.landing}`)
    summaryLines.push(`  - /settings ok: ${item.settings?.ok ? 'sim' : 'nao'}`)
    summaryLines.push(`  - /profile ok: ${item.profile?.ok ? 'sim' : 'nao'}`)
    summaryLines.push(`  - Menu visivel: ${item.menu.visible.join(', ')}`)
    if (item.menu.missing.length) summaryLines.push(`  - Menu faltante: ${item.menu.missing.join(', ')}`)
    if (item.menu.forbiddenVisible?.length) summaryLines.push(`  - Menu indevido visivel: ${item.menu.forbiddenVisible.join(', ')}`)
  }
  summaryLines.push('')
  summaryLines.push('## Falhas')
  if (issues.length === 0) {
    summaryLines.push('- Nenhuma falha crítica encontrada nos fluxos cobertos.')
  } else {
    for (const issue of issues) {
      summaryLines.push(`- [${issue.severity}] ${issue.area}: ${issue.title} - ${issue.details}`)
    }
  }
  summaryLines.push('')
  summaryLines.push('## Screenshots')
  for (const item of flatResults) {
    for (const shot of item.screenshots) {
      summaryLines.push(`- ${path.relative(rootDir, shot)}`)
    }
  }
  summaryLines.push('')
  summaryLines.push('## Observações')
  summaryLines.push('- O backend ainda normaliza perfis legados como `GESTOR` para `ADMIN` no login, mas o `/api/auth/me` expõe o papel canônico.')
  summaryLines.push('- O fluxo de logout no hub retorna ao estado anônimo sem redirecionar automaticamente para /login.')

  fs.writeFileSync(path.join(rootDir, 'RESULTADO.md'), summaryLines.join('\n'), 'utf8')
  fs.writeFileSync(path.join(dataDir, 'results.json'), JSON.stringify({ flatResults, issues }, null, 2), 'utf8')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
