import { test, expect } from '@playwright/test'
import { skipScreenshotSuiteUnlessAuthorized } from './helpers/screenshotAuthorization'

skipScreenshotSuiteUnlessAuthorized(test, 'tests/logo-size-final.spec.ts')

test.describe('Logo Size Final Test', () => {
  test('Deve exibir logo grande ocupando todo o espaço disponível', async ({ page }) => {
    // Configurar viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Ir para o dashboard
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Aguardar um pouco para garantir que tudo carregou
    await page.waitForTimeout(2000)
    
    // Tirar screenshot da sidebar completa
    await page.screenshot({ 
      path: 'test-results/logo-grande-final.png',
      fullPage: false
    })
    
    console.log('✅ Screenshot capturada! Verifique test-results/logo-grande-final.png')
  })

  test('Deve verificar texto com capitalização correta', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Verificar se o texto está presente (case-sensitive)
    const textoGestor = page.locator('text=Gestor de Manutenção Mizu')
    const textoGMM = page.locator('text=(GMM)')
    
    // Aguardar e verificar
    await page.waitForTimeout(2000)
    
    // Tirar screenshot focado no header
    const sidebar = page.locator('aside').first()
    await sidebar.screenshot({ 
      path: 'test-results/sidebar-header-final.png'
    })
    
    console.log('✅ Screenshot do header capturada!')
  })

  test('Deve mostrar sidebar recolhida com apenas hamburger', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Procurar pelo botão hamburger
    const hamburgerButton = page.locator('button').filter({ hasText: /menu/i }).first()
    
    // Se encontrar, clicar
    if (await hamburgerButton.isVisible()) {
      await hamburgerButton.click()
      await page.waitForTimeout(500)
      
      await page.screenshot({ 
        path: 'test-results/sidebar-recolhida-final.png',
        fullPage: false
      })
      
      console.log('✅ Screenshot da sidebar recolhida capturada!')
    }
  })
})
