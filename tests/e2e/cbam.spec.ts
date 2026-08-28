import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Carbon Border Adjustment Mechanism (CBAM) & Scope 3 Decarbonization Engine (EU Reg. 2023/956)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render CBAM workbench with KPI cards", async ({ page }) => {
    await page.goto("/cbam");

    // Header
    await expect(
      page.locator("h1:has-text('Ajuste en Frontera por Carbono (CBAM)')"),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Masa Neta Importada')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Emisiones Directas (Alc. 1)')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Emisiones Indirectas (Alc. 2)')"),
    ).toBeVisible();
    await expect(page.locator("p:has-text('Deuda Neta EU ETS')")).toBeVisible();
  });

  test("should inspect CBAM declarations and view export actions", async ({
    page,
  }) => {
    await page.goto("/cbam");

    await expect(
      page.locator("h1:has-text('Ajuste en Frontera por Carbono (CBAM)')"),
    ).toBeVisible({ timeout: 15000 });

    // Select declaration
    const declaration = page.locator("p:has-text('CBAM-2026-Q3-001')").first();
    await expect(declaration).toBeVisible({ timeout: 10000 });
    await declaration.click();

    // Verify detail headers and export buttons
    await expect(page.locator("a:has-text('XML Registro UE')")).toBeVisible();
    await expect(page.locator("a:has-text('Certificado (PDF)')")).toBeVisible();
  });

  test("should run interactive emissions and EU ETS financial simulators", async ({
    page,
  }) => {
    await page.goto("/cbam");

    // Switch to simulator tab
    const calcTab = page.locator(
      "button:has-text('Calculadora de Emisiones & Precursores')",
    );
    await calcTab.click();

    // Run emissions calculator
    const emissionsBtn = page.locator(
      "button:has-text('Calcular Emisiones Integradas')",
    );
    await expect(emissionsBtn).toBeVisible();
    await emissionsBtn.click();
    await expect(
      page.locator("span:has-text('Total Emisiones Integradas:')"),
    ).toBeVisible({ timeout: 5000 });

    // Switch to Finance tab
    const financeTab = page.locator(
      "button:has-text('Auditoría Financiera EU ETS & Deducciones Origen (Art. 9)')",
    );
    await financeTab.click();

    // Run finance calculator
    const financeBtn = page.locator(
      "button:has-text('Estimar Liquidación Neta CBAM')",
    );
    await expect(financeBtn).toBeVisible();
    await financeBtn.click();
    await expect(
      page.locator("span:has-text('Deuda Neta Liquidable:')"),
    ).toBeVisible({ timeout: 5000 });
  });
});
