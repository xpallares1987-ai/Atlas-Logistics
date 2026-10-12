import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Smart Contracts, e-BL MLETR & Escrow DLT Ledger (/smart-contracts)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Smart Contracts hub with consensus badges and cryptographic chain status", async ({
    page,
  }) => {
    await page.goto("/smart-contracts", { waitUntil: "domcontentloaded" });

    // Header
    await expect(
      page.locator("h1:has-text('Smart Contracts, e-BL MLETR & Escrow')")
    ).toBeVisible({ timeout: 15000 });

    // Badges & Pills
    await expect(page.locator("text=DLT Merkle DAG")).toBeVisible();
    await expect(page.locator("text=Atlas Authority Node 1")).toBeVisible();
    await expect(page.locator("text=Cadena Íntegra")).toBeVisible();

    // Verify Action Buttons
    await expect(page.locator("button:has-text('Verificar Cadena')")).toBeVisible();
    await expect(page.locator("button:has-text('Exportar Ledger JSON')")).toBeVisible();
  });

  test("should display e-BL MLETR title holder and Smart Escrow milestone panel", async ({
    page,
  }) => {
    await page.goto("/smart-contracts", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Smart Contracts, e-BL MLETR & Escrow')")
    ).toBeVisible({ timeout: 15000 });

    // Verify e-BL Section
    await expect(page.locator("h2:has-text('e-BL Negociable (MLETR)')")).toBeVisible();
    await expect(page.locator("text=e-BL Number:")).toBeVisible();
    await expect(page.locator("text=Naviera (Carrier):")).toBeVisible();

    // Verify Escrow Section
    await expect(page.locator("h2:has-text('Smart Escrow Financial VM')")).toBeVisible();
    await expect(page.locator("text=Monto en Custodia")).toBeVisible();
  });

  test("should display immutable blockchain ledger blocks and verify chain integrity", async ({
    page,
  }) => {
    await page.goto("/smart-contracts", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Smart Contracts, e-BL MLETR & Escrow')")
    ).toBeVisible({ timeout: 15000 });

    // Verify Ledger Timeline or Blocks
    await expect(page.locator("h2:has-text('Libro Mayor Distribuido DLT (Ledger)')")).toBeVisible();
    await expect(page.locator("text=Bloque #").first()).toBeVisible();

    // Click "Verificar Cadena" button
    const verifyBtn = page.locator("button:has-text('Verificar Cadena')");
    await verifyBtn.click();

    // Verify successful verification response
    await expect(
      page.locator("text=Cadena Íntegra").first()
    ).toBeVisible({ timeout: 10000 });
  });
});
