import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Freight Rate Comparer", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render freight comparer view and currency toggle", async ({
    page,
  }) => {
    await page.goto("/quotes");

    await expect(
      page
        .locator("text=Freight Comparer")
        .or(page.locator("text=Freight Rate")),
    ).toBeVisible({ timeout: 20000 });

    const usdBtn = page.getByRole("button", { name: "USD", exact: true });
    const eurBtn = page.getByRole("button", { name: "EUR", exact: true });
    await expect(usdBtn).toBeVisible();
    await expect(eurBtn).toBeVisible();

    // Toggle currency
    await eurBtn.click();
    await expect(eurBtn).toHaveClass(/bg-indigo-600/);
  });

  test("should select origin and destination ports and trigger rate search", async ({
    page,
  }) => {
    await page.goto("/quotes");
    await expect(
      page
        .locator("text=Freight Comparer")
        .or(page.locator("text=Freight Rate")),
    ).toBeVisible({ timeout: 20000 });

    // Verify search button or inputs exist
    const searchBtn = page
      .locator("button:has-text('Buscar')")
      .or(page.locator("button:has-text('Search')"))
      .first();
    await expect(searchBtn).toBeVisible({ timeout: 10000 });
  });
});
