import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Automated Road Freight (FTL/LTL) & e-CMR Dispatch Engine", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Road Freight workbench and KPI cards", async ({
    page,
  }) => {
    await page.goto("/road-freight");

    // Header
    await expect(
      page.locator("h1:has-text('Transporte Terrestre & e-CMR')"),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Expediciones Activas')"),
    ).toBeVisible();
    await expect(page.locator("p:has-text('Carga Despachada')")).toBeVisible();
    await expect(
      page.locator("p:has-text('Ocupación Semirremolque')"),
    ).toBeVisible();
    await expect(page.locator("p:has-text('Expediciones ADR')")).toBeVisible();
  });

  test("should select consignment and inspect 4-panel details and PDF buttons", async ({
    page,
  }) => {
    await page.goto("/road-freight");

    await expect(
      page.locator("h1:has-text('Transporte Terrestre & e-CMR')"),
    ).toBeVisible({ timeout: 15000 });

    // Select CMR consignment
    const firstConsignment = page.locator("text=CMR-2026-99210").first();
    await expect(firstConsignment).toBeVisible({ timeout: 10000 });
    await firstConsignment.click();

    // Verify 4-Panel Inspector
    await expect(
      page.locator("span:has-text('Expedidor & Destinatario')"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("span:has-text('Vehículo y Conductor Asignado')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Ocupación del Semirremolque')"),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Tacógrafo Digital CE 561/2006')"),
    ).toBeVisible();

    // Verify PDF actions
    const cmrLink = page.locator("a:has-text('e-CMR (24 Cajas PDF)')");
    const cdpLink = page.locator("a:has-text('Carta de Porte (PDF)')");
    await expect(cmrLink).toBeVisible();
    await expect(cdpLink).toBeVisible();
  });

  test("should open ADR & Route Planner modal and simulate tachograph driving hours", async ({
    page,
  }) => {
    await page.goto("/road-freight");

    await expect(
      page.locator("h1:has-text('Transporte Terrestre & e-CMR')"),
    ).toBeVisible({ timeout: 15000 });

    // Open Planner Modal
    const plannerBtn = page.locator(
      "button:has-text('Planificador ADR & Tacógrafo')",
    );
    await expect(plannerBtn).toBeVisible({ timeout: 10000 });
    await plannerBtn.click();

    // Modal Header
    await expect(
      page.locator(
        "h3:has-text('Planificador de Ruta, Tacógrafo y ADR 1.1.3.6')",
      ),
    ).toBeVisible({ timeout: 10000 });

    // Run Simulation
    const runBtn = page.locator(
      "button:has-text('Planificar Ruta y Evaluar Exención 1.1.3.6')",
    );
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Verify Output
    await expect(page.locator("span:has-text('Conducción:')")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("span:has-text('Pausas 45 min:')")).toBeVisible();
    await expect(page.locator("span:has-text('Puntos ADR:')")).toBeVisible();
  });
});
