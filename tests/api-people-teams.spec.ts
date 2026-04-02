import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Pessoas e Equipes - Testes de API', () => {
  
  test.describe('API de Pessoas', () => {
    test('01 - GET /api/users - Deve retornar lista de usuários', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/users`)
      expect(response.ok()).toBeTruthy()
      
      const data = await response.json()
      expect(data).toHaveProperty('data')
      expect(Array.isArray(data.data)).toBeTruthy()
    })

    test('02 - POST /api/users - Deve criar novo usuário', async ({ request }) => {
      const newUser = {
        firstName: 'Teste',
        lastName: 'Usuário',
        email: `teste.${Date.now()}@test.com`,
        password: 'senha123',
        role: 'TECHNICIAN',
        rate: 50
      }

      const response = await request.post(`${BASE_URL}/api/users`, {
        data: newUser
      })
      
      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('id')
      expect(data.data.firstName).toBe('Teste')
    })

    test('03 - GET /api/users com filtro de role', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/users?role=TECHNICIAN`)
      expect(response.ok()).toBeTruthy()
      
      const data = await response.json()
      expect(data).toHaveProperty('data')
      
      if (data.data.length > 0) {
        expect(data.data[0].role).toBe('TECHNICIAN')
      }
    })
  })

  test.describe('API de Equipes', () => {
    test('04 - GET /api/teams - Deve retornar lista de equipes', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/teams`)
      expect(response.ok()).toBeTruthy()
      
      const data = await response.json()
      expect(data).toHaveProperty('data')
      expect(Array.isArray(data.data)).toBeTruthy()
    })

    test('05 - POST /api/teams - Deve criar nova equipe', async ({ request }) => {
      const newTeam = {
        name: `Equipe Teste ${Date.now()}`,
        description: 'Equipe de teste automatizado',
        memberIds: []
      }

      const response = await request.post(`${BASE_URL}/api/teams`, {
        data: newTeam
      })
      
      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('id')
      expect(data.data.name).toContain('Equipe Teste')
    })
  })

  test.describe('Páginas UI - Acesso sem autenticação', () => {
    test('06 - Página /people deve existir', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/people`)
      expect(response?.status()).toBeLessThan(500)
    })

    test('07 - Página /people/new deve existir', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/people/new`)
      expect(response?.status()).toBeLessThan(500)
    })

    test('08 - Página /teams deve existir', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/teams`)
      expect(response?.status()).toBeLessThan(500)
    })

    test('09 - Página /teams/new deve existir', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/teams/new`)
      expect(response?.status()).toBeLessThan(500)
    })
  })
})
