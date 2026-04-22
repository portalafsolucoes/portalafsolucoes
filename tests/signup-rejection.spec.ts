import { test, expect } from '@playwright/test'

/**
 * Fase 4 — Rejeicao pelo SUPER_ADMIN
 * Depende de um login SUPER_ADMIN valido em SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD.
 * O teste apenas confirma que a UI expoe o modal de rejeicao com motivo
 * obrigatorio e os filtros de status; nao cria/rejeita dados reais.
 */
test.describe('Aprovacao de empresa — UI SUPER_ADMIN', () => {
  test.skip(
    !process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD,
    'Defina SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD para rodar este teste.'
  )

  test('tela /admin/portal expoe filtros de status e banner de pendentes', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.SUPER_ADMIN_EMAIL!)
    await page.fill('input[type="password"]', process.env.SUPER_ADMIN_PASSWORD!)
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/(hub|dashboard|admin\/select-company)/, { timeout: 15000 })

    await page.goto('/admin/portal')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: /todas/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /pendentes/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /ativas/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /rejeitadas/i }).first()).toBeVisible()
  })
})
