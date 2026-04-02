import { test, expect } from '@playwright/test'

test.describe('Testes de Permissões de Usuários', () => {
  
  test('ADMIN - Deve ter acesso a todos os módulos', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    
    // Login como admin
    await page.fill('input[type="email"]', 'admin@mizu.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    // Aguardar redirecionamento
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Verificar itens do menu que devem estar presentes
    const menuItems = [
      'Dashboard',
      'Ordens de Serviço',
      'Solicitações',
      'Aprovações',
      'Ativos',
      'Localizações',
      'Pessoas/Equipes',
      'Relatórios'
    ]
    
    for (const item of menuItems) {
      const menuLink = page.locator(`text="${item}"`).first()
      await expect(menuLink).toBeVisible({ timeout: 5000 })
    }
    
    // Verificar que "Peças" NÃO está presente
    const partsMenu = page.locator('text="Peças"').first()
    await expect(partsMenu).not.toBeVisible()
  })
  
  test('TECHNICIAN - Deve ter acesso apenas a OS, Solicitações e Ativos', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    
    // Login como técnico
    await page.fill('input[type="email"]', 'tecnico@mizu.com')
    await page.fill('input[type="password"]', 'tecnico123')
    await page.click('button[type="submit"]')
    
    // Aguardar redirecionamento (deve ir para work-orders, não dashboard)
    await page.waitForURL('**/work-orders', { timeout: 10000 })
    
    // Verificar itens do menu que DEVEM estar presentes
    const allowedItems = [
      'Ordens de Serviço',
      'Solicitações',
      'Ativos'
    ]
    
    for (const item of allowedItems) {
      const menuLink = page.locator(`text="${item}"`).first()
      await expect(menuLink).toBeVisible({ timeout: 5000 })
    }
    
    // Verificar itens que NÃO DEVEM estar presentes
    const forbiddenItems = [
      'Dashboard',
      'Peças',
      'Localizações',
      'Pessoas/Equipes',
      'Relatórios',
      'Aprovações'
    ]
    
    for (const item of forbiddenItems) {
      const menuLink = page.locator(`text="${item}"`).first()
      await expect(menuLink).not.toBeVisible()
    }
  })
  
  test('REQUESTER - Deve ter acesso apenas a OS, Solicitações e Ativos', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    
    // Login como solicitante
    await page.fill('input[type="email"]', 'solicitante@mizu.com')
    await page.fill('input[type="password"]', 'solicitante123')
    await page.click('button[type="submit"]')
    
    // Aguardar redirecionamento (deve ir para work-orders, não dashboard)
    await page.waitForURL('**/work-orders', { timeout: 10000 })
    
    // Verificar itens do menu que DEVEM estar presentes
    const allowedItems = [
      'Ordens de Serviço',
      'Solicitações',
      'Ativos'
    ]
    
    for (const item of allowedItems) {
      const menuLink = page.locator(`text="${item}"`).first()
      await expect(menuLink).toBeVisible({ timeout: 5000 })
    }
    
    // Verificar itens que NÃO DEVEM estar presentes
    const forbiddenItems = [
      'Dashboard',
      'Peças',
      'Localizações',
      'Pessoas/Equipes',
      'Relatórios',
      'Aprovações'
    ]
    
    for (const item of forbiddenItems) {
      const menuLink = page.locator(`text="${item}"`).first()
      await expect(menuLink).not.toBeVisible()
    }
  })
  
  test('Verificar que rota /parts não é acessível', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    
    // Login como admin
    await page.fill('input[type="email"]', 'admin@mizu.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Tentar acessar rota /parts diretamente
    const response = await page.goto('http://localhost:3000/parts')
    
    // Deve retornar erro ou redirecionar
    expect(response?.status()).not.toBe(200)
  })
})
