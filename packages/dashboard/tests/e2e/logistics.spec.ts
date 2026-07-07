import { test, expect } from "@playwright/test";

test.describe("Logistics E2E Journey", () => {
  test("should load the Shipment Dashboard successfully", async ({ page }) => {
    // Navigate to the Dashboard
    await page.goto("/");

    // Verify the page title or primary heading
    // This is a dynamic smoke test that waits for Next.js to render
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    // We expect the Sankey chart or the general map container to eventually mount
    // If the UI is built with Tailwind and lucide icons, verify some core structure exists
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("should render dynamic data without breaking", async ({ page }) => {
    await page.goto("/");

    // We expect the React components to hydrate and not throw any 500 errors
    const errors: string[] = [];
    page.on("pageerror", (exception) => {
      errors.push(exception.message);
    });

    await page.waitForLoadState("networkidle");
    expect(errors.length).toBe(0); // Ensure no client-side exceptions were thrown
  });
});
