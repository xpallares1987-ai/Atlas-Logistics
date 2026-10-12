import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Enterprise ERP Integration Connectors (/erp-integrations)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render ERP Integrations hub with SAP and NetSuite topology status cards", async ({
    page,
  }) => {
    await page.goto("/erp-integrations", { waitUntil: "domcontentloaded" });

    // Header & Badges
    await expect(
      page.locator("h1:has-text('Conectores ERP & Integración Empresarial')")
    ).toBeVisible({ timeout: 15000 });

    await expect(page.locator("text=SAP S/4HANA OData").first()).toBeVisible();
    await expect(page.locator("text=NetSuite SuiteTalk").first()).toBeVisible();

    // Presets
    await expect(page.locator("button:has-text('SAP S/4HANA (Automotriz Alemania)')")).toBeVisible();
    await expect(page.locator("button:has-text('Oracle NetSuite (High-Tech Taiwán)')")).toBeVisible();

    // Default tab: Topology Cards
    await expect(page.locator("text=SAP S/4HANA Cloud Gateway")).toBeVisible();
    await expect(page.locator("text=Oracle NetSuite ERP Production")).toBeVisible();
  });

  test("should switch between Topology, Schema Mapping, Telemetry Sandbox, and Dexie Queue tabs", async ({
    page,
  }) => {
    await page.goto("/erp-integrations", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Conectores ERP & Integración Empresarial')")
    ).toBeVisible({ timeout: 15000 });

    // Switch to Schema Mapping Tab
    const mappingTab = page.locator("button:has-text('Estudio de Mapeo de Esquemas (Bi-Direccional)')");
    await mappingTab.click();
    await expect(
      page.locator("text=Matriz de Transformación y Equivalencia de Campos")
    ).toBeVisible({ timeout: 10000 });

    // Switch to Sandbox Simulator Tab
    const sandboxTab = page.locator("button:has-text('Simulador de Telemetría & Sandbox en Vivo')");
    await sandboxTab.click();
    await expect(
      page.locator("text=Acciones de Disparo & Sincronización")
    ).toBeVisible({ timeout: 10000 });

    // Switch to Dexie Queue Tab
    const queueTab = page.locator("button:has-text('Cola Offline Dexie & Resiliencia de Red')");
    await queueTab.click();
    await expect(
      page.locator("text=Bandeja de Mutaciones Offline (Dexie.js / IndexedDB)")
    ).toBeVisible({ timeout: 10000 });
  });

  test("should execute live simulation actions and display real-time JSON response", async ({
    page,
  }) => {
    await page.goto("/erp-integrations", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Conectores ERP & Integración Empresarial')")
    ).toBeVisible({ timeout: 15000 });

    // Switch to Sandbox Simulator Tab
    const sandboxTab = page.locator("button:has-text('Simulador de Telemetría & Sandbox en Vivo')");
    await sandboxTab.click();

    // Trigger SAP PO Sync
    const syncPoBtn = page.locator("button:has-text('1. Ingestar Orden de Compra SAP')");
    await expect(syncPoBtn).toBeVisible({ timeout: 10000 });
    await syncPoBtn.click();

    // Verify response console shows success
    await expect(
      page.locator("text=SAP S/4HANA PO Sincronizado Exitosamente")
    ).toBeVisible({ timeout: 10000 });

    // Trigger NetSuite Item Receipt & Landed Cost
    const postReceiptBtn = page.locator("button:has-text('3. Postear Item Receipt & Landed Cost')");
    await postReceiptBtn.click();

    await expect(
      page.locator("text=Item Receipt & Landed Cost Generado en NetSuite")
    ).toBeVisible({ timeout: 10000 });

    // Switch to Dexie Queue tab and enqueue manual mutation
    const queueTab = page.locator("button:has-text('Cola Offline Dexie & Resiliencia de Red')");
    await queueTab.click();

    const enqueueBtn = page.locator("button:has-text('+ Encolar Transacción Manual')");
    await enqueueBtn.click();

    // Verify table has records
    await expect(page.locator("text=SAP_S4HANA").first()).toBeVisible({ timeout: 10000 });
  });
});
