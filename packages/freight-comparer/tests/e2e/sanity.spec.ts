import { test, expect } from '@playwright/test';

test.describe('Freight-Comparer Sanity Check', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });
  });

  test('should render correctly and have no console errors', async ({ page }) => {
    await page.goto('/');
    
    // Basic rendering check (wait for body or root)
    await expect(page.locator('body')).toBeVisible();

    // Verify 0 console errors during initial load
    expect(consoleErrors).toEqual([]);
  });
});
