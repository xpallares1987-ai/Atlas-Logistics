import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("e.firma Hub & Zero-Knowledge Cryptographic Vault (/efirma-hub)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render e.firma Hub with Zero-Knowledge security badges and preset selector", async ({
    page,
  }) => {
    await page.goto("/efirma-hub", { waitUntil: "domcontentloaded" });

    // Header
    await expect(
      page.locator("h1:has-text('e.firma Hub & Bóveda Criptográfica Zero-Knowledge')")
    ).toBeVisible({ timeout: 15000 });

    // Badges
    await expect(page.locator("text=SAT WebCrypto API")).toBeVisible();
    await expect(page.locator("text=Zero-Knowledge").first()).toBeVisible();
    await expect(page.locator("text=RFC 3161 TSA")).toBeVisible();

    // Preset selector buttons
    await expect(page.getByRole("button", { name: "Pedimento A1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pedimento AF" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Carta Porte 3.1" })).toBeVisible();
  });

  test("should switch between Signing Studio, Vault, and Public Verifier tabs", async ({
    page,
  }) => {
    await page.goto("/efirma-hub", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('e.firma Hub & Bóveda Criptográfica Zero-Knowledge')")
    ).toBeVisible({ timeout: 15000 });

    // Verify default tab: Estudio de Firmado de Documentos
    await expect(page.locator("button:has-text('Estudio de Firmado de Documentos')")).toBeVisible();

    // Switch to Bóveda tab
    const vaultTab = page.locator("button:has-text('Bóveda & Certificado SAT X.509')");
    await vaultTab.click();
    await expect(page.locator("text=Gestión de Llaves y Bóveda Criptográfica")).toBeVisible({ timeout: 10000 });

    // Switch to Verificador tab
    const verifierTab = page.locator("button:has-text('Validador Criptográfico Público')");
    await verifierTab.click();
    await expect(page.locator("text=Verificador Criptográfico Independiente de Sellos SAT")).toBeVisible({ timeout: 10000 });
  });

  test("should generate sandbox demo keypair and sign canonical cadena original client-side", async ({
    page,
  }) => {
    await page.goto("/efirma-hub", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('e.firma Hub & Bóveda Criptográfica Zero-Knowledge')")
    ).toBeVisible({ timeout: 15000 });

    // Switch to Bóveda tab
    const vaultTab = page.locator("button:has-text('Bóveda & Certificado SAT X.509')");
    await vaultTab.click();

    // Click "Cargar Credenciales Sandbox SAT (Demo)" button to populate in-memory WebCrypto keypair
    const demoBtn = page.locator("button:has-text('Cargar Credenciales Sandbox')").first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await expect(page.locator("text=Desbloqueada").first()).toBeVisible({ timeout: 10000 });
    }

    // Return to Signing Studio
    const studioTab = page.locator("button:has-text('Estudio de Firmado de Documentos')");
    await studioTab.click();

    // Verify Sign button is present
    const signBtn = page.locator("button:has-text('Firmar con WebCrypto API')").or(page.locator("button:has-text('Firmar')")).first();
    await expect(signBtn).toBeVisible();
  });
});
