import { test, expect } from '@playwright/test'

test.describe('Logo Test', () => {
  test('Deve exibir a nova logo com texto MIZU CIMENTOS', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Aguardar a logo carregar
    const logo = page.locator('img[alt="Mizu Cimentos"]').first()
    await expect(logo).toBeVisible()
    
    // Verificar se a logo está carregando do caminho correto
    await expect(logo).toHaveAttribute('src', /logo\.png/)
    
    // Tirar screenshot para verificação visual
    await page.screenshot({ path: 'test-results/nova-logo-dashboard.png' })
    
    console.log('✅ Logo carregada com sucesso!')
  })

  test('Deve exibir a logo na sidebar expandida', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    
    const logo = page.locator('img[alt="Mizu Cimentos"]').first()
    await expect(logo).toBeVisible()
    
    await page.screenshot({ path: 'test-results/logo-sidebar-expandida.png' })
  })

  test('Deve esconder a logo quando sidebar está recolhida', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Clicar no botão de recolher
    const collapseButton = page.locator('button[title*="sidebar"]').first()
    await collapseButton.click()
    
    // Aguardar animação
    await page.waitForTimeout(500)
    
    // Verificar que a logo não está visível (desktop)
    const logo = page.locator('img[alt="Mizu Cimentos"]').first()
    await expect(logo).not.toBeVisible()
    
    await page.screenshot({ path: 'test-results/logo-sidebar-recolhida.png' })
  })
})
