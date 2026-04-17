import { test } from '@playwright/test';
import { skipScreenshotSuiteUnlessAuthorized } from './helpers/screenshotAuthorization'

skipScreenshotSuiteUnlessAuthorized(test, 'tests/gep-debug-test.spec.ts')

test('Debug GEP Page Structure', async ({ page }) => {
  await page.goto('http://localhost:3000/gep');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Capturar screenshot
  await page.screenshot({ path: 'test-results/gep-page-debug.png', fullPage: true });

  // Log da estrutura HTML
  const html = await page.content();
  console.log('=== HTML Content Length:', html.length);

  // Verificar inputs de data
  const dateInputs = await page.locator('input[type="date"]').count();
  console.log('=== Date inputs found:', dateInputs);

  // Verificar inputs de hora
  const timeInputs = await page.locator('input[type="time"]').count();
  console.log('=== Time inputs found:', timeInputs);

  // Verificar botões
  const buttons = await page.locator('button').count();
  console.log('=== Total buttons found:', buttons);

  // Verificar texto específico
  const periodoText = await page.locator('text=/período/i').count();
  console.log('=== "período" text found:', periodoText);

  // Verificar labels
  const labels = await page.locator('label').allTextContents();
  console.log('=== Labels found:', labels);

  // Verificar se há erros na página
  const errors = await page.locator('text=/erro/i').count();
  console.log('=== Errors found:', errors);
});
