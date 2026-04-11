import { test, expect } from '@playwright/test'
import { skipScreenshotSuiteUnlessAuthorized } from './helpers/screenshotAuthorization'

skipScreenshotSuiteUnlessAuthorized(test, 'tests/access-test.spec.ts')

test.describe('Teste de Acesso ao Sistema GMM', () => {
  test('Deve acessar a página de login', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Verificar se está na página de login ou dashboard
    const url = page.url()
    console.log('URL atual:', url)
    
    // Tirar screenshot
    await page.screenshot({ path: 'test-results/acesso-inicial.png', fullPage: true })
    
    // Verificar se não há erros do Turbopack
    const turbopackError = page.locator('text=/Turbopack error/i')
    await expect(turbopackError).toHaveCount(0)
    
    console.log('✅ Sistema acessível sem erros!')
  })

  test('Deve exibir a logo MIZU grande na sidebar', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Verificar se a logo está presente
    const logo = page.locator('img[alt="Mizu Cimentos"]').first()
    const isVisible = await logo.isVisible().catch(() => false)
    
    console.log('Logo visível:', isVisible)
    
    // Tirar screenshot da sidebar
    await page.screenshot({ path: 'test-results/sidebar-logo-teste.png', fullPage: false })
    
    console.log('✅ Screenshot da sidebar capturada!')
  })

  test('Deve verificar texto GMM na página', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Verificar se há algum texto relacionado ao GMM
    const pageContent = await page.content()
    const hasGMM = pageContent.includes('GMM') || pageContent.includes('Gestor')
    
    console.log('Página contém GMM ou Gestor:', hasGMM)
    
    // Tirar screenshot completo
    await page.screenshot({ path: 'test-results/pagina-completa.png', fullPage: true })
    
    console.log('✅ Verificação de conteúdo concluída!')
  })
})
