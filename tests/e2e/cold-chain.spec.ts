import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Cold Chain & Temperature-Controlled Pharma/Reefer Monitoring Engine (EU GDP & EN 12830)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Cold Chain & Pharma GDP workbench with KPI cards", async ({
    page,
  }) => {
    await page.goto("/cold-chain");

    // Header
    await expect(
      page.locator("h1:has-text('Cadena de Frío & Farma GDP / Reefer')"),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Envíos Activos Frío')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Conformidad GDP (Liberados)')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Lotes en Cuarentena')"),
    ).toBeVisible();
    await expect(page.locator("p:has-text('Alerta Hielo Seco')")).toBeVisible();
  });

  test("should inspect cold chain shipments and view telemetry datalogger readings", async ({
    page,
  }) => {
    await page.goto("/cold-chain");

    await expect(
      page.locator("h1:has-text('Cadena de Frío & Farma GDP / Reefer')"),
    ).toBeVisible({ timeout: 15000 });

    // Select vaccine shipment
    const vaxShipment = page.locator("p:has-text('CC-2026-9901')").first();
    await expect(vaxShipment).toBeVisible({ timeout: 10000 });
    await vaxShipment.click();

    // Verify detail panel headers and certificate link
    await expect(
      page.locator("a:has-text('Certificado GDP (PDF)')"),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Dictamen de Calidad (RP)')"),
    ).toBeVisible();
  });

  test("should run interactive MKT and thermal physics simulators", async ({
    page,
  }) => {
    await page.goto("/cold-chain");

    // Switch to simulator tab
    const calcTab = page.locator(
      "button:has-text('Calculadora Térmica (MKT / Hielo Seco / Genset)')",
    );
    await calcTab.click();

    // Run MKT
    const mktBtn = page.locator("button:has-text('Calcular MKT de Arrhenius')");
    await expect(mktBtn).toBeVisible();
    await mktBtn.click();
    await expect(page.locator("span:has-text('MKT Calculado:')")).toBeVisible({
      timeout: 5000,
    });

    // Run Dry Ice Sim
    const dryIceBtn = page.locator(
      "button:has-text('Estimar Autonomía & Pérdida')",
    );
    await expect(dryIceBtn).toBeVisible();
    await dryIceBtn.click();
    await expect(
      page.locator("span:has-text('Autonomía Restante:')"),
    ).toBeVisible({ timeout: 5000 });

    // Run Reefer Genset Sim
    const reeferBtn = page.locator(
      "button:has-text('Estimar Consumo de Combustible')",
    );
    await expect(reeferBtn).toBeVisible();
    await reeferBtn.click();
    await expect(
      page.locator("span:has-text('Consumo Total Estimado:')"),
    ).toBeVisible({ timeout: 5000 });
  });
});
