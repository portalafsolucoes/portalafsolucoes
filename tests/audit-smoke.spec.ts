import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  isScreenshotAutomationAuthorized,
  skipScreenshotSuiteUnlessAuthorized,
} from './helpers/screenshotAuthorization'

const baseURL = process.env.BASE_URL ?? 'http://localhost:3001'
const auditRoot = path.resolve(process.cwd(), 'auditoria-e2e')
const discoveryShots = path.join(auditRoot, 'F1_discovery', 'screenshots')
const testShots = path.join(auditRoot, 'F2_testes', 'screenshots')
const screenshotAuthorized = isScreenshotAutomationAuthorized()

const users = {
  superAdmin: { email: 'super.admin@polimix.local', password: 'Teste@123' },
  technician: { email: 'tecnico@polimix.local', password: 'Teste@123' },
  requester: { email: 'solicitante@polimix.local', password: 'Teste@123' },
}

for (const dir of [discoveryShots, testShots]) {
  if (screenshotAuthorized) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

skipScreenshotSuiteUnlessAuthorized(test, 'tests/audit-smoke.spec.ts')

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
}

test.describe('Audit smoke', () => {
  test('super admin can navigate visible modules without page-level failures', async ({ page, request }) => {
    const consoleErrors: string[] = []
    const httpFailures: string[] = []

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text())
      }
    })

    page.on('response', (response) => {
      const url = response.url()
      const status = response.status()

      if (status < 400) {
        return
      }

      if (
        url.includes('webpack.hot-update') ||
        url.includes('_rsc=') ||
        url.endsWith('/favicon.ico')
      ) {
        return
      }

      httpFailures.push(`${status} ${response.request().method()} ${url}`)
    })

    await loginByApi(page, request, users.superAdmin.email, users.superAdmin.password)
    await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' })
    await page.locator('aside nav a').first().waitFor({ state: 'visible' })
    await page.screenshot({ path: path.join(discoveryShots, 'F1_01_home_super_admin.png'), fullPage: true })

    const navLinks = page.locator('aside nav a')
    const navCount = await navLinks.count()
    expect(navCount).toBeGreaterThan(5)

    const visited: string[] = []

    for (let index = 0; index < navCount; index += 1) {
      const link = navLinks.nth(index)
      const label = (await link.innerText())
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
      const href = await link.getAttribute('href')
      expect(href).toBeTruthy()
      await page.goto(`${baseURL}${href}`)
      await page.waitForLoadState('networkidle')
      await expect(page.locator('body')).not.toContainText('Application error')
      await expect(page.locator('body')).not.toContainText('Unhandled Runtime Error')
      await expect(page.locator('body')).not.toContainText('Error:')
      visited.push(`${label} -> ${page.url()}`)
      await page.screenshot({ path: path.join(discoveryShots, `F1_nav_${String(index + 1).padStart(2, '0')}_${label}.png`), fullPage: true })
    }

    fs.writeFileSync(
      path.join(auditRoot, 'F1_discovery', 'mapa_sistema.md'),
      `# Mapa do Sistema\n\n${visited.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}\n`,
      'utf8'
    )

    expect.soft(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toEqual([])
    expect.soft(httpFailures, `HTTP failures found:\n${httpFailures.join('\n')}`).toEqual([])
  })

  test('requester should not see admin-only menu items', async ({ page, request }) => {
    await loginByApi(page, request, users.requester.email, users.requester.password)
    await page.goto(`${baseURL}/requests`, { waitUntil: 'domcontentloaded' })
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toContainText('Aprovações')
    await expect(sidebar).not.toContainText('Relatório de Análise de Falha')
    await page.screenshot({ path: path.join(testShots, 'F2_requester_sidebar_permissions.png'), fullPage: true })
  })

  test('technician should land outside dashboard and keep restricted navigation', async ({ page, request }) => {
    await loginByApi(page, request, users.technician.email, users.technician.password)
    await page.goto(`${baseURL}/work-orders`, { waitUntil: 'domcontentloaded' })
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toContainText('Dashboard')
    await expect(sidebar).not.toContainText('Aprovações')
    await page.screenshot({ path: path.join(testShots, 'F2_technician_sidebar_permissions.png'), fullPage: true })
  })
})
