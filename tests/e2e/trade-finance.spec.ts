import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Trade Finance & Letters of Credit Engine (UCP 600 / URDG 758 / SWIFT MT700)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Trade Finance workbench with KPI cards", async ({
    page,
  }) => {
    await page.goto("/trade-finance");

    // Header
    await expect(
      page.locator(
        "h1:has-text('Financiación Internacional & Créditos Documentarios')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Instrumentos Vivos')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Volumen Financiado')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Conformidad UCP 600')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Garantías a 1ª Demanda')"),
    ).toBeVisible();
  });

  test("should inspect trade credit instrument, verify documents table and export buttons", async ({
    page,
  }) => {
    await page.goto("/trade-finance");

    await expect(
      page.locator(
        "h1:has-text('Financiación Internacional & Créditos Documentarios')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // Select instrument
    const instrumentItem = page
      .locator("p:has-text('LC-2026-BCN-0089')")
      .first();
    await expect(instrumentItem).toBeVisible({ timeout: 10000 });
    await instrumentItem.click();

    // Verify detail headers and export buttons
    await expect(page.locator("a:has-text('SWIFT MT700')")).toBeVisible();
    await expect(
      page.locator("a:has-text('Dossier Bancario (PDF)')"),
    ).toBeVisible();
  });

  test("should run UCP 600 discrepancy audit and bank fee simulator", async ({
    page,
  }) => {
    await page.goto("/trade-finance");

    // Switch to UCP Discrepancies tab
    const ucpTab = page.locator(
      "button:has-text('Auditor de Discrepancias UCP 600 & Avisos SWIFT MT734')",
    );
    await ucpTab.click();

    // Run UCP audit
    const auditBtn = page.locator("button:has-text('Ejecutar Examen UCP 600')");
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();
    await expect(
      page.locator(
        "h3:has-text('Resultados del Examen & Discrepancias Detectadas')",
      ),
    ).toBeVisible({ timeout: 5000 });

    // Switch to Fee Simulator tab
    const feeTab = page.locator(
      "button:has-text('Simulador de Comisiones Bancarias & Coste Financiero')",
    );
    await feeTab.click();

    // Run fee calculator
    const calcFeeBtn = page.locator(
      "button:has-text('Calcular Comisiones Bancarias')",
    );
    await expect(calcFeeBtn).toBeVisible();
    await calcFeeBtn.click();
    await expect(
      page.locator("span:has-text('Comisión de Apertura')"),
    ).toBeVisible({ timeout: 5000 });
  });
});
