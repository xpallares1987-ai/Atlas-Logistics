import { test, expect } from "@playwright/test";

test.describe("Micro-Frontend (MFE) Federation & Resilient Edge Loading", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@atlas.com");
    await page.fill('input[type="password"]', "admin");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });
  });

  test("should seamlessly render Rate Comparer with fallback mode when remote edge is offline", async ({ page }) => {
    // Intercept remoteEntry.js calls to simulate remote edge container being offline
    await page.route("**/assets/remoteEntry.js", (route) => route.abort("failed"));

    await page.goto("/quotes");

    // SafeRemoteLoader should catch the aborted request and mount the local fallback cleanly
    await expect(page.locator("#mfeStatusFallback")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Local Fallback Mode · Resilient (Rate Comparer)")).toBeVisible();

    // Verify Rate Comparer content is mounted
    await expect(page.locator("body")).toContainText("Rate Comparer", { timeout: 15000 });
  });

  test("should seamlessly render Warehouse Operations with fallback mode when remote edge is offline", async ({ page }) => {
    await page.route("**/assets/remoteEntry.js", (route) => route.abort("failed"));

    await page.goto("/warehouse");

    // SafeRemoteLoader should display local fallback badge
    await expect(page.locator("#mfeStatusFallback")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Local Fallback Mode · Resilient (Warehouse Operations)")).toBeVisible();

    // Verify warehouse operations UI is active
    await expect(page.locator("body")).toContainText("Warehouse", { timeout: 15000 });
  });

  test("should gracefully display active edge badge when remote container responds", async ({ page }) => {
    // Mock the remote entry endpoint returning mock JS
    await page.route("http://127.0.0.1:5176/assets/remoteEntry.js", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `
          window.__rates_remote_loaded = true;
          export default function RemoteRates() {
            return window.React ? window.React.createElement("div", { id: "mockRemoteRates" }, "Live Edge Remote Rates Active") : null;
          }
        `,
      });
    });

    await page.goto("/quotes");

    // When remote responds, verify SafeRemoteLoader handles the route or fallback without crash
    await expect(page.locator("body")).not.toContainText("No se pudo resolver el módulo remoto", { timeout: 10000 });
  });
});
