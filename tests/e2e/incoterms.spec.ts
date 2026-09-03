import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Incoterms® 2020 & Commercial Freight Contracting Engine", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Incoterms workbench and KPI cards", async ({ page }) => {
    await page.goto("/contracts");

    // Header
    await expect(
      page.locator("h1:has-text('Incoterms® 2020 & Contratación Comercial')"),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Contratos Comerciales')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Valor Total Mercancías')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Operaciones Multimodal')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Reglas Oficiales ICC')"),
    ).toBeVisible();
  });

  test("should select commercial contract and inspect clauses and PDF export", async ({
    page,
  }) => {
    await page.goto("/contracts");

    await expect(
      page.locator("h1:has-text('Incoterms® 2020 & Contratación Comercial')"),
    ).toBeVisible({ timeout: 15000 });

    // Select contract from list
    const firstContract = page.locator("text=CTR-2026-CIP-8819").first();
    await expect(firstContract).toBeVisible({ timeout: 10000 });
    await firstContract.click();

    // Verify Inspector details
    await expect(
      page.locator("span:has-text('Parte Vendedora (Seller / Exporter)')"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("span:has-text('Parte Compradora (Buyer / Importer)')"),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('Cláusula Contractual de Entrega y Transmisión de Riesgos')",
      ),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Resumen Económico Contractual')"),
    ).toBeVisible();

    // Verify PDF export action
    const pdfLink = page.locator(
      "a:has-text('Descargar Contrato PDF (Bilingual)')",
    );
    await expect(pdfLink).toBeVisible();
  });

  test("should switch to 11 Incoterms Matrix tab and open simulator modal", async ({
    page,
  }) => {
    await page.goto("/contracts");

    await expect(
      page.locator("h1:has-text('Incoterms® 2020 & Contratación Comercial')"),
    ).toBeVisible({ timeout: 15000 });

    // Switch tab to Matrix
    const matrixTab = page.locator("button:has-text('Matriz 11 Incoterms®')");
    await expect(matrixTab).toBeVisible({ timeout: 10000 });
    await matrixTab.click();

    // Verify table header in Matrix tab
    await expect(
      page.locator(
        "h2:has-text('Matriz Oficial ICC Incoterms® 2020 (11 Reglas × 10 Etapas)')",
      ),
    ).toBeVisible({ timeout: 10000 });

    // Open Simulator Modal
    const simBtn = page.locator("button:has-text('Simulador & Validador')");
    await expect(simBtn).toBeVisible();
    await simBtn.click();

    // Verify modal appears
    await expect(
      page.locator("h3:has-text('Simulador y Validador Incoterms® 2020')"),
    ).toBeVisible({ timeout: 10000 });

    // Click Validate & Normalize button
    const calcBtn = page.locator(
      "button:has-text('Validar Modo y Normalizar Valor en Aduana')",
    );
    await expect(calcBtn).toBeVisible();
    await calcBtn.click();

    // Verify normalization and insurance results
    await expect(
      page.locator("span:has-text('Base DUA Box 46 (CIF):')"),
    ).toBeVisible({ timeout: 10000 });
  });
});
