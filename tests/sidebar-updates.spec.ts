import { test, expect } from '@playwright/test'

test.describe('Sidebar Updates', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
  })

  test('Deve exibir a logo atualizada na sidebar', async ({ page }) => {
    // Verificar se a logo está presente
    const logo = page.locator('img[alt="Mizu Cimentos"]')
    await expect(logo).toBeVisible()
    
    // Verificar se o src da logo está correto
    await expect(logo).toHaveAttribute('src', /logo\.png/)
  })

  test('Deve exibir o menu GVP com nome completo', async ({ page }) => {
    // Verificar se o menu existe com o nome completo
    const gvpMenu = page.locator('text=Gerenciamento de Variáveis de Processo (GVP)')
    await expect(gvpMenu).toBeVisible()
  })

  test('Deve ter o botão de recolher sidebar visível em desktop', async ({ page }) => {
    // Ajustar viewport para desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Verificar se o botão de collapse existe
    const collapseButton = page.locator('button[title*="sidebar"]').first()
    await expect(collapseButton).toBeVisible()
  })

  test('Deve recolher a sidebar ao clicar no botão', async ({ page }) => {
    // Ajustar viewport para desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Pegar a sidebar
    const sidebar = page.locator('aside').first()
    
    // Verificar largura inicial (deve ser 256px = w-64)
    const initialBox = await sidebar.boundingBox()
    expect(initialBox?.width).toBeGreaterThan(200)
    
    // Clicar no botão de collapse
    const collapseButton = page.locator('button[title*="sidebar"]').first()
    await collapseButton.click()
    
    // Aguardar animação
    await page.waitForTimeout(500)
    
    // Verificar se a sidebar está menor (deve ser 80px = w-20)
    const collapsedBox = await sidebar.boundingBox()
    expect(collapsedBox?.width).toBeLessThan(100)
  })

  test('Deve expandir a sidebar ao clicar no botão novamente', async ({ page }) => {
    // Ajustar viewport para desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    
    const sidebar = page.locator('aside').first()
    const collapseButton = page.locator('button[title*="sidebar"]').first()
    
    // Recolher
    await collapseButton.click()
    await page.waitForTimeout(500)
    
    // Expandir
    await collapseButton.click()
    await page.waitForTimeout(500)
    
    // Verificar se voltou ao tamanho normal
    const expandedBox = await sidebar.boundingBox()
    expect(expandedBox?.width).toBeGreaterThan(200)
  })

  test('Deve ocultar textos dos menus quando recolhida', async ({ page }) => {
    // Ajustar viewport para desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    
    const collapseButton = page.locator('button[title*="sidebar"]').first()
    
    // Verificar que o texto está visível antes de recolher
    const dashboardText = page.locator('aside nav').locator('text=Dashboard').first()
    await expect(dashboardText).toBeVisible()
    
    // Recolher
    await collapseButton.click()
    await page.waitForTimeout(500)
    
    // Verificar que o texto não está mais visível
    await expect(dashboardText).not.toBeVisible()
  })

  test('Deve mostrar tooltip com nome do menu quando recolhida', async ({ page }) => {
    // Ajustar viewport para desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    
    const collapseButton = page.locator('button[title*="sidebar"]').first()
    
    // Recolher
    await collapseButton.click()
    await page.waitForTimeout(500)
    
    // Verificar se os links têm o atributo title
    const dashboardLink = page.locator('a[href="/dashboard"]').first()
    await expect(dashboardLink).toHaveAttribute('title', 'Dashboard')
  })

  test('Deve ajustar o padding do conteúdo principal quando recolhida', async ({ page }) => {
    // Ajustar viewport para desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    
    const mainContent = page.locator('main').first()
    const collapseButton = page.locator('button[title*="sidebar"]').first()
    
    // Pegar padding inicial
    const initialPadding = await mainContent.evaluate((el) => {
      return window.getComputedStyle(el).paddingLeft
    })
    
    // Recolher
    await collapseButton.click()
    await page.waitForTimeout(500)
    
    // Verificar que o padding diminuiu
    const collapsedPadding = await mainContent.evaluate((el) => {
      return window.getComputedStyle(el).paddingLeft
    })
    
    expect(parseInt(collapsedPadding)).toBeLessThan(parseInt(initialPadding))
  })

  test('Não deve mostrar botão de collapse em mobile', async ({ page }) => {
    // Ajustar viewport para mobile
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Verificar se o botão de collapse está oculto
    const collapseButton = page.locator('button[title*="sidebar"]').first()
    await expect(collapseButton).not.toBeVisible()
  })

  test('Deve navegar para página GVP ao clicar no menu', async ({ page }) => {
    // Clicar no menu GVP
    const gvpMenu = page.locator('text=Gerenciamento de Variáveis de Processo (GVP)')
    await gvpMenu.click()
    
    // Verificar se navegou para a página correta
    await page.waitForURL('**/gep')
    expect(page.url()).toContain('/gep')
  })
})
