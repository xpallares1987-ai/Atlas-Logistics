import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("IATA e-Freight & Air Cargo (e-AWB) Engine", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Air Cargo workbench and Air KPI cards", async ({
    page,
  }) => {
    await page.goto("/air-freight");

    // Verify main header
    await expect(
      page.locator("h1:has-text('IATA e-Freight & Air Cargo (e-AWB)')"),
    ).toBeVisible({ timeout: 15000 });

    // Verify KPI cards
    await expect(
      page.locator("p:has-text('Total Air Waybills')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Consolidaciones Master')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Tonelaje Tarifable')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Carga Especial / DGR')"),
    ).toBeVisible();
  });

  test("should select Airway Bill and inspect 12-Box IATA AWB details and export links", async ({
    page,
  }) => {
    await page.goto("/air-freight");

    await expect(
      page.locator("h1:has-text('IATA e-Freight & Air Cargo (e-AWB)')"),
    ).toBeVisible({ timeout: 15000 });

    // Verify Airway Bill list item exists
    const firstAwb = page.locator("text=075-84920153").first();
    await expect(firstAwb).toBeVisible({ timeout: 10000 });

    // Verify 12-box IATA neutral AWB inspector
    await expect(
      page.locator("span:has-text('Casilla 1 - Shipper / Expedidor')"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("span:has-text('Casilla 2 - Consignee / Destinatario')"),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('Casilla 3 & 4 - Issuing Carrier\\'s Agent')",
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('Casilla 5 & 6 - Departure, Destination & Flight')",
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('Casilla 8 - Handling Information & Special Handling Codes (SHC)')",
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('Casilla 9 - Liquidación de Flete y Tarificación Aérea')",
      ),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Casilla 10 - Recargos IATA Due Carrier')"),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('Casilla 11 - Total Liquidación (Total Prepaid)')",
      ),
    ).toBeVisible();

    // Verify Export Action Links (PDF, Cargo-XML, Cargo-IMP)
    await expect(page.locator("a:has-text('IATA AWB PDF')")).toBeVisible();
    await expect(page.locator("a:has-text('Cargo-XML (XFWB)')")).toBeVisible();
    await expect(page.locator("a:has-text('Cargo-IMP (FWB)')")).toBeVisible();
  });

  test("should open Volumetric & DGR Simulator modal and compute air freight liquidation", async ({
    page,
  }) => {
    await page.goto("/air-freight");

    await expect(
      page.locator("h1:has-text('IATA e-Freight & Air Cargo (e-AWB)')"),
    ).toBeVisible({ timeout: 15000 });

    // Click simulator button
    const simBtn = page.locator(
      "button:has-text('Simulador Volumétrico y Tarificación')",
    );
    await expect(simBtn).toBeVisible({ timeout: 10000 });
    await simBtn.click();

    // Verify modal appears
    await expect(
      page.locator(
        "h3:has-text('Simulador Volumétrico y Tarificación Aérea IATA')",
      ),
    ).toBeVisible({ timeout: 10000 });

    // Click calculate
    const calcBtn = page.locator(
      "button:has-text('Calcular Liquidación Aérea IATA')",
    );
    await expect(calcBtn).toBeVisible();
    await calcBtn.click();

    // Verify calculation results
    await expect(page.locator("span:has-text('Volumen Total:')")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("span:has-text('Peso Volumétrico:')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Peso Tarifable:')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Total Liquidación:')"),
    ).toBeVisible();
  });
});
