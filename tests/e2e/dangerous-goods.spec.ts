import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Multimodal Dangerous Goods Engine (IMO IMDG / IATA DGR / ADR 2025)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Dangerous Goods workbench with KPI cards and tabs", async ({
    page,
  }) => {
    await page.goto("/dangerous-goods");

    // Header
    await expect(
      page.locator(
        "h1:has-text('Gestión Multimodal de Mercancías Peligrosas')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // KPI Cards
    await expect(
      page.locator("p:has-text('Expedientes DGR Activos')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Sustancias UN Catalogadas')"),
    ).toBeVisible();
    await expect(
      page.locator("p:has-text('Auditoría de Segregación')"),
    ).toBeVisible();
    await expect(page.locator("p:has-text('Puntos ADR Unidad')")).toBeVisible();
  });

  test("should test Segregation Simulator and detect chemical conflict", async ({
    page,
  }) => {
    await page.goto("/dangerous-goods");

    await expect(
      page.locator(
        "h1:has-text('Gestión Multimodal de Mercancías Peligrosas')",
      ),
    ).toBeVisible({ timeout: 15000 });

    // Verify catalog is present
    await expect(
      page.locator("span:has-text('UN 1203')").first(),
    ).toBeVisible();

    // Verify segregation result badge (UN 1203 vs UN 1789 default is conflict)
    await expect(
      page.locator("div:has-text('INCOMPATIBLE — PROHIBIDA CO-CARGA')").first(),
    ).toBeVisible();
  });

  test("should switch to Exemptions tab and check ADR points & Lithium Battery classifier", async ({
    page,
  }) => {
    await page.goto("/dangerous-goods");

    const tabBtn = page.locator(
      "button:has-text('Calculadora de Exenciones (LQ/EQ, ADR 1.1.3.6 & Baterías)')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify ADR calculator
    await expect(
      page
        .locator(
          "div:has-text('Calculadora de 1.000 Puntos ADR (Exención 1.1.3.6)')",
        )
        .first(),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('EXENTO DE PANEL NARANJA')"),
    ).toBeVisible();

    // Verify Lithium battery classifier
    await expect(
      page
        .locator(
          "div:has-text('Clasificador IATA DGR de Baterías de Litio (UN 3480)')",
        )
        .first(),
    ).toBeVisible();
    await expect(
      page.locator("span:has-text('Sección IA (PI 965)')"),
    ).toBeVisible();
  });

  test("should switch to Declarations tab and check PDF generation buttons", async ({
    page,
  }) => {
    await page.goto("/dangerous-goods");

    const tabBtn = page.locator(
      "button:has-text('Declaraciones Multimodales (DGD) & Emisión de PDFs')",
    );
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click();

    // Verify shipment detail
    await expect(
      page.locator("span:has-text('DGD-2026-VAL-0089')").first(),
    ).toBeVisible();

    // Verify buttons
    await expect(
      page.locator("button:has-text('Declaración Multimodal IMO DGD PDF')"),
    ).toBeVisible();
    await expect(
      page.locator(
        "button:has-text('Declaración Aérea IATA Shipper\\'s DGD PDF')",
      ),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Ficha de Emergencia EmS PDF')"),
    ).toBeVisible();
    await expect(
      page.locator(
        "button:has-text('Certificado de Estiba de Contenedor PDF')",
      ),
    ).toBeVisible();
  });
});
