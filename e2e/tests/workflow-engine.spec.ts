import { test, expect } from "@playwright/test";

test.describe("Workflow Engine", () => {
  test("should display the BullMQ Dashboard via iframe", async ({ page }) => {
    await page.goto("/workflows");

    // Wait for the page to load
    await expect(
      page.locator('h1:has-text("Workflow Engine Dashboard")'),
    ).toBeVisible();

    // Verify that the iframe is present
    const iframe = page.locator('iframe[title="BullMQ Dashboard"]');
    await expect(iframe).toBeVisible();

    // Verify the iframe src points to the backend /admin/queues
    const src = await iframe.getAttribute("src");
    expect(src).toContain("/admin/queues");
  });
});
