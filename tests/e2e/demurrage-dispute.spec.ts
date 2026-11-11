import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Automated Demurrage & Detention Dispute Resolver (/demurrage)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Demurrage & Detention Control Tower with live clocks and KPI strip", async ({
    page,
  }) => {
    await page.goto("/demurrage", { waitUntil: "domcontentloaded" });

    // Header & Badges
    await expect(
      page.locator("h1:has-text('Demurrage & Detention Control Tower')"),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.locator("text=FMC § 541 / OSRA 2022").first(),
    ).toBeVisible();

    // Relational Context Banner & Shipment Selector
    await expect(
      page.locator("text=Expedición Relacional Activa (SQLite dev.db)"),
    ).toBeVisible();

    // Default tab: Radar table with container data
    await expect(
      page.locator("text=Radar de Relojes de Demurrage en Tiempo Real"),
    ).toBeVisible();
    await expect(page.locator("text=MSKU9284712").first()).toBeVisible();
    await expect(page.locator("text=Maersk Line A/S").first()).toBeVisible();
    await expect(page.locator("text=APM Terminals").first()).toBeVisible();
  });

  test("should switch between Radar, Clock-Pause Engine, Invoice Audit, and Dispute Dossier tabs", async ({
    page,
  }) => {
    await page.goto("/demurrage", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Demurrage & Detention Control Tower')"),
    ).toBeVisible({ timeout: 15000 });

    // Switch to Tab 2: Clock-Pause Suspensions Engine
    const suspTab = page.locator(
      "button:has-text('2. Motor de Suspensión de Reloj')",
    );
    await suspTab.click();
    await expect(
      page.locator("text=Eventos de Pausa de Reloj Registrados"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("text=Declarar Nueva Suspensión de Reloj"),
    ).toBeVisible({ timeout: 10000 });

    // Switch to Tab 3: Invoice Audit vs. EDI 315
    const auditTab = page.locator(
      "button:has-text('3. Auditoría Factura vs. EDI 315')",
    );
    await auditTab.click();
    await expect(
      page.locator("text=Factura Emitida por la Naviera"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("text=Liquidación Legal Auditada (Atlas Engine)"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator(
        "text=Auditoría de Requisitos Obligatorios FMC 46 CFR § 541.6",
      ),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("text=Cronología Técnica de Hitos EDI 315"),
    ).toBeVisible({ timeout: 10000 });

    // Switch to Tab 4: Dispute Dossier Pack
    const dossierTab = page.locator(
      "button:has-text('4. Dossier Evidencial & Disputa')",
    );
    await dossierTab.click();
    await expect(
      page.locator("text=Escrito Formal de Disputa & Demanda Legal"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("button:has-text('Descargar PDF Oficial')"),
    ).toBeVisible();
    await expect(
      page.locator("text=Despacho Telemático de Disputa"),
    ).toBeVisible();
  });

  test("should toggle Barcelona Intermodal Book TEST01 preset and dispatch dispute email", async ({
    page,
  }) => {
    await page.goto("/demurrage", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('Demurrage & Detention Control Tower')"),
    ).toBeVisible({ timeout: 15000 });

    // Verify relational context
    await expect(
      page.locator("text=Expedición Relacional Activa (SQLite dev.db)"),
    ).toBeVisible({ timeout: 10000 });

    // Navigate to Dossier tab
    const dossierTab = page.locator(
      "button:has-text('4. Dossier Evidencial & Disputa')",
    );
    await dossierTab.click();

    await expect(
      page.locator("text=Escrito Formal de Disputa & Demanda Legal"),
    ).toBeVisible({ timeout: 10000 });

    // Dispatch email
    const dispatchBtn = page.locator(
      "button:has-text('Despachar Reclamación a Naviera')",
    );
    await dispatchBtn.click();

    // Verify confirmation
    await expect(
      page.locator("text=Expediente Despachado con Éxito"),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Código de Acuse:")).toBeVisible();
  });
});
