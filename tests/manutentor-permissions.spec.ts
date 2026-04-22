import { test, expect } from '@playwright/test'

/**
 * Fase 3 — Permissoes do perfil MANUTENTOR
 * MANUTENTOR so ve Ativos, OS, SS e RAF; redireciona para /work-orders apos login.
 */
test.describe('Permissoes do perfil MANUTENTOR', () => {
  test.skip(
    !process.env.MANUTENTOR_EMAIL || !process.env.MANUTENTOR_PASSWORD,
    'Defina MANUTENTOR_EMAIL e MANUTENTOR_PASSWORD para rodar este teste.'
  )

  test('sidebar so expoe OS, SS, Ativos e RAF', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.MANUTENTOR_EMAIL!)
    await page.fill('input[type="password"]', process.env.MANUTENTOR_PASSWORD!)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/work-orders', { timeout: 15000 })

    const allowed = ['Ordens de Serviço', 'Solicitações', 'Ativos']
    for (const label of allowed) {
      await expect(page.locator('nav').getByText(label, { exact: false }).first()).toBeVisible()
    }

    const forbidden = [
      'Dashboard',
      'Aprovações',
      'Pessoas',
      'Planejamento',
      'Administração do Portal',
    ]
    for (const label of forbidden) {
      await expect(page.locator('nav').getByText(label, { exact: false })).toHaveCount(0)
    }
  })

  test('acesso direto a /dashboard nao permitido redireciona', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.MANUTENTOR_EMAIL!)
    await page.fill('input[type="password"]', process.env.MANUTENTOR_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/work-orders', { timeout: 15000 })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toContain('/dashboard')
  })
})
