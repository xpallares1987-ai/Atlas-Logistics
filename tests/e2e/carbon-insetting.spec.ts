import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Supply Chain Digital Twin & Scope 3 Carbon Insetting (/carbon-insetting)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should render Carbon Insetting Control Tower with KPI cards and header', async ({
    page,
  }) => {
    await page.goto('/carbon-insetting', { waitUntil: 'domcontentloaded' });

    // Header & Badges
    await expect(
      page.locator("h1:has-text('Supply Chain Digital Twin & Scope 3 Carbon Insetting')")
    ).toBeVisible({ timeout: 15000 });

    await expect(page.locator('text=Digital Twin Registry · Scope 3 Decarbonization')).toBeVisible();

    // KPI Cards
    await expect(page.locator('text=Emisiones Scope 3 Evitadas')).toBeVisible();
    await expect(page.locator('text=Combustible Verde Asignado')).toBeVisible();
    await expect(page.locator('text=Balance Pool FuelEU Maritime')).toBeVisible();
    await expect(page.locator('text=Penalizaciones Evitadas (Pool)')).toBeVisible();
  });

  test('should navigate across all 4 tabs: Ledger, Allocation Studio, FuelEU Pooling, and Sustainability Dossier', async ({
    page,
  }) => {
    await page.goto('/carbon-insetting', { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator("h1:has-text('Supply Chain Digital Twin & Scope 3 Carbon Insetting')")
    ).toBeVisible({ timeout: 15000 });

    // Tab 1: Book-and-Claim Ledger (Default)
    await expect(page.locator('text=Libro Mayor Tokenizado de Insetting')).toBeVisible();
    await expect(page.locator('text=INSET-2026-B100-BCN-001')).toBeVisible();
    await expect(page.locator('button:has-text("Certificado PDF")').first()).toBeVisible();

    // Tab 2: Allocation & Mass Balance Studio
    await page.locator("button:has-text('Asignación & Mass Balance Studio')").click();
    await expect(
      page.locator('text=Asignación de Combustible Verde & Mass Balance')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Cálculo de Descarbonización en Tiempo Real')).toBeVisible();
    await expect(page.locator('text=Reducción Scope 3 Acreditada')).toBeVisible();

    // Tab 3: FuelEU Pooling Simulator
    await page.locator("button:has-text('Simulador de Pooling FuelEU Maritime')").click();
    await expect(
      page.locator('text=Simulador de Pooling de Flota FuelEU Maritime')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=LAURA MAERSK')).toBeVisible();
    await expect(page.locator('text=MSC ISABELLA')).toBeVisible();
    await expect(page.locator('button:has-text("Ejecutar & Sellar Pool de Cumplimiento")')).toBeVisible();

    // Tab 4: Sustainability & ISCC Dossier
    await page.locator("button:has-text('Dossier de Sostenibilidad & ISCC')").click();
    await expect(
      page.locator('text=Dossier Técnico de Combustibles Sostenibles & Esquemas de Certificación')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Biodiésel Puro B100')).toBeVisible();
    await expect(page.locator('text=e-Metanol Sintético Verde')).toBeVisible();
  });

  test('should allocate sustainable fuel, mint insetting token, and re-execute FuelEU pool', async ({
    page,
  }) => {
    await page.goto('/carbon-insetting', { waitUntil: 'domcontentloaded' });

    // 1. Go to Allocation Studio
    await page.locator("button:has-text('Asignación & Mass Balance Studio')").click();
    await expect(
      page.locator('text=Asignación de Combustible Verde & Mass Balance')
    ).toBeVisible({ timeout: 10000 });

    // Modify allocated shipment ref
    await page.fill('#allocatedShipmentRef', 'SHP-BCN-TEST-999');

    // Submit form
    await page.locator('button:has-text("Firmar Digitalmente & Expedir Token de Insetting")').click();

    // 2. Verify redirected to Ledger and new shipment appears
    await expect(page.locator('text=SHP-BCN-TEST-999')).toBeVisible({ timeout: 10000 });

    // 3. Test FuelEU pooling execution
    await page.locator("button:has-text('Simulador de Pooling FuelEU Maritime')").click();
    await expect(
      page.locator('button:has-text("Ejecutar & Sellar Pool de Cumplimiento")')
    ).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Ejecutar & Sellar Pool de Cumplimiento")').click();
    await expect(page.locator('text=COMPLIANT (0 MULTA)').first()).toBeVisible({ timeout: 10000 });
  });
});
