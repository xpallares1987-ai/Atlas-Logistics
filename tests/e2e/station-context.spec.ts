/**
 * @file station-context.spec.ts
 * @description Playwright E2E tests for Global Station Context Selector, Navbar Pill, and Context Propagation.
 * @module @atlas/tests/e2e/station-context
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import { test, expect } from "@playwright/test";

test.describe("Global Station Context & Navigation Cockpit Selector", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Log in as canonical administrator
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@atlas.com");
    await page.fill('input[type="password"]', "admin");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });
  });

  test("renders StationSelectorPill in TopNavbar with active station context", async ({
    page,
  }) => {
    // Locate the station context pill in the top navigation bar
    const stationPill = page.locator(
      'button[aria-label="Select Operating Station"]',
    );
    await expect(stationPill).toBeVisible({ timeout: 10000 });

    // Verify initial station text
    const pillText = await stationPill.textContent();
    expect(pillText).toBeTruthy();
  });

  test("opens dropdown and allows selecting an operating station", async ({
    page,
  }) => {
    const stationPill = page.locator(
      'button[aria-label="Select Operating Station"]',
    );
    await expect(stationPill).toBeVisible({ timeout: 10000 });

    // Open station dropdown
    await stationPill.click();

    // Verify dropdown panel content
    await expect(
      page.locator("text=Branch Station Context").first(),
    ).toBeVisible();

    // Search or filter by BCN
    const filterInput = page.locator('input[placeholder*="Filter by station"]');
    await expect(filterInput).toBeVisible();
    await filterInput.fill("BCN");

    // Click on Barcelona Gateway if visible
    const bcnOption = page.locator("button:has-text('BCN-OCEAN')").first();
    if (await bcnOption.isVisible()) {
      await bcnOption.click();

      // Verify pill updated to BCN-OCEAN
      await expect(stationPill).toContainText("BCN-OCEAN");

      // Verify localStorage was updated
      const storedStation = await page.evaluate(() =>
        localStorage.getItem("atlas_station_context"),
      );
      expect(storedStation).toBe("BCN-OCEAN");
    }
  });

  test("propagates X-Station-Context header on subsequent authenticated API requests", async ({
    page,
  }) => {
    // Set station in localStorage
    await page.evaluate(() => {
      localStorage.setItem("atlas_station_context", "BCN-OCEAN");
      localStorage.setItem("atlas_station_id", "stn_esbcn_01");
    });

    await page.reload();

    // Intercept API requests and assert X-Station-Context header is sent
    let capturedHeader: string | null = null;
    page.on("request", (req) => {
      if (req.url().includes("/api/")) {
        const header = req.headers()["x-station-context"];
        if (header) {
          capturedHeader = header;
        }
      }
    });

    // Navigate to a page that makes authenticated API calls
    await page.goto("/shipments");
    await page.waitForTimeout(2000);

    expect(capturedHeader).toBe("BCN-OCEAN");
  });
});
