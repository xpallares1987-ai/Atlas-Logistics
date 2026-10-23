import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Workload Portfolio & Axle Heatmap (/workload)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Workload Portfolio module with Book TEST01 metrics and operative saturation", async ({
    page,
  }) => {
    await page.goto("/workload", { waitUntil: "domcontentloaded" });

    // Header
    await expect(
      page.locator("h1:has-text('Carterización & Carga de Trabajo Operativa')"),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("Book TEST01 (Barcelona)")).toBeVisible();

    // Active Operatives
    await expect(
      page.getByText("TEST01 (Team Leader Customer01)"),
    ).toBeVisible();
    await expect(page.getByText("Operador Tráfico Marítimo 1")).toBeVisible();

    // Excluded Role Check (Governance)
    await expect(page.getByText("TEST02 (Operations Manager)")).toBeVisible();
    await expect(page.getByText("EXCLUIDO").first()).toBeVisible();
    await expect(
      page.getByText("Excluido por Gobernanza").first(),
    ).toBeVisible();
  });

  test("should display rebalancing recommendations and apply rebalance", async ({
    page,
  }) => {
    await page.goto("/workload", { waitUntil: "domcontentloaded" });

    // Click Rebalance tab
    await page.getByRole("button", { name: /Rebalanceo/i }).click();

    await expect(
      page.locator("h2:has-text('Rebalanceo Automático de Cartera')"),
    ).toBeVisible({ timeout: 10000 });

    // Look for rebalance action button if available
    const applyBtn = page
      .getByRole("button", { name: /Aplicar Rebalanceo/i })
      .first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await expect(page.locator("text=reasignada con éxito")).toBeVisible();
    }
  });

  test("should display carrier charge audit discrepancies in D&D tab", async ({
    page,
  }) => {
    await page.goto("/workload", { waitUntil: "domcontentloaded" });

    // Click Discrepancies tab
    await page.getByRole("button", { name: /Auditoría D&D/i }).click();

    await expect(
      page.locator("h2:has-text('Auditoría Financiera de Cargos Navieros')"),
    ).toBeVisible();

    await expect(page.getByText("CHG-MSC-001")).toBeVisible();
    await expect(page.getByText("FREE TIME DISPUTE")).toBeVisible();
  });

  test("should render 5-axle kinematic load and 2D floor stress heatmap on Customer01 operations page", async ({
    page,
  }) => {
    await page.goto("/customer01-operations", {
      waitUntil: "domcontentloaded",
    });

    // Click 40ft HC Stowage tab
    await page.getByRole("button", { name: /Estiba 40' HC/i }).click();

    // 5-Axle distribution container
    await expect(
      page.getByText("Reparto Cinemático sobre Ejes del Vehículo"),
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Eje 1: Directriz Tractora")).toBeVisible();
    await expect(page.getByText("Eje 2: Motriz Tractora")).toBeVisible();
    await expect(page.getByText("VIALMENTE LEGAL")).toBeVisible();

    // 2D Floor Thermal Stress Heatmap
    await expect(
      page.getByText("Matriz de Estrés Dinámico del Suelo 40' HC"),
    ).toBeVisible();
    await expect(page.getByText("Frontal (Testero Kingpin)")).toBeVisible();
    await expect(page.getByText("Puertas Posteriores (Trídem)")).toBeVisible();
  });
});
