import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');

  // Should redirect to login since not authenticated
  await expect(page).toHaveURL(/.*login/);

  // Fill in credentials for the seeded test user
  await page.fill('input[type="email"]', 'admin@atlas.com');
  await page.fill('input[type="password"]', 'admin');
  
  // Submit the form
  await page.click('button[type="submit"]');

  // Wait until we are redirected back to the dashboard / root
  await expect(page).not.toHaveURL(/.*login/);
  await expect(page.locator('#root')).toBeVisible();

  // Save storage state to a file
  await page.context().storageState({ path: authFile });
});
