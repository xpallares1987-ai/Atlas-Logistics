import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Passkeys Biometrics, FIDO2 & TOTP 2FA (/settings#security)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Security Settings tab and Passkeys FIDO2 section", async ({
    page,
  }) => {
    await page.goto("/settings#security", { waitUntil: "domcontentloaded" });

    // Verify main Settings container is visible
    await expect(page.locator("h1:has-text('Configuración')").or(page.locator("h1:has-text('Settings')"))).toBeVisible({
      timeout: 15000,
    });

    // Ensure Security tab is active or click it
    const securityTabBtn = page.locator("button:has-text('Seguridad')").or(page.locator("button:has-text('Security')")).first();
    await securityTabBtn.click();

    // Verify Passkeys FIDO2 header
    await expect(
      page.locator("h3:has-text('Centro de Llaves Passkeys & Tokens de Seguridad (FIDO2)')")
    ).toBeVisible({ timeout: 10000 });

    // Verify registered devices are displayed
    await expect(page.locator("text=YubiKey 5 NFC").first()).toBeVisible();
    await expect(page.locator("text=MacBook Pro TouchID").or(page.locator("text=Windows Hello")).first()).toBeVisible();
  });

  test("should toggle Passkey linking modal and perform biometric handshake test", async ({
    page,
  }) => {
    await page.goto("/settings#security", { waitUntil: "domcontentloaded" });

    const securityTabBtn = page.locator("button:has-text('Seguridad')").or(page.locator("button:has-text('Security')")).first();
    await securityTabBtn.click();

    // Click "Vincular Nueva Llave"
    const addKeyBtn = page.locator("button:has-text('Vincular Nueva Llave')");
    await expect(addKeyBtn).toBeVisible({ timeout: 10000 });
    await addKeyBtn.click();

    // Verify form input is visible
    await expect(page.locator("text=Registrar Nuevo Dispositivo FIDO2 / WebAuthn")).toBeVisible();
    await expect(page.locator("button:has-text('Completar Registro FIDO2')")).toBeVisible();

    // Test Handshake button
    const testHandshakeBtn = page.locator("button:has-text('Probar Handshake')");
    await expect(testHandshakeBtn).toBeVisible();
    await testHandshakeBtn.click();

    // Verify Handshake success toast/badge
    await expect(page.locator("text=¡Handshake exitoso!")).toBeVisible({ timeout: 10000 });
  });

  test("should display TOTP 2FA secret, live timer, and Step-Up security policies", async ({
    page,
  }) => {
    await page.goto("/settings#security");

    const securityTabBtn = page.locator("button:has-text('Seguridad')").or(page.locator("button:has-text('Security')")).first();
    await securityTabBtn.click();

    // Verify TOTP Section
    await expect(
      page.locator("h3:has-text('Autenticación en Dos Pasos (TOTP RFC 6238)')")
    ).toBeVisible({ timeout: 10000 });

    // Verify live countdown timer or code preview
    await expect(page.locator("text=Código de Prueba en Vivo")).toBeVisible();
    await expect(page.locator("text=Clave Secreta Base32:")).toBeVisible();

    // Verify Step-Up policy switches
    await expect(
      page.locator("h3:has-text('Políticas de Autorización Biométrica Reforzada (Step-Up)')")
    ).toBeVisible();
    await expect(page.locator("text=Despacho y Pedimentos Aduanales (SAT / VUCEM)")).toBeVisible();
    await expect(page.locator("text=Endoso y Transferencia de Conocimientos de Embarque (e-BL MLETR)")).toBeVisible();
    await expect(page.locator("text=Liquidaciones y Pagos de Tesorería Superiores a Umbral")).toBeVisible();

    // Verify save policy button
    await expect(page.locator("button:has-text('Guardar Políticas de Seguridad')")).toBeVisible();
  });
});
