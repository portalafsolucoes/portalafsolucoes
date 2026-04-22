import { test, expect } from '@playwright/test'

/**
 * Fase 3 — Permissoes do perfil PLANEJADOR
 * PLANEJADOR deve ver Dashboard, OS, SS, Aprovacoes, Planejamento/Programacao, RAF.
 * NAO deve ver Configuracoes, Painel Administrativo ou modulos de SUPER_ADMIN.
 */
test.describe('Permissoes do perfil PLANEJADOR', () => {
  test.skip(
    !process.env.PLANEJADOR_EMAIL || !process.env.PLANEJADOR_PASSWORD,
    'Defina PLANEJADOR_EMAIL e PLANEJADOR_PASSWORD para rodar este teste.'
  )

  test('sidebar expoe apenas as features permitidas', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.PLANEJADOR_EMAIL!)
    await page.fill('input[type="password"]', process.env.PLANEJADOR_PASSWORD!)
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/(hub|dashboard|work-orders)/, { timeout: 15000 })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const allowed = ['Dashboard', 'Ordens de Serviço', 'Solicitações', 'Aprovações', 'Planejamento']
    for (const label of allowed) {
      await expect(page.locator(`nav`).getByText(label, { exact: false }).first()).toBeVisible()
    }

    const forbidden = ['Administração do Portal', 'Configurações do Portal']
    for (const label of forbidden) {
      await expect(page.locator(`nav`).getByText(label, { exact: false })).toHaveCount(0)
    }
  })
})
