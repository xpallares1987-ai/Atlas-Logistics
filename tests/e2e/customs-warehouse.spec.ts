import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Customs Warehouse, Free Zone & Special Regimes Engine (CAU 7100/7600 & AEAT)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Customs Warehouse workbench with KPI cards", async ({
    page,
  }) => {
    await page.goto("/customs-warehouse");

    // Header
    await expect(
      page.locator(
        "h1:has-text('Depósito Aduanero, Zona Franca & Regímenes Especiales')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Partidas Vinculadas')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Deuda Aduanera Suspendida')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Aval Global Disponible (AEAT)')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Instalaciones Autorizadas')"),
    ).toBeVisible();
  });

  test("should inspect customs inventory lots and verify DVD PDF export button", async ({
    page,
  }) => {
    await page.goto("/customs-warehouse");

    await expect(
      page.locator(
        "h1:has-text('Depósito Aduanero, Zona Franca & Regímenes Especiales')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // Select lot
    const lotItem = page.locator("p:has-text('LOT-2026-DA-08101')").first();
    await expect(lotItem).toBeVisible({ timeout: 10000 });
    await lotItem.click();

    // Verify detail headers and export buttons
    await expect(
      page.locator("a:has-text('Documento DVD (PDF)')"),
    ).toBeVisible();
    await expect(
      page.locator("a:has-text('Certificado Oficial de Existencias (PDF)')"),
    ).toBeVisible();
  });

  test("should run tax settlement simulator and usual handling validator", async ({
    page,
  }) => {
    await page.goto("/customs-warehouse");

    // Switch to Guarantees & Tax tab
    const guarTab = page.locator(
      "button:has-text('Gestión de Avales & Liquidación Fiscal (4071 vs 3171)')",
    );
    await guarTab.click();

    // Run discharge tax calculator
    const calcTaxBtn = page.locator(
      "button:has-text('Calcular Liquidación de Tributos')",
    );
    await expect(calcTaxBtn).toBeVisible();
    await calcTaxBtn.click();
    await expect(
      page.locator("span:has-text('Total a Pagar en DUA:')"),
    ).toBeVisible({ timeout: 5000 });

    // Switch to Facilities & Usual Handlings tab
    const facTab = page.locator(
      "button:has-text('Instalaciones & Manipulaciones Usuales (Art. 220 CAU)')",
    );
    await facTab.click();

    // Check Article 220 validation notice
    await expect(
      page.locator(
        "span:has-text('MANIPULACIÓN USUAL AUTORIZADA (ART. 220 CAU)')",
      ),
    ).toBeVisible({ timeout: 5000 });
  });
});
