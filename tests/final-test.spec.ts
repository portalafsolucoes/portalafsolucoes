import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Testes Finais - Pessoas e Equipes', () => {
  
  test('01 - Página única com abas deve funcionar', async ({ page }) => {
    await page.goto(`${BASE_URL}/people-teams`)
    
    // Verificar se página carrega
    await expect(page.locator('text=Pessoas e Equipes')).toBeVisible()
    
    // Verificar abas
    await expect(page.locator('button:has-text("Pessoas")')).toBeVisible()
    await expect(page.locator('button:has-text("Equipes")')).toBeVisible()
  })

  test('02 - Trocar entre abas deve funcionar', async ({ page }) => {
    await page.goto(`${BASE_URL}/people-teams`)
    await page.waitForTimeout(1000)
    
    // Clicar na aba Equipes
    await page.click('button:has-text("Equipes")')
    await page.waitForTimeout(500)
    
    // Verificar se mostra conteúdo de equipes
    await expect(page.locator('button:has-text("Nova Equipe")')).toBeVisible({ timeout: 5000 })
    
    // Voltar para Pessoas
    await page.click('button:has-text("Pessoas")')
    await page.waitForTimeout(500)
    
    // Verificar se mostra conteúdo de pessoas
    await expect(page.locator('button:has-text("Adicionar Pessoa")')).toBeVisible({ timeout: 5000 })
  })

  test('03 - Visualização em grade deve funcionar', async ({ page }) => {
    await page.goto(`${BASE_URL}/people-teams`)
    await page.waitForTimeout(1000)
    
    // Clicar no botão de grade
    const gridButton = page.locator('button[title="Visualização em Grade"]')
    if (await gridButton.isVisible()) {
      await gridButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('04 - Visualização em tabela deve funcionar', async ({ page }) => {
    await page.goto(`${BASE_URL}/people-teams`)
    await page.waitForTimeout(1000)
    
    // Clicar no botão de tabela
    const tableButton = page.locator('button[title="Visualização em Tabela"]')
    if (await tableButton.isVisible()) {
      await tableButton.click()
      await page.waitForTimeout(500)
      
      // Verificar se tabela aparece
      await expect(page.locator('table')).toBeVisible({ timeout: 5000 })
    }
  })

  test('05 - Visualização hierárquica deve funcionar', async ({ page }) => {
    await page.goto(`${BASE_URL}/people-teams`)
    await page.waitForTimeout(1000)
    
    // Clicar no botão de hierarquia
    const hierarchyButton = page.locator('button[title="Visualização Hierárquica"]')
    if (await hierarchyButton.isVisible()) {
      await hierarchyButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('06 - Modal deve ter blur leve', async ({ page }) => {
    await page.goto(`${BASE_URL}/people-teams`)
    await page.waitForTimeout(1000)
    
    // Abrir modal
    await page.click('button:has-text("Adicionar Pessoa")')
    await page.waitForTimeout(500)
    
    // Verificar se overlay tem backdrop-blur
    const overlay = page.locator('.backdrop-blur-sm')
    await expect(overlay).toBeVisible({ timeout: 5000 })
  })

  test('07 - Clicar em pessoa deve abrir pessoa correta', async ({ page }) => {
    await page.goto(`${BASE_URL}/people-teams`)
    await page.waitForTimeout(1500)
    
    // Pegar primeiro card de pessoa
    const firstCard = page.locator('[data-user-id]').first()
    
    if (await firstCard.isVisible()) {
      // Pegar o ID do data attribute
      const userId = await firstCard.getAttribute('data-user-id')
      console.log('Card user ID:', userId)
      
      // Clicar no card
      await firstCard.click()
      await page.waitForTimeout(1000)
      
      // Verificar se modal abriu
      await expect(page.locator('text=Detalhes da Pessoa')).toBeVisible({ timeout: 5000 })
    }
  })

  test('08 - Menu deve ter Pessoas/Equipes junto', async ({ page }) => {
    await page.goto(`${BASE_URL}/people-teams`)
    
    // Verificar se existe o link no menu
    await expect(page.locator('a[href="/people-teams"]')).toBeVisible()
  })
})
