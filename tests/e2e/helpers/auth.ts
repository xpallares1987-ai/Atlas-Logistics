import { Page, expect } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");

  const hasToken = await page
    .evaluate(() => !!localStorage.getItem("atlas_token"))
    .catch(() => false);

  if (!hasToken) {
    await page.fill('input[type="email"]', "admin@atlas.com");
    await page.fill('input[type="password"]', "admin");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });
  }

  await expect(
    page.locator("text=Dashboard").or(page.locator("text=ATLAS")).first(),
  ).toBeVisible({ timeout: 15000 });
}
