import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.skip(!!process.env.CI, 'Skip visual tests in CI');

  test('should match the initial canvas snapshot', async ({ page }) => {
    await page.goto('/');

    // Wait for modeler to be ready
    await page.waitForSelector('.djs-container', { state: 'visible' });

    // Hide parts that might change (minimap, etc) if needed
    // But for a sanity visual check, we take the whole viewport or just the canvas
    const canvas = page.locator('#canvas');

    // Use the built-in playwright toHaveScreenshot
    await expect(canvas).toHaveScreenshot('initial-canvas.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('should match sidebar layout when element selected', async ({ page }) => {
    await page.goto('/');

    // Wait for diagram to load
    await page.waitForSelector('.djs-container', { state: 'visible' });

    // Click on a task to open sidebar properties (StartEvent is usually Task_1 or similar in default)
    // Actually default diagram usually has StartEvent_1
    await page.click('[data-element-id="StartEvent_1"]');

    const sidebar = page.locator('#propertiesSidebar');
    await expect(sidebar).toBeVisible();

    await expect(sidebar).toHaveScreenshot('sidebar-selected.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});
