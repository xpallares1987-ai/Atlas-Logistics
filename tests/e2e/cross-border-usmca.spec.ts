import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Cross-Border USMCA, T-MEC & Carta Porte 3.1 (/cross-border-usmca)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Cross-Border Hub with presets and Carta Porte 3.1 studio", async ({
    page,
  }) => {
    await page.goto("/cross-border-usmca", { waitUntil: "domcontentloaded" });

    // Header
    await expect(
      page.locator("h1:has-text('Corredor Transfronterizo Norteamérica')")
    ).toBeVisible({ timeout: 15000 });

    // Preset selector banner
    await expect(page.locator("text=Escenarios Transfronterizos Demostrativos")).toBeVisible();
    await expect(page.locator("button:has-text('Laredo')")).toBeVisible();
    await expect(page.locator("button:has-text('Manzanillo')")).toBeVisible();

    // Default tab: SAT Carta Porte 3.1 & CFDI 4.0
    await expect(page.locator("button:has-text('SAT Carta Porte 3.1 & CFDI 4.0')")).toBeVisible();
    await expect(page.locator("text=IdCCP (36 Caracteres)")).toBeVisible();
  });

  test("should switch to Reglas de Origen T-MEC & IMMEX tab and display RVC calculations", async ({
    page,
  }) => {
    await page.goto("/cross-border-usmca", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Corredor Transfronterizo Norteamérica')")
    ).toBeVisible({ timeout: 15000 });

    // Click T-MEC tab
    const tmecTab = page.locator("button:has-text('Reglas de Origen T-MEC & IMMEX')");
    await tmecTab.click();

    // Verify RVC method card
    await expect(page.locator("text=Calculadora de Valor de Contenido Regional (VCR)")).toBeVisible();
    await expect(page.locator("text=Fracción Arancelaria (HS Code)")).toBeVisible();

    // Verify IMMEX duty deferral analysis
    await expect(page.locator("text=Ahorro Arancelario Total")).toBeVisible();
  });

  test("should switch to Predictor ML tab and display dwell time forecast", async ({
    page,
  }) => {
    await page.goto("/cross-border-usmca", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Corredor Transfronterizo Norteamérica')")
    ).toBeVisible({ timeout: 15000 });

    // Click Predictor ML tab
    const mlTab = page.locator("button:has-text('Predictor ML de Permanencia y Aforo')");
    await mlTab.click();

    // Verify ML forecast panel
    await expect(page.locator("text=Parámetros de Aforo Aduanal")).toBeVisible();
    await expect(page.locator("text=Tiempo Estimado (Dwell)")).toBeVisible();
    await expect(page.locator("text=Prob. Canal Rojo")).toBeVisible();
  });
});
