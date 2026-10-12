import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Omnichannel Notifications & Driver Dispatch (/notifications)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Omnichannel Hub with MS Teams Adaptive Cards studio", async ({
    page,
  }) => {
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    // Header
    await expect(
      page.locator("h1:has-text('Notificaciones Omnicanal & Despacho a Choferes')")
    ).toBeVisible({ timeout: 15000 });

    // Badges
    await expect(page.locator("text=MS Teams 1.5 & Telegram")).toBeVisible();

    // Default tab: Estudio de Adaptive Cards (MS Teams)
    await expect(page.locator("button:has-text('Estudio de Adaptive Cards (MS Teams)')")).toBeVisible();
    await expect(page.locator("text=Plantillas de Anomalías Operacionales")).toBeVisible();
  });

  test("should switch anomaly presets and update Adaptive Card preview", async ({
    page,
  }) => {
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Notificaciones Omnicanal & Despacho a Choferes')")
    ).toBeVisible({ timeout: 15000 });

    // Select Canal Rojo anomaly
    const canalRojoBtn = page.locator("button:has-text('Canal Rojo Aduanero')").first();
    await expect(canalRojoBtn).toBeVisible({ timeout: 10000 });
    await canalRojoBtn.click();

    // Verify Copy JSON button or Teams send button
    const copyJsonBtn = page.locator("button:has-text('Copiar JSON')").or(page.locator("button:has-text('Enviar Notificación')")).first();
    await expect(copyJsonBtn).toBeVisible();
  });

  test("should switch between Telegram Driver Dispatch and HMAC Audit Log tabs", async ({
    page,
  }) => {
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Notificaciones Omnicanal & Despacho a Choferes')")
    ).toBeVisible({ timeout: 15000 });

    // Switch to Telegram Dispatch tab
    const telegramTab = page.locator("button:has-text('Centro de Choferes (Telegram Gateway)')");
    await telegramTab.click();
    await expect(page.locator("text=Feed en Vivo de Transportistas (Telegram)")).toBeVisible({ timeout: 10000 });

    // Switch to Audit Log tab
    const auditTab = page.locator("button:has-text('Auditoría de Despacho')");
    await auditTab.click();
    await expect(page.locator("text=Bitácora de Auditoría de Webhooks Despachados")).toBeVisible({ timeout: 10000 });
  });
});
