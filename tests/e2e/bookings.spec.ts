import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Booking Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render booking management dashboard and board columns", async ({
    page,
  }) => {
    await page.goto("/bookings");

    await expect(
      page.locator("h1:has-text('Booking & B/L Management')"),
    ).toBeVisible({ timeout: 15000 });

    // Verify Kanban columns
    await expect(page.locator("h3:has-text('Pending')").first()).toBeVisible();
    await expect(
      page.locator("h3:has-text('Confirmed')").first(),
    ).toBeVisible();
  });

  test("should open new booking form and display HBL draft editor", async ({
    page,
  }) => {
    await page.goto("/bookings");
    await expect(
      page.locator("h1:has-text('Booking & B/L Management')"),
    ).toBeVisible({ timeout: 15000 });

    const newBookingBtn = page.locator("button:has-text('New Booking')");
    await expect(newBookingBtn).toBeVisible({ timeout: 10000 });
    await newBookingBtn.click();

    // Verify HBL draft editor opens
    await expect(
      page.locator("h3:has-text('House Bill of Lading Draft')"),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Save Booking')")).toBeVisible({
      timeout: 10000,
    });
  });
});
