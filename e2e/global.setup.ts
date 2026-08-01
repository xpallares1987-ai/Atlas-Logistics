import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page, request }) => {
  // Wait for the backend to be ready by checking if the proxy returns a 502/504
  await expect(async () => {
    const res = await request.get('/api/auth/me');
    expect(res.status()).not.toBe(502);
    expect(res.status()).not.toBe(504);
  }).toPass({ timeout: 30000 });

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
