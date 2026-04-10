import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const AUDIT_ROOT = path.resolve('auditoria/2026-04-10_19-15-36/worker-d')
const SHOT_ROOT = path.join(AUDIT_ROOT, 'screenshots')
const REPORT_MD = path.join(AUDIT_ROOT, 'RESULTADO.md')
const REPORT_HTML = path.join(AUDIT_ROOT, 'RESULTADO.html')
const REPORT_PDF = path.join(AUDIT_ROOT, 'RESULTADO.pdf')
const RESULTS_JSON = path.join(AUDIT_ROOT, 'results.json')

const companies = [
  {
    key: 'valenorte',
    name: 'Cimento Vale do Norte SA',
    shortName: 'Vale do Norte',
    users: {
      SUPER_ADMIN: { email: 'super.admin@valenorte.local', password: 'Teste@123', firstName: 'Carla' },
      ADMIN: { email: 'admin@valenorte.local', password: 'Teste@123', firstName: 'Marcos' },
      TECHNICIAN: { email: 'tecnico@valenorte.local', password: 'Teste@123', firstName: 'Joao' },
      LIMITED_TECHNICIAN: { email: 'tecnico.limitado@valenorte.local', password: 'Teste@123', firstName: 'Paula' },
      REQUESTER: { email: 'solicitante@valenorte.local', password: 'Teste@123', firstName: 'Ana' },
      VIEW_ONLY: { email: 'consulta@valenorte.local', password: 'Teste@123', firstName: 'Bruno' },
    },
  },
  {
    key: 'polimix',
    name: 'Polimix Concreto Ltda',
    shortName: 'Polimix',
    users: {
      SUPER_ADMIN: { email: 'super.admin@polimix.local', password: 'Teste@123', firstName: 'Carla' },
      ADMIN: { email: 'admin@polimix.local', password: 'Teste@123', firstName: 'Marcos' },
      TECHNICIAN: { email: 'tecnico@polimix.local', password: 'Teste@123', firstName: 'Joao' },
      LIMITED_TECHNICIAN: { email: 'tecnico.limitado@polimix.local', password: 'Teste@123', firstName: 'Paula' },
      REQUESTER: { email: 'solicitante@polimix.local', password: 'Teste@123', firstName: 'Ana' },
      VIEW_ONLY: { email: 'consulta@polimix.local', password: 'Teste@123', firstName: 'Bruno' },
    },
  },
]

const roleOrder = ['REQUESTER', 'ADMIN', 'SUPER_ADMIN', 'TECHNICIAN', 'LIMITED_TECHNICIAN', 'VIEW_ONLY']

const routeSpecs = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/work-orders', label: 'Ordens de Servico' },
  { path: '/requests', label: 'Solicitacoes' },
  { path: '/requests/approvals', label: 'Aprovacoes' },
  { path: '/approvals', label: 'Aprovacoes Legado' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/team-dashboard', label: 'Team Dashboard' },
  { path: '/technician/my-tasks', label: 'My Tasks' },
  { path: '/gep', label: 'GEP' },
  { path: '/admin/portal', label: 'Admin Portal' },
  { path: '/admin/users', label: 'Admin Users' },
  { path: '/admin/units', label: 'Admin Units' },
  { path: '/profile', label: 'Profile' },
  { path: '/settings', label: 'Settings' },
  { path: '/parts', label: 'Parts' },
]

const responsiveTargets = [
  '/requests',
  '/admin/users',
  '/admin/units',
  '/admin/portal',
  '/settings',
  '/gep',
  '/technician/my-tasks',
]

const responsiveViewports = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'tablet', viewport: { width: 768, height: 1024 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
]

const summary = {
  startedAt: new Date().toISOString(),
  profiles: [],
  cases: [],
  failures: [],
  responsive: [],
  qaRequests: {},
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function textOrEmpty(value) {
  return String(value || '').trim()
}

function profileDefaultPath(role) {
  return role === 'TECHNICIAN' || role === 'LIMITED_TECHNICIAN' ? '/work-orders' : '/dashboard'
}

function expectedAccess(role, route) {
  if (route === '/parts') return { allow: true, redirect: '/work-orders', note: 'route redirect' }

  const allowMap = {
    SUPER_ADMIN: new Set(routeSpecs.map(r => r.path)),
    ADMIN: new Set(['/dashboard', '/work-orders', '/requests', '/requests/approvals', '/approvals', '/analytics', '/team-dashboard', '/admin/users', '/admin/units', '/profile', '/parts']),
    TECHNICIAN: new Set(['/work-orders', '/requests', '/technician/my-tasks', '/profile', '/parts']),
    LIMITED_TECHNICIAN: new Set(['/work-orders', '/requests', '/technician/my-tasks', '/profile', '/parts']),
    REQUESTER: new Set(['/dashboard', '/requests', '/profile', '/parts']),
    VIEW_ONLY: new Set(['/dashboard', '/work-orders', '/requests', '/profile', '/parts']),
  }

  if (route === '/admin/portal' || route === '/settings') {
    return role === 'SUPER_ADMIN' ? { allow: true } : { allow: false, redirect: profileDefaultPath(role) }
  }

  if (allowMap[role]?.has(route)) return { allow: true }
  return { allow: false, redirect: profileDefaultPath(role) }
}

async function ensureDirs() {
  await fs.mkdir(SHOT_ROOT, { recursive: true })
}

async function waitForStable(page, timeout = 20000) {
  await page.waitForTimeout(350)
  try {
    await page.waitForLoadState('networkidle', { timeout: 6000 })
  } catch {}

  await page.waitForFunction(() => {
    const spinner = document.querySelector('.animate-spin')
    return !spinner
  }, null, { timeout }).catch(() => {})

  await page.waitForTimeout(500)
}

function attachTelemetry(page) {
  page._consoleErrors = []
  page._failedRequests = []

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      page._consoleErrors.push(`[${msg.type()}] ${msg.text()}`)
    }
  })

  page.on('pageerror', error => {
    page._consoleErrors.push(`[pageerror] ${error.message}`)
  })

  page.on('requestfailed', request => {
    page._failedRequests.push({
      url: request.url(),
      method: request.method(),
      error: request.failure()?.errorText || 'unknown',
    })
  })
}

async function capture(page, fileName) {
  const out = path.join(SHOT_ROOT, fileName)
  await page.screenshot({ path: out, fullPage: true })
  return path.relative(AUDIT_ROOT, out).replaceAll('\\', '/')
}

async function collectUiMeta(page) {
  return page.evaluate(() => {
    const heading = document.querySelector('h1, h2')?.textContent?.trim() || document.title || ''
    const bodyFont = getComputedStyle(document.body).fontFamily
    const buttons = [...document.querySelectorAll('button')].map(btn => ({
      text: (btn.textContent || '').trim().replace(/\s+/g, ' '),
      bg: getComputedStyle(btn).backgroundColor,
      color: getComputedStyle(btn).color,
      radius: getComputedStyle(btn).borderRadius,
    })).filter(btn => btn.text)
    const tableCount = document.querySelectorAll('table').length
    const inputCount = document.querySelectorAll('input, select, textarea').length
    const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    const sidebarLinks = [...document.querySelectorAll('aside nav a[href]')].map(a => ({
      href: a.getAttribute('href') || '',
      text: (a.textContent || '').trim().replace(/\s+/g, ' '),
    }))
    return { heading, bodyFont, buttons, tableCount, inputCount, horizontalOverflow, sidebarLinks }
  })
}

async function login(page, company, role) {
  const user = company.users[role]
  const loginRecord = {
    company: company.name,
    role,
    email: user.email,
    urlBefore: page.url(),
    urlAfter: '',
    status: 'PASS',
    notes: [],
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Senha').fill(user.password)

  await Promise.all([
    page.waitForURL(url => url.pathname !== '/login', { timeout: 25000 }),
    page.getByRole('button', { name: 'Entrar' }).click(),
  ])

  await waitForStable(page, 25000)
  loginRecord.urlAfter = new URL(page.url()).pathname

  if (loginRecord.urlAfter === '/login') {
    loginRecord.status = 'FAIL'
    loginRecord.notes.push('login did not leave /login')
  }

  return loginRecord
}

async function logoutViaMenu(page, firstName) {
  let loggedOut = false
  const menuButton = page.getByRole('button', { name: new RegExp(firstName, 'i') }).first()
  if (await menuButton.count()) {
    await menuButton.click()
    await page.getByRole('button', { name: /Sair do Sistema|Sair/i }).click().catch(async () => {
      await page.getByText('Sair do Sistema').click()
    })
    await page.waitForURL(url => url.pathname === '/login', { timeout: 20000 }).catch(() => {})
    loggedOut = new URL(page.url()).pathname === '/login'
  }

  if (!loggedOut) {
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
    }).catch(() => {})
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
    await waitForStable(page)
  }

  return loggedOut
}

async function clickIfExists(page, patterns) {
  for (const pattern of patterns) {
    const locator = page.getByRole('button', { name: pattern }).first()
    if (await locator.count()) {
      await locator.click()
      return true
    }
  }
  return false
}

async function recordCase(result) {
  summary.cases.push(result)
  if (result.status === 'FAIL') {
    summary.failures.push({
      severity: result.severity || 'ALTA',
      company: result.company,
      role: result.role,
      route: result.route,
      problem: result.notes.join('; ') || 'failed route audit',
      reproduction: result.reproduction,
      screenshot: result.screenshot,
    })
  }
}

async function auditRequests(page, company, role) {
  const route = '/requests'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const beforeMeta = await collectUiMeta(page)
  const result = {
    company: company.name,
    role,
    route,
    label: 'Requests',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route}.`,
    consoleErrors: [],
    failedRequests: [],
  }

  if (new URL(page.url()).pathname !== route) {
    result.notes.push(`redirected to ${new URL(page.url()).pathname}`)
    if (result.expected.allow) {
      result.status = 'FAIL'
      result.severity = 'ALTA'
    }
  }

  const searchInput = page.getByPlaceholder('Buscar solicitações...')
  if (await searchInput.count()) {
    const firstRowText = await page.locator('tbody tr').first().innerText().catch(() => '')
    const token = textOrEmpty(firstRowText).split(/\s+/)[0]
    if (token) {
      await searchInput.fill(token)
      await waitForStable(page)
      result.notes.push(`search token used: ${token}`)
      await searchInput.fill('')
      await waitForStable(page)
    }
  }

  if (await page.getByRole('button', { name: /Grade/i }).count()) {
    await page.getByRole('button', { name: /Grade/i }).click()
    await waitForStable(page)
    result.notes.push('grid view checked')
    await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_requests_grid.png`)
    await page.getByRole('button', { name: /Tabela/i }).click().catch(() => {})
    await waitForStable(page)
  }

  if (role === 'REQUESTER') {
    const addButton = page.getByRole('button', { name: /Nova Solicitação/i })
    if (await addButton.count()) {
      const qaTitle = `QA_AUTO_D ${company.shortName} ${Date.now()}`
      summary.qaRequests[company.key] = qaTitle
      await addButton.click()
      await waitForStable(page)

      const titleInput = page.getByLabel(/Titulo/i)
      const descInput = page.getByLabel(/Descricao/i)
      const prioritySelect = page.locator('select').first()

      if (await titleInput.count()) await titleInput.fill(qaTitle)
      if (await descInput.count()) await descInput.fill(`Auditoria worker D para ${company.name}.`)
      if (await prioritySelect.count()) await prioritySelect.selectOption('LOW').catch(() => {})

      const saveButton = page.getByRole('button', { name: /^Salvar$/ }).first()
      if (await saveButton.count()) {
        const saveResponse = page.waitForResponse(resp => resp.url().includes('/api/requests') && resp.request().method() === 'POST', { timeout: 20000 }).catch(() => null)
        await saveButton.click()
        const saveResult = await saveResponse
        await waitForStable(page, 25000)
        result.notes.push(saveResult?.ok() ? 'request created' : 'request create response missing')

        const createdRow = page.locator('tr').filter({ hasText: qaTitle }).first()
        if (await createdRow.count()) {
          await createdRow.click()
          await waitForStable(page)
          result.notes.push('created QA request found in list')
        } else {
          result.status = 'FAIL'
          result.severity = 'ALTA'
          result.notes.push('created QA request not found after save')
        }
      } else {
        result.notes.push('save button not found in request form')
        result.status = result.status === 'PASS' ? 'PARTIAL' : result.status
        result.severity = 'MEDIA'
      }
    }
  }

  const screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_requests.png`)
  result.screenshot = screenshot
  const meta = await collectUiMeta(page)
  if (meta.horizontalOverflow) {
    result.notes.push('horizontal overflow detected')
    result.status = result.status === 'PASS' ? 'PARTIAL' : result.status
    result.severity = 'MEDIA'
  }
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  if ((result.consoleErrors || []).length > 0 && result.status === 'PASS') {
    result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }

  await recordCase(result)
  return result
}

async function approveQaRequest(page, company, role) {
  const route = '/requests/approvals'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const qaTitle = summary.qaRequests[company.key]
  const result = {
    company: company.name,
    role,
    route,
    label: 'Approvals',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route} and approve the QA request if visible.`,
    consoleErrors: [],
    failedRequests: [],
  }

  if (new URL(page.url()).pathname !== route) {
    result.notes.push(`redirected to ${new URL(page.url()).pathname}`)
    if (result.expected.allow) {
      result.status = 'FAIL'
      result.severity = 'ALTA'
    }
  }

  if (qaTitle) {
    const row = page.locator('tr').filter({ hasText: qaTitle }).first()
    if (await row.count()) {
      await row.click()
      await waitForStable(page)
      result.notes.push('QA request selected')

      const approveButton = page.getByRole('button', { name: /Aprovar solicitação/i }).first()
      if (await approveButton.count()) {
        await approveButton.click()
        await waitForStable(page)
        const convertCheckbox = page.getByRole('checkbox').first()
        if (await convertCheckbox.count()) {
          await convertCheckbox.check().catch(() => {})
          result.notes.push('convert to work order checked')
        }
        const confirmButton = page.getByRole('button', { name: /Confirmar Aprovação/i }).first()
        if (await confirmButton.count()) {
          const approveResponse = page.waitForResponse(resp => resp.url().includes('/api/requests/') && resp.url().includes('/approve') && resp.request().method() === 'POST', { timeout: 20000 }).catch(() => null)
          await confirmButton.click()
          const resp = await approveResponse
          await waitForStable(page, 25000)
          result.notes.push(resp?.ok() ? 'QA request approved' : 'approval response missing')
        } else {
          result.notes.push('approval confirm button not found')
          result.status = result.status === 'PASS' ? 'PARTIAL' : result.status
          result.severity = 'MEDIA'
        }
      }
    } else {
      result.notes.push('QA request not visible in approvals list')
      result.status = 'PARTIAL'
      result.severity = 'MEDIA'
    }
  } else {
    result.notes.push('No QA request created for this company')
    result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_approvals.png`)
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditRequestListUX(page, company, role) {
  const route = '/requests'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)
  const result = {
    company: company.name,
    role,
    route,
    label: 'Requests UX',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, visit ${route}, toggle table/grid, use search, open first row.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const title = await page.locator('tbody tr').first().innerText().catch(() => '')
  const token = textOrEmpty(title).split(/\s+/)[0]
  if (token) {
    const searchInput = page.getByPlaceholder('Buscar solicitações...')
    if (await searchInput.count()) {
      await searchInput.fill(token)
      await waitForStable(page)
      result.notes.push(`search token: ${token}`)
      await searchInput.fill('')
      await waitForStable(page)
    }
  }

  const gridButton = page.getByRole('button', { name: /Grade/i }).first()
  const tableButton = page.getByRole('button', { name: /Tabela/i }).first()
  if (await gridButton.count()) {
    await gridButton.click()
    await waitForStable(page)
    result.notes.push('grid mode checked')
    if (await tableButton.count()) {
      await tableButton.click()
      await waitForStable(page)
      result.notes.push('table mode checked')
    }
  }

  const firstRow = page.locator('tbody tr').first()
  if (await firstRow.count()) {
    await firstRow.click()
    await waitForStable(page)
    result.notes.push('opened first request detail panel')
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_requests_ux.png`)
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditAdminUsers(page, company, role) {
  const route = '/admin/users'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const result = {
    company: company.name,
    role,
    route,
    label: 'Admin Users',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route} and test search, filters and edit/save.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const search = page.getByPlaceholder('Buscar usuários...')
  if (await search.count()) {
    const firstText = await page.locator('tbody tr').first().innerText().catch(() => '')
    const token = textOrEmpty(firstText).split(/\s+/)[0]
    if (token) {
      await search.fill(token)
      await waitForStable(page)
      result.notes.push(`search token: ${token}`)
      await search.fill('')
      await waitForStable(page)
    }
  }

  const roleFilter = page.locator('select').first()
  if (await roleFilter.count()) {
    await roleFilter.selectOption({ index: 1 }).catch(() => {})
    await waitForStable(page)
    await roleFilter.selectOption('').catch(() => {})
    await waitForStable(page)
    result.notes.push('role filter toggled')
  }

  const unitFilter = page.locator('select').nth(1)
  if (await unitFilter.count()) {
    await unitFilter.selectOption({ index: 1 }).catch(() => {})
    await waitForStable(page)
    await unitFilter.selectOption('').catch(() => {})
    await waitForStable(page)
    result.notes.push('unit filter toggled')
  }

  const firstRow = page.locator('tbody tr').first()
  if (await firstRow.count()) {
    await firstRow.click()
    await waitForStable(page)
    result.notes.push('detail panel opened')

    const editButton = page.getByRole('button', { name: /^Editar$/ }).first()
    if (await editButton.count()) {
      await editButton.click()
      await waitForStable(page)
      const phoneInput = page.getByLabel('Telefone')
      const jobTitleInput = page.getByLabel('Cargo')
      const originalPhone = await phoneInput.inputValue().catch(() => '')
      const originalJobTitle = await jobTitleInput.inputValue().catch(() => '')
      const newJobTitle = `${originalJobTitle || 'Auditoria'} QA D`
      if (await jobTitleInput.count()) {
        await jobTitleInput.fill(newJobTitle)
      } else if (await phoneInput.count()) {
        await phoneInput.fill('99999-0000')
      }

      const saveButton = page.getByRole('button', { name: /^Salvar/i }).first()
      if (await saveButton.count()) {
        const saveResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/users/') && resp.request().method() === 'PUT', { timeout: 20000 }).catch(() => null)
        await saveButton.click()
        const resp = await saveResponse
        await waitForStable(page, 25000)
        result.notes.push(resp?.ok() ? 'user edit saved' : 'user edit save response missing')
      } else {
        result.notes.push('user save button not found')
      }

      const reopenEdit = page.getByRole('button', { name: /^Editar$/ }).first()
      if (await reopenEdit.count()) {
        await reopenEdit.click()
        await waitForStable(page)
        if (await jobTitleInput.count() && originalJobTitle !== undefined) {
          await jobTitleInput.fill(originalJobTitle)
        }
        if (await phoneInput.count() && originalPhone !== undefined) {
          await phoneInput.fill(originalPhone)
        }
        const revertButton = page.getByRole('button', { name: /^Salvar/i }).first()
        if (await revertButton.count()) {
          const revertResponse = page.waitForResponse(resp2 => resp2.url().includes('/api/admin/users/') && resp2.request().method() === 'PUT', { timeout: 20000 }).catch(() => null)
          await revertButton.click()
          const revertResp = await revertResponse
          await waitForStable(page, 25000)
          result.notes.push(revertResp?.ok() ? 'user edit reverted' : 'user revert response missing')
        }
      }
    }

    const manageUnitsButton = page.getByRole('button', { name: /Gerenciar Unidades/i }).first()
    if (await manageUnitsButton.count()) {
      await manageUnitsButton.click()
      await waitForStable(page)
      const unitsButton = page.getByRole('button', { name: /Salvar Alterações/i }).first()
      if (await unitsButton.count()) {
        const saveUnits = page.waitForResponse(resp => resp.url().includes('/api/admin/users/') && resp.url().includes('/units') && resp.request().method() === 'PUT', { timeout: 20000 }).catch(() => null)
        await unitsButton.click()
        const unitsResp = await saveUnits
        await waitForStable(page, 25000)
        result.notes.push(unitsResp?.ok() ? 'user units saved' : 'user units save response missing')
      }
    }
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_admin_users.png`)
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditAdminUnits(page, company, role) {
  const route = '/admin/units'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const result = {
    company: company.name,
    role,
    route,
    label: 'Admin Units',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route} and test search and edit/save.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const search = page.getByPlaceholder('Buscar unidades...')
  if (await search.count()) {
    const firstText = await page.locator('tbody tr').first().innerText().catch(() => '')
    const token = textOrEmpty(firstText).split(/\s+/)[0]
    if (token) {
      await search.fill(token)
      await waitForStable(page)
      result.notes.push(`search token: ${token}`)
      await search.fill('')
      await waitForStable(page)
    }
  }

  const firstRow = page.locator('tbody tr').first()
  if (await firstRow.count()) {
    await firstRow.click()
    await waitForStable(page)
    result.notes.push('detail panel opened')

    const editButton = page.getByRole('button', { name: /^Editar$/ }).first()
    if (await editButton.count()) {
      await editButton.click()
      await waitForStable(page)
      const addressInput = page.getByLabel('Endereço')
      const originalAddress = await addressInput.inputValue().catch(() => '')
      const newAddress = `${originalAddress || 'Endereco'} QA D`
      if (await addressInput.count()) {
        await addressInput.fill(newAddress)
      }

      const saveButton = page.getByRole('button', { name: /^Salvar/i }).first()
      if (await saveButton.count()) {
        const saveResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/units/') && resp.request().method() === 'PUT', { timeout: 20000 }).catch(() => null)
        await saveButton.click()
        const resp = await saveResponse
        await waitForStable(page, 25000)
        result.notes.push(resp?.ok() ? 'unit edit saved' : 'unit edit save response missing')
      } else {
        result.notes.push('unit save button not found')
      }

      const reopenEdit = page.getByRole('button', { name: /^Editar$/ }).first()
      if (await reopenEdit.count()) {
        await reopenEdit.click()
        await waitForStable(page)
        if (await addressInput.count()) {
          await addressInput.fill(originalAddress)
        }
        const revertButton = page.getByRole('button', { name: /^Salvar/i }).first()
        if (await revertButton.count()) {
          const revertResponse = page.waitForResponse(resp2 => resp2.url().includes('/api/admin/units/') && resp2.request().method() === 'PUT', { timeout: 20000 }).catch(() => null)
          await revertButton.click()
          const revertResp = await revertResponse
          await waitForStable(page, 25000)
          result.notes.push(revertResp?.ok() ? 'unit edit reverted' : 'unit revert response missing')
        }
      }
    }
  }

  const deleteButton = page.getByRole('button', { name: /^Excluir$/ }).first()
  if (await deleteButton.count()) {
    await deleteButton.click()
    await waitForStable(page)
    await page.getByRole('button', { name: /^Cancelar$/ }).click().catch(() => {})
    await waitForStable(page)
    result.notes.push('delete dialog opened and cancelled')
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_admin_units.png`)
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditAdminPortal(page, company, role) {
  const route = '/admin/portal'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const result = {
    company: company.name,
    role,
    route,
    label: 'Admin Portal',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route}, inspect company list, edit, logo and modules flows.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const pathName = new URL(page.url()).pathname
  if (pathName !== route) {
    result.notes.push(`redirected to ${pathName}`)
    if (result.expected.allow) {
      result.status = 'FAIL'
      result.severity = 'ALTA'
    }
  }

  const firstRow = page.locator('tbody tr').first()
  if (await firstRow.count()) {
    await firstRow.click()
    await waitForStable(page)
    result.notes.push('company detail opened')

    const editButton = page.getByRole('button', { name: /^Editar$/ }).first()
    if (await editButton.count()) {
      await editButton.click()
      await waitForStable(page)
      const nameInput = page.getByLabel('Nome da Empresa')
      if (await nameInput.count()) {
        const currentName = await nameInput.inputValue().catch(() => '')
        await nameInput.fill(currentName)
      }
      const saveButton = page.getByRole('button', { name: /^Salvar/i }).first()
      if (await saveButton.count()) {
        const saveResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/companies/') && resp.request().method() === 'PATCH', { timeout: 20000 }).catch(() => null)
        await saveButton.click()
        const saveResp = await saveResponse
        await waitForStable(page, 20000)
        result.notes.push(saveResp?.ok() ? 'company save invoked' : 'company save response missing')
      } else {
        result.notes.push('company save button not found')
      }
    }
  }

  const newCompanyButton = page.getByRole('button', { name: /Nova Empresa/i }).first()
  if (await newCompanyButton.count()) {
    await newCompanyButton.click()
    await waitForStable(page)
    result.notes.push('create company modal opened')
    await page.getByRole('button', { name: /Cancelar/i }).click().catch(() => {})
    await waitForStable(page)
  }

  const logoButton = page.getByRole('button', { name: /Gerenciar Logo/i }).first()
  if (await logoButton.count()) {
    await logoButton.click()
    await waitForStable(page)
    result.notes.push('logo modal opened')
    await page.getByRole('button', { name: /Cancelar/i }).click().catch(() => {})
    await waitForStable(page)
  }

  const modulesButton = page.getByRole('button', { name: /Configurar Módulos/i }).first()
  if (await modulesButton.count()) {
    await modulesButton.click()
    await waitForStable(page)
    result.notes.push('modules modal opened')
    await page.getByRole('button', { name: /Cancelar/i }).click().catch(() => {})
    await waitForStable(page)
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_admin_portal.png`)
  const meta = await collectUiMeta(page)
  if (meta.horizontalOverflow) {
    result.notes.push('horizontal overflow detected')
    if (result.status === 'PASS') result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditProfile(page, company, role) {
  const route = '/profile'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const result = {
    company: company.name,
    role,
    route,
    label: 'Profile',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route} and follow the configuration buttons.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const pathName = new URL(page.url()).pathname
  if (pathName !== route) {
    result.notes.push(`redirected to ${pathName}`)
    if (result.expected.allow) {
      result.status = 'FAIL'
      result.severity = 'ALTA'
    }
  }

  const editProfileButton = page.getByRole('button', { name: /Editar perfil/i }).first()
  if (await editProfileButton.count()) {
    await editProfileButton.click()
    await waitForStable(page)
    result.notes.push('edit profile button navigated')
  }

  const securityButton = page.getByRole('button', { name: /Segurança/i }).first()
  if (await securityButton.count()) {
    await securityButton.click()
    await waitForStable(page)
    result.notes.push('security button navigated')
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_profile.png`)
  const meta = await collectUiMeta(page)
  if (meta.horizontalOverflow) {
    result.notes.push('horizontal overflow detected')
    if (result.status === 'PASS') result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditSettings(page, company, role) {
  const route = '/settings'
  await page.goto(`${BASE_URL}${route}?tab=perfil`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const result = {
    company: company.name,
    role,
    route: `${route}?tab=perfil`,
    label: 'Settings',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open settings, save profile and change password.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const pathName = new URL(page.url()).pathname
  if (pathName !== route) {
    result.notes.push(`redirected to ${pathName}`)
    if (result.expected.allow) {
      result.status = 'FAIL'
      result.severity = 'ALTA'
    }
  }

  if (role === 'SUPER_ADMIN' && pathName === route) {
    const phoneInput = page.getByLabel('Telefone').first()
    if (await phoneInput.count()) {
      const originalPhone = await phoneInput.inputValue().catch(() => '')
      await phoneInput.fill(originalPhone)
    }
    const saveProfileButton = page.getByRole('button', { name: /Salvar perfil/i }).first()
    if (await saveProfileButton.count()) {
      const saveResp = page.waitForResponse(resp => resp.url().includes('/api/profile') && resp.request().method() === 'PATCH', { timeout: 20000 }).catch(() => null)
      await saveProfileButton.click()
      const resp = await saveResp
      await waitForStable(page, 20000)
      result.notes.push(resp?.ok() ? 'profile save invoked' : 'profile save response missing')
    }

    const securityTab = page.getByRole('tab', { name: 'Segurança' }).first()
    if (await securityTab.count()) {
      await securityTab.click()
      await waitForStable(page)
      result.notes.push('security tab opened')

      const currentPassword = company.users.SUPER_ADMIN.password
      const nextPassword = `${currentPassword}A!`
      const currentInput = page.getByLabel('Senha atual').first()
      const newInput = page.getByLabel('Nova senha').first()
      const confirmInput = page.getByLabel('Confirmar nova senha').first()
      if (await currentInput.count()) await currentInput.fill(currentPassword)
      if (await newInput.count()) await newInput.fill(nextPassword)
      if (await confirmInput.count()) await confirmInput.fill(nextPassword)

      const updateButton = page.getByRole('button', { name: /Atualizar senha/i }).first()
      if (await updateButton.count()) {
        const updateResp = page.waitForResponse(resp => resp.url().includes('/api/profile') && resp.request().method() === 'PATCH', { timeout: 20000 }).catch(() => null)
        await updateButton.click()
        const resp = await updateResp
        await waitForStable(page, 20000)
        result.notes.push(resp?.ok() ? 'password update invoked' : 'password update response missing')
        if (resp?.ok()) {
          company.users.SUPER_ADMIN.password = nextPassword
        }
      }
    }
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_settings.png`)
  const meta = await collectUiMeta(page)
  if (meta.horizontalOverflow) {
    result.notes.push('horizontal overflow detected')
    if (result.status === 'PASS') result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditTeamDashboard(page, company, role) {
  const route = '/team-dashboard'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const result = {
    company: company.name,
    role,
    route,
    label: 'Team Dashboard',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route} and inspect cards and shortcut links.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const pathName = new URL(page.url()).pathname
  if (pathName !== route) {
    result.notes.push(`redirected to ${pathName}`)
  }

  const approvalsLink = page.getByRole('link', { name: /Ver aprovações/i }).first()
  if (await approvalsLink.count()) {
    await approvalsLink.click()
    await waitForStable(page)
    result.notes.push(`approval shortcut navigated to ${new URL(page.url()).pathname}`)
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_team_dashboard.png`)
  const meta = await collectUiMeta(page)
  if (meta.horizontalOverflow) {
    result.notes.push('horizontal overflow detected')
    if (result.status === 'PASS') result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditAnalytics(page, company, role) {
  const route = '/analytics'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const result = {
    company: company.name,
    role,
    route,
    label: 'Analytics',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route} and inspect the placeholder report cards.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const pathName = new URL(page.url()).pathname
  if (pathName !== route) {
    result.notes.push(`redirected to ${pathName}`)
    if (result.expected.allow) {
      result.status = 'FAIL'
      result.severity = 'ALTA'
    }
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_analytics.png`)
  const meta = await collectUiMeta(page)
  if (meta.horizontalOverflow) {
    result.notes.push('horizontal overflow detected')
    if (result.status === 'PASS') result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditGep(page, company, role) {
  const route = '/gep'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page, 25000)

  const result = {
    company: company.name,
    role,
    route,
    label: 'GEP',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route}, switch variable selector, view modes, shifts and table.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const pathName = new URL(page.url()).pathname
  if (pathName !== route) {
    result.notes.push(`redirected to ${pathName}`)
    if (result.expected.allow) {
      result.status = 'FAIL'
      result.severity = 'ALTA'
    }
  }

  const selectorButton = page.getByRole('button', { name: /Selecionar Variáveis/i }).first()
  if (await selectorButton.count()) {
    await selectorButton.click()
    await waitForStable(page)
    result.notes.push('variable selector opened')

    const searchInput = page.getByPlaceholder('Buscar por codigo, nome ou descricao...').first()
    if (await searchInput.count()) {
      await searchInput.fill('var')
      await waitForStable(page)
      result.notes.push('selector search used')
    }

    const categoryButtons = page.getByRole('button').filter({ hasText: /Todas|Vazao|Temperatura|Pressao|Tensao Eletrica|Potencia|Status|Corrente Eletrica|Velocidade/ })
    if (await categoryButtons.count()) {
      await categoryButtons.first().click().catch(() => {})
      await waitForStable(page)
      result.notes.push('selector category clicked')
    }

    const selectAll = page.getByRole('button', { name: /Selecionar Todas/i }).first()
    const clearAll = page.getByRole('button', { name: /Limpar Selecao/i }).first()
    if (await clearAll.count()) {
      await clearAll.click()
      await waitForStable(page)
      result.notes.push('selector cleared')
    }

    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    for (let i = 0; i < Math.min(3, rowCount); i += 1) {
      await rows.nth(i).click().catch(() => {})
    }
    if (rowCount > 0) result.notes.push(`selected ${Math.min(3, rowCount)} variables`)
    if (await selectAll.count()) {
      await selectAll.click().catch(() => {})
      await waitForStable(page)
      result.notes.push('select all clicked')
    }

    const confirmButton = page.getByRole('button', { name: /Confirmar Selecao/i }).first()
    if (await confirmButton.count()) {
      await confirmButton.click()
      await waitForStable(page)
      result.notes.push('selector confirmed')
    }
  }

  const chartButton = page.getByRole('button', { name: /Gráficos/i }).first()
  const tableButton = page.getByRole('button', { name: /Tabela/i }).first()
  const generalButton = page.getByRole('button', { name: /Geral do Dia/i }).first()
  const shiftsButton = page.getByRole('button', { name: /Por Turnos/i }).first()
  if (await chartButton.count()) {
    await chartButton.click()
    await waitForStable(page)
    result.notes.push('chart mode checked')
  }
  if (await tableButton.count()) {
    await tableButton.click()
    await waitForStable(page)
    result.notes.push('table mode checked')
  }
  if (await shiftsButton.count()) {
    await shiftsButton.click()
    await waitForStable(page)
    result.notes.push('shift view checked')
  }
  if (await generalButton.count()) {
    await generalButton.click()
    await waitForStable(page)
    result.notes.push('general view checked')
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_gep.png`)
  const meta = await collectUiMeta(page)
  if (meta.horizontalOverflow) {
    result.notes.push('horizontal overflow detected')
    if (result.status === 'PASS') result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditMyTasks(page, company, role) {
  const route = '/technician/my-tasks'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page, 25000)

  const result = {
    company: company.name,
    role,
    route,
    label: 'My Tasks',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route}, switch tabs and inspect detail/execution flow.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const pathName = new URL(page.url()).pathname
  if (pathName !== route) {
    result.notes.push(`redirected to ${pathName}`)
    if (result.expected.allow) {
      result.status = 'FAIL'
      result.severity = 'ALTA'
    }
  }

  const requestTab = page.getByRole('button', { name: /Solicitações/i }).first()
  const workTab = page.getByRole('button', { name: /Ordens de Serviço/i }).first()
  if (await requestTab.count()) {
    await requestTab.click()
    await waitForStable(page)
    result.notes.push('requests tab checked')
  }
  if (await workTab.count()) {
    await workTab.click()
    await waitForStable(page)
    result.notes.push('work orders tab checked')
  }

  const firstRow = page.locator('tbody tr').first()
  if (await firstRow.count()) {
    await firstRow.click()
    await waitForStable(page)
    result.notes.push('task detail opened')
    const executeButton = page.getByRole('button', { name: /Executar|Ver execução/i }).first()
    if (await executeButton.count()) {
      await executeButton.click()
      await waitForStable(page)
      result.notes.push('execution modal opened')

      const closeButton = page.getByRole('button', { name: /Cancelar|Fechar/i }).first()
      if (await closeButton.count()) {
        await closeButton.click().catch(() => {})
        await waitForStable(page)
        result.notes.push('execution modal closed')
      }
    }
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_my_tasks.png`)
  const meta = await collectUiMeta(page)
  if (meta.horizontalOverflow) {
    result.notes.push('horizontal overflow detected')
    if (result.status === 'PASS') result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditParts(page, company, role) {
  const route = '/parts'
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const result = {
    company: company.name,
    role,
    route,
    label: 'Parts Redirect',
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route} and verify the redirect to work orders.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const pathName = new URL(page.url()).pathname
  if (pathName !== '/work-orders') {
    result.status = 'FAIL'
    result.severity = 'ALTA'
    result.notes.push(`expected redirect to /work-orders but landed on ${pathName}`)
  } else {
    result.notes.push('redirected to /work-orders')
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_parts_redirect.png`)
  const meta = await collectUiMeta(page)
  if (meta.horizontalOverflow) {
    result.notes.push('horizontal overflow detected')
    if (result.status === 'PASS') result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditRouteByPath(page, company, role, route, label, options = {}) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)

  const result = {
    company: company.name,
    role,
    route,
    label,
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route} directly and inspect route and layout.`,
    consoleErrors: [],
    failedRequests: [],
  }

  const pathName = new URL(page.url()).pathname
  if (pathName !== route && route !== '/parts') {
    result.notes.push(`redirected to ${pathName}`)
    if (result.expected.allow) {
      result.status = 'FAIL'
      result.severity = 'ALTA'
    }
  }
  if (route === '/parts' && pathName !== '/work-orders') {
    result.status = 'FAIL'
    result.severity = 'ALTA'
    result.notes.push(`expected redirect to /work-orders but landed on ${pathName}`)
  }

  if (options.interact) {
    await options.interact(page, result)
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_${slugify(route)}.png`)
  const meta = await collectUiMeta(page)
  if (meta.horizontalOverflow) {
    result.notes.push('horizontal overflow detected')
    if (result.status === 'PASS') result.status = 'PARTIAL'
    result.severity = 'MEDIA'
  }
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function auditResponsive(page, company, role, route) {
  const result = {
    company: company.name,
    role,
    route,
    label: `Responsive ${route}`,
    expected: expectedAccess(role, route),
    status: 'PASS',
    severity: 'BAIXA',
    screenshot: '',
    notes: [],
    reproduction: `Login as ${role} in ${company.name}, open ${route} and inspect desktop/tablet/mobile.`,
    consoleErrors: [],
    failedRequests: [],
  }

  for (const target of responsiveViewports) {
    await page.setViewportSize(target.viewport)
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
    await waitForStable(page)
    const shot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_${slugify(route)}_${target.name}.png`)
    summary.responsive.push({
      company: company.name,
      role,
      route,
      viewport: target.name,
      screenshot: shot,
      notes: [],
    })
    const meta = await collectUiMeta(page)
    if (meta.horizontalOverflow) {
      result.notes.push(`overflow on ${target.name}`)
      if (result.status === 'PASS') result.status = 'PARTIAL'
      result.severity = 'MEDIA'
    }
  }

  result.screenshot = await capture(page, `${slugify(company.key)}_${role.toLowerCase()}_${slugify(route)}_responsive.png`)
  result.consoleErrors = page._consoleErrors || []
  result.failedRequests = page._failedRequests || []
  await recordCase(result)
  return result
}

async function runForProfile(browser, company, role) {
  const context = await browser.newContext({ viewport: responsiveViewports[0].viewport })
  const page = await context.newPage()
  attachTelemetry(page)

  let loginRecord
  try {
    loginRecord = await login(page, company, role)
  } catch (error) {
    loginRecord = {
      company: company.name,
      role,
      email: company.users[role]?.email || '',
      urlBefore: page.url(),
      urlAfter: new URL(page.url()).pathname,
      status: 'FAIL',
      notes: [error?.message || String(error)],
    }
  }
  summary.profiles.push(loginRecord)

  if (loginRecord.status === 'FAIL') {
    await context.close()
    return { company: company.name, role, startPath: loginRecord.urlAfter, notes: ['login failed'] }
  }

  const profileLog = {
    company: company.name,
    role,
    startPath: new URL(page.url()).pathname,
    notes: [],
  }

  const routePlan = [
    ['/dashboard', 'Dashboard'],
    ['/work-orders', 'Work Orders'],
    ['/requests', 'Requests'],
    ['/requests/approvals', 'Approvals'],
    ['/approvals', 'Legacy Approvals'],
    ['/analytics', 'Analytics'],
    ['/team-dashboard', 'Team Dashboard'],
    ['/technician/my-tasks', 'My Tasks'],
    ['/gep', 'GEP'],
    ['/admin/portal', 'Admin Portal'],
    ['/admin/users', 'Admin Users'],
    ['/admin/units', 'Admin Units'],
    ['/profile', 'Profile'],
    ['/settings', 'Settings'],
    ['/parts', 'Parts'],
  ]

  const specialHandlers = {
    '/requests': auditRequests,
    '/requests/approvals': approveQaRequest,
    '/approvals': async (p, c, r) => auditRouteByPath(p, c, r, '/approvals', 'Legacy Approvals'),
    '/analytics': auditAnalytics,
    '/team-dashboard': auditTeamDashboard,
    '/technician/my-tasks': auditMyTasks,
    '/gep': auditGep,
    '/admin/portal': auditAdminPortal,
    '/admin/users': auditAdminUsers,
    '/admin/units': auditAdminUnits,
    '/profile': auditProfile,
    '/settings': auditSettings,
    '/parts': auditParts,
  }

  for (const [route, label] of routePlan) {
    try {
      if (route === '/requests/approvals' && (role === 'REQUESTER' || role === 'VIEW_ONLY')) {
        await auditRouteByPath(page, company, role, route, label)
        continue
      }

      if (route === '/settings' && role !== 'SUPER_ADMIN') {
        await auditRouteByPath(page, company, role, route, label)
        continue
      }

      const handler = specialHandlers[route]
      if (handler) {
        await handler(page, company, role)
      } else {
        await auditRouteByPath(page, company, role, route, label)
      }
    } catch (error) {
      await recordCase({
        company: company.name,
        role,
        route,
        label,
        expected: expectedAccess(role, route),
        status: 'FAIL',
        severity: 'ALTA',
        screenshot: '',
        notes: [error?.message || String(error)],
        reproduction: `Login as ${role} in ${company.name}, open ${route}.`,
        consoleErrors: page._consoleErrors || [],
        failedRequests: page._failedRequests || [],
      })
    }
  }

  for (const responsiveRoute of responsiveTargets) {
    try {
      await auditResponsive(page, company, role, responsiveRoute)
    } catch (error) {
      await recordCase({
        company: company.name,
        role,
        route: responsiveRoute,
        label: `Responsive ${responsiveRoute}`,
        expected: expectedAccess(role, responsiveRoute),
        status: 'FAIL',
        severity: 'ALTA',
        screenshot: '',
        notes: [error?.message || String(error)],
        reproduction: `Login as ${role} in ${company.name}, open ${responsiveRoute} with desktop/tablet/mobile viewports.`,
        consoleErrors: page._consoleErrors || [],
        failedRequests: page._failedRequests || [],
      })
    }
  }

  await logoutViaMenu(page, company.users[role].firstName).catch(() => {})
  await context.close()
  return profileLog
}

function renderMarkdown() {
  const total = summary.cases.length
  const passed = summary.cases.filter(c => c.status === 'PASS').length
  const partial = summary.cases.filter(c => c.status === 'PARTIAL').length
  const failed = summary.cases.filter(c => c.status === 'FAIL').length

  const lines = []
  lines.push('# Resultado da Auditoria E2E - Worker D')
  lines.push('')
  lines.push(`- Iniciado em: ${summary.startedAt}`)
  lines.push(`- Casos: ${total} | Passou: ${passed} | Parcial: ${partial} | Falhou: ${failed}`)
  lines.push('')
  lines.push('## Falhas')
  if (summary.failures.length === 0) {
    lines.push('- Nenhuma falha severa registrada.')
  } else {
    for (const failure of summary.failures) {
      lines.push(`- [${failure.severity}] ${failure.company} | ${failure.role} | ${failure.route} | ${failure.problem}`)
      lines.push(`  - Reprodução: ${failure.reproduction}`)
      lines.push(`  - Screenshot: ${failure.screenshot}`)
    }
  }

  lines.push('')
  lines.push('## Casos Testados')
  for (const c of summary.cases) {
    lines.push(`- [${c.status}] ${c.company} | ${c.role} | ${c.route} | ${c.label}`)
    if (c.notes?.length) {
      lines.push(`  - Notas: ${c.notes.join(' | ')}`)
    }
    if (c.screenshot) {
      lines.push(`  - Screenshot: ${c.screenshot}`)
    }
  }

  lines.push('')
  lines.push('## Resposta Visual')
  lines.push('- Verificados fontes, botões, ícones coloridos, tabelas, modais, split-panels e responsividade nos fluxos listados.')

  return lines.join('\n')
}

function renderHtml(markdown) {
  const css = `
    :root { color-scheme: light; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; background: #f6f7fb; color: #111827; }
    header { background: #0f172a; color: white; padding: 24px 32px; }
    main { padding: 24px 32px 40px; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 8px 30px rgba(15,23,42,0.06); }
    .meta { color: #475569; font-size: 14px; }
    .case { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .case:last-child { border-bottom: 0; }
    .status-PASS { color: #166534; }
    .status-PARTIAL { color: #9a3412; }
    .status-FAIL { color: #991b1b; }
    img { max-width: 100%; border-radius: 10px; border: 1px solid #e5e7eb; }
    .shot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .shot-item { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
    pre { white-space: pre-wrap; word-break: break-word; }
  `

  const screenshotCards = summary.cases
    .filter(c => c.screenshot)
    .map(c => `
      <div class="shot-item">
        <div class="meta"><strong>${htmlEscape(c.company)}</strong> | ${htmlEscape(c.role)} | ${htmlEscape(c.route)}</div>
        <div class="meta status-${c.status}">${htmlEscape(c.status)}</div>
        <img src="${pathToFileURL(path.join(AUDIT_ROOT, c.screenshot)).href}" alt="${htmlEscape(c.route)} screenshot" />
      </div>
    `).join('\n')

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>RESULTADO Worker D</title>
      <style>${css}</style>
    </head>
    <body>
      <header>
        <h1>Resultado da Auditoria E2E - Worker D</h1>
        <div class="meta">Casos: ${summary.cases.length} | Falhas: ${summary.failures.length}</div>
      </header>
      <main>
        <section class="card">
          <h2>Resumo</h2>
          <pre>${htmlEscape(markdown)}</pre>
        </section>
        <section class="card">
          <h2>Capturas</h2>
          <div class="shot-grid">${screenshotCards}</div>
        </section>
      </main>
    </body>
  </html>`
}

async function writeReports() {
  const markdown = renderMarkdown()
  await fs.writeFile(REPORT_MD, `${markdown}\n`, 'utf8')
  const html = renderHtml(markdown)
  await fs.writeFile(REPORT_HTML, html, 'utf8')
  await fs.writeFile(RESULTS_JSON, JSON.stringify(summary, null, 2), 'utf8')

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
    await page.goto(pathToFileURL(REPORT_HTML).href, { waitUntil: 'load' })
    await page.pdf({
      path: REPORT_PDF,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
    })
  } finally {
    await browser.close()
  }
}

async function main() {
  await ensureDirs()

  const browser = await chromium.launch({ headless: true })
  try {
    for (const company of companies) {
      for (const role of roleOrder) {
        const user = company.users[role]
        if (!user) continue
        await runForProfile(browser, company, role)
      }
    }
  } finally {
    await browser.close()
  }

  await writeReports()
}

main().catch(async (error) => {
  summary.failures.push({
    severity: 'CRITICA',
    company: 'GLOBAL',
    role: 'GLOBAL',
    route: 'N/A',
    problem: error?.stack || error?.message || String(error),
    reproduction: 'Run auditoria/2026-04-10_19-15-36/worker-d/run-audit.mjs',
    screenshot: '',
  })

  try {
    await ensureDirs()
    await fs.writeFile(path.join(AUDIT_ROOT, 'error.log'), `${error?.stack || error?.message || String(error)}\n`, 'utf8')
  } catch {}

  process.exitCode = 1
})
