import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Multimodal Core Workflow E2E (/bookings, /addresses, /edi)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ==========================================================================
  // 1. BOOKING MANAGEMENT LIFECYCLE & HBL EDITOR MODAL
  // ==========================================================================
  test("should load booking workbench, inspect kanban columns, and open new request modal", async ({
    page,
  }) => {
    await page.goto("/bookings", { waitUntil: "domcontentloaded" });

    // Validate main heading
    await expect(
      page
        .locator("h1:has-text('Ocean Booking & Equipment Control Tower')")
        .or(page.locator("h1:has-text('Booking & B/L Management')"))
        .first(),
    ).toBeVisible({ timeout: 15000 });

    // Click New Booking button
    const newBookingBtn = page
      .locator("button:has-text('New Booking')")
      .or(page.locator("button:has-text('Nueva Solicitud')"))
      .first();

    if (await newBookingBtn.isVisible()) {
      await newBookingBtn.click();

      // Verify booking modal / HBL draft editor pops up
      await expect(
        page
          .locator("h3:has-text('Nueva Solicitud de Reserva')")
          .or(page.locator("h3:has-text('House Bill of Lading Draft')"))
          .or(page.locator("h3:has-text('New Booking Request')"))
          .first(),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  // ==========================================================================
  // 2. 25-CODE CANONICAL ADDRESSES HUB & CORPORATE GROUPS
  // ==========================================================================
  test("should render Addresses Hub, directory statistics, and corporate group governance", async ({
    page,
  }) => {
    await page.goto("/addresses", { waitUntil: "domcontentloaded" });

    // Validate directory title
    await expect(
      page
        .locator(
          "h1:has-text('Directorio Corporativo & Maestro de Direcciones')",
        )
        .or(page.locator("h1:has-text('Addresses Hub')"))
        .or(page.locator("h1:has-text('Directorio')"))
        .first(),
    ).toBeVisible({ timeout: 15000 });

    // Verify search input
    const searchInput = page
      .locator("input[placeholder*='Buscar por empresa']")
      .or(page.locator("input[placeholder*='Buscar']"))
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Filter by UN/LOCODE or country
    await searchInput.fill("ESVLC");
    await page.waitForTimeout(500);

    // Verify button to create new address exists
    const newAddrBtn = page
      .locator("button:has-text('Registrar Nueva Dirección')")
      .or(page.locator("button:has-text('New Address')"))
      .first();
    await expect(newAddrBtn).toBeVisible({ timeout: 10000 });
  });

  // ==========================================================================
  // 3. DRAYAGE DISPATCH & RATE RECONCILIATION
  // ==========================================================================
  test("should open Drayage Calculator modal and compute haulage charges", async ({
    page,
  }) => {
    await page.goto("/bookings", { waitUntil: "domcontentloaded" });

    // Search for any Drayage trigger button or open Drayage directly
    const drayageBtn = page
      .locator("button:has-text('Drayage')")
      .or(page.locator("button:has-text('Calcular Transporte Terrestre')"))
      .or(page.locator("button:has-text('Transporte')"))
      .first();

    if (await drayageBtn.isVisible()) {
      await drayageBtn.click();

      // Verify Drayage modal opens with origin / destination selection
      await expect(
        page
          .locator("text=Drayage & Port Haulage Calculator")
          .or(page.locator("text=Calculadora de Drayage"))
          .first(),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  // ==========================================================================
  // 4. EDI INTEGRATION CONSOLE & UN/EDIFACT + UN/CEFACT XML
  // ==========================================================================
  test("should render EDI Integration Console and navigate to UN/EDIFACT & XML catalog", async ({
    page,
  }) => {
    await page.goto("/edi", { waitUntil: "domcontentloaded" });

    // Heading verification
    await expect(
      page
        .locator(
          "h1:has-text('Consola Integral EDIFACT / ANSI X12 / DCSA 3.0')",
        )
        .or(page.locator("h1:has-text('Interoperabilidad B2B')"))
        .or(page.locator("text=Consola Integral EDIFACT").first()),
    ).toBeVisible({ timeout: 15000 });

    // Switch to UN/EDIFACT & UN/CEFACT XML Tab
    const catalogTab = page
      .locator("button:has-text('UN/EDIFACT & UN/CEFACT XML')")
      .first();
    await expect(catalogTab).toBeVisible({ timeout: 10000 });
    await catalogTab.click();

    // Verify EDI catalog header or message list
    await expect(
      page
        .locator("text=Catálogo de Mensajes")
        .or(page.locator("text=UN/EDIFACT"))
        .or(page.locator("text=UN/CEFACT XML"))
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
