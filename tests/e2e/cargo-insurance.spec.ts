import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Cargo Insurance & Marine Open Cover Engine (ICC 2009 / UCP 600 / LMA)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Cargo Insurance workbench with KPI cards and tabs", async ({
    page,
  }) => {
    await page.goto("/cargo-insurance");

    // Header
    await expect(
      page.locator("h1:has-text('Seguro de Transporte de Mercancías')"),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Pólizas Flotantes Activas')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Suma Asegurada en Riesgo')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Primas & Recargos Fiscales')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Ratio Siniestralidad')"),
    ).toBeVisible();
  });

  test("should test Actuarial Calculator and calculate 110% CIF and Gross Premium", async ({
    page,
  }) => {
    await page.goto("/cargo-insurance");

    await expect(
      page.locator("h1:has-text('Seguro de Transporte de Mercancías')"),
    ).toBeVisible({ timeout: 15000 });

    // Verify 110% CIF sum is calculated
    await expect(
      page.locator("span:has-text('Suma Total Asegurada (110% CIF):')"),
    ).toBeVisible();

    // Verify compliance note
    await expect(
      page.locator(
        "p:has-text('Certificado apto para negociación bancaria bajo UCP 600 Art. 28')",
      ),
    ).toBeVisible();
  });

  test("should switch to Open Policies tab and check open cover and bordereau", async ({
    page,
  }) => {
    await page.goto("/cargo-insurance");

    const tabBtn = page.locator(
      "button:has-text('Pólizas Flotantes (Open Cover) & Bordereau Mensual')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify policy number
    await expect(
      page.locator("span:has-text('POL-MAR-2026-VAL-0089')").first(),
    ).toBeVisible();

    // Verify buttons
    await expect(
      page.locator("button:has-text('Póliza Schedule PDF')"),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Descargar Bordereau Mensual PDF')"),
    ).toBeVisible();
  });

  test("should switch to Certificates & Claims tab and check claim simulator and PDF buttons", async ({
    page,
  }) => {
    await page.goto("/cargo-insurance");

    const tabBtn = page.locator(
      "button:has-text('Certificados Emitidos & Liquidación de Siniestros')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify certificate number
    await expect(
      page.locator("span:has-text('INS-CERT-2026-VAL-0042')").first(),
    ).toBeVisible();

    // Verify buttons
    await expect(
      page.locator("button:has-text('Descargar Certificado PDF')"),
    ).toBeVisible();
    await expect(
      page.locator(
        "button:has-text('Descargar Dictamen Pericial de Siniestro PDF')",
      ),
    ).toBeVisible();
  });
});
