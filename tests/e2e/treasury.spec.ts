import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Multi-Currency Treasury, Hedging & IATA CASS / Ocean Carrier Auto-Reconciliation Engine", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Treasury & CASS workbench with KPI cards", async ({
    page,
  }) => {
    await page.goto("/treasury");

    // Header
    await expect(
      page.locator("h1:has-text('Tesorería Multidivisa & CASS / Navieras')"),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Facturas Porteadores')"),
    ).toBeVisible();
    await expect(page.locator("p:has-text('Volumen Facturado')")).toBeVisible();
    await expect(
      page.locator("p:has-text('Tasa de Casación OK')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Sobrecargos en Disputa')"),
    ).toBeVisible();
  });

  test("should inspect 3-Way Match lines and PDF export links", async ({
    page,
  }) => {
    await page.goto("/treasury");

    await expect(
      page.locator("h1:has-text('Tesorería Multidivisa & CASS / Navieras')"),
    ).toBeVisible({ timeout: 15000 });

    // Select Maersk Invoice
    const maerskInvoice = page
      .locator("p:has-text('MSK-INV-2026-88910')")
      .first();
    await expect(maerskInvoice).toBeVisible({ timeout: 10000 });
    await maerskInvoice.click();

    // Verify 3-way match table
    await expect(page.locator("th:has-text('Doc. Transporte')")).toBeVisible();
    await expect(page.locator("th:has-text('Varianza')")).toBeVisible();

    // Verify PDF actions
    const settlementPdf = page.locator(
      "a:has-text('Estado de Liquidación (PDF)')",
    );
    await expect(settlementPdf).toBeVisible();

    const disputePdf = page.locator(
      "a:has-text('Nota de Cargo / Disputa (PDF)')",
    );
    await expect(disputePdf).toBeVisible();
  });

  test("should switch between 3-Way Match, FX Treasury and Disputes tabs", async ({
    page,
  }) => {
    await page.goto("/treasury");

    await expect(
      page.locator("h1:has-text('Tesorería Multidivisa & CASS / Navieras')"),
    ).toBeVisible({ timeout: 15000 });

    // Switch to Tab 2: Monitor FX & Flujo de Caja
    await page.click("button:has-text('Monitor de Riesgo FX & Flujo de Caja')");
    await expect(
      page.locator("h3:has-text('Matriz de Tipos de Cambio Oficiales')"),
    ).toBeVisible();
    await expect(
      page.locator("h3:has-text('Proyección de Flujo de Caja')"),
    ).toBeVisible();

    // Switch to Tab 3: Centro de Disputas
    await page.click("button:has-text('Centro de Disputas & Notas de Cargo')");
    await expect(
      page.locator("h3:has-text('Expedientes de Disputa')"),
    ).toBeVisible();
  });

  test("should open and execute 3-Way Match simulation modal", async ({
    page,
  }) => {
    await page.goto("/treasury");

    await expect(
      page.locator("button:has-text('Simulador 3-Way Match')"),
    ).toBeVisible({ timeout: 15000 });
    await page.click("button:has-text('Simulador 3-Way Match')");

    // Modal should be visible
    await expect(
      page.locator("h3:has-text('Simulador de Casación 3-Way Match')"),
    ).toBeVisible();

    // Run evaluation
    await page.click(
      "button:has-text('Evaluar Casación con Tolerancia ±1% / ±5€')",
    );

    // Check result
    await expect(
      page.locator("span:has-text('Resultado Casación:')"),
    ).toBeVisible();
  });
});
