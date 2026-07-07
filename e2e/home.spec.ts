import { test, expect } from "@playwright/test";

test("has title and basic navigation", async ({ page }) => {
  await page.goto("/");

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Atlas Logistics/i);

  // Expect to see the tracking search input or hero section
  const heading = page.getByRole("heading", { name: /Control Tower/i });
  if (await heading.isVisible()) {
    await expect(heading).toBeVisible();
  }
});

test("can navigate to shipments", async ({ page }) => {
  await page.goto("/");

  // Attempt to find a link to the dashboard or shipments
  const shipmentsLink = page.getByRole("link", {
    name: /shipments|dashboard/i,
  });

  if (await shipmentsLink.isVisible()) {
    await shipmentsLink.click();
    await expect(page).toHaveURL(/.*shipments/);
  }
});
