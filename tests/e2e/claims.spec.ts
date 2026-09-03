import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Automated Freight Cargo Claims & Insurance Subrogation Engine", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Claims workbench and KPI cards", async ({ page }) => {
    await page.goto("/claims");

    // Header
    await expect(
      page.locator(
        "h1:has-text('Siniestros de Carga & Recobros Subrogatorios')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(page.locator("p:has-text('Total Expedientes')")).toBeVisible();
    await expect(page.locator("p:has-text('Importe Reclamado')")).toBeVisible();
    await expect(
      page.locator("p:has-text('Límite Estatutario (DEG)')"),
    ).toBeVisible();
    await expect(page.locator("p:has-text('Recobro Liquidado')")).toBeVisible();
  });

  test("should select claim and inspect 4-box details and PDF export buttons", async ({
    page,
  }) => {
    await page.goto("/claims");

    await expect(
      page.locator(
        "h1:has-text('Siniestros de Carga & Recobros Subrogatorios')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // Click on Hague-Visby claim
    const firstClaim = page.locator("text=CLM-2026-HV-0041").first();
    await expect(firstClaim).toBeVisible({ timeout: 10000 });
    await firstClaim.click();

    // Verify 4-Box Inspector details
    await expect(
      page.locator("span:has-text('Datos de Transporte y Reclamante')"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator(
        "span:has-text('Declaración de Daños & Peritación Técnica')",
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        "span:has-text('Liquidación Estatutaria de Responsabilidad (DEG)')",
      ),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Indemnización Póliza Asegurada')"),
    ).toBeVisible();

    // Verify PDF actions
    const protestLink = page.locator("a:has-text('Carta de Protesta (PDF)')");
    const subrogationLink = page.locator(
      "a:has-text('Recibo Subrogación (PDF)')",
    );
    await expect(protestLink).toBeVisible();
    await expect(subrogationLink).toBeVisible();
  });

  test("should open SDR and Carrier Liability Calculator modal and compute statutory limit", async ({
    page,
  }) => {
    await page.goto("/claims");

    await expect(
      page.locator(
        "h1:has-text('Siniestros de Carga & Recobros Subrogatorios')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // Open Calculator Modal
    const calcBtn = page.locator(
      "button:has-text('Calculadora DEG y Prescripción')",
    );
    await expect(calcBtn).toBeVisible({ timeout: 10000 });
    await calcBtn.click();

    // Modal Header
    await expect(
      page.locator(
        "h3:has-text('Calculadora de Responsabilidad Estatutaria (DEG)')",
      ),
    ).toBeVisible({ timeout: 10000 });

    // Click calculate
    const computeBtn = page.locator(
      "button:has-text('Calcular Límite DEG y Plazo de Prescripción')",
    );
    await expect(computeBtn).toBeVisible();
    await computeBtn.click();

    // Verify output
    await expect(page.locator("span:has-text('Tasa Aplicable:')")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("span:has-text('Límite Legal DEG:')"),
    ).toBeVisible();
  });
});
