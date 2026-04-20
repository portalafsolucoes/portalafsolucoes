import { test, expect } from '@playwright/test'

// Smoke test da tela PA das RAFs (/rafs/action-plan).
// Verifica estrutura visual, sidebar, KPIs e presenca da legenda monocromatica.
// Nao executa mutacoes: apenas leitura do estado renderizado.

test.describe('PA das RAFs', () => {
  test('Pagina renderiza header, KPIs e legenda', async ({ page }) => {
    await page.goto('http://localhost:3000/rafs/action-plan')
    await page.waitForLoadState('networkidle')

    // Header
    await expect(page.locator('h1:has-text("PA das RAFs")').first()).toBeVisible({
      timeout: 8000,
    })

    // Dashboard cards — 4 KPIs obrigatorios
    await expect(page.getByText('RAFs abertas')).toBeVisible()
    await expect(page.getByText('RAFs finalizadas')).toBeVisible()
    await expect(page.getByText('Ações no prazo', { exact: false })).toBeVisible()
    await expect(page.getByText('Ações atrasadas', { exact: false })).toBeVisible()

    // Legenda — simbolos monocromaticos
    await expect(page.getByText('Legenda:')).toBeVisible()
  })

  test('Grupo "Analise de Falhas" aparece no menu com os dois sub-itens', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')

    const group = page.getByRole('button', { name: /Análise de Falhas|Analise de Falhas/ }).first()
    if (await group.isVisible().catch(() => false)) {
      await group.click()
    }

    await expect(page.getByRole('link', { name: 'RAFs', exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'PA das RAFs', exact: true }).first()).toBeVisible()
  })
})
