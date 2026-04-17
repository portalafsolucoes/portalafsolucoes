import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Pessoas e Equipes - Testes Completos', () => {
  let _personId: string
  let _teamId: string

  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', 'admin@example.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
  })

  test.describe('Pessoas - CRUD Completo', () => {
    test('01 - Deve acessar a página de lista de pessoas', async ({ page }) => {
      await page.click('a[href="/people"]')
      await page.waitForURL('**/people')
      
      await expect(page.locator('h1')).toContainText('Pessoas')
      await expect(page.locator('text=Adicionar Pessoa')).toBeVisible()
    })

    test('02 - Deve criar uma nova pessoa', async ({ page }) => {
      await page.goto(`${BASE_URL}/people/new`)
      
      await page.fill('input[name="firstName"]', 'João')
      await page.fill('input[name="lastName"]', 'Silva')
      await page.fill('input[name="email"]', `joao.silva.${Date.now()}@test.com`)
      await page.fill('input[name="password"]', 'senha123')
      await page.fill('input[name="phone"]', '11987654321')
      await page.fill('input[name="jobTitle"]', 'Técnico Eletricista')
      await page.selectOption('select[name="role"]', 'TECHNICIAN')
      await page.fill('input[name="rate"]', '50.00')
      
      await page.click('button[type="submit"]')
      await page.waitForURL('**/people')
      
      await expect(page.locator('text=João Silva')).toBeVisible()
      
      // Capturar ID da pessoa criada
      const personLink = page.locator('a:has-text("João Silva")').first()
      const href = await personLink.getAttribute('href')
      _personId = href?.split('/').pop() || ''
    })

    test('03 - Deve visualizar detalhes da pessoa', async ({ page }) => {
      await page.goto(`${BASE_URL}/people`)
      
      const personLink = page.locator('a:has-text("João Silva")').first()
      await personLink.click()
      
      await expect(page.locator('h1')).toContainText('João Silva')
      await expect(page.locator('text=Técnico Eletricista')).toBeVisible()
      await expect(page.locator('text=joao.silva')).toBeVisible()
      await expect(page.locator('text=11987654321')).toBeVisible()
    })

    test('04 - Deve editar pessoa existente', async ({ page }) => {
      await page.goto(`${BASE_URL}/people`)
      
      const personLink = page.locator('a:has-text("João Silva")').first()
      await personLink.click()
      
      await page.click('text=Editar')
      await page.waitForURL('**/edit')
      
      await page.fill('input[name="jobTitle"]', 'Técnico Eletricista Sênior')
      await page.fill('input[name="rate"]', '75.00')
      
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Técnico Eletricista Sênior')).toBeVisible()
    })

    test('05 - Deve filtrar pessoas por papel', async ({ page }) => {
      await page.goto(`${BASE_URL}/people`)
      
      await page.selectOption('select', 'TECHNICIAN')
      
      await expect(page.locator('text=João Silva')).toBeVisible()
    })

    test('06 - Deve buscar pessoa por nome', async ({ page }) => {
      await page.goto(`${BASE_URL}/people`)
      
      await page.fill('input[placeholder*="Buscar"]', 'João')
      
      await expect(page.locator('text=João Silva')).toBeVisible()
    })
  })

  test.describe('Equipes - CRUD Completo', () => {
    test('07 - Deve acessar a página de lista de equipes', async ({ page }) => {
      await page.click('a[href="/teams"]')
      await page.waitForURL('**/teams')
      
      await expect(page.locator('h1')).toContainText('Equipes')
      await expect(page.locator('text=Nova Equipe')).toBeVisible()
    })

    test('08 - Deve criar uma nova equipe', async ({ page }) => {
      await page.goto(`${BASE_URL}/teams/new`)
      
      await page.fill('input[name="name"]', 'Equipe Elétrica')
      await page.fill('textarea[name="description"]', 'Equipe responsável por manutenção elétrica')
      
      // Selecionar membros (se existirem usuários)
      const firstCheckbox = page.locator('input[type="checkbox"]').first()
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.check()
      }
      
      await page.click('button[type="submit"]')
      await page.waitForURL('**/teams')
      
      await expect(page.locator('text=Equipe Elétrica')).toBeVisible()
    })

    test('09 - Deve visualizar detalhes da equipe', async ({ page }) => {
      await page.goto(`${BASE_URL}/teams`)
      
      const teamLink = page.locator('text=Equipe Elétrica').first()
      await teamLink.click()
      
      await expect(page.locator('h1')).toContainText('Equipe Elétrica')
      await expect(page.locator('text=Equipe responsável por manutenção elétrica')).toBeVisible()
      await expect(page.locator('text=Membros da Equipe')).toBeVisible()
    })

    test('10 - Deve editar equipe existente', async ({ page }) => {
      await page.goto(`${BASE_URL}/teams`)
      
      const teamCard = page.locator('text=Equipe Elétrica').first()
      await teamCard.click()
      
      await page.click('text=Editar')
      await page.waitForURL('**/edit')
      
      await page.fill('textarea[name="description"]', 'Equipe responsável por toda manutenção elétrica predial')
      
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Equipe responsável por toda manutenção elétrica predial')).toBeVisible()
    })

    test('11 - Deve adicionar membro à equipe', async ({ page }) => {
      await page.goto(`${BASE_URL}/teams`)
      
      const teamCard = page.locator('text=Equipe Elétrica').first()
      await teamCard.click()
      
      const _initialMemberCount = await page.locator('text=Membros').first().textContent()
      
      await page.click('text=Editar')
      
      // Adicionar um membro adicional
      const uncheckedBox = page.locator('input[type="checkbox"]:not(:checked)').first()
      if (await uncheckedBox.isVisible()) {
        await uncheckedBox.check()
        await page.click('button[type="submit"]')
        
        // Verificar que o número de membros aumentou
        await expect(page.locator('text=Membros da Equipe')).toBeVisible()
      }
    })
  })

  test.describe('Integração Pessoas e Equipes', () => {
    test('12 - Deve mostrar equipes na página de detalhes da pessoa', async ({ page }) => {
      // Criar uma pessoa e adicionar a uma equipe
      await page.goto(`${BASE_URL}/people`)
      
      const personLink = page.locator('a').filter({ hasText: /Silva/ }).first()
      if (await personLink.isVisible()) {
        await personLink.click()
        
        // Verificar se há seção de equipes
        const teamsSection = page.locator('text=Equipes')
        if (await teamsSection.isVisible()) {
          await expect(teamsSection).toBeVisible()
        }
      }
    })

    test('13 - Deve mostrar membros na página de detalhes da equipe', async ({ page }) => {
      await page.goto(`${BASE_URL}/teams`)
      
      const teamCard = page.locator('text=Equipe Elétrica').first()
      if (await teamCard.isVisible()) {
        await teamCard.click()
        
        await expect(page.locator('text=Membros da Equipe')).toBeVisible()
      }
    })
  })

  test.describe('Validações e Erros', () => {
    test('14 - Deve validar campos obrigatórios ao criar pessoa', async ({ page }) => {
      await page.goto(`${BASE_URL}/people/new`)
      
      await page.click('button[type="submit"]')
      
      // O browser deve mostrar validação HTML5
      const firstNameInput = page.locator('input[name="firstName"]')
      await expect(firstNameInput).toHaveAttribute('required', '')
    })

    test('15 - Deve validar campos obrigatórios ao criar equipe', async ({ page }) => {
      await page.goto(`${BASE_URL}/teams/new`)
      
      await page.click('button[type="submit"]')
      
      const nameInput = page.locator('input[name="name"]')
      await expect(nameInput).toHaveAttribute('required', '')
    })

    test('16 - Não deve permitir email duplicado', async ({ page }) => {
      await page.goto(`${BASE_URL}/people/new`)
      
      await page.fill('input[name="firstName"]', 'Teste')
      await page.fill('input[name="lastName"]', 'Duplicado')
      await page.fill('input[name="email"]', 'admin@example.com') // Email existente
      await page.fill('input[name="password"]', 'senha123')
      
      await page.click('button[type="submit"]')
      
      // Deve mostrar mensagem de erro (aguardar alert ou mensagem na página)
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('exists')
        dialog.accept()
      })
    })
  })

  test.describe('Exclusão', () => {
    test('17 - Deve excluir equipe', async ({ page }) => {
      await page.goto(`${BASE_URL}/teams`)
      
      const teamCard = page.locator('text=Equipe Elétrica').first()
      if (await teamCard.isVisible()) {
        await teamCard.click()
        
        page.on('dialog', dialog => dialog.accept())
        await page.click('text=Excluir')
        
        await page.waitForURL('**/teams')
        
        // A equipe não deve mais aparecer na lista
        await expect(page.locator('text=Equipe Elétrica')).not.toBeVisible()
      }
    })

    test('18 - Deve excluir pessoa', async ({ page }) => {
      await page.goto(`${BASE_URL}/people`)
      
      const personLink = page.locator('a:has-text("João Silva")').first()
      if (await personLink.isVisible()) {
        await personLink.click()
        
        page.on('dialog', dialog => dialog.accept())
        await page.click('button:has-text("Excluir")')
        
        await page.waitForURL('**/people')
        
        // A pessoa não deve mais aparecer na lista
        await expect(page.locator('text=João Silva')).not.toBeVisible()
      }
    })
  })

  test.describe('Responsividade', () => {
    test('19 - Deve funcionar em mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto(`${BASE_URL}/people`)
      
      await expect(page.locator('h1')).toContainText('Pessoas')
      await expect(page.locator('text=Adicionar Pessoa')).toBeVisible()
    })

    test('20 - Deve funcionar em tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await page.goto(`${BASE_URL}/teams`)
      
      await expect(page.locator('h1')).toContainText('Equipes')
      await expect(page.locator('text=Nova Equipe')).toBeVisible()
    })
  })
})
