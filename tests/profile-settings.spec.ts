import { test, expect } from '@playwright/test'

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000'

test.describe('Profile settings', () => {
  test('keeps the existing username when saving profile data', async ({ page }) => {
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Email').fill('super.admin@polimix.local')
    await page.getByLabel('Senha').fill('Teste@123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL(/\/cmms|\/dashboard|\/hub/, { timeout: 30000 })

    await page.goto(`${baseURL}/settings`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Salvar perfil' })).toBeVisible()

    const [updateResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/profile') && response.request().method() === 'PATCH'
      ),
      page.getByRole('button', { name: 'Salvar perfil' }).click(),
    ])

    expect(updateResponse.ok()).toBeTruthy()
    await expect(page.getByText('Dados do perfil atualizados com sucesso.')).toBeVisible()
  })
})
