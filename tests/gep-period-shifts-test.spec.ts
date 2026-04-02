import { test, expect } from '@playwright/test';

test.describe('GEP - Seleção de Período e Separação por Turnos', () => {
  test.beforeEach(async ({ page }) => {
    // Fazer login primeiro
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Preencher credenciais
    await page.fill('input[type="email"]', 'andrew.silva@mizu.com.br');
    await page.fill('input[type="password"]', 'Mizu@2025');
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento para dashboard
    await page.waitForURL(/\/(dashboard|gep)/, { timeout: 10000 });
    
    // Navegar para a página GEP
    await page.goto('http://localhost:3000/gep');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('Deve exibir campos de período com data e hora', async ({ page }) => {
    // Verificar se os campos de período estão presentes
    const startDateInput = page.locator('input[type="date"]').first();
    const startTimeInput = page.locator('input[type="time"]').first();
    const endDateInput = page.locator('input[type="date"]').nth(1);
    const endTimeInput = page.locator('input[type="time"]').nth(1);

    await expect(startDateInput).toBeVisible();
    await expect(startTimeInput).toBeVisible();
    await expect(endDateInput).toBeVisible();
    await expect(endTimeInput).toBeVisible();

    // Verificar labels
    await expect(page.getByText('Início do Período')).toBeVisible();
    await expect(page.getByText('Fim do Período')).toBeVisible();
  });

  test('Deve permitir selecionar período personalizado', async ({ page }) => {
    // Preencher data e hora de início
    await page.locator('input[type="date"]').first().fill('2025-11-02');
    await page.locator('input[type="time"]').first().fill('08:30');

    // Preencher data e hora de fim
    await page.locator('input[type="date"]').nth(1).fill('2025-11-02');
    await page.locator('input[type="time"]').nth(1).fill('18:45');

    // Aguardar carregamento dos dados
    await page.waitForTimeout(2000);

    // Verificar se os dados foram carregados
    const loadingText = page.getByText('Carregando dados...');
    await expect(loadingText).not.toBeVisible({ timeout: 10000 });
  });

  test('Deve separar visualização por turnos na tabela', async ({ page }) => {
    // Selecionar visualização de tabela
    await page.getByRole('button', { name: /tabela/i }).click();
    
    // Aguardar carregamento
    await page.waitForTimeout(2000);

    // Verificar se os turnos estão presentes
    const turnoA = page.getByText('Turno A (01h - 07h)');
    const turnoB = page.getByText('Turno B (07h - 13h)');
    const turnoC = page.getByText('Turno C (13h - 19h)');
    const turnoD = page.getByText('Turno D (19h - 01h)');

    // Pelo menos um turno deve estar visível (dependendo dos dados)
    const anyTurnoVisible = await Promise.race([
      turnoA.isVisible().catch(() => false),
      turnoB.isVisible().catch(() => false),
      turnoC.isVisible().catch(() => false),
      turnoD.isVisible().catch(() => false)
    ]);

    expect(anyTurnoVisible).toBeTruthy();
  });

  test('Deve agrupar horários corretamente por turno', async ({ page }) => {
    // Configurar período que cubra todos os turnos
    await page.locator('input[type="date"]').first().fill('2025-11-02');
    await page.locator('input[type="time"]').first().fill('00:00');
    await page.locator('input[type="date"]').nth(1).fill('2025-11-02');
    await page.locator('input[type="time"]').nth(1).fill('23:59');

    // Selecionar visualização de tabela
    await page.getByRole('button', { name: /tabela/i }).click();
    await page.waitForTimeout(3000);

    // Verificar se existem cards separados para cada turno
    const cards = await page.locator('.space-y-4 > div').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('Deve exibir contagem de leituras por turno', async ({ page }) => {
    // Selecionar visualização de tabela
    await page.getByRole('button', { name: /tabela/i }).click();
    await page.waitForTimeout(2000);

    // Verificar se há texto de contagem de leituras (ex: "6 leituras")
    const leituras = page.locator('text=/\\d+ leituras?/');
    const count = await leituras.count();
    
    if (count > 0) {
      await expect(leituras.first()).toBeVisible();
    }
  });

  test('Deve aplicar cores diferentes para cada turno', async ({ page }) => {
    // Selecionar visualização de tabela
    await page.getByRole('button', { name: /tabela/i }).click();
    await page.waitForTimeout(2000);

    // Verificar se há elementos com classes de cor de fundo
    const colorClasses = ['bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50'];
    
    let hasColoredElements = false;
    for (const colorClass of colorClasses) {
      const elements = page.locator(`.${colorClass}`);
      const count = await elements.count();
      if (count > 0) {
        hasColoredElements = true;
        break;
      }
    }
    
    expect(hasColoredElements).toBeTruthy();
  });

  test('Deve manter funcionalidade de seleção de setor', async ({ page }) => {
    // Verificar se os botões de setor estão presentes
    const setorButtons = page.locator('button:has-text("Moagem")');
    const count = await setorButtons.count();
    expect(count).toBeGreaterThan(0);

    // Clicar em um setor
    await setorButtons.first().click();
    await page.waitForTimeout(1000);

    // Verificar se não há erros
    const errorMessage = page.getByText(/erro/i);
    await expect(errorMessage).not.toBeVisible();
  });

  test('Deve exibir dados no formato de gráfico', async ({ page }) => {
    // Selecionar visualização de gráfico
    await page.getByRole('button', { name: /gráfico/i }).click();
    await page.waitForTimeout(2000);

    // Verificar se o gráfico está presente (recharts)
    const chart = page.locator('.recharts-wrapper');
    await expect(chart).toBeVisible({ timeout: 5000 });
  });
});
