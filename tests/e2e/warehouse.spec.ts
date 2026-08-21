import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Warehouse Operations MFE", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Warehouse & Terminal Ops dashboard with KPIs", async ({
    page,
  }) => {
    await page.goto("/warehouse");

    await expect(page.locator("text=Warehouse & Terminal Ops")).toBeVisible({
      timeout: 15000,
    });

    await expect(page.locator("text=Active Vehicles")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Total Inventory")).toBeVisible();
    await expect(page.locator("text=Docks Available")).toBeVisible();
  });

  test("should display Kanban stages and task cards", async ({ page }) => {
    await page.goto("/warehouse");
    await expect(page.locator("text=Warehouse & Terminal Ops")).toBeVisible({
      timeout: 15000,
    });

    // Switch to Fulfillment Kanban tab
    await page.click("button:has-text('Fulfillment')");

    // Wait for Kanban board to load
    await expect(page.locator("text=Order Fulfillment Workflow")).toBeVisible({
      timeout: 15000,
    });

    // Verify Kanban columns (PICK, PACK, DISPATCH, COMPLETED)
    await expect(page.locator("text=PICK").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=PACK").first()).toBeVisible();
    await expect(page.locator("text=DISPATCH").first()).toBeVisible();
  });
});
