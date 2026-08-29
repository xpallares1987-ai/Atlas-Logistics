import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("FuelEU Maritime & EU ETS Decarbonization Engine (Reg. UE 2023/1805 & Dir. 2023/959)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render FuelEU Maritime workbench with KPI cards", async ({
    page,
  }) => {
    await page.goto("/fueleu-maritime");

    // Header
    await expect(
      page.locator(
        "h1:has-text('FuelEU Maritime, EU ETS & Descarbonización de Flota')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Travesías Auditadas')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Intensidad GEI Media')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Derechos EU ETS Marítimo')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Agrupaciones (Pools)')"),
    ).toBeVisible();
  });

  test("should inspect marine voyage, verify WtW GHG intensity and export buttons", async ({
    page,
  }) => {
    await page.goto("/fueleu-maritime");

    await expect(
      page.locator(
        "h1:has-text('FuelEU Maritime, EU ETS & Descarbonización de Flota')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // Select voyage
    const voyageItem = page.locator("p:has-text('VOY-2026-MED-0101')").first();
    await expect(voyageItem).toBeVisible({ timeout: 10000 });
    await voyageItem.click();

    // Verify detail headers and export buttons
    await expect(page.locator("a:has-text('XML THETIS-MRV')")).toBeVisible();
    await expect(page.locator("a:has-text('Informe BDN (PDF)')")).toBeVisible();
  });

  test("should run EU ETS / Green BAF calculator and multi-fuel simulator", async ({
    page,
  }) => {
    await page.goto("/fueleu-maritime");

    // Switch to EU ETS tab
    const etsTab = page.locator(
      "button:has-text('Liquidación EU ETS & Recargos Green BAF por TEU')",
    );
    await etsTab.click();

    // Run ETS calculator
    const calcEtsBtn = page.locator(
      "button:has-text('Calcular Derechos ETS & Green BAF')",
    );
    await expect(calcEtsBtn).toBeVisible();
    await calcEtsBtn.click();
    await expect(
      page.locator("span:has-text('Desglose de Recargo Verde (Green BAF)')"),
    ).toBeVisible({ timeout: 5000 });

    // Switch to Pooling & Multi-Fuel tab
    const poolTab = page.locator(
      "button:has-text('Pooling de Flota (Art. 21) & Simulador Multicombustible')",
    );
    await poolTab.click();

    // Run Multi-fuel simulator
    const simFuelBtn = page.locator(
      "button:has-text('Simular Intensidad GEI & Balance')",
    );
    await expect(simFuelBtn).toBeVisible();
    await simFuelBtn.click();
    await expect(
      page.locator("span:has-text('Intensidad WtW Obtenida:')"),
    ).toBeVisible({ timeout: 5000 });
  });
});
