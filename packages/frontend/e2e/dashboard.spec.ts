import { test, expect } from '@playwright/test';

test.describe('Atlas Logistics Super-App', () => {
  test('should load the dashboard and navigate to Copilot', async ({ page }) => {
    await page.goto('/');

    // Verify Title
    await expect(page).toHaveTitle(/Atlas Logistics/i);

    // Verify Copilot button exists and click it
    const copilotTab = page.locator('text=AI Copilot');
    await expect(copilotTab).toBeVisible();
    await copilotTab.click();

    // Verify Copilot content is loaded
    await expect(page.locator('text=Data Analyst')).toBeVisible();
  });

  test('should navigate to Tasklist and display tasks', async ({ page }) => {
    await page.goto('/');

    const tasklistTab = page.locator('text=Tasklist');
    await expect(tasklistTab).toBeVisible();
    await tasklistTab.click();

    // Verify Human Tasklist (Camunda) is loaded
    await expect(page.locator('text=Human Tasklist (Camunda)')).toBeVisible();
  });
});
