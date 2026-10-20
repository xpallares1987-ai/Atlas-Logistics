import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Customer01 Logistics & FMS Platform (/saica-operations)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should render Customer01 Control Tower with Book TEST01 corridor badge, metrics, and albaranes list', async ({
    page,
  }) => {
    await page.goto('/saica-operations', { waitUntil: 'domcontentloaded' });

    // Header & Corridor Badge
    await expect(
      page.locator("h1:has-text('Customer01 Logistics & FMS Platform')")
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('DEPT-TEST01', { exact: true })).toBeVisible();

    // Table & Seed Albaranes
    await expect(page.locator('text=Albaranes en Stock y Recepción')).toBeVisible();
    await expect(page.locator('text=ALB-012-9001')).toBeVisible();
    await expect(page.locator('text=ALB-012-9002')).toBeVisible();

    // Vehicle detection tags
    await expect(page.locator('text=Tren Eléctrico (-76.9%)').first()).toBeVisible();
    await expect(page.locator('text=Camión-Lona').first()).toBeVisible();
  });

  test('should navigate across all 4 tabs: Albaranes Ingest, 40ft HC Stowage, Dock Exceptions, and Governance', async ({
    page,
  }) => {
    await page.goto('/saica-operations', { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator("h1:has-text('Customer01 Logistics & FMS Platform')")
    ).toBeVisible({ timeout: 15000 });

    // Tab 1: Albaranes Ingest (Default)
    await expect(page.locator('text=Ingesta de Albarán de Expedición')).toBeVisible();

    // Tab 2: 40' HC Physical Stowage
    await page.locator('#tabStowage40hc').click();
    await expect(page.locator('text=Límite Legal Oficial (RD 2822/1998)')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#btnToggleUsPayload')).toBeVisible();
    await expect(page.locator('text=Desviación Longitudinal |Δx|')).toBeVisible();
    await expect(page.locator('text=Falso Flete Cuantificado')).toBeVisible();
    await expect(page.locator('#btnExecute2Opt')).toBeVisible();

    // Tab 3: Dock Exceptions
    await page.locator('#tabDockExceptions').click();
    await expect(page.locator('text=Registrar Incidencia de Muelle')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=EXC-Customer01-001')).toBeVisible();
    await expect(page.locator('text=RETRASO_FERROVIARIO')).toBeVisible();

    // Tab 4: Governance & Roles
    await page.locator('#tabGovernanceRoles').click();
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
    await page.goto('/saica-operations', { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator("h1:has-text('Customer01 Logistics & FMS Platform')")
    ).toBeVisible({ timeout: 15000 });

    // 1. Ingest new albaran
    await page.locator('#inputAlbaranNumber').fill('ALB-012-PW-INGEST');
    await page.locator('#btnSubmitAlbaran').click();
    await expect(
      page.locator('text=Albarán ALB-012-PW-INGEST procesado e ingresado en stock correctamente.')
    ).toBeVisible({ timeout: 5000 });

    // 2. 40' HC Stowage & 2-Opt Rebalance
    await page.locator('#tabStowage40hc').click();
    await page.locator('#btnExecute2Opt').click();
    await expect(
      page.locator('text=Algoritmo 2-opt ejecutado: columnas simétricas reordenadas.')
    ).toBeVisible({ timeout: 5000 });

    // 3. Governance Rule Verification
    await page.locator('#tabGovernanceRoles').click();

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

    // Test 3c: Excluded individual (Blocked User)
    await page.locator('#inputTestRoleCode').fill('TEST01');
    await page.locator('#inputTestPersonName').fill('Blocked User');
    await page.locator('#btnVerifyGovernance').click();
    await expect(page.locator('#governanceVerdictResult')).toContainText(
      'Blocked User está expresamente excluido'
    );
  });
});
