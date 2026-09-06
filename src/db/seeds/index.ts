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

export async function runAllSeeds(): Promise<void> {
  await seedTriggers();
  const coreCtx = await seedCore();
  const shipmentIds = await seedOperations(coreCtx);
  const fullCtx = { ...coreCtx, shipmentIds };

  await seedFinance(fullCtx);
  await seedBookingsWarehouse(fullCtx);
  await seedAirCargo();
  await seedIncoterms();
  await seedClaims();
  await seedRoadFreight();
  await seedTreasury();
  await seedColdChain();
  await seedCbam();
  await seedRail();
  await seedCustomsWarehouse();
  await seedFuelEu();
  await seedTradeFinance();
  await seedAeoSecurity();
  await seedChartering();
  await seedGeneralAverage();
  await seedDangerousGoods();
  await seedCargoInsurance();
  await seedBulkOperations();
}
