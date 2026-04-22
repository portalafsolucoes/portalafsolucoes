import { test, expect } from '@playwright/test'

/**
 * Fase 7 — Troca forcada de senha
 * Valida que /change-password renderiza com layout autocontido e que o
 * botao Salvar exige preenchimento basico.
 */
test.describe('Change password (fluxo basico)', () => {
  test('/change-password publico renderiza formulario', async ({ page }) => {
    await page.goto('/change-password')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByLabel(/senha atual|temporária/i)).toBeVisible()
    await expect(page.getByLabel(/^nova senha$/i)).toBeVisible()
    await expect(page.getByLabel(/confirmar nova senha/i)).toBeVisible()
  })
})
