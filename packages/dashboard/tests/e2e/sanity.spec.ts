import { test, expect } from '@playwright/test';

test.describe('Shipment-Dashboard Sanity Check', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      // Ignore Next.js dev hydration or benign warnings if needed, but we fail on real errors
      if (msg.type() === 'error' && !msg.text().includes('404')) {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });
  });

  test('should render correctly and have no console errors', async ({ page }) => {
    await page.goto('/');
    
    // Verify it doesn't crash on load
    await expect(page.locator('body')).toBeVisible();

    // Verify 0 console errors during initial load
    expect(consoleErrors).toEqual([]);
  });
});
