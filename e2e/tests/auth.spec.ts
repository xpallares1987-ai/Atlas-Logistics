import { test, expect } from '@playwright/test';

// Reset storage state for this specific file so it doesn't use the global setup
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication Flows', () => {
  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2:has-text("ATLAS")')).toBeVisible();

    await page.fill('input[type="email"]', 'invalid@atlas.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMsg = page.locator('text=Invalid credentials').or(page.locator('text=Authentication failed'));
    await expect(errorMsg).toBeVisible();
  });

  test('should successfully login and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@atlas.com');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard root
    await expect(page).not.toHaveURL(/.*login/);
    await expect(page.locator('#root')).toBeVisible();
  });
});
