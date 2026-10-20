import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Customer01 Logistics Platform (/customer01-operations)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should render Customer01 Control Tower with Book TEST01 corridor badge, metrics, and albaranes list', async ({
    page,
  }) => {
    await page.goto('/customer01-operations', { waitUntil: 'domcontentloaded' });

    // Header & Corridor Badge
    await expect(
      page.locator("h1:has-text('Customer01 Logistics Platform')")
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('DEPT-TEST01', { exact: true })).toBeVisible();

    // Table & Seed Albaranes
    await expect(page.locator('text=Albaranes en Stock y Recepción')).toBeVisible();
    await expect(page.locator('text=ALB-TEST01-9001')).toBeVisible();
    await expect(page.locator('text=ALB-TEST01-9002')).toBeVisible();

    // Vehicle detection tags
    await expect(page.locator('text=Tren Eléctrico (-76.9%)').first()).toBeVisible();
    await expect(page.locator('text=Camión-Lona').first()).toBeVisible();
  });

  test('should navigate across all tabs: Albaranes Ingest, 40ft HC Stowage, Dock Exceptions, and Governance', async ({
    page,
  }) => {
    await page.goto('/customer01-operations', { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator("h1:has-text('Customer01 Logistics Platform')")
    ).toBeVisible({ timeout: 15000 });

    // Tab 1: Albaranes Ingest (Default)
    await expect(page.locator('text=Registrar Albarán de Expedición')).toBeVisible();

    // Tab 4: Governance & Roles
    await page.getByRole('button', { name: /Gobernanza & Auditoría/i }).click();
    await expect(
      page.locator('text=Verificador de Integridad de Asignaciones Operativas')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=System Admin')).toBeVisible();
    await expect(page.locator('text=Operator Lead')).toBeVisible();
    await expect(page.locator('text=Operations Manager')).toBeVisible();
  });

  test('should ingest new albaran, execute 2-opt rebalance, and test governance authorization rules', async ({
    page,
  }) => {
    await page.goto('/customer01-operations', { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator("h1:has-text('Customer01 Logistics Platform')")
    ).toBeVisible({ timeout: 15000 });

    // 1. Ingest new albaran
    await page.locator('#inputAlbaranNumber').fill('ALB-TEST01-PW-INGEST');
    await page.locator('#btnSubmitAlbaran').click();
    await expect(
      page.locator('text=Albarán ALB-TEST01-PW-INGEST procesado e ingresado en stock correctamente.')
    ).toBeVisible({ timeout: 5000 });

    // 2. 40' HC Stowage & 2-Opt Rebalance
    await page.getByRole('button', { name: /Estiba 40' HC/i }).click();
    await page.locator('#btnTrigger2Opt').click();
    await expect(
      page.locator('text=Algoritmo 2-opt ejecutado: columnas simétricas reordenadas.')
    ).toBeVisible({ timeout: 5000 });

    // 3. Governance Rule Verification
    await page.getByRole('button', { name: /Gobernanza & Auditoría/i }).click();

    // Test 3a: Valid assignment (TEST01 / Operator Lead)
    await page.locator('#inputTestRoleCode').fill('TEST01');
    await page.locator('#inputTestPersonName').fill('Operator Lead');
    await page.locator('#btnVerifyGovernance').click();
    await expect(page.locator('#governanceVerdictResult')).toContainText('AUTORIZADA');

    // Test 3b: Excluded executive manager (TEST02 / Operations Manager)
    await page.locator('#inputTestRoleCode').fill('TEST02');
    await page.locator('#inputTestPersonName').fill('Operations Manager');
    await page.locator('#btnVerifyGovernance').click();
    await expect(page.locator('#governanceVerdictResult')).toContainText(
      'excluida de recibir asignaciones operativas'
    );

    // Test 3c: Excluded restricted operator
    await page.locator('#inputTestRoleCode').fill('TEST01');
    await page.locator('#inputTestPersonName').fill('RESTRICTED_OPERATOR');
    await page.locator('#btnVerifyGovernance').click();
    await expect(page.locator('#governanceVerdictResult')).toContainText(
      'expresamente excluido'
    );
  });
});
