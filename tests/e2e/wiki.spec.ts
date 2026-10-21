import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("In-App Wiki & Knowledge Hub (/wiki)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render Wiki Hub with header, search bar, and default Corredor Oficial article", async ({
    page,
  }) => {
    await page.goto("/wiki", { waitUntil: "domcontentloaded" });

    // Main header and badge
    await expect(
      page.locator(
        "h1:has-text('Enciclopedia Logística & Normativa Operativa')",
      ),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("Knowledge Base & Wiki")).toBeVisible();

    // Default article title
    await expect(
      page.getByRole("heading", { name: /Corredor Oficial Book TEST01/i }),
    ).toBeVisible();

    // Summary and legal baseline
    await expect(page.getByText("26.500 kg netos")).toBeVisible();
    await expect(page.getByText("CANTUNIS")).toBeVisible();
  });

  test("should filter articles by search query", async ({ page }) => {
    await page.goto("/wiki", { waitUntil: "domcontentloaded" });

    const searchInput = page.locator("#wiki-search-input");
    await expect(searchInput).toBeVisible();

    // Search for DUA
    await searchInput.fill("Casilla 46");
    await expect(
      page.locator("h4:has-text('Guía Integral de Despacho Aduanero')"),
    ).toBeVisible();

    // Clear search
    await page.getByRole("button", { name: /Limpiar/i }).click();
    await expect(searchInput).toHaveValue("");
  });

  test("should switch to Glossary tab and display international logistics terms", async ({
    page,
  }) => {
    await page.goto("/wiki", { waitUntil: "domcontentloaded" });

    // Click on Glossary tab button
    await page.getByRole("button", { name: /Glosario A-Z/i }).click();

    // Check international terms
    await expect(page.getByText("DEG / SDR")).toBeVisible();
    await expect(page.getByText("TEU")).toBeVisible();
    await expect(page.getByText("DUA / SAD")).toBeVisible();
    await expect(page.getByText("VGM")).toBeVisible();
  });

  test("should switch articles on clicking a related or list article", async ({
    page,
  }) => {
    await page.goto("/wiki", { waitUntil: "domcontentloaded" });

    // Click on Incoterms article in sidebar list
    const incotermsCard = page.locator(
      "h4:has-text('Matriz Oficial Incoterms')",
    );
    await expect(incotermsCard).toBeVisible();
    await incotermsCard.click();

    // Active reader should show Incoterms title
    await expect(
      page.getByRole("heading", { name: /Matriz Oficial Incoterms® 2020/i }),
    ).toBeVisible();
    await expect(
      page.getByText("¡No usar FOB / CIF en Contenedores!"),
    ).toBeVisible();
  });
});
