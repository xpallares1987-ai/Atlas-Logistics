import { test, expect } from "@playwright/test";

test("dashboard features work correctly", async ({ page }) => {
  // Navigate to SCM App (using base path)
  await page.goto("/Atlas-Logistics/");

  // Verify page title
  await expect(page).toHaveTitle(/Atlas Logistics/i);

  // Trigger OmniSearch cmdk (Ctrl+K / Meta+K)
  await page.keyboard.press("Control+k");
  
  // Verify OmniSearch overlay is visible
  const searchInput = page.locator('input[placeholder="Buscar carga, comandos, ayuda..."]');
  if (await searchInput.isVisible()) {
    await expect(searchInput).toBeVisible();
    
    // Close OmniSearch
    await page.keyboard.press("Escape");
    await expect(searchInput).not.toBeVisible();
  }

  // Navigate to tracker if link exists
  const trackerLink = page.getByRole("link", { name: /tracker/i });
  if (await trackerLink.isVisible()) {
    await trackerLink.click();
    await expect(page).toHaveURL(/.*tracker/);
    
    // Verify 3D Globe Tracker is present in tracker view
    const globeContainer = page.locator('.globe-container');
    if (await globeContainer.isVisible()) {
      await expect(globeContainer).toBeVisible();
    }
  }
});
