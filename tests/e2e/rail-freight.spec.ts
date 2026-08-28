import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Rail Intermodal Freight & Corridors Engine (COTIF / CIM & TEN-T 750m)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Rail Freight workbench with KPI cards", async ({
    page,
  }) => {
    await page.goto("/rail-freight");

    // Header
    await expect(
      page.locator("h1:has-text('Ferrocarril Intermodal & Corredores TEN-T')"),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Expediciones Activas CIM')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Masa Bruta Transportada')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Trenes Bloque Formados')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Nodos Cambio de Ancho')"),
    ).toBeVisible();
  });

  test("should inspect CIM consignments and check PDF/XML export buttons", async ({
    page,
  }) => {
    await page.goto("/rail-freight");

    await expect(
      page.locator("h1:has-text('Ferrocarril Intermodal & Corredores TEN-T')"),
    ).toBeVisible({ timeout: 15000 });

    // Select consignment
    const cimItem = page.locator("p:has-text('CIM-2026-8801')").first();
    await expect(cimItem).toBeVisible({ timeout: 10000 });
    await cimItem.click();

    // Verify detail headers and export buttons
    await expect(
      page.locator("a:has-text('Carta de Porte CIM (PDF)')"),
    ).toBeVisible();
    await expect(page.locator("a:has-text('XML TAF-TSI')")).toBeVisible();
  });

  test("should run train consist and axle load dynamics simulators", async ({
    page,
  }) => {
    await page.goto("/rail-freight");

    // Switch to train consist simulator tab
    const consistTab = page.locator(
      "button:has-text('Composición de Trenes Bloque & Boletín de Frenado')",
    );
    await consistTab.click();

    // Run train physics calculator
    const calcTrainBtn = page.locator(
      "button:has-text('Calcular Dinámica de Tren & Frenado')",
    );
    await expect(calcTrainBtn).toBeVisible();
    await calcTrainBtn.click();
    await expect(
      page.locator("span:has-text('Longitud Total del Convoy:')"),
    ).toBeVisible({ timeout: 5000 });

    // Switch to axle audit tab
    const axleTab = page.locator(
      "button:has-text('Auditoría de Cargas por Eje UIC & Gálibo P400')",
    );
    await axleTab.click();

    // Run axle calculator
    const calcAxleBtn = page.locator(
      "button:has-text('Verificar Carga por Eje')",
    );
    await expect(calcAxleBtn).toBeVisible();
    await calcAxleBtn.click();
    await expect(
      page.locator("span:has-text('Carga por Eje Calculada:')"),
    ).toBeVisible({ timeout: 5000 });
  });
});
