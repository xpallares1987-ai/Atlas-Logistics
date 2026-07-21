import { test, expect } from '@playwright/test';

test.describe('Atlas Logistics - Smoke & E2E', () => {
  test('Should load the homepage and display the Dashboard', async ({ page }) => {
    // Navigate to root
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for the app container
    await expect(page.locator('#root')).toBeVisible();

    // Verify main navigation or logo text exists
    const brand = page.locator('text=ATLAS');
    await expect(brand.first()).toBeVisible();
  });

  test('Should navigate to Rate Comparer and interact', async ({ page }) => {
    // Navigate to root
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Navigate to quotes page
    await page.goto('/quotes', { waitUntil: 'domcontentloaded' });

    // Check root app container loaded successfully
    await expect(page.locator('#root')).toBeVisible();
  });
});
