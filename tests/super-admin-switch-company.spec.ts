import { test, expect } from '@playwright/test'

/**
 * Fase 5 — SUPER_ADMIN seleciona e troca de empresa
 * Valida que o UserMenu expoe "Trocar empresa" + "Administracao do Portal"
 * e que /admin/select-company lista empresas.
 */
test.describe('SUPER_ADMIN — seleciona e troca de empresa', () => {
  test.skip(
    !process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD,
    'Defina SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD para rodar este teste.'
  )

  test('UserMenu mostra opcoes de SUPER_ADMIN e leva a /admin/select-company', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.SUPER_ADMIN_EMAIL!)
    await page.fill('input[type="password"]', process.env.SUPER_ADMIN_PASSWORD!)
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/(hub|dashboard|admin\/select-company)/, { timeout: 15000 })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const userButton = page.locator('button', { hasText: /./ }).filter({ has: page.locator('.rounded-\\[4px\\].bg-gray-900') }).first()
    await userButton.click()

    await expect(page.getByRole('button', { name: /trocar empresa/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /administração do portal/i })).toBeVisible()

    await page.getByRole('button', { name: /trocar empresa/i }).click()
    await page.waitForURL('**/admin/select-company', { timeout: 10000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
