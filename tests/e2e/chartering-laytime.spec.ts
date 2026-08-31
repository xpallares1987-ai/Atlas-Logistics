import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Maritime Chartering & Laytime / Demurrage Engine (BIMCO Gencon 2022 / NYPE 2015)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Chartering & Laytime workbench with KPI cards and tabs", async ({
    page,
  }) => {
    await page.goto("/chartering-laytime");

    // Header
    await expect(
      page.locator(
        "h1:has-text('Fletamentos Marítimos & Liquidación de Planchas')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Pólizas & Fixtures Activas')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Liquidación Neta Demurrage / Despatch')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Tiempo de Plancha Ahorrado')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Días Off-Hire Auditados')"),
    ).toBeVisible();
  });

  test("should select fixture, view contract particulars and check PDF button", async ({
    page,
  }) => {
    await page.goto("/chartering-laytime");

    await expect(
      page.locator(
        "h1:has-text('Fletamentos Marítimos & Liquidación de Planchas')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // Select fixture
    const fixtureCard = page
      .locator("span:has-text('CP-2026-SDR-0081')")
      .first();
    await expect(fixtureCard).toBeVisible({ timeout: 10000 });
    await fixtureCard.click();

    // Verify detail headers
    await expect(
      page.locator(
        "span:has-text('Trigo Duro a Granel (Durum Wheat in Bulk)')",
      ),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Descargar Póliza / Fixture PDF')").first(),
    ).toBeVisible();
  });

  test("should switch to SOF & Laytime Simulator tab and verify calculation results", async ({
    page,
  }) => {
    await page.goto("/chartering-laytime");

    const tabBtn = page.locator(
      "button:has-text('Estado de Hechos (SOF) & Simulador de Plancha')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify simulator inputs & result
    await expect(
      page
        .locator("div:has-text('Simulador de Plancha, Lluvia y Demoras')")
        .first(),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('Resultado del Cómputo de Plancha & Dictamen Financiero')",
      ),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Descargar Statement of Facts (SOF PDF)')"),
    ).toBeVisible();
    await expect(
      page.locator(
        "button:has-text('Descargar Hoja de Liquidación de Planchas PDF')",
      ),
    ).toBeVisible();
  });

  test("should switch to Settlements & Time Charter tab and verify off-hire audit", async ({
    page,
  }) => {
    await page.goto("/chartering-laytime");

    const tabBtn = page.locator(
      "button:has-text('Liquidación Demurrage / Despatch & Time Charter')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify Time Charter section
    await expect(
      page
        .locator(
          "div:has-text('Auditoría de Fletamento por Tiempo (Time Charter Hire & Off-Hire Statement)')",
        )
        .first(),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Flete Bruto Devengado')"),
    ).toBeVisible();
    await expect(
      page.locator(
        "button:has-text('Descargar Estado de Liquidación Time Charter PDF')",
      ),
    ).toBeVisible();
  });
});
