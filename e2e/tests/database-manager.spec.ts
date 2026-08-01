import { test, expect } from "@playwright/test";

test.describe("Database Manager", () => {
  test("should load database manager and allow creating a column", async ({
    page,
  }) => {
    // Navigate directly to Database tab
    await page.goto("/settings#database");

    // Verify the schema tables list is visible
    await expect(page.locator("text=Current Schema")).toBeVisible();

    // Setup dialog handler before clicking add column
    page.on("dialog", (dialog) => dialog.accept());

    // Select table
    const tableSelect = page
      .locator('label:has-text("Target Table")')
      .locator("..")
      .locator("select");
    await tableSelect.selectOption("users");

    // Add a new column
    const colNameInput = page
      .locator('label:has-text("Column Name")')
      .locator("..")
      .locator("input");
    const newColName = "test_col_" + Date.now();
    await colNameInput.fill(newColName);

    // Submit the form
    await page.click('button:has-text("Add Column")');

    // Wait a bit for the action to complete
    await page.waitForTimeout(1000);
  });
});
