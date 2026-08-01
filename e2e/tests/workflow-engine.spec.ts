import { test, expect } from "@playwright/test";

test.describe("Workflow Engine", () => {
  test("should display the Workflows Modeler", async ({ page }) => {
    await page.goto("/workflows");

    // Wait for the page to load
    await expect(
      page.locator('h1:has-text("Workflows Modeler")'),
    ).toBeVisible();

    // Verify that the recent workflow instances table is present
    const tableHeader = page.locator('h2:has-text("Recent Workflow Instances")');
    await expect(tableHeader).toBeVisible();
  });
});
