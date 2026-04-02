
import { test, expect } from '@playwright/test';

test.describe('Testes completos da página de RAFs', () => {
  const RAF_DATA = {
    tag: 'FQ-TEST-002',
    area: 'Área de Teste',
    equipment: 'Equipamento de Teste',
    failureDate: '2025-11-01',
    failureTime: '10:00',
    operator: 'Test User',
    failureDescription: 'Descrição da falha para o teste completo.',
    observations: 'Observações para o teste completo.',
    immediateAction: 'Ação imediata para o teste completo.',
    why1: 'Primeiro porquê do teste.',
    failureType: 'RANDOM',
  };

  const EDITED_RAF_DATA = {
    equipment: 'Equipamento de Teste Editado',
    failureDescription: 'Descrição da falha editada.',
  };

  test.beforeEach(async ({ page }) => {
    // Fazer login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test.user@mizu.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navegar para a página de RAFs
    await page.goto('http://localhost:3000/rafs');
    await page.waitForLoadState('networkidle');
  });

  test('1. Deve criar um novo RAF com sucesso', async ({ page }) => {
    await page.click('button:has-text("Novo RAF")');
    await page.waitForURL('**/rafs/new');

    // Preencher formulário
    await page.fill('input[name="tag"]', RAF_DATA.tag);
    await page.fill('input[name="area"]', RAF_DATA.area);
    await page.fill('input[name="equipment"]', RAF_DATA.equipment);
    await page.fill('input[name="failureDate"]', RAF_DATA.failureDate);
    await page.fill('input[name="failureTime"]', RAF_DATA.failureTime);
    await page.fill('input[name="operator"]', RAF_DATA.operator);
    await page.fill('textarea[name="failureDescription"]', RAF_DATA.failureDescription);
    await page.fill('textarea[name="observations"]', RAF_DATA.observations);
    await page.fill('textarea[name="immediateAction"]', RAF_DATA.immediateAction);
    await page.fill('input[name="why1"]', RAF_DATA.why1);
    await page.check(`input[value="${RAF_DATA.failureType}"]`);

    await page.click('button[type="submit"]');

    await page.waitForURL('**/rafs');
    await expect(page.locator(`text=${RAF_DATA.tag}`)).toBeVisible();
  });

  test('2. Deve editar o RAF criado', async ({ page }) => {
    // Encontrar o RAF na lista e clicar em editar
    const rafRow = page.locator(`tr:has-text("${RAF_DATA.tag}")`);
    await rafRow.locator('button:has-text("Editar")').click();

    await page.waitForURL(`**/rafs/edit/**`);

    // Editar campos
    await page.fill('input[name="equipment"]', EDITED_RAF_DATA.equipment);
    await page.fill('textarea[name="failureDescription"]', EDITED_RAF_DATA.failureDescription);

    await page.click('button[type="submit"]');

    await page.waitForURL('**/rafs');
    await expect(page.locator(`text=${EDITED_RAF_DATA.equipment}`)).toBeVisible();
  });

  test('3. Deve excluir o RAF editado', async ({ page }) => {
    const rafRow = page.locator(`tr:has-text("${RAF_DATA.tag}")`);
    await rafRow.locator('button:has-text("Excluir")').click();

    // Confirmar exclusão no diálogo
    page.on('dialog', dialog => dialog.accept());
    await page.waitForResponse(response => response.url().includes('/api/rafs/') && response.status() === 200);

    await expect(page.locator(`text=${RAF_DATA.tag}`)).not.toBeVisible();
  });
});
