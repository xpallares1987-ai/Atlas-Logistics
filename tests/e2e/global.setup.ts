import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = path.join(process.cwd(), "e2e/.auth/user.json");

setup("authenticate", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.goto("/login");
  await page.fill('input[type="email"]', "admin@atlas.com");
  await page.fill('input[type="password"]', "admin");
  await page.click('button[type="submit"]');
  await page.waitForURL("/");
  await page.context().storageState({ path: authFile });
});
