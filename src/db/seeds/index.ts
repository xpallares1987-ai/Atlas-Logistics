/**
 * Master Domain Seeders Runner
 * Coordinates deterministic seed injection in strict relational order.
 */

export * from "./triggers.seed.js";
export * from "./core.seed.js";
export * from "./operations.seed.js";
export * from "./finance.seed.js";
export * from "./bookings-warehouse.seed.js";
export * from "./air-cargo.seed.js";
export * from "./incoterms.seed.js";
export * from "./claims.seed.js";
export * from "./road-freight.seed.js";
export * from "./treasury.seed.js";
export * from "./cold-chain.seed.js";
export * from "./cbam.seed.js";
export * from "./rail.seed.js";
export * from "./customs-warehouse.seed.js";
export * from "./fueleu.seed.js";
export * from "./trade-finance.seed.js";
export * from "./aeo-security.seed.js";
export * from "./chartering.seed.js";
export * from "./general-average.seed.js";
export * from "./dangerous-goods.seed.js";
export * from "./cargo-insurance.seed.js";
export * from "./bulk-operations.seed.js";
export * from "./carbon.seed.js";
export * from "./telemetry.seed.js";
export * from "./edi.seed.js";
export * from "./documents.seed.js";
export * from "./control_tower.seed.js";
export * from "./addresses.seed.js";
export * from "./drayage.seed.js";

import { seedTriggers } from "./triggers.seed.js";
import { seedCore } from "./core.seed.js";
import { seedOperations } from "./operations.seed.js";
import { seedFinance } from "./finance.seed.js";
import { seedBookingsWarehouse } from "./bookings-warehouse.seed.js";
import { seedAirCargo } from "./air-cargo.seed.js";
import { seedIncoterms } from "./incoterms.seed.js";
import { seedClaims } from "./claims.seed.js";
import { seedRoadFreight } from "./road-freight.seed.js";
import { seedTreasury } from "./treasury.seed.js";
import { seedColdChain } from "./cold-chain.seed.js";
import { seedCbam } from "./cbam.seed.js";
import { seedRail } from "./rail.seed.js";
import { seedCustomsWarehouse } from "./customs-warehouse.seed.js";
import { seedFuelEu } from "./fueleu.seed.js";
import { seedTradeFinance } from "./trade-finance.seed.js";
import { seedAeoSecurity } from "./aeo-security.seed.js";
import { seedChartering } from "./chartering.seed.js";
import { seedGeneralAverage } from "./general-average.seed.js";
import { seedDangerousGoods } from "./dangerous-goods.seed.js";
import { seedCargoInsurance } from "./cargo-insurance.seed.js";
import { seedBulkOperations } from "./bulk-operations.seed.js";
import { seedCarbon } from "./carbon.seed.js";
import { seedTelemetry } from "./telemetry.seed.js";
import { seedEdi } from "./edi.seed.js";
import { seedDocuments } from "./documents.seed.js";
import { seedControlTower } from "./control_tower.seed.js";
import { seedAddressesAndBookings } from "./addresses.seed.js";
import { seedDrayageOrders } from "./drayage.seed.js";
import { db } from "../index.js";
import * as schema from "../schema/index.js";

export interface SeedContext {
  companyIds: string[];
  userIds: string[];
  shipmentIds: string[];
}

/**
 * Phase 1: Core Multimodal Operations & Control Tower
 * (Shipments, Containers, AIS Telemetry, Drayage Orders, Incidents, Incoterms, Air/Rail/Road/Bulk/Chartering)
 */
export async function seedPhase1(): Promise<SeedContext> {
  console.log(
    "🚀 [PHASE 1] Inyectando Operaciones Multimodales, Fletes y Control Tower...",
  );
  await seedTriggers();
  const coreCtx = await seedCore();
  const shipmentIds = await seedOperations(coreCtx);
  await seedAddressesAndBookings();
  await seedDrayageOrders();
  await seedTelemetry();
  await seedControlTower();
  await seedEdi();
  await seedIncoterms();
  await seedRoadFreight();
  await seedRail();
  await seedAirCargo();
  await seedBulkOperations();
  await seedChartering();
  console.log(
    "✅ [PHASE 1] Operaciones Multimodales y Control Tower completadas con éxito.",
  );
  return {
    companyIds: coreCtx.companyIds,
    userIds: coreCtx.userIds,
    shipmentIds,
  };
}

/**
 * Phase 2: Specialized Cargo & Regulatory Compliance
 * (Pharma Cold Chain GDP, IMDG Hazmat DGR, EU CBAM, Bonded Customs Warehouse, FuelEU Maritime, Carbon Footprint, AEO)
 */
export async function seedPhase2(): Promise<void> {
  console.log(
    "🌿 [PHASE 2] Inyectando Carga Especializada, Cadena de Frío, Mercancías Peligrosas y Cumplimiento CBAM/FuelEU...",
  );
  await seedColdChain();
  await seedDangerousGoods();
  await seedCbam();
  await seedCustomsWarehouse();
  await seedFuelEu();
  await seedCarbon();
  await seedAeoSecurity();
  console.log(
    "✅ [PHASE 2] Carga Especializada y Cumplimiento Regulatorio completadas con éxito.",
  );
}

/**
 * Phase 3: Finance, Trade Finance & Digital Document Vault
 * (Multi-currency AR/AP Invoices, CASS Airline Netting, UCP 600 Letters of Credit, Treasury, Claims, e-BL / MLETR Vault)
 */
export async function seedPhase3(ctx?: Partial<SeedContext>): Promise<void> {
  console.log(
    "💰 [PHASE 3] Inyectando Facturación Comercial, Financiación UCP 600, Tesorería y Bóveda Documental...",
  );
  let activeCtx = ctx;

  if (
    !activeCtx ||
    !activeCtx.shipmentIds ||
    activeCtx.shipmentIds.length === 0
  ) {
    const existingCompanies = await db
      .select({ id: schema.companies.id })
      .from(schema.companies)
      .limit(10);
    const existingUsers = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .limit(10);
    const existingShipments = await db
      .select({ id: schema.shipments.id })
      .from(schema.shipments)
      .limit(100);

    if (existingCompanies.length > 0 && existingShipments.length > 0) {
      activeCtx = {
        companyIds: existingCompanies.map((c) => c.id),
        userIds: existingUsers.map((u) => u.id),
        shipmentIds: existingShipments.map((s) => s.id),
      };
    } else {
      console.log(
        "⚠️ Prerrequisitos de Fase 1 ausentes en BD. Inicializando Fase 1 previa...",
      );
      const p1 = await seedPhase1();
      activeCtx = p1;
    }
  }

  const fullCtx = {
    companyIds: activeCtx.companyIds || [],
    userIds: activeCtx.userIds || [],
    shipmentIds: activeCtx.shipmentIds || [],
  };

  await seedFinance(fullCtx);
  await seedBookingsWarehouse(fullCtx);
  await seedTreasury();
  await seedTradeFinance();
  await seedClaims();
  await seedGeneralAverage();
  await seedCargoInsurance();
  await seedDocuments();
  console.log(
    "✅ [PHASE 3] Finanzas, Créditos Documentarios y Bóveda completadas con éxito.",
  );
}

/**
 * Master Runner: Executes all 3 phases sequentially.
 */
export async function runAllSeeds(): Promise<void> {
  const p1 = await seedPhase1();
  await seedPhase2();
  await seedPhase3(p1);
  console.log(
    "✨ Las 3 Fases de Datos Enterprise han sido inyectadas exitosamente.",
  );
}
