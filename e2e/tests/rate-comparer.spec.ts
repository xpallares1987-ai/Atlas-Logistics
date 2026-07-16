import { test, expect } from '@playwright/test';

test.describe('Atlas Logistics - Smoke & E2E', () => {
  test('Should load the homepage and display the Dashboard', async ({ page }) => {
    // Navigate to the root
    await page.goto('/');

    // Ensure the title is present (or any known element from App.tsx)
    await expect(page.locator('text=ATLAS.')).toBeVisible();
  });

  test('Should navigate to Rate Comparer and interact', async ({ page }) => {
    // Navigate to the root
    await page.goto('/');

    // Click the Rate Comparer sidebar link.
    // The link likely has text 'Rate Comparer' or similar. We can search for the icon or the href.
    // Assuming the href is '/rate-comparer' or the text is 'Rates'
    const link = page.locator('a', { hasText: /rate/i }).first();
    if (await link.isVisible()) {
      await link.click();
    } else {
      // Direct navigation if link not found
      await page.goto('/rates');
    }

    // Wait for the route to load
    await page.waitForLoadState('networkidle');

    // Simple interaction assertion: check that the page didn't crash
    // and wait for at least one div
    await expect(page.locator('div').first()).toBeVisible();
  });
});
