import { test, expect } from '@playwright/test'

test.describe('Servidor Funcionando Test', () => {
  test('Deve carregar a página inicial sem erros do Turbopack', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Verificar se o título da página contém GMM
    await expect(page).toHaveTitle(/GMM/)
    
    // Verificar se não há mensagens de erro do Turbopack
    const turbopackErrors = page.locator('text=/Turbopack error/i')
    await expect(turbopackErrors).toHaveCount(0)
    
    console.log('✅ Servidor funcionando sem erros do Turbopack!')
  })
})
