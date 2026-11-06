import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { eq } from "drizzle-orm";

export async function seedDemurrageDisputes(): Promise<void> {
  console.log(
    "⏱️ [DEMURRAGE-DISPUTE] Sembrando facturas y disputas legales FMC...",
  );

  // Verify target shipment sh_demo_01 exists, fallback to first available
  const [demoShipment] = await db
    .select({ id: schema.shipments.id })
    .from(schema.shipments)
    .where(eq(schema.shipments.id, "sh_demo_01"))
    .limit(1);

  let targetShipmentId = demoShipment?.id;
  if (!targetShipmentId) {
    const [firstShipment] = await db
      .select({ id: schema.shipments.id })
      .from(schema.shipments)
      .limit(1);
    targetShipmentId = firstShipment?.id;
  }

  if (!targetShipmentId) {
    console.warn(
      "⚠️ No se encontraron expediciones para asociar demurrage_invoices.",
    );
    return;
  }

  // 1. Seed canonical Demurrage Invoice
  const invoiceId = "dinv_sh_demo_01";
  await db
    .insert(schema.demurrageInvoices)
    .values({
      id: invoiceId,
      shipmentId: targetShipmentId,
      invoiceNumber: "INV-DEM-2026-9921",
      containerNumber: "MSKU9284712",
      carrierScac: "MAEU",
      carrierName: "Maersk Line A/S",
      billOfLading: "BK-2026-67116",
      pod: "New York Container Terminal (USNYC)",
      terminalName: "APM Terminals Port Elizabeth",
      vesselDischargeDate: "2026-10-25T08:00:00Z",
      gateInDate: "2026-10-25T09:30:00Z",
      gateOutDate: null,
      availableDate: "2026-10-25T14:00:00Z",
      freeTimeStartDate: "2026-10-26T00:00:00Z",
      freeTimeEndDate: "2026-10-29T23:59:59Z",
      freeDaysGranted: 4,
      dailyRateUsd: 175,
      totalInvoicedUsd: 1400,
      status: "DISPUTED",
      fmcCompliant: true,
      tariffTiersJson: JSON.stringify([
        { fromDay: 1, toDay: 4, dailyRate: 175, currency: "USD" },
        { fromDay: 5, toDay: 8, dailyRate: 250, currency: "USD" },
      ]),
    })
    .onConflictDoNothing();

  // 2. Seed canonical Clock Suspension
  await db
    .insert(schema.demurrageSuspensions)
    .values({
      id: "dsusp_01",
      invoiceId,
      startDate: "2026-10-27T08:00:00Z",
      endDate: "2026-10-29T18:00:00Z",
      daysSuspended: 2,
      reason: "CUSTOMS_PHYSICAL_EXAM",
      justificationText:
        "CBP vacis exam hold placed on container MSKU9284712 preventing gate-out release.",
      approved: true,
    })
    .onConflictDoNothing();

  // 3. Seed canonical FMC Dispute
  await db
    .insert(schema.demurrageDisputes)
    .values({
      id: "ddisp_01",
      invoiceId,
      disputedAmountUsd: 850,
      revisedPayableUsd: 550,
      fmcRuleClause:
        "46 CFR § 541.6(a) - Inaccurate Free Time Start During Government Inspection Hold",
      status: "SUBMITTED",
      formalLetterPayload: JSON.stringify({
        recipient: "Maersk Line North America Demurrage Claims",
        containerNumber: "MSKU9284712",
        billOfLading: "BK-2026-67116",
        statutoryBasis: "FMC OSRA 2022 / 46 CFR Part 541",
        claimedWaiverDays: 2,
        justification:
          "Official CBP notice demonstrates terminal gate availability was restricted.",
      }),
      submittedAt: Math.floor(Date.now() / 1000) - 86400,
    })
    .onConflictDoNothing();

  console.log(
    "✅ [DEMURRAGE-DISPUTE] Facturas y disputas sembradas con éxito.",
  );
}
