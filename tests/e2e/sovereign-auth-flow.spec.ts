/**
 * @file sovereign-auth-flow.spec.ts
 * @description End-to-End Playwright test suite for Sovereign Native Identity & Authentication (ADR 0031).
 * Exercises the complete lifecycle: password login, TOTP QR SVG setup, dynamic RFC 6238 token verification,
 * FIDO2 WebAuthn virtual authenticator enrollment via CDP, NIST SP 800-63B Step-Up revocation,
 * passwordless 1-click biometric sign-in, and 2FA login challenge.
 *
 * @module @atlas/tests/e2e/sovereign-auth-flow
 * @see {@link docs/adr/0031-sovereign-native-identity-and-authentication-engine.md}
 */

import { test, expect, Page, CDPSession } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../../src/db/index.js";
import {
  users,
  userPasskeys,
  userTotpCredentials,
  authAuditLogs,
} from "../../src/db/schema/index.js";
import { hashPassword } from "../../src/lib/auth.js";
import { getJWTConfig } from "../../src/config/jwt.js";
import { base32Decode, computeHotp } from "../../src/lib/totp.js";

/**
 * Calculates current 6-digit TOTP token using RFC 6238 with a 3-second boundary guard.
 */
async function calculateSafeTotp(secretBase32: string): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const remainingInWindow = 30 - (nowSec % 30);
  if (remainingInWindow < 3) {
    // Wait for the next 30-second window to prevent counter roll during network flight
    await new Promise((resolve) =>
      setTimeout(resolve, (remainingInWindow + 1) * 1000),
    );
  }
  const counter = Math.floor(Date.now() / 1000 / 30);
  const secretBuf = base32Decode(secretBase32);
  return computeHotp(secretBuf, counter);
}

test.describe
  .serial("Sovereign Native Identity & Auth Engine Lifecycle (ADR 0031)", () => {
  const BASE_URL = process.env.BASE_URL || "http://localhost:3100";
  const testUserId = `usr_e2e_${randomBytes(6).toString("hex")}`;
  const testUserEmail = `e2e_sovereign_${Date.now()}@atlas.local`;
  const plainPassword = "SovereignPasskey2026!";

  let page: Page;
  let cdpSession: CDPSession;
  let sharedTotpSecret = "";
  let testUserToken = "";

  test.beforeAll(async ({ browser }) => {
    // 1. Seed dedicated test user in SQLite WAL
    const hashedPassword = await hashPassword(plainPassword);
    await db.insert(users).values({
      id: testUserId,
      email: testUserEmail,
      hashedPassword,
      role: "ADMIN",
    });

    const { secret } = getJWTConfig();
    testUserToken = jwt.sign(
      {
        id: testUserId,
        email: testUserEmail,
        role: "ADMIN",
        name: "Sovereign E2E Admin",
      },
      secret,
      { expiresIn: "2h" },
    );

    // 2. Spawn isolated browser context and initialize persistent CDP WebAuthn authenticator
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    page = await context.newPage();

    page.on("dialog", async (dialog) => {
      console.log("[E2E BROWSER DIALOG]", dialog.type(), dialog.message());
      await dialog.dismiss();
    });
    page.on("console", (msg) => {
      console.log(`[PAGE ${msg.type().toUpperCase()}]`, msg.text());
    });

    cdpSession = await context.newCDPSession(page);
    await cdpSession.send("WebAuthn.enable");
    await cdpSession.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });
  });

  test.afterAll(async () => {
    try {
      if (cdpSession) {
        await cdpSession.send("WebAuthn.disable").catch(() => {});
        await cdpSession.detach().catch(() => {});
      }
      if (page) {
        await page
          .context()
          .close()
          .catch(() => {});
      }
    } catch {
      // Ignore context teardown errors
    }

    try {
      // Clean up database records
      await db.delete(userPasskeys).where(eq(userPasskeys.userId, testUserId));
      await db
        .delete(userTotpCredentials)
        .where(eq(userTotpCredentials.userId, testUserId));
      await db
        .delete(authAuditLogs)
        .where(eq(authAuditLogs.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (err) {
      console.error("Cleanup error in afterAll:", err);
    }
  });

  test("1. Initial password authentication into Sovereign Dashboard", async () => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator("text=Atlas ERP")).toBeVisible({
      timeout: 15000,
    });

    const loginResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/auth/login") && res.ok(),
      { timeout: 15000 },
    );

    await page.fill('input[type="email"]', testUserEmail);
    await page.fill('input[type="password"]', plainPassword);
    await page.click('button[type="submit"]');

    const loginRes = await loginResponsePromise;
    const loginJson = await loginRes.json();
    expect(loginJson.token).toBeTruthy();

    await expect(page.locator("text=Dashboard").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("2. Setup and activate TOTP 2FA (QR SVG + Dynamic RFC 6238 Token)", async () => {
    // 2.1 Navigate to Security Settings
    await page.goto(`${BASE_URL}/settings#security`, {
      waitUntil: "domcontentloaded",
    });

    const securityTabBtn = page
      .locator("button:has-text('Seguridad')")
      .or(page.locator("button:has-text('Security')"))
      .first();
    await securityTabBtn.click();

    // 2.2 Verify TOTP section is visible
    const totpHeader = page
      .locator("h3:has-text('Two-Factor Authentication (TOTP RFC 6238)')")
      .or(
        page.locator(
          "h3:has-text('Autenticación en Dos Pasos (TOTP RFC 6238)')",
        ),
      );
    await expect(totpHeader).toBeVisible({ timeout: 15000 });

    // 2.3 Toggle 2FA Switch ON while intercepting the Fastify setup response
    const totpContainer = page
      .locator("div.space-y-4", { has: totpHeader })
      .first();
    const switchLabel = totpContainer
      .locator("label:has(input[type='checkbox'])")
      .or(totpContainer.locator("label"))
      .first();

    const setupResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/auth/totp/setup") && res.ok(),
      { timeout: 15000 },
    );

    await switchLabel.click();

    const setupResponse = await setupResponsePromise;
    const setupData = await setupResponse.json();
    expect(setupData.success).toBe(true);
    expect(setupData.secret).toBeTruthy();
    sharedTotpSecret = setupData.secret;

    // 2.4 Verify QR Code SVG display
    const qrImage = page.locator('img[alt="TOTP QR Code"]');
    await expect(qrImage).toBeVisible({ timeout: 15000 });
    const qrSrc = await qrImage.getAttribute("src");
    expect(qrSrc).toContain("data:image/svg+xml");

    // 2.5 Calculate dynamic RFC 6238 6-digit code and verify
    const validCode = await calculateSafeTotp(sharedTotpSecret);
    const codeInput = page.locator('input[placeholder="123456"]').first();
    await codeInput.fill(validCode);

    const verifyBtn = page.locator("button:has-text('Verify')").first();
    await verifyBtn.click();

    await expect(
      page
        .locator("text=✓ Code verified successfully.")
        .or(page.locator("text=2FA TOTP Activado")),
    ).toBeVisible({ timeout: 10000 });
  });

  test("3. Enroll FIDO2 / WebAuthn Passkeys via CDP Virtual Authenticator", async () => {
    // 3.1 Navigate to Security Settings (already authenticated)
    await page.goto(`${BASE_URL}/settings#security`, {
      waitUntil: "domcontentloaded",
    });
    const securityTabBtn = page
      .locator("button:has-text('Seguridad')")
      .or(page.locator("button:has-text('Security')"))
      .first();
    await securityTabBtn.click();

    // 3.2 Enroll Primary Passkey
    const linkBtn = page
      .locator("button:has-text('Link New Key')")
      .or(page.locator("button:has-text('Vincular Nueva Llave')"))
      .first();
    await linkBtn.click();

    const nameInput = page.locator(
      'input[placeholder="e.g. YubiKey 5 NFC Office"]',
    );
    await nameInput.fill("Primary CDP Virtual Key");

    const completeBtn = page
      .locator("button:has-text('Complete FIDO2 Registration')")
      .or(page.locator("button:has-text('Completar Registro FIDO2')"));
    await completeBtn.click();

    await expect(page.locator("text=Primary CDP Virtual Key")).toBeVisible({
      timeout: 15000,
    });

    // 3.3 Enroll Secondary Passkey for subsequent revocation test
    await linkBtn.click();
    await nameInput.fill("Secondary Key to Revoke");
    await completeBtn.click();
    await expect(page.locator("text=Secondary Key to Revoke")).toBeVisible({
      timeout: 15000,
    });
  });

  test("4. NIST SP 800-63B Step-Up Verification (Negative & Positive Revocation)", async () => {
    // 4.1 Click Revoke on Secondary Key
    const secondaryKeyRow = page
      .locator("div.p-3\\.5", {
        has: page.locator("text=Secondary Key to Revoke"),
      })
      .first();
    await expect(secondaryKeyRow).toBeVisible({ timeout: 10000 });

    const revokeBtn = secondaryKeyRow.locator("button:has-text('Revoke')");
    await revokeBtn.click();

    // 4.2 Verify Step-Up Modal appearance
    await expect(
      page.locator("text=Confirmación de Seguridad (Step-Up)"),
    ).toBeVisible({ timeout: 10000 });

    // 4.3 Negative Test: submit invalid password
    const stepUpPasswordInput = page.locator(
      'input[placeholder="Contraseña actual"]',
    );
    await stepUpPasswordInput.fill("WrongStepUpPassword123!");
    await page.locator("button:has-text('Confirmar Acción')").click();

    await expect(
      page.locator("p.text-rose-600").or(page.locator("p.text-rose-400")),
    ).toBeVisible({ timeout: 10000 });
    // Key must NOT be revoked
    await expect(page.locator("text=Secondary Key to Revoke")).toBeVisible();

    // 4.4 Positive Test: submit valid password
    await stepUpPasswordInput.fill(plainPassword);
    await page.locator("button:has-text('Confirmar Acción')").click();

    // 4.5 Verify Step-Up modal closes and revoked device is removed
    await expect(
      page.locator("text=Confirmación de Seguridad (Step-Up)"),
    ).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Secondary Key to Revoke")).not.toBeVisible({
      timeout: 10000,
    });
    // Primary key remains intact
    await expect(page.locator("text=Primary CDP Virtual Key")).toBeVisible();
  });

  test("5. Passwordless 1-Click Passkey Authentication Ceremony", async () => {
    // 5.1 Clear session state to simulate new unauthenticated visit
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${BASE_URL}/login`);

    // 5.2 Click Passwordless Passkey Sign-In button (CDP virtual authenticator holds the registered resident key)
    const passkeyBtn = page
      .locator("button:has-text('Iniciar con Passkey')")
      .or(page.locator("button:has-text('Passkey')"))
      .first();
    await expect(passkeyBtn).toBeVisible({ timeout: 10000 });
    await passkeyBtn.click();

    // 5.3 Assert successful redirect to dashboard
    await expect(page.locator("text=Dashboard").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("6. Multi-Factor Authentication Challenge (TOTP 2FA Verification)", async () => {
    // 6.1 Clear session state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${BASE_URL}/login`);

    // 6.2 Enter user credentials
    await page.fill('input[type="email"]', testUserEmail);
    await page.fill('input[type="password"]', plainPassword);
    await page.click('button[type="submit"]');

    // 6.3 Assert 2FA Challenge Prompt is displayed
    await expect(
      page.locator("text=Verificación de Seguridad 2FA"),
    ).toBeVisible({ timeout: 15000 });

    // 6.4 Negative Test: submit invalid TOTP code
    const mfaInput = page.locator('input[placeholder="123456"]').first();
    await mfaInput.fill("000000");
    await page.click('button:has-text("Verificar Código 2FA")');

    await expect(
      page
        .locator("text=Código de verificación inválido")
        .or(page.locator("div.text-rose-400")),
    ).toBeVisible({ timeout: 10000 });

    // 6.5 Positive Test: submit valid dynamic RFC 6238 TOTP code
    const validTotpCode = await calculateSafeTotp(sharedTotpSecret);
    await mfaInput.fill(validTotpCode);
    await page.click('button:has-text("Verificar Código 2FA")');

    // 6.6 Assert successful authentication and dashboard access
    await expect(page.locator("text=Dashboard").first()).toBeVisible({
      timeout: 15000,
    });
  });
});
