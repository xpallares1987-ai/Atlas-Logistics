import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Customs Clearance & Tariff Engine", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render customs clearance workbench and channel KPI cards", async ({
    page,
  }) => {
    await page.goto("/customs");

    // Verify main header
    await expect(
      page.locator("h1:has-text('Despacho Aduanero y Motor Arancelario')"),
    ).toBeVisible({ timeout: 15000 });

    // Verify Channel KPI cards
    await expect(
      page.locator("p:has-text('Total Declaraciones')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Canal Verde (Levante)')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Canal Naranja (Docs)')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Canal Rojo (Inspección)')"),
    ).toBeVisible();
  });

  test("should select declaration and inspect 54-Box DUA details and compliance diagnostics", async ({
    page,
  }) => {
    await page.goto("/customs");

    await expect(
      page.locator("h1:has-text('Despacho Aduanero y Motor Arancelario')"),
    ).toBeVisible({ timeout: 15000 });

    // Verify declaration list items exist and click first item
    const firstDecl = page.locator("button:has-text('TARIC:')").first();
    await expect(firstDecl).toBeVisible({ timeout: 10000 });
    await firstDecl.click();

    // Verify DUA inspector header & boxes
    await expect(
      page.locator("h2:has-text('Documento Único Administrativo (DUA)')"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("span:has-text('Casilla 02 - Exportador / Expedidor')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Casilla 08 - Destinatario / Importador')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Casilla 14 - Declarante / Representante')"),
    ).toBeVisible();
    await expect(
      page.locator("h3:has-text('Diagnóstico de Cumplimiento Normativo')"),
    ).toBeVisible();

    // Verify PDF and XML export buttons
    await expect(page.locator("button:has-text('DUA PDF')")).toBeVisible();
    await expect(page.locator("button:has-text('DUA XML')")).toBeVisible();
  });

  test("should open TARIC simulator modal and compute duties and VAT", async ({
    page,
  }) => {
    await page.goto("/customs");

    await expect(
      page.locator("h1:has-text('Despacho Aduanero y Motor Arancelario')"),
    ).toBeVisible({ timeout: 15000 });

    // Click simulator button
    const simBtn = page.locator("button:has-text('Simulador TARIC')");
    await expect(simBtn).toBeVisible({ timeout: 10000 });
    await simBtn.click();

    // Verify modal appears
    await expect(
      page.locator(
        "h3:has-text('Simulador Arancelario TARIC y Nuevo Despacho')",
      ),
    ).toBeVisible({ timeout: 10000 });

    // Click calculate
    const calcBtn = page.locator("button:has-text('Calcular Liquidación')");
    await expect(calcBtn).toBeVisible();
    await calcBtn.click();

    // Verify calculated liquidation table
    await expect(
      page.locator("span:has-text('Valor CIF (Base):')"),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("span:has-text('Total Liquidación:')"),
    ).toBeVisible();
  });
});
