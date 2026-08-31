import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Maritime General Average & Salvage Engine (York-Antwerp Rules 2016 / LOF 2024)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render General Average workbench with KPI cards and tabs", async ({
    page,
  }) => {
    await page.goto("/general-average");

    // Header
    await expect(
      page.locator("h1:has-text('Avería Gruesa Marítima & Salvamento')"),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Expedientes de Siniestro Activos')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Masa Activa Total Admisible')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Masa Pasiva Contributoria')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Tasa de Contribución Global')"),
    ).toBeVisible();
  });

  test("should select case, view casualty narrative and check PDF button", async ({
    page,
  }) => {
    await page.goto("/general-average");

    await expect(
      page.locator("h1:has-text('Avería Gruesa Marítima & Salvamento')"),
    ).toBeVisible({ timeout: 15000 });

    // Select case
    const caseCard = page.locator("span:has-text('GA-2026-VAL-0012')").first();
    await expect(caseCard).toBeVisible({ timeout: 10000 });
    await caseCard.click();

    // Verify detail
    await expect(
      page.locator(
        "h4:has-text('Relato de la Emergencia & Protesta de Mar Notarial')",
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        "button:has-text('Descargar Declaración Notarial de Avería Gruesa PDF')",
      ),
    ).toBeVisible();
  });

  test("should switch to Adjuster Simulator tab and verify rate of contribution", async ({
    page,
  }) => {
    await page.goto("/general-average");

    const tabBtn = page.locator(
      "button:has-text('Masa Activa & Pasiva (Simulador de Prorrateo)')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify simulator inputs & result
    await expect(
      page
        .locator("div:has-text('Simulador de Masa Activa & Pasiva (YAR 2016)')")
        .first(),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('Resultado del Ajuste & Cuota de Contribución')",
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        "button:has-text('Descargar Cuadro de Liquidación de Avería Gruesa PDF')",
      ),
    ).toBeVisible();
  });

  test("should switch to Securities tab and verify Lloyd's Average Bond & Guarantees", async ({
    page,
  }) => {
    await page.goto("/general-average");

    const tabBtn = page.locator(
      "button:has-text('Garantías de Carga, Bonos LAB 77 & Liquidación')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify Securities section
    await expect(
      page
        .locator(
          "div:has-text('Garantías de Avería Gruesa & Fianza de Liberación de Carga (Lloyd\\'s LAB 77)')",
        )
        .first(),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('SEC-2026-VAL-001 (Average Bond + Guarantee)')",
      ),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Lloyd\\'s Average Bond (LAB 77 PDF)')"),
    ).toBeVisible();
  });
});
