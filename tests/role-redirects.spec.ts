import { test, expect } from '@playwright/test'

/**
 * Fase 3 — Redirects por perfil
 * Confirma que os perfis canonicos caem na rota correta apos login:
 * ADMIN/SUPER_ADMIN -> /hub (ou /dashboard)
 * PLANEJADOR -> /dashboard
 * MANUTENTOR -> /work-orders
 * Os credenciais vem de variaveis de ambiente — o teste pula se nao definidas.
 */
const credsByRole = [
  {
    role: 'ADMIN',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    expectedUrl: /\/(hub|dashboard)/,
  },
  {
    role: 'PLANEJADOR',
    email: process.env.PLANEJADOR_EMAIL,
    password: process.env.PLANEJADOR_PASSWORD,
    expectedUrl: /\/dashboard/,
  },
  {
    role: 'MANUTENTOR',
    email: process.env.MANUTENTOR_EMAIL,
    password: process.env.MANUTENTOR_PASSWORD,
    expectedUrl: /\/work-orders/,
  },
]

test.describe('Redirects por perfil apos login', () => {
  for (const { role, email, password, expectedUrl } of credsByRole) {
    test(`${role} cai na rota canonica`, async ({ page }) => {
      test.skip(!email || !password, `Defina ${role}_EMAIL e ${role}_PASSWORD para rodar este teste.`)

      await page.goto('/login')
      await page.fill('input[type="email"]', email!)
      await page.fill('input[type="password"]', password!)
      await page.click('button[type="submit"]')

      await page.waitForURL(expectedUrl, { timeout: 15000 })
      expect(page.url()).toMatch(expectedUrl)
    })
  }
})
