import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Predictive Port Congestion & AIS Berth Delay Early Warning Engine (/port-congestion)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should render Port Congestion Control Tower with Iberian port selector and KPI cards', async ({
    page,
  }) => {
    await page.goto('/port-congestion', { waitUntil: 'domcontentloaded' });

    // Header & Badges
    await expect(
      page.locator("h1:has-text('Predictive Port Congestion & AIS Berth Delay Early Warning Engine')")
    ).toBeVisible({ timeout: 15000 });

    await expect(page.locator('text=Atlas Maritime Control Tower · AIS Telemetry')).toBeVisible();

    // Port Selector Buttons
    await expect(page.locator("button:has-text('ESBCN')")).toBeVisible();
    await expect(page.locator("button:has-text('ESVLC')")).toBeVisible();
    await expect(page.locator("button:has-text('ESALG')")).toBeVisible();

    // KPI Cards
    await expect(page.locator('text=Índice de Congestión')).toBeVisible();
    await expect(page.locator('text=Espera Media Fondeadero')).toBeVisible();
    await expect(page.locator('text=Buques en Espera / Fondeo')).toBeVisible();
    await expect(page.locator('text=Tiempo Giro Puerta (Gate)')).toBeVisible();
  });

  test('should switch between Geospatial Map, Berth Timeline, Landside Drayage, and D&D Suspension tabs', async ({
    page,
  }) => {
    await page.goto('/port-congestion', { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator("h1:has-text('Predictive Port Congestion & AIS Berth Delay Early Warning Engine')")
    ).toBeVisible({ timeout: 15000 });

    // Tab 1: Geospatial Map (Default)
    await expect(page.locator('text=Carta Náutica Telemétrica:')).toBeVisible();
    await expect(page.locator('text=FONDEADERO EXTERIOR').first()).toBeVisible();
    await expect(page.locator('text=Buques en Radar')).toBeVisible();


    // Switch to Port Valencia (ESVLC)
    await page.locator("button:has-text('ESVLC')").click();
    await expect(page.locator('text=Port de València (ESVLC)')).toBeVisible();

    // Switch back to Barcelona (ESBCN)
    await page.locator("button:has-text('ESBCN')").click();

    // Tab 2: Berth Timeline & Collision Radar
    const berthTab = page.locator("button:has-text('Cronograma de Atraques & Colisiones')");
    await berthTab.click();
    await expect(page.locator('text=Radar Determinista de Colisiones de Atraque')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=MADRID MAERSK').first()).toBeVisible();

    // Tab 3: Landside Drayage & Intermodal Advisories
    const landsideTab = page.locator("button:has-text('Acarreo Terrestre & Intermodal')");
    await landsideTab.click();
    await expect(
      page.locator('text=Avisos de Acarreo Terrestre & Enlaces Ferroviarios (CANTUNIS / TLSA / BERRIO)')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=CANTUNIS').first()).toBeVisible();
    await expect(page.locator('text=TLSA').first()).toBeVisible();

    // Tab 4: FMC/OSRA D&D Free-Time Suspension Generator
    const ddTab = page.locator("button:has-text('Suspensión Reloj D&D (FMC/OSRA)')");
    await ddTab.click();
    await expect(page.locator('text=Generar Certificación de Suspensión D&D')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Certificados Emitidos & Sellos Criptográficos')).toBeVisible();
    await expect(page.locator('button:has-text("PDF Oficial")').first()).toBeVisible();
  });

  test('should interact with berth collision resolver, rebalance drayage, and issue D&D suspension certificate', async ({
    page,
  }) => {
    await page.goto('/port-congestion', { waitUntil: 'domcontentloaded' });

    // 1. Resolve Berth Collision on Tab 2
    await page.locator("button:has-text('Cronograma de Atraques & Colisiones')").click();
    await expect(page.locator('text=Radar Determinista de Colisiones de Atraque')).toBeVisible({ timeout: 10000 });

    const resolveBtn = page.locator("button:has-text('Resolver y Reasignar')").first();
    if (await resolveBtn.isVisible()) {
      await resolveBtn.click();
      await expect(page.locator('text=No existen colisiones de atraque activas')).toBeVisible({ timeout: 5000 });
    }

    // 2. Rebalance Landside Drayage on Tab 3
    await page.locator("button:has-text('Acarreo Terrestre & Intermodal')").click();
    await expect(page.locator('button:has-text("Rebalancear Citas de Entrada")')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Rebalancear Citas de Entrada")').click();
    await expect(page.locator('text=CANTUNIS').first()).toBeVisible();

    // 3. Issue FMC/OSRA D&D Suspension Certificate on Tab 4
    await page.locator("button:has-text('Suspensión Reloj D&D (FMC/OSRA)')").click();
    await expect(page.locator('text=Generar Certificación de Suspensión D&D')).toBeVisible({ timeout: 10000 });

    // Fill form and submit
    await page.fill('input[value="TCLU9283710"]', 'SAICU8829104');
    await page.locator('button:has-text("Firmar Digitalmente & Expedir Certificado")').click();

    // Verify newly issued certificate card appears in history
    await expect(page.locator('text=SAICU8829104').first()).toBeVisible({ timeout: 10000 });
  });
});

