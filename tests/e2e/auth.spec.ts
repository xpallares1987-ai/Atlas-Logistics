import { test, expect } from "@playwright/test";

test.describe("Authentication & RBAC", () => {
  test("should login successfully as admin", async ({ page }) => {
    // Go to login page
    await page.goto("/login");

    // Wait for the form to render
    await expect(page.getByText("Atlas Enterprise")).toBeVisible();

    // Fill credentials
    await page.fill('input[type="email"]', "admin@atlas.com");
    await page.fill('input[type="password"]', "admin");

    // Submit
    await page.click('button[type="submit"]');

    // Wait for navigation and verify dashboard renders
    await expect(page).toHaveURL("/");
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("should show error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "wrong@atlas.com");
    await page.fill('input[type="password"]', "badpassword");
    await page.click('button[type="submit"]');

    await expect(page.getByText("Credenciales inválidas")).toBeVisible();
  });
});
