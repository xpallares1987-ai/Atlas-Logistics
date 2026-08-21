import { test, expect } from "@playwright/test";

test.describe("Authentication & RBAC", () => {
  test("should login successfully as admin", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("text=Atlas ERP")).toBeVisible();

    await page.fill('input[type="email"]', "admin@atlas.com");
    await page.fill('input[type="password"]', "admin");
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 15000 });
    await expect(page.locator("text=Dashboard").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("should show error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "wrong@atlas.com");
    await page.fill('input[type="password"]', "badpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Invalid credentials")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/bookings");
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("text=Atlas ERP")).toBeVisible();
  });
});
