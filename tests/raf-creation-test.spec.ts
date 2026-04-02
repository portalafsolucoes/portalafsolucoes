import { test, expect } from '@playwright/test'

test.describe('Testes de Criação de RAF', () => {
  
  test('Deve criar um novo RAF com sucesso', async ({ page }) => {
    // Fazer login como admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@mizu.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    // Aguardar redirecionamento
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Navegar para RAFs
    await page.goto('http://localhost:3000/rafs')
    await page.waitForLoadState('networkidle')
    
    // Clicar em "Novo RAF"
    await page.click('text=Novo RAF')
    
    // Aguardar página carregar
    await page.waitForURL('**/rafs/new', { timeout: 5000 })
    await expect(page.locator('h1:has-text("Novo RAF")')).toBeVisible()
    
    // Preencher campos obrigatórios
    await page.fill('input[placeholder="Ex: FQ13"]', 'FQ-TEST-001')
    await page.fill('input[placeholder="Ex: MOAGEM 2"]', 'Área de Teste')
    await page.fill('input[placeholder="Ex: SENSOR TEMP. ENT. FIL."]', 'Equipamento Teste')
    await page.fill('input[type="date"]', '2025-10-30')
    await page.fill('input[type="time"]', '14:30')
    await page.fill('input[placeholder="Nome do operador"]', 'João Silva')
    
    // Preencher textareas
    await page.fill('textarea[placeholder*="Descreva detalhadamente a falha"]', 'Falha no sensor de temperatura')
    await page.fill('textarea[placeholder*="Descreva as observações"]', 'Observação de teste')
    await page.fill('textarea[placeholder*="Descreva as ações de bloqueio"]', 'Ação imediata de teste')
    
    // Preencher pelo menos um porquê
    await page.fill('input[placeholder="Porquê 1..."]', 'Primeiro porquê')
    
    // Selecionar tipo de falha
    await page.check('input[value="RANDOM"]')
    
    // Submeter formulário
    await page.click('button[type="submit"]')
    
    // Verificar se foi redirecionado para lista
    await page.waitForURL('**/rafs', { timeout: 10000 })
    
    // Verificar se o RAF aparece na lista
    await expect(page.locator('text=FQ-TEST-001')).toBeVisible({ timeout: 5000 })
    
    console.log('✓ RAF criado com sucesso!')
    console.log('✓ RAF aparece na listagem')
  })
  
  test('Deve validar campos obrigatórios', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@mizu.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    await page.goto('http://localhost:3000/rafs/new')
    await page.waitForLoadState('networkidle')
    
    // Tentar submeter sem preencher
    await page.click('button[type="submit"]')
    
    // Verificar que não redirecionou (validação HTML5)
    await expect(page).toHaveURL('**/rafs/new')
    
    console.log('✓ Validação de campos obrigatórios funcionando')
  })
  
  test('Verificar layout responsivo do formulário', async ({ page }) => {
    // Testar em mobile
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@mizu.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await page.goto('http://localhost:3000/rafs/new')
    await page.waitForLoadState('networkidle')
    
    // Verificar que elementos estão visíveis em mobile
    await expect(page.locator('h1:has-text("Novo RAF")')).toBeVisible()
    await expect(page.locator('button:has-text("Criar RAF")')).toBeVisible()
    
    console.log('✓ Layout responsivo OK')
  })
})
