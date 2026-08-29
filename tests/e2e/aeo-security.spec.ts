import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("AEO & Supply Chain Security Engine (UCC Art. 38-39 / C-TPAT / ISO 28000)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render AEO Security workbench with KPI cards and tabs", async ({
    page,
  }) => {
    await page.goto("/aeo-security");

    // Header
    await expect(
      page.locator(
        "h1:has-text('Operador Económico Autorizado (OEA / AEO) & Seguridad')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("span:has-text('Score Global OEA (% CAE)')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Inspecciones 7 Puntos')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Precintos ISO 17712 (Clase H)')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Socios Homologados ISO 28000')"),
    ).toBeVisible();
  });

  test("should select audit, view CAE 6 blocks breakdown and verify download button", async ({
    page,
  }) => {
    await page.goto("/aeo-security");

    await expect(
      page.locator(
        "h1:has-text('Operador Económico Autorizado (OEA / AEO) & Seguridad')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // Select audit
    const auditCard = page.locator("h3:has-text('OEA-2026-MAD-0088')").first();
    await expect(auditCard).toBeVisible({ timeout: 10000 });
    await auditCard.click();

    // Verify detail panel
    await expect(
      page.locator("span:has-text('B2: Cumplimiento Aduanero (Art. 39a)')"),
    ).toBeVisible();
    await expect(
      page.locator("a:has-text('Descargar Informe Oficial CAE PDF')"),
    ).toBeVisible();
  });

  test("should switch to 7-Point Inspections & Seals tab and verify tables", async ({
    page,
  }) => {
    await page.goto("/aeo-security");

    const tabBtn = page.locator(
      "button:has-text('Inspección en 7 Puntos & Precintos ISO 17712')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify form and tables
    await expect(
      page.locator("h3:has-text('Registrar Inspección en 7 Puntos')"),
    ).toBeVisible();
    await expect(
      page.locator(
        "h3:has-text('Registro de Inspecciones en 7 Puntos Realizadas')",
      ),
    ).toBeVisible();
    await expect(
      page.locator("h3:has-text('Libro Registro de Precintos ISO 17712')"),
    ).toBeVisible();
  });

  test("should switch to Partners Risk tab and verify screening simulator", async ({
    page,
  }) => {
    await page.goto("/aeo-security");

    const tabBtn = page.locator(
      "button:has-text('Homologación de Socios & Riesgo ISO 28000')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify form and partner table
    await expect(
      page.locator(
        "h3:has-text('Cribado & Evaluación de Riesgo de Proveedor')",
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        "h3:has-text('Censo de Socios Comerciales & Cadena de Custodia')",
      ),
    ).toBeVisible();
  });
});
