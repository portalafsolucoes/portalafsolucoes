import { test, expect } from '@playwright/test'

/**
 * Fase 4 — Signup publico (fluxo feliz)
 * Valida que /register renderiza, submete um cadastro novo e redireciona
 * para /register/pending com o conteudo explicativo esperado.
 */
test.describe('Signup publico — fluxo feliz', () => {
  test('abre /register a partir do /login e finaliza em /register/pending', async ({ page }) => {
    await page.goto('/login')

    const registerLink = page.getByRole('button', { name: /cadastre-se/i })
    await expect(registerLink).toBeVisible()
    await registerLink.click()

    await page.waitForURL('**/register')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('/register/pending exibe os 3 passos do processo', async ({ page }) => {
    await page.goto('/register/pending')

    await expect(page.getByText(/cadastro recebido/i)).toBeVisible()
    await expect(page.getByText(/confirme seu e-mail/i)).toBeVisible()
    await expect(page.getByText(/aguarde aprovação do portal/i)).toBeVisible()
    await expect(page.getByText(/receba o aviso de liberação/i)).toBeVisible()
  })

  test('/register/verify sem token mostra estado "missing"', async ({ page }) => {
    await page.goto('/register/verify')

    await expect(page.getByText(/token ausente/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /ir para o login/i })).toBeVisible()
  })
})
