import { test, expect } from '@playwright/test';

// Selector del <svg> de la Curva S (viewBox fijo definido en CurvaS.jsx),
// para no chocar con los <circle> de los íconos lucide-react del resto de la página.
const CHART_SVG = 'svg[viewBox="0 0 1000 340"]';

async function abrirCurvaS(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Ver Actividades/ }).first().click();
  await page.getByText('Curva S', { exact: true }).click();
  await expect(page.locator(CHART_SVG)).toBeVisible();
}

test.describe('Curva S — tooltip y marcador personalizado', () => {
  test('el círculo de avance real (hoy) muestra tooltip al pasar el mouse', async ({ page }) => {
    await abrirCurvaS(page);

    const circle = page.locator(`${CHART_SVG} circle`).first();
    await expect(circle).toHaveCount(1);
    await circle.hover();

    const tooltip = page.locator(`${CHART_SVG} foreignObject`);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Real:');
    await expect(tooltip).toContainText('Programado:');
    await expect(tooltip).toContainText('vs. plan');
  });

  test('agregar y eliminar el marcador amarillo con fecha personalizada', async ({ page }) => {
    await abrirCurvaS(page);

    // Sin marcador: solo existe el círculo de "hoy"
    await expect(page.locator(`${CHART_SVG} circle`)).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Agregar Marcador/ })).toBeVisible();

    await page.getByRole('button', { name: /Agregar Marcador/ }).click();

    // Con marcador: aparecen el input de fecha, el botón de eliminar y un segundo círculo
    await expect(page.locator(`${CHART_SVG} circle`)).toHaveCount(2);
    await expect(page.getByRole('button', { name: /Eliminar Marcador/ })).toBeVisible();
    const dateInput = page.locator('input[type="date"]').last();
    await expect(dateInput).toBeVisible();

    // El tooltip del marcador también debe mostrar el mismo formato
    const marcadorCircle = page.locator(`${CHART_SVG} circle`).nth(1);
    await marcadorCircle.hover();
    const tooltip = page.locator(`${CHART_SVG} foreignObject`);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Real:');
    await expect(tooltip).toContainText('Programado:');
    await expect(tooltip).toContainText('vs. plan');

    // Eliminar el marcador restaura el estado inicial
    await page.getByRole('button', { name: /Eliminar Marcador/ }).click();
    await expect(page.locator(`${CHART_SVG} circle`)).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Agregar Marcador/ })).toBeVisible();
  });
});
