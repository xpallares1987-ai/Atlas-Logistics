import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('BPMN Modeler Sanity Check', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('is already registered') && !text.includes('append-task')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });
  });

  test('should render correctly and have no console errors', async ({ page }) => {
    // 1. App renders correctly
    await page.goto('/');
    
    // Verify title and main elements are visible
    await expect(page).toHaveTitle(/BPMN Modeler/);
    await expect(page.locator('.app-shell')).toBeVisible();
    await expect(page.locator('.topbar__title')).toHaveText('BPMN 2.0 Interactive Modeler');
    await expect(page.locator('#canvas')).toBeVisible();

    // Wait for initial render of the default diagram
    await page.waitForSelector('.djs-container', { state: 'visible' });

    // Verify 0 console errors
    expect(consoleErrors).toEqual([]);
  });
});
