import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Pessoas e Equipes - Testes com Modais', () => {
  
  test('01 - Navbar deve estar presente na página de pessoas', async ({ page }) => {
    await page.goto(`${BASE_URL}/people`)
    
    // Verificar se Navbar está visível
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('text=AdwTech')).toBeVisible()
    await expect(page.locator('a[href="/people"]')).toBeVisible()
  })

  test('02 - Botão Adicionar Pessoa deve abrir modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/people`)
    
    // Clicar no botão Adicionar Pessoa
    await page.click('button:has-text("Adicionar Pessoa")')
    
    // Verificar se modal abriu
    await expect(page.locator('text=Adicionar Nova Pessoa').or(page.locator('text=Nova Pessoa'))).toBeVisible({ timeout: 5000 })
    
    // Verificar se ainda estamos na mesma URL
    expect(page.url()).toBe(`${BASE_URL}/people`)
  })

  test('03 - Modal deve fechar ao clicar no X', async ({ page }) => {
    await page.goto(`${BASE_URL}/people`)
    
    await page.click('button:has-text("Adicionar Pessoa")')
    await page.waitForSelector('text=Adicionar Nova Pessoa, text=Nova Pessoa', { timeout: 5000 })
    
    // Clicar no botão X para fechar
    await page.click('button:has(svg)')
    
    // Modal deve sumir
    await expect(page.locator('text=Adicionar Nova Pessoa')).not.toBeVisible()
  })

  test('04 - Clicar em pessoa deve abrir modal de detalhes', async ({ page }) => {
    await page.goto(`${BASE_URL}/people`)
    
    // Aguardar carregar
    await page.waitForTimeout(1000)
    
    // Clicar no primeiro card de pessoa (se existir)
    const firstPerson = page.locator('.cursor-pointer').first()
    if (await firstPerson.isVisible()) {
      await firstPerson.click()
      
      // Verificar se modal de detalhes abriu
      await expect(page.locator('text=Detalhes da Pessoa')).toBeVisible({ timeout: 5000 })
      
      // Verificar se ainda estamos na mesma URL
      expect(page.url()).toBe(`${BASE_URL}/people`)
    }
  })

  test('05 - Navbar deve estar presente na página de equipes', async ({ page }) => {
    await page.goto(`${BASE_URL}/teams`)
    
    // Verificar se Navbar está visível
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('text=AdwTech')).toBeVisible()
  })

  test('06 - Botão Nova Equipe deve abrir modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/teams`)
    
    // Clicar no botão Nova Equipe
    await page.click('button:has-text("Nova Equipe")')
    
    // Verificar se modal abriu
    await expect(page.locator('text=Nova Equipe').or(page.locator('text=Adicionar Equipe'))).toBeVisible({ timeout: 5000 })
    
    // Verificar se ainda estamos na mesma URL
    expect(page.url()).toBe(`${BASE_URL}/teams`)
  })

  test('07 - Clicar em equipe deve abrir modal de detalhes', async ({ page }) => {
    await page.goto(`${BASE_URL}/teams`)
    
    // Aguardar carregar
    await page.waitForTimeout(1000)
    
    // Clicar no primeiro card de equipe (se existir)
    const firstTeam = page.locator('.cursor-pointer').first()
    if (await firstTeam.isVisible()) {
      await firstTeam.click()
      
      // Verificar se modal de detalhes abriu
      await expect(page.locator('text=Detalhes da Equipe')).toBeVisible({ timeout: 5000 })
      
      // Verificar se ainda estamos na mesma URL
      expect(page.url()).toBe(`${BASE_URL}/teams`)
    }
  })

  test('08 - Modal de edição deve abrir dentro do modal de detalhes', async ({ page }) => {
    await page.goto(`${BASE_URL}/people`)
    
    await page.waitForTimeout(1000)
    
    const firstPerson = page.locator('.cursor-pointer').first()
    if (await firstPerson.isVisible()) {
      await firstPerson.click()
      await page.waitForSelector('text=Detalhes da Pessoa', { timeout: 5000 })
      
      // Clicar em Editar
      await page.click('button:has-text("Editar")')
      
      // Verificar se modal de edição abriu
      await expect(page.locator('text=Editar Pessoa')).toBeVisible({ timeout: 5000 })
    }
  })

  test('09 - Deve poder fechar modal com ESC', async ({ page }) => {
    await page.goto(`${BASE_URL}/people`)
    
    await page.click('button:has-text("Adicionar Pessoa")')
    await page.waitForSelector('text=Adicionar Nova Pessoa, text=Nova Pessoa', { timeout: 5000 })
    
    // Pressionar ESC
    await page.keyboard.press('Escape')
    
    // Modal deve sumir
    await expect(page.locator('text=Adicionar Nova Pessoa')).not.toBeVisible()
  })

  test('10 - Background overlay deve fechar modal ao clicar', async ({ page }) => {
    await page.goto(`${BASE_URL}/teams`)
    
    await page.click('button:has-text("Nova Equipe")')
    await page.waitForTimeout(500)
    
    // Clicar no overlay (fora do modal)
    await page.locator('.bg-black').click({ position: { x: 10, y: 10 } })
    
    // Modal deve sumir
    await expect(page.locator('text=Nova Equipe')).not.toBeVisible()
  })
})
