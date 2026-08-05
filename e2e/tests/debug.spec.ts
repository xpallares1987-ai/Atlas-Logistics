import { test, expect } from "@playwright/test";
test("debug role", async ({ page }) => {
  await page.goto("/settings#database");
  await page.waitForTimeout(2000);
  const text = await page.evaluate(() => document.body.innerText);
  console.log("PAGE TEXT:", text);
});
