import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Bulk Cargo & Port Terminal Operations Engine (IMSBC / BLU / Grain Code / ASTM 54)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Bulk Operations workbench with KPI cards and tabs", async ({
    page,
  }) => {
    await page.goto("/bulk-operations");

    // Header
    await expect(
      page.locator(
        "h1:has-text('Logística de Graneles & Operaciones de Terminal Portuaria')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Buques en Operación')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Carga Certificada (Draft)')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Control Licuefacción TML')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Estabilidad Grain Code')"),
    ).toBeVisible();
  });

  test("should test Draft Survey Calculator in Tab 1 and calculate Net Cargo Tonnage", async ({
    page,
  }) => {
    await page.goto("/bulk-operations");

    await expect(
      page.locator(
        "h1:has-text('Logística de Graneles & Operaciones de Terminal Portuaria')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // Verify Tab 1 calculation elements
    await expect(
      page.locator("span:has-text('Asiento Aparente (Trim):')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Calado Medio de Medios (DQM):')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('TONELAJE NETO DE CARGA EMBARCADA:')"),
    ).toBeVisible();

    // Verify PDF button
    await expect(
      page.locator("button:has-text('Descargar Certificado Draft Survey PDF')"),
    ).toBeVisible();
  });

  test("should switch to IMSBC & Grain tab and verify TML and Grain Code compliance", async ({
    page,
  }) => {
    await page.goto("/bulk-operations");

    const tabBtn = page.locator(
      "button:has-text('Graneles Sólidos IMSBC & Estabilidad de Grano OMI')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify IMSBC TML
    await expect(
      page.locator("span:has-text('Límite de Humedad Transportable (TML):')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('✔ CARGAMENTO APTO PARA EMBARQUE')"),
    ).toBeVisible();

    // Verify Grain stability
    await expect(
      page.locator("span:has-text('Ángulo de Escora Residual (θ):')"),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('✔ ESTABILIDAD APROBADA CONFORME SOLAS CAP. VI')",
      ),
    ).toBeVisible();
  });

  test("should switch to Tanker Ullage tab and verify ASTM Table 54 quantity", async ({
    page,
  }) => {
    await page.goto("/bulk-operations");

    const tabBtn = page.locator(
      "button:has-text('Sondeo de Tanques Ullage ASTM & Terminales BLU')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify ASTM calculations
    await expect(
      page.locator("span:has-text('Volumen Bruto Observado (GOV):')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('MASA COMERCIAL EN AIRE (FACTURACIÓN):')"),
    ).toBeVisible();

    // Verify PDF button
    await expect(
      page.locator("button:has-text('Descargar Informe Ullage ASTM PDF')"),
    ).toBeVisible();
  });
});
