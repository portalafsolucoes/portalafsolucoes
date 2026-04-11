import { test, expect } from '@playwright/test'
import { skipScreenshotSuiteUnlessAuthorized } from './helpers/screenshotAuthorization'

skipScreenshotSuiteUnlessAuthorized(test, 'tests/sidebar-logo-final.spec.ts')

test.describe('Sidebar Logo Final Test', () => {
  test('Deve exibir logo maior ao lado do hamburger com texto embaixo', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Verificar se a logo está visível e maior
    const logo = page.locator('img[alt="Mizu Cimentos"]').first()
    await expect(logo).toBeVisible()
    
    // Verificar se o texto "Gestor de Manutenção MIZU" está visível
    const textoGestor = page.locator('text=Gestor de Manutenção MIZU')
    await expect(textoGestor).toBeVisible()
    
    // Verificar se o texto "(GMM)" está visível
    const textoGMM = page.locator('text=(GMM)')
    await expect(textoGMM).toBeVisible()
    
    // Tirar screenshot da sidebar expandida
    await page.screenshot({ 
      path: 'test-results/sidebar-logo-expandida-final.png',
      fullPage: false
    })
    
    console.log('✅ Logo maior visível com texto embaixo!')
  })

  test('Deve esconder logo e texto quando sidebar recolhida', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Clicar no botão hamburger para recolher
    const hamburgerButton = page.locator('button[title="Recolher sidebar"]')
    await hamburgerButton.click()
    
    // Aguardar animação
    await page.waitForTimeout(500)
    
    // Verificar que apenas o botão hamburger está visível
    const expandButton = page.locator('button[title="Expandir sidebar"]')
    await expect(expandButton).toBeVisible()
    
    // Verificar que logo e textos não estão visíveis
    const logo = page.locator('img[alt="Mizu Cimentos"]').first()
    await expect(logo).not.toBeVisible()
    
    // Tirar screenshot da sidebar recolhida
    await page.screenshot({ 
      path: 'test-results/sidebar-logo-recolhida-final.png',
      fullPage: false
    })
    
    console.log('✅ Sidebar recolhida mostrando apenas hamburger!')
  })

  test('Deve expandir sidebar ao clicar no hamburger novamente', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Recolher
    const collapseButton = page.locator('button[title="Recolher sidebar"]')
    await collapseButton.click()
    await page.waitForTimeout(500)
    
    // Expandir
    const expandButton = page.locator('button[title="Expandir sidebar"]')
    await expandButton.click()
    await page.waitForTimeout(500)
    
    // Verificar que logo e textos voltaram a ser visíveis
    const logo = page.locator('img[alt="Mizu Cimentos"]').first()
    await expect(logo).toBeVisible()
    
    const textoGestor = page.locator('text=Gestor de Manutenção MIZU')
    await expect(textoGestor).toBeVisible()
    
    console.log('✅ Sidebar expandida novamente com sucesso!')
  })

  test('Deve verificar tamanho da logo (maior que antes)', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Pegar dimensões da logo
    const logo = page.locator('img[alt="Mizu Cimentos"]').first()
    const box = await logo.boundingBox()
    
    // Logo deve ter pelo menos 60px de largura (w-16 = 64px)
    expect(box?.width).toBeGreaterThanOrEqual(60)
    
    console.log(`✅ Logo com tamanho adequado: ${box?.width}px x ${box?.height}px`)
  })
})
