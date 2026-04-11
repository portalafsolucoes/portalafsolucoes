import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000'

const users = {
  superAdmin: { email: 'super.admin@polimix.local', password: 'Teste@123' },
  admin: { email: 'admin@polimix.local', password: 'Teste@123' },
  technician: { email: 'tecnico@polimix.local', password: 'Teste@123' },
  requester: { email: 'solicitante@polimix.local', password: 'Teste@123' },
}

async function loginByApi(page: Page, request: APIRequestContext, email: string, password: string) {
  const response = await request.post(`${baseURL}/api/auth/login`, {
    data: { email, password },
  })

  expect(response.ok()).toBeTruthy()

  const setCookie = response.headers()['set-cookie']
  const sessionValue = setCookie?.match(/session=([^;]+)/)?.[1]

  expect(sessionValue).toBeTruthy()

  await page.context().addCookies([
    {
      name: 'session',
      value: sessionValue!,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])

  return sessionValue!
}

async function fetchWithSession(request: APIRequestContext, sessionValue: string, route: string) {
  const response = await request.get(`${baseURL}${route}`, {
    headers: {
      cookie: `session=${sessionValue}`,
    },
  })

  expect(response.ok(), `${route} should return 200`).toBeTruthy()
  return response.json()
}

async function expectMainHeading(page: Page, route: string, expectedTitle?: string | RegExp) {
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('load')

  const heading = page.locator('h1').first()

  await heading.waitFor({ state: 'visible' })
  await expect(heading, `${route} should render a visible h1`).toBeVisible()

  if (expectedTitle) {
    await expect(heading).toHaveText(expectedTitle)
  }

  await expect(page.locator('body')).not.toContainText('Application error')
  await expect(page.locator('body')).not.toContainText('Unhandled Runtime Error')
}

async function getHeaderWrapperClass(page: Page) {
  const heading = page.locator('h1').first()

  return heading.evaluate((node) => {
    let current: HTMLElement | null = node.parentElement

    while (current) {
      if (current.className.includes('border-b') && current.className.includes('border-border')) {
        return current.className
      }

      current = current.parentElement
    }

    return ''
  })
}

test.describe('Page Header Layout', () => {
  test.describe.configure({ timeout: 120000 })

  test('super admin dashboard uses shared header wrapper', async ({ page, request }) => {
    await loginByApi(page, request, users.superAdmin.email, users.superAdmin.password)

    await expectMainHeading(page, '/dashboard', 'Dashboard Corporativo')

    await expect(getHeaderWrapperClass(page)).resolves.toContain('border-b border-border px-4 py-3 md:px-6 flex-shrink-0')
  })

  test('admin dashboard uses shared header wrapper', async ({ page, request }) => {
    await loginByApi(page, request, users.admin.email, users.admin.password)

    await expectMainHeading(page, '/dashboard', 'Dashboard')

    await expect(getHeaderWrapperClass(page)).resolves.toContain('border-b border-border px-4 py-3 md:px-6 flex-shrink-0')
  })

  for (const scenario of [
    {
      label: 'super admin',
      user: users.superAdmin,
      routes: [
        '/dashboard',
        '/work-orders',
        '/requests',
        '/requests/approvals',
        '/assets',
        '/locations',
        '/people-teams',
        '/criticality',
        '/rafs',
        '/tree',
        '/admin/portal',
        '/admin/users',
        '/admin/units',
        '/planning/plans',
        '/planning/schedules',
        '/maintenance-plan/standard',
        '/maintenance-plan/asset',
        '/profile',
        '/settings',
      ],
    },
    {
      label: 'admin',
      user: users.admin,
      routes: [
        '/dashboard',
        '/work-orders',
        '/requests',
        '/requests/approvals',
        '/assets',
        '/locations',
        '/people-teams',
        '/criticality',
        '/rafs',
        '/tree',
        '/admin/users',
        '/admin/units',
        '/planning/plans',
        '/planning/schedules',
        '/maintenance-plan/standard',
        '/maintenance-plan/asset',
        '/profile',
        '/settings',
      ],
    },
    {
      label: 'technician',
      user: users.technician,
      routes: ['/work-orders', '/requests', '/assets', '/technician/my-tasks', '/profile', '/settings'],
    },
    {
      label: 'requester',
      user: users.requester,
      routes: ['/work-orders', '/requests', '/assets', '/profile', '/settings'],
    },
  ]) {
    test(`${scenario.label} visible modules render a main heading`, async ({ page, request }) => {
      await loginByApi(page, request, scenario.user.email, scenario.user.password)
      for (const route of scenario.routes) {
        await expectMainHeading(page, route)
      }
    })
  }

  test('admin direct form and detail routes render standardized headings', async ({ page, request }) => {
    const sessionValue = await loginByApi(page, request, users.admin.email, users.admin.password)

    await expectMainHeading(page, '/people/new', 'Adicionar Nova Pessoa')
    await expectMainHeading(page, '/assets/new', /Novo (Subativo de .+|Ativo)/)
    await expectMainHeading(page, '/locations/new', 'Nova Localização')
    await expectMainHeading(page, '/teams/new', 'Nova Equipe')
    await expectMainHeading(page, '/requests/new', 'Nova Solicitação de Manutenção')
    await expectMainHeading(page, '/work-orders/new', 'Nova Ordem de Serviço')

    const usersPayload = await fetchWithSession(request, sessionValue, '/api/users')
    const personId = usersPayload.data?.[0]?.id as string | undefined

    expect(personId).toBeTruthy()

    await expectMainHeading(page, `/people/${personId}`)
    await expectMainHeading(page, `/people/${personId}/edit`, 'Editar Pessoa')

    const workOrdersPayload = await fetchWithSession(request, sessionValue, '/api/work-orders')
    const workOrderId = workOrdersPayload.data?.[0]?.id as string | undefined

    if (workOrderId) {
      await expectMainHeading(page, `/work-orders/${workOrderId}/edit`, 'Editar Ordem de Serviço')
    }
  })
})