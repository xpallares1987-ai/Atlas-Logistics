/**
 * @file po.seed.ts
 * @description Deterministic seeder for Supply Chain Purchase Orders, SKUs, manufacturing milestones,
 * and booking allocations (ADR 0032).
 * @module @atlas/db/seeds/po
 * @see {@link docs/adr/0032-supply-chain-purchase-order-and-booking-allocation-engine.md}
 */

import { db } from "../index.js";
import {
  purchaseOrders,
  poLineItems,
  productionMilestones,
} from "../schema/po.js";
import { companies } from "../schema/core.js";
import { bookings } from "../schema/operations.js";
import { eq } from "drizzle-orm";

export async function seedPurchaseOrders(): Promise<void> {
  const now = new Date();

  // 1. Ensure Defensive Seed of Canonical Buyer & Supplier Companies
  const buyerId = "c-1";
  const supplierId = "comp_top_apex_asia";

  await db
    .insert(companies)
    .values({
      id: supplierId,
      name: "Apex Manufacturing Asia Ltd.",
      groupCode: "APEX-ASIA",
      sector: "Industrial Electronics & Telemetry",
      headquartersCountry: "CN",
      taxId: "CN91310000X998877",
      creditLimit: 5000000,
    })
    .onConflictDoUpdate({
      target: companies.id,
      set: {
        name: "Apex Manufacturing Asia Ltd.",
        groupCode: "APEX-ASIA",
        sector: "Industrial Electronics & Telemetry",
        headquartersCountry: "CN",
        taxId: "CN91310000X998877",
      },
    });

  // 2. Ensure Canonical Booking for Allocation linking
  const demoBookingId = "bkg_demo_01";
  await db
    .insert(bookings)
    .values({
      id: demoBookingId,
      customerId: buyerId,
      referenceNumber: "BK-2026-67116",
      status: "Confirmed",
      origin: "CNSHA",
      destination: "ESVLC",
      serviceType: "FCL",
      equipment: "40HC",
      vessel: "MSC ISABELLA",
      voyage: "VOY-2026-88",
    })
    .onConflictDoUpdate({
      target: bookings.id,
      set: {
        customerId: buyerId,
        referenceNumber: "BK-2026-67116",
        status: "Confirmed",
      },
    });

  // 3. Seed Canonical PO 1 (Cargo Ready in Shanghai)
  const po1Id = "po_demo_sha_01";
  await db
    .insert(purchaseOrders)
    .values({
      id: po1Id,
      tenantId: "tenant_default",
      buyerId: buyerId,
      supplierId: supplierId,
      poNumber: "PO-2026-VAL-8801",
      incoterm: "FOB",
      expectedCargoReadyDate: "2026-11-25",
      status: "CARGO_READY",
      notes:
        "High priority telemetry hardware batch for European distribution hub.",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: purchaseOrders.id,
      set: {
        poNumber: "PO-2026-VAL-8801",
        status: "CARGO_READY",
        updatedAt: now,
      },
    });

  // SKUs for PO 1
  const po1Items = [
    {
      id: "poi_demo_01",
      poId: po1Id,
      skuCode: "SKU-IOT-GATEWAY-X1",
      description: "Industrial Multi-Protocol IoT Gateway 4G/5G",
      quantity: "500.000",
      allocatedQuantity: "0.000",
      uom: "PCS",
      hsCode: "851762",
      packageCount: 25,
      grossWeightKg: "2.500",
      volumeCbm: "0.015",
      originalUnitPrice: "145.0000",
      originalCurrency: "USD",
    },
    {
      id: "poi_demo_02",
      poId: po1Id,
      skuCode: "SKU-TEMP-SENSOR-PRO",
      description: "Reefer Temperature & Humidity Telemetry Sensor",
      quantity: "1200.000",
      allocatedQuantity: "0.000",
      uom: "PCS",
      hsCode: "903180",
      packageCount: 30,
      grossWeightKg: "0.450",
      volumeCbm: "0.004",
      originalUnitPrice: "32.5000",
      originalCurrency: "USD",
    },
  ];

  for (const item of po1Items) {
    await db
      .insert(poLineItems)
      .values({
        ...item,
        tenantId: "tenant_default",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: poLineItems.id,
        set: {
          quantity: item.quantity,
          allocatedQuantity: item.allocatedQuantity,
          updatedAt: now,
        },
      });
  }

  // Milestones for PO 1
  const po1Milestones = [
    {
      id: "mil_demo_01",
      poId: po1Id,
      milestoneCode: "ORDER_RECEIVED" as const,
      plannedDate: "2026-10-15",
      actualDate: "2026-10-15",
      notes: "Contract signed and technical drawings approved.",
    },
    {
      id: "mil_demo_02",
      poId: po1Id,
      milestoneCode: "RAW_MATERIALS_READY" as const,
      plannedDate: "2026-10-28",
      actualDate: "2026-10-27",
      notes: "SMT components and PCBs received at factory.",
    },
    {
      id: "mil_demo_03",
      poId: po1Id,
      milestoneCode: "QC_PASSED" as const,
      plannedDate: "2026-11-20",
      actualDate: "2026-11-20",
      notes: "Quality assurance certified 100% compliance with zero defects.",
    },
  ];

  for (const m of po1Milestones) {
    await db
      .insert(productionMilestones)
      .values({
        ...m,
        tenantId: "tenant_default",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: productionMilestones.id,
        set: {
          actualDate: m.actualDate,
          notes: m.notes,
          updatedAt: now,
        },
      });
  }

  // 4. Seed Canonical PO 2 (Partially Booked onto MSC ISABELLA)
  const po2Id = "po_demo_nbg_02";
  await db
    .insert(purchaseOrders)
    .values({
      id: po2Id,
      tenantId: "tenant_default",
      buyerId: buyerId,
      supplierId: supplierId,
      poNumber: "PO-2026-BCN-7702",
      incoterm: "FOB",
      expectedCargoReadyDate: "2026-11-10",
      status: "PARTIALLY_BOOKED",
      notes:
        "Consignment allocated to container MSKU9284712 under MSC ISABELLA booking.",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: purchaseOrders.id,
      set: {
        poNumber: "PO-2026-BCN-7702",
        status: "PARTIALLY_BOOKED",
        updatedAt: now,
      },
    });

  const po2Items = [
    {
      id: "poi_demo_03",
      poId: po2Id,
      bookingId: demoBookingId,
      skuCode: "SKU-SOLAR-INVERTER-5K",
      description: "Grid-Tied Microinverter Units 5000W",
      quantity: "300.000",
      allocatedQuantity: "200.000",
      uom: "PCS",
      hsCode: "850440",
      packageCount: 50,
      grossWeightKg: "18.500",
      volumeCbm: "0.080",
      originalUnitPrice: "380.0000",
      originalCurrency: "EUR",
    },
  ];

  for (const item of po2Items) {
    await db
      .insert(poLineItems)
      .values({
        ...item,
        tenantId: "tenant_default",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: poLineItems.id,
        set: {
          quantity: item.quantity,
          allocatedQuantity: item.allocatedQuantity,
          bookingId: item.bookingId,
          updatedAt: now,
        },
      });
  }

  console.log(
    "✅ [PO SEED] Canonical Purchase Orders and SKUs seeded successfully.",
  );
}
