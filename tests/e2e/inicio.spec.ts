import { test, expect } from '@playwright/test';

test('la página de inicio muestra las cuatro fases del marco', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Trazalitica' })).toBeVisible();
  for (const fase of [
    'Elicitación',
    'Análisis y Priorización',
    'Especificación',
    'Validación y Trazabilidad',
  ]) {
    await expect(page.getByText(fase)).toBeVisible();
  }
});
