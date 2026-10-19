import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('IATA ONE Record & Air Cargo e-AWB Linked Data Hub (/iata-one-record)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should render IATA ONE Record Control Tower with W3C JSON-LD explorer and metrics', async ({
    page,
  }) => {
    await page.goto('/iata-one-record', { waitUntil: 'domcontentloaded' });

    // Header & Badges
    await expect(
      page.locator("h1:has-text('IATA ONE Record Hub & Cargo iQ e-AWB')")
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('W3C JSON-LD', { exact: true })).toBeVisible();

    // Key Metric Cards
    await expect(page.getByText('075-82910482', { exact: true })).toBeVisible();
    await expect(page.getByText('BCN → JFK', { exact: true })).toBeVisible();
    await expect(page.locator('text=IB6251').first()).toBeVisible();
    await expect(page.locator('text=Desglose de Bultos Físicos (ONE Record Pieces)')).toBeVisible();

    // Pieces Table
    await expect(page.locator('td:has-text("PC-001")')).toBeVisible();
    await expect(page.locator('td:has-text("PC-002")')).toBeVisible();

    // W3C JSON-LD Block & Copy button
    await expect(page.locator('#btnCopyJsonLd')).toBeVisible();
    await page.locator('#btnCopyJsonLd').click();
    await expect(page.locator('text=Copiado!')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate across all 4 tabs: JSON-LD Explorer, Cargo iQ Timeline, e-DGD Studio, and e-AWB Pouch', async ({
    page,
  }) => {
    await page.goto('/iata-one-record', { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator("h1:has-text('IATA ONE Record Hub & Cargo iQ e-AWB')")
    ).toBeVisible({ timeout: 15000 });

    // Tab 1: JSON-LD Explorer (Default)
    await expect(page.locator('text=Desglose de Bultos Físicos')).toBeVisible();

    // Tab 2: Cargo iQ Milestone Control Tower
    await page.locator('#tabCargoIqTimeline').click();
    await expect(
      page.locator('text=Registrar Actualización Operativa Cargo iQ')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Matriz de Cumplimiento Cargo iQ SLA')).toBeVisible();
    await expect(page.locator('span:has-text("FWB")').first()).toBeVisible();
    await expect(page.locator('span:has-text("RCS")').first()).toBeVisible();
    await expect(page.locator('span:has-text("DEP")').first()).toBeVisible();

    // Tab 3: e-DGD Dangerous Goods Studio
    await page.locator('#tabEdgdStudio').click();
    await expect(
      page.locator('text=Declaración e-DGD de Mercancías Peligrosas')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Veredicto de Cumplimiento IATA DGR')).toBeVisible();
    await expect(page.locator('#inputDgUnNumber')).toHaveValue('UN1845');

    // Tab 4: e-AWB Digital Pouch
    await page.locator('#tabEawbPouch').click();
    await expect(
      page.locator('text=Valija Digital e-AWB (Digital Cargo Pouch)')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Declaración de Seguridad de Carga Aérea (e-CSD)')).toBeVisible();
    await expect(page.locator('text=Regulated Agent ES/RA/0018-01')).toBeVisible();
  });

  test('should update Cargo iQ milestone event and validate Dangerous Goods in e-DGD Studio', async ({
    page,
  }) => {
    await page.goto('/iata-one-record', { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator("h1:has-text('IATA ONE Record Hub & Cargo iQ e-AWB')")
    ).toBeVisible({ timeout: 15000 });

    // 1. Cargo iQ Milestone Update
    await page.locator('#tabCargoIqTimeline').click();
    await page.locator('#milestoneCodeSelect').selectOption('DEP');
    await page.locator('#milestoneRemarksInput').fill('Inspección completada y estiba asegurada en BCN');
    await page.locator('#btnUpdateMilestone').click();

    await expect(
      page.locator('text=Hito DEP actualizado exitosamente con marca de tiempo actual.')
    ).toBeVisible({ timeout: 5000 });

    // 2. e-DGD Dangerous Goods Validation
    await page.locator('#tabEdgdStudio').click();
    await expect(page.locator('text=CONFORME / APTO PARA VUELO')).toBeVisible();

    // Trigger violation: Change class from 9 to 3 for Dry Ice
    await page.locator('#inputDgClass').fill('3');
    await expect(page.locator('text=RECHAZADO / INFRACCIÓN DGR')).toBeVisible();
    await expect(page.locator('text=Infracciones Detectadas')).toBeVisible();

    // Revert class to 9
    await page.locator('#inputDgClass').fill('9');
    await expect(page.locator('text=CONFORME / APTO PARA VUELO')).toBeVisible();

    // Click Export e-DGD PDF
    await page.locator('#btnExportEdgdPdf').click();
    await expect(page.locator('text=Certificado e-DGD generado y descargado.')).toBeVisible({
      timeout: 5000,
    });
  });
});
