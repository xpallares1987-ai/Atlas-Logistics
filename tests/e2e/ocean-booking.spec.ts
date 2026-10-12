import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Autonomous Ocean Booking Engine & Equipment Control (/bookings)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Ocean Booking Control Tower with multi-carrier spot rate locks and corridor presets", async ({
    page,
  }) => {
    await page.goto("/bookings", { waitUntil: "domcontentloaded" });

    // Header & Badges
    await expect(
      page.locator("h1:has-text('Ocean Booking & Equipment Control Tower')")
    ).toBeVisible({ timeout: 15000 });

    await expect(page.locator("text=DCSA v2.0 / EDI 301 & 304").first()).toBeVisible();

    // Corridor Presets
    await expect(page.locator("button:has-text('Transpacífico (Shanghai -> LA)')")).toBeVisible();
    await expect(page.locator("button:has-text('Asia-Europa (Singapur -> RTM)')")).toBeVisible();
    await expect(page.locator("button:has-text('Customer01 Corredor (BCN -> NYC Book TEST01)')")).toBeVisible();

    // Default tab: Rate Lock Cards
    await expect(page.locator("text=Comparador de Tarifas Spot en Tiempo Real")).toBeVisible();
    await expect(page.locator("text=Maersk Line A/S").first()).toBeVisible();
    await expect(page.locator("text=CMA CGM S.A.").first()).toBeVisible();
    await expect(page.locator("text=Hapag-Lloyd AG").first()).toBeVisible();
    await expect(page.locator("text=Garantía Rate Lock").first()).toBeVisible();
  });

  test("should switch between Rate Lock, Cut-Off Radar, SI Studio, and Equipment Release tabs", async ({
    page,
  }) => {
    await page.goto("/bookings", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Ocean Booking & Equipment Control Tower')")
    ).toBeVisible({ timeout: 15000 });

    // Tab 2: Cut-Off Radar
    const cutOffTab = page.locator("button:has-text('2. Radar de Plazos Cut-Off')");
    await cutOffTab.click();
    await expect(
      page.locator("text=Radar de Hitos y Fechas Límite (Cut-Off Milestones)")
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=SI Cut-Off (Instrucciones)")).toBeVisible();
    await expect(page.locator("text=VGM Cut-Off (Peso Bruto)")).toBeVisible();

    // Tab 3: Shipping Instructions Studio (EDI 304)
    const siTab = page.locator("button:has-text('3. Instrucciones B/L (EDI 304)')");
    await siTab.click();
    await expect(
      page.locator("text=Instrucciones de Embarque (Shipping Instructions)")
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Descargar Draft B/L (PDF)')")).toBeVisible();
    await expect(page.locator("text=EDI 304 Transmisión ANSI X12")).toBeVisible();

    // Tab 4: Equipment Release Order
    const equipTab = page.locator("button:has-text('4. Pase de Equipo Vacío (Depot)')");
    await equipTab.click();
    await expect(
      page.locator("text=Orden de Liberación de Equipo Vacío (Empty Release)")
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Descargar Pase de Depósito (PDF)')")).toBeVisible();
    await expect(page.locator("text=PIN de Acceso de Transportista")).toBeVisible();
  });

  test("should toggle Customer01 Corredor Book TEST01 preset and execute booking with rate lock", async ({
    page,
  }) => {
    await page.goto("/bookings", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Ocean Booking & Equipment Control Tower')")
    ).toBeVisible({ timeout: 15000 });

    // Toggle Book TEST01 preset
    const bcnBtn = page.locator("button:has-text('Customer01 Corredor (BCN -> NYC Book TEST01)')");
    await bcnBtn.click();

    await expect(page.locator("text=ESBCN").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=USNYC").first()).toBeVisible();

    // Click Reservar Ahora
    const bookBtn = page.locator("button:has-text('Reservar Ahora')").first();
    await bookBtn.click();

    // Switches automatically to Cut-Off Radar tab
    await expect(
      page.locator("text=Radar de Hitos y Fechas Límite (Cut-Off Milestones)")
    ).toBeVisible({ timeout: 15000 });

    // Switch to Equipment Release tab
    const equipTab = page.locator("button:has-text('4. Pase de Equipo Vacío (Depot)')");
    await equipTab.click();

    await expect(
      page.locator("text=Pase Digital de Acceso Gate")
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=PIN de Acceso de Transportista")).toBeVisible();
  });
});
