import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import {
  bookings,
  shipments,
  shipmentContainers,
} from "../db/schema/operations.js";
import { shipmentEventLogs } from "../db/schema/audit.js";
import { documents } from "../db/schema/support.js";
import { companies } from "../db/schema/core.js";
import { eq, desc, or } from "drizzle-orm";
import { ensureOperationsSeedData } from "../routes/operations/seed-data.js";

export interface CreateBookingInput {
  referenceNumber?: string;
  bookingReference?: string;
  customerId?: string;
  customerName?: string;
  consigneeName?: string;
  origin: string;
  destination: string;
  carrier?: string;
  serviceType?: string;
  equipment?: string;
  vessel?: string;
  voyage?: string;
  commodity?: string;
  commodities?: { description: string; grossWeightKg: number }[];
  weight?: number;
  poNumber?: string;
  incoterm?: string;
  rateAmount?: number;
  currency?: string;
  transitDays?: number;
  estimatedDeparture?: string | number | Date;
  status?: string;
}

export interface ConfirmBookingInput {
  carrierBookingNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  cutOffDate?: string;
  incoterm?: string;
  shipperName?: string;
  consigneeName?: string;
}

function parseCargoDetails(
  raw: string | null | undefined,
): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const first = parsed[0] || {};
      return {
        commodities: parsed,
        commodity: first.description || "General Cargo",
        weightKg: parsed.reduce(
          (acc: number, item: any) => acc + (Number(item.grossWeightKg) || 0),
          0,
        ),
      };
    }
    return parsed;
  } catch {
    return {};
  }
}

export function formatBookingRecord(b: typeof bookings.$inferSelect) {
  const details = parseCargoDetails(b.cargoDetails);
  const commodities =
    details.commodities ||
    (details.commodity
      ? [
          {
            description: details.commodity,
            grossWeightKg: details.weightKg || 12000,
          },
        ]
      : []);

  const weightVal =
    details.weightKg ||
    details.weight ||
    commodities[0]?.grossWeightKg ||
    12000;

  return {
    ...b,
    customer:
      details.customerName ||
      (b.customerId === "c-1" ? "Demo Customer Ltd" : b.customerId),
    consignee: details.consigneeName || "Global Imports Consignee",
    carrier: details.carrier || "Maersk",
    commodity:
      details.commodity || commodities[0]?.description || "General Cargo",
    weightKg: weightVal,
    weight: weightVal,
    poNumber: details.poNumber || "",
    incoterm: details.incoterm || "FOB",
    rateAmount: details.rateAmount ?? 2450,
    currency: details.currency || "USD",
    transitDays: details.transitDays ?? 25,
    carrierBookingNumber: details.carrierBookingNumber || null,
    shipmentId: details.shipmentId || null,
    trackingNumber: details.trackingNumber || null,
    blDocumentId: details.blDocumentId || null,
    blReference: details.blReference || null,
    containerNumber: details.containerNumber || null,
    confirmedAt: details.confirmedAt || null,
    commodities,
    parsedCargoDetails: {
      ...details,
      carrier: details.carrier || "Maersk",
      incoterm: details.incoterm || "FOB",
      weight: weightVal,
      weightKg: weightVal,
      commodity:
        details.commodity || commodities[0]?.description || "General Cargo",
      shipmentTrackingNumber: details.trackingNumber || null,
      blReference: details.blReference || null,
    },
    containers: details.containerNumber
      ? [
          {
            containerNumber: details.containerNumber,
            sealNumber: details.sealNumber || "SL-99281",
            equipment: b.equipment || "40HC",
          },
        ]
      : [],
  };
}

export async function createBookingRequest(input: CreateBookingInput) {
  await ensureOperationsSeedData();

  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = `bkg_${uuidv4().substring(0, 8)}`;
  const referenceNumber =
    input.referenceNumber ||
    input.bookingReference ||
    `BKG-${yyyymm}-${randomSuffix}`;

  const customerId = input.customerId || "c-1";

  // Ensure customer exists in companies
  const existingCustomer = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, customerId))
    .limit(1);

  if (existingCustomer.length === 0) {
    await db
      .insert(companies)
      .values({
        id: customerId,
        name: input.customerName || customerId,
        taxId: "ESA00000000",
      })
      .onConflictDoNothing();
  }

  const weightKg =
    Number(input.weight) ||
    (input.commodities?.[0]?.grossWeightKg
      ? Number(input.commodities[0].grossWeightKg)
      : 12000);

  const commodityDesc =
    input.commodity ||
    input.commodities?.[0]?.description ||
    "General Merchandising Cargo";

  const cargoDetailsObj = {
    carrier: input.carrier || "Maersk",
    commodity: commodityDesc,
    weightKg,
    poNumber: input.poNumber || "",
    incoterm: input.incoterm || "FOB",
    rateAmount: Number(input.rateAmount ?? 2450),
    currency: input.currency || "USD",
    transitDays: Number(input.transitDays ?? 25),
    customerName: input.customerName || "Demo Customer Ltd",
    consigneeName: input.consigneeName || "Continental Distribution Hub",
    commodities: input.commodities || [
      { description: commodityDesc, grossWeightKg: weightKg },
    ],
  };

  const estDep = input.estimatedDeparture
    ? new Date(input.estimatedDeparture)
    : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const inserted = await db
    .insert(bookings)
    .values({
      id,
      referenceNumber,
      customerId,
      status: input.status || "PENDING",
      origin: input.origin || "CNSHA",
      destination: input.destination || "ESBCN",
      serviceType: input.serviceType || "FCL",
      equipment: input.equipment || "40HC",
      vessel:
        input.vessel || `${(input.carrier || "ATLAS").toUpperCase()} HORIZON`,
      voyage: input.voyage || "2610W",
      cargoDetails: JSON.stringify(cargoDetailsObj),
      estimatedDeparture: estDep,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return formatBookingRecord(inserted[0]);
}

export async function listBookings(filters?: {
  status?: string;
  customerId?: string;
  limit?: number;
}) {
  await ensureOperationsSeedData();
  const limit = filters?.limit || 100;
  const rows = await db
    .select()
    .from(bookings)
    .orderBy(desc(bookings.createdAt))
    .limit(limit);

  let formatted = rows.map(formatBookingRecord);

  if (filters?.status) {
    const target = filters.status.toUpperCase();
    formatted = formatted.filter(
      (b) => (b.status || "").toUpperCase() === target,
    );
  }
  if (filters?.customerId) {
    formatted = formatted.filter((b) => b.customerId === filters.customerId);
  }

  return formatted;
}

export async function getBookingById(idOrRef: string) {
  await ensureOperationsSeedData();
  const rows = await db
    .select()
    .from(bookings)
    .where(or(eq(bookings.id, idOrRef), eq(bookings.referenceNumber, idOrRef)))
    .limit(1);

  if (rows.length === 0) return null;
  const formatted = formatBookingRecord(rows[0]);

  let linkedShipment = null;
  let linkedEvents: any[] = [];
  let linkedDocument = null;

  if (formatted.shipmentId) {
    const shp = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, formatted.shipmentId))
      .limit(1);
    linkedShipment = shp[0] || null;

    linkedEvents = await db
      .select()
      .from(shipmentEventLogs)
      .where(eq(shipmentEventLogs.shipmentId, formatted.shipmentId));

    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.shipmentId, formatted.shipmentId));
    linkedDocument = docs[0] || null;
  }

  return {
    ...formatted,
    shipment: linkedShipment,
    events: linkedEvents,
    blDocument: linkedDocument,
  };
}

export async function confirmBookingToShipment(
  idOrRef: string,
  input: ConfirmBookingInput = {},
) {
  await ensureOperationsSeedData();

  const existing = await db
    .select()
    .from(bookings)
    .where(or(eq(bookings.id, idOrRef), eq(bookings.referenceNumber, idOrRef)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Booking '${idOrRef}' not found`);
  }

  const bkg = existing[0];
  if (bkg.status === "CANCELLED") {
    throw new Error(`Cannot confirm a CANCELLED booking ('${idOrRef}')`);
  }

  const details = parseCargoDetails(bkg.cargoDetails);

  if (bkg.status === "CONFIRMED" && details.shipmentId) {
    const existingShipment = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, details.shipmentId))
      .limit(1);
    const existingDoc = details.blDocumentId
      ? await db
          .select()
          .from(documents)
          .where(eq(documents.id, details.blDocumentId))
          .limit(1)
      : [];
    const existingEvents = await db
      .select()
      .from(shipmentEventLogs)
      .where(eq(shipmentEventLogs.shipmentId, details.shipmentId));

    return {
      alreadyConfirmed: true,
      booking: formatBookingRecord(bkg),
      shipment: existingShipment[0] || null,
      container: {
        containerNumber: details.containerNumber,
        sealNumber: details.sealNumber,
        containerType: bkg.equipment || "40HC",
      },
      milestones: existingEvents,
      events: existingEvents,
      blDocument: existingDoc[0] || null,
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const randCode = Math.floor(10000 + Math.random() * 90000);

  const shipmentId = details.shipmentId || `shp_${uuidv4().substring(0, 8)}`;
  const trackingNumber = details.trackingNumber || `ATLS-${year}-${randCode}`;
  const blDocumentId =
    details.blDocumentId || `doc_${uuidv4().substring(0, 8)}`;
  const blReference = details.blReference || `BL-${trackingNumber}`;

  const carrierName = details.carrier || "Maersk";
  const scacPrefix = carrierName.substring(0, 4).toUpperCase().padEnd(4, "U");
  const carrierBookingNumber =
    input.carrierBookingNumber ||
    details.carrierBookingNumber ||
    `${scacPrefix}${Math.floor(1000000 + Math.random() * 9000000)}`;

  const containerNumber =
    input.containerNumber ||
    details.containerNumber ||
    `${scacPrefix}${Math.floor(1000000 + Math.random() * 8999999)}`;

  const sealNumber =
    input.sealNumber ||
    details.sealNumber ||
    `SL-${Math.floor(10000 + Math.random() * 89999)}`;
  const vesselName =
    input.vesselName || bkg.vessel || `${carrierName.toUpperCase()} TITAN`;
  const voyageNumber = input.voyageNumber || bkg.voyage || "2611E";
  const incoterm = input.incoterm || details.incoterm || "FOB";
  const weightKg = Number(details.weightKg) || 12000;

  // 1. Insert or Update Active Shipment
  const existingShp = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(eq(shipments.id, shipmentId))
    .limit(1);

  if (existingShp.length === 0) {
    await db.insert(shipments).values({
      id: shipmentId,
      status: "BOOKED",
      incoterm,
      serviceType: bkg.serviceType || "FCL",
      vesselName,
      voyageNumber,
      trackingNumber,
      origin: bkg.origin || "CNSHA",
      destination: bkg.destination || "ESBCN",
      weight: weightKg,
      companyId: bkg.customerId || "c-1",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 2. Insert Assigned Container Record
  await db
    .insert(shipmentContainers)
    .values({
      id: `cnt_${uuidv4().substring(0, 8)}`,
      shipmentId,
      containerNumber,
      containerType: bkg.equipment || "40HC",
      sealNumber,
      weight: weightKg,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  // 3. Initialize Standard Operational Milestones in shipment_event_logs
  const milestoneEvents = [
    {
      id: `evt_${uuidv4().substring(0, 8)}`,
      shipmentId,
      status: "BOOKING_CONFIRMED",
      location: `${bkg.origin || "Origin"} — Carrier Ref: ${carrierBookingNumber}`,
      recordedAt: now,
    },
    {
      id: `evt_${uuidv4().substring(0, 8)}`,
      shipmentId,
      status: "CONTAINER_ASSIGNED",
      location: `${bkg.origin || "Origin"} Depot — Container ${containerNumber} / Seal ${sealNumber}`,
      recordedAt: new Date(now.getTime() + 1000),
    },
    {
      id: `evt_${uuidv4().substring(0, 8)}`,
      shipmentId,
      status: "CARGO_READY_FOR_RECEIPT",
      location: `${bkg.origin || "Origin"} Port Terminal — Vessel ${vesselName} (${voyageNumber})`,
      recordedAt: new Date(now.getTime() + 2000),
    },
  ];

  for (const evt of milestoneEvents) {
    await db.insert(shipmentEventLogs).values(evt);
  }

  // 4. Emit and Persist Draft Bill of Lading (B/L) in documents
  const shipperNameVal =
    input.shipperName ||
    details.customerName ||
    (bkg.customerId === "c-1" ? "Demo Customer Ltd" : bkg.customerId);
  const consigneeNameVal =
    input.consigneeName ||
    details.consigneeName ||
    "Continental Distribution Hub";

  const blPayload = {
    blNumber: blReference,
    bookingReference: bkg.referenceNumber,
    carrierBookingNumber,
    trackingNumber,
    carrier: carrierName,
    shipperName: shipperNameVal,
    consigneeName: consigneeNameVal,
    shipper: {
      name: shipperNameVal,
    },
    consignee: {
      name: consigneeNameVal,
    },
    notifyParty: "Same as Consignee",
    vesselName,
    voyageNumber,
    portOfLoading: bkg.origin || "CNSHA",
    portOfDischarge: bkg.destination || "ESBCN",
    equipment: bkg.equipment || "40HC",
    containerNumber,
    sealNumber,
    commodity: details.commodity || "General Cargo",
    grossWeightKg: weightKg,
    incoterm,
    freightRate: details.rateAmount ?? 2450,
    currency: details.currency || "USD",
    issuedAt: now.toISOString(),
  };

  const sha256Hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(blPayload))
    .digest("hex");

  await db
    .insert(documents)
    .values({
      id: blDocumentId,
      shipmentId,
      name: `Draft_Bill_of_Lading_${blReference}.pdf`,
      type: "BILL_OF_LADING",
      documentReference: blReference,
      sha256Hash,
      status: "DRAFT",
      payloadData: blPayload as any,
      fileSize: 48200,
      url: `/api/bookings/${bkg.id}/bol`,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  // 5. Update Booking Status to CONFIRMED with full linkage
  const updatedDetails = {
    ...details,
    carrierBookingNumber,
    shipmentId,
    trackingNumber,
    blDocumentId,
    blReference,
    containerNumber,
    sealNumber,
    confirmedAt: now.toISOString(),
  };

  const updatedBookingRows = await db
    .update(bookings)
    .set({
      status: "CONFIRMED",
      vessel: vesselName,
      voyage: voyageNumber,
      cargoDetails: JSON.stringify(updatedDetails),
      updatedAt: now,
    })
    .where(eq(bookings.id, bkg.id))
    .returning();

  const createdShipment = await db
    .select()
    .from(shipments)
    .where(eq(shipments.id, shipmentId))
    .limit(1);

  const createdDoc = await db
    .select()
    .from(documents)
    .where(eq(documents.id, blDocumentId))
    .limit(1);

  return {
    booking: formatBookingRecord(updatedBookingRows[0]),
    shipment: createdShipment[0],
    container: {
      containerNumber,
      sealNumber,
      containerType: bkg.equipment || "40HC",
      weight: weightKg,
    },
    milestones: milestoneEvents,
    events: milestoneEvents,
    blDocument: createdDoc[0] || {
      id: blDocumentId,
      documentReference: blReference,
      status: "DRAFT",
      sha256Hash,
      payloadData: blPayload,
    },
  };
}

export async function cancelBookingRequest(idOrRef: string, reason?: string) {
  const existing = await db
    .select()
    .from(bookings)
    .where(or(eq(bookings.id, idOrRef), eq(bookings.referenceNumber, idOrRef)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Booking '${idOrRef}' not found`);
  }

  const bkg = existing[0];
  const details = parseCargoDetails(bkg.cargoDetails);
  const updatedDetails = {
    ...details,
    cancelReason: reason || "Cancelled by operator",
    cancelledAt: new Date().toISOString(),
  };

  const updated = await db
    .update(bookings)
    .set({
      status: "CANCELLED",
      cargoDetails: JSON.stringify(updatedDetails),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bkg.id))
    .returning();

  return formatBookingRecord(updated[0]);
}
