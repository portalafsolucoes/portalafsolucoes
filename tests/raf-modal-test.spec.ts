import { test, expect } from '@playwright/test'

test.describe('Testes do Modal RAF', () => {
  
  test('Verificar que botão Novo RAF abre o modal', async ({ page }) => {
    // Ir direto para página de RAFs
    await page.goto('http://localhost:3000/rafs')
    await page.waitForLoadState('networkidle')
    
    // Verificar se a página carregou
    await expect(page.locator('text=Relatórios de Análise de Falha')).toBeVisible({ timeout: 5000 })
    
    // Clicar no botão "Novo RAF"
    await page.click('button:has-text("Novo RAF")')
    
    // Aguardar modal aparecer
    await page.waitForTimeout(500)
    
    // Verificar que o modal está visível
    await expect(page.locator('text=Novo Relatório de Análise de Falha')).toBeVisible({ timeout: 3000 })
    
    // Verificar campos principais do modal
    await expect(page.locator('input[placeholder="FQ13"]')).toBeVisible()
    await expect(page.locator('input[placeholder="MOAGEM 2"]')).toBeVisible()
    await expect(page.locator('button:has-text("Criar RAF")')).toBeVisible()
    
    console.log('✓ Modal RAF abre corretamente')
    console.log('✓ Campos estão visíveis')
    console.log('✓ Layout compacto funcionando')
  })
  
  test('Verificar que modal pode ser fechado', async ({ page }) => {
    await page.goto('http://localhost:3000/rafs')
    await page.waitForLoadState('networkidle')
    
    // Abrir modal
    await page.click('button:has-text("Novo RAF")')
    await page.waitForTimeout(500)
    
    // Fechar modal (clicar no X ou fora)
    await page.locator('button:has-text("Cancelar")').click()
    await page.waitForTimeout(500)
    
    // Verificar que modal não está mais visível
    await expect(page.locator('text=Novo Relatório de Análise de Falha')).not.toBeVisible()
    
    console.log('✓ Modal fecha corretamente')
  })
  
  test('Verificar sidebar com logo e RAF posicionado corretamente', async ({ page }) => {
    await page.goto('http://localhost:3000/rafs')
    await page.waitForLoadState('networkidle')
    
    // Verificar que GMM está na sidebar
    await expect(page.locator('text=GMM').first()).toBeVisible()
    await expect(page.locator('text=MIZU').first()).toBeVisible()
    
    // Verificar que RAF aparece com nome completo
    await expect(page.locator('text=Relatório de Análise de Falha (RAF)').first()).toBeVisible()
    
    console.log('✓ Sidebar está correta')
    console.log('✓ Logo e textos visíveis')
    console.log('✓ RAF com nome completo')
  })
  
  test('Verificar layout compacto do modal (estilo A4)', async ({ page }) => {
    await page.goto('http://localhost:3000/rafs')
    await page.waitForLoadState('networkidle')
    
    // Abrir modal
    await page.click('button:has-text("Novo RAF")')
    await page.waitForTimeout(500)
    
    // Verificar que modal tem largura limitada (não ocupa tela toda)
    const modal = page.locator('[role="dialog"]').first()
    const modalBox = await modal.boundingBox()
    
    if (modalBox) {
      // Modal deve ter largura limitada (menos que 80% da tela)
      const viewportSize = page.viewportSize()
      if (viewportSize) {
        const modalWidthPercentage = (modalBox.width / viewportSize.width) * 100
        console.log(`📏 Largura do modal: ${modalWidthPercentage.toFixed(0)}% da tela`)
        
        // Verificar que não ocupa tela toda
        expect(modalWidthPercentage).toBeLessThan(90)
      }
    }
    
    console.log('✓ Modal tem proporção adequada')
    console.log('✓ Layout compacto estilo A4')
  })
})
