import { test, expect } from "@playwright/test";

test.describe("Carbon Tracker", () => {
  test("should render carbon tracking charts", async ({ page }) => {
    // Navigate to ESG module
    await page.goto("/esg-tracker");

    // Wait for the ESG / Carbon Tracker header
    await expect(
      page
        .locator("h1", { hasText: "ESG" })
        .or(page.locator("h2", { hasText: "ESG" }))
        .or(page.locator("text=Carbon")),
    ).toBeVisible();

    // The charts use Recharts or Chart.js which render as SVG or Canvas
    // Let's check for an SVG with recharts-wrapper or a canvas element
    const chartContainer = page.locator(".recharts-wrapper, canvas").first();
    await expect(chartContainer).toBeVisible({ timeout: 10000 });
  });
});
