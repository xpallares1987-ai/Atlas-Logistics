import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { db, client } from "../db/index.js";
import {
  bookings,
  shipments,
  shipmentContainers,
} from "../db/schema/operations.js";
import { shipmentEventLogs } from "../db/schema/audit.js";
import { documents } from "../db/schema/support.js";
import { companies, addresses, addressContacts } from "../db/schema/core.js";
import { drayageTransportOrders } from "../db/schema/drayage.js";
import { eq, desc, or, and } from "drizzle-orm";
import { ensureOperationsSeedData } from "../routes/operations/seed-data.js";
import { formatAllBlBoxes } from "@atlas/shared";

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

  // Addresses Hub Integration
  shipperAddressId?: string;
  consigneeAddressId?: string;
  notifyAddressId?: string;
  dischargeAgentAddressId?: string;
  isToOrder?: boolean;
  orderOf?: string;
  blPartiesSnapshot?: any;

  // Drayage Port-to-Door Integration
  drayageQuote?: any;
  haulierAddressId?: string;
  drayageDestinationAddressId?: string;
}

export interface ConfirmBookingInput {
  carrierBookingNumber?: string;
  bookingNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  cutOffDate?: string;
  incoterm?: string;
  shipperName?: string;
  consigneeName?: string;

  // Addresses Hub Integration
  shipperAddressId?: string;
  consigneeAddressId?: string;
  notifyAddressId?: string;
  dischargeAgentAddressId?: string;
  isToOrder?: boolean;
  orderOf?: string;
  blPartiesSnapshot?: any;

  // Drayage Port-to-Door Integration
  haulierAddressId?: string;
  drayageDestinationAddressId?: string;
}

let bookingsColumnsEnsured = false;
export async function ensureBookingsColumns() {
  if (bookingsColumnsEnsured) return;
  const cols = [
    "ALTER TABLE bookings ADD COLUMN shipper_address_id TEXT REFERENCES addresses(id);",
    "ALTER TABLE bookings ADD COLUMN consignee_address_id TEXT REFERENCES addresses(id);",
    "ALTER TABLE bookings ADD COLUMN notify_address_id TEXT REFERENCES addresses(id);",
    "ALTER TABLE bookings ADD COLUMN discharge_agent_address_id TEXT REFERENCES addresses(id);",
    "ALTER TABLE bookings ADD COLUMN is_to_order INTEGER DEFAULT 0;",
    "ALTER TABLE bookings ADD COLUMN order_of TEXT;",
    "ALTER TABLE bookings ADD COLUMN bl_parties_snapshot TEXT;",
  ];
  for (const sql of cols) {
    try {
      await client.execute(sql);
    } catch {}
  }
  bookingsColumnsEnsured = true;
}

export async function resolveBlPartiesSnapshot(params: {
  shipperAddressId?: string;
  consigneeAddressId?: string;
  notifyAddressId?: string;
  dischargeAgentAddressId?: string;
  isToOrder?: boolean;
  orderOf?: string;
  fallbackShipperName?: string;
  fallbackConsigneeName?: string;
}) {
  let shipperAddr: any = null;
  let shipperContact: any = null;
  let consigneeAddr: any = null;
  let consigneeContact: any = null;
  let notifyAddr: any = null;
  let notifyContact: any = null;
  let agentAddr: any = null;
  let agentContact: any = null;

  if (params.shipperAddressId) {
    const res = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, params.shipperAddressId))
      .limit(1);
    if (res[0]) {
      shipperAddr = res[0];
      const contacts = await db
        .select()
        .from(addressContacts)
        .where(eq(addressContacts.addressId, res[0].id));
      shipperContact = contacts.find((c) => c.isPrimary) || contacts[0];
    }
  }

  if (params.consigneeAddressId) {
    const res = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, params.consigneeAddressId))
      .limit(1);
    if (res[0]) {
      consigneeAddr = res[0];
      const contacts = await db
        .select()
        .from(addressContacts)
        .where(eq(addressContacts.addressId, res[0].id));
      consigneeContact = contacts.find((c) => c.isPrimary) || contacts[0];
    }
  }

  if (params.notifyAddressId) {
    const res = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, params.notifyAddressId))
      .limit(1);
    if (res[0]) {
      notifyAddr = res[0];
      const contacts = await db
        .select()
        .from(addressContacts)
        .where(eq(addressContacts.addressId, res[0].id));
      notifyContact = contacts.find((c) => c.isPrimary) || contacts[0];
    }
  }

  if (params.dischargeAgentAddressId) {
    const res = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, params.dischargeAgentAddressId))
      .limit(1);
    if (res[0]) {
      agentAddr = res[0];
      const contacts = await db
        .select()
        .from(addressContacts)
        .where(eq(addressContacts.addressId, res[0].id));
      agentContact = contacts.find((c) => c.isPrimary) || contacts[0];
    }
  }

  return formatAllBlBoxes({
    shipper:
      shipperAddr ||
      (params.fallbackShipperName
        ? {
            companyName: params.fallbackShipperName,
            street1: "",
            zipCode: "",
            city: "",
            country: "ES",
          }
        : undefined),
    shipperContact,
    consignee:
      consigneeAddr ||
      (params.fallbackConsigneeName
        ? {
            companyName: params.fallbackConsigneeName,
            street1: "",
            zipCode: "",
            city: "",
            country: "NL",
          }
        : undefined),
    consigneeContact,
    isToOrder: params.isToOrder,
    orderOf: params.orderOf,
    notify: notifyAddr,
    notifyContact,
    agent: agentAddr,
    agentContact,
  });
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

  const parsedSnapshot = b.blPartiesSnapshot
    ? typeof b.blPartiesSnapshot === "string"
      ? JSON.parse(b.blPartiesSnapshot)
      : b.blPartiesSnapshot
    : null;

  return {
    ...b,
    shipperAddressId: b.shipperAddressId || null,
    consigneeAddressId: b.consigneeAddressId || null,
    notifyAddressId: b.notifyAddressId || null,
    dischargeAgentAddressId: b.dischargeAgentAddressId || null,
    isToOrder: !!b.isToOrder,
    orderOf: b.orderOf || null,
    blPartiesSnapshot: parsedSnapshot,
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
    bookingNumber: details.carrierBookingNumber || b.referenceNumber,
    carrierBookingNumber: details.carrierBookingNumber || null,
    shipmentId: details.shipmentId || null,
    trackingNumber: details.trackingNumber || null,
    blDocumentId: details.blDocumentId || null,
    blReference: details.blReference || null,
    containerNumber: details.containerNumber || null,
    confirmedAt: details.confirmedAt || null,
    drayageQuote: details.drayageQuote || null,
    drayageOrderId: details.drayageOrderId || null,
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
      drayageQuote: details.drayageQuote || null,
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
  await ensureBookingsColumns();

  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const randomSuffix = crypto.randomInt(1000, 10000);
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
    drayageQuote: input.drayageQuote || null,
    haulierAddressId: input.haulierAddressId || null,
    drayageDestinationAddressId:
      input.drayageDestinationAddressId ||
      input.drayageQuote?.destinationAddressId ||
      null,
  };

  const estDep = input.estimatedDeparture
    ? new Date(input.estimatedDeparture)
    : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  let blSnapshot = input.blPartiesSnapshot || null;
  if (!blSnapshot && (input.shipperAddressId || input.consigneeAddressId)) {
    blSnapshot = await resolveBlPartiesSnapshot({
      shipperAddressId: input.shipperAddressId,
      consigneeAddressId: input.consigneeAddressId,
      notifyAddressId: input.notifyAddressId,
      dischargeAgentAddressId: input.dischargeAgentAddressId,
      isToOrder: input.isToOrder,
      orderOf: input.orderOf,
      fallbackShipperName: input.customerName,
      fallbackConsigneeName: input.consigneeName,
    });
  }

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
      shipperAddressId: input.shipperAddressId || null,
      consigneeAddressId: input.consigneeAddressId || null,
      notifyAddressId: input.notifyAddressId || null,
      dischargeAgentAddressId: input.dischargeAgentAddressId || null,
      isToOrder: !!input.isToOrder,
      orderOf: input.orderOf || null,
      blPartiesSnapshot: blSnapshot ? JSON.stringify(blSnapshot) : null,
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
  await ensureBookingsColumns();
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
  await ensureBookingsColumns();
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
  await ensureBookingsColumns();

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
    const existingDrayage = await db
      .select()
      .from(drayageTransportOrders)
      .where(eq(drayageTransportOrders.shipmentId, details.shipmentId))
      .limit(1);

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
      drayageOrder: existingDrayage[0] || null,
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const randCode = crypto.randomInt(10000, 100000);

  const shipmentId = details.shipmentId || `shp_${uuidv4().substring(0, 8)}`;
  const trackingNumber = details.trackingNumber || `ATLS-${year}-${randCode}`;
  const blDocumentId =
    details.blDocumentId || `doc_${uuidv4().substring(0, 8)}`;
  const blReference = details.blReference || `BL-${trackingNumber}`;

  const carrierName = details.carrier || "Maersk";
  const scacPrefix = carrierName.substring(0, 4).toUpperCase().padEnd(4, "U");
  const carrierBookingNumber =
    input.carrierBookingNumber ||
    input.bookingNumber ||
    details.carrierBookingNumber ||
    `${scacPrefix}${crypto.randomInt(1000000, 10000000)}`;

  const containerNumber =
    input.containerNumber ||
    details.containerNumber ||
    `${scacPrefix}${crypto.randomInt(1000000, 9999999)}`;

  const sealNumber =
    input.sealNumber ||
    details.sealNumber ||
    `SL-${crypto.randomInt(10000, 99999)}`;
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

  const resolvedBlSnapshot = await resolveBlPartiesSnapshot({
    shipperAddressId:
      input.shipperAddressId || (bkg as any).shipperAddressId || undefined,
    consigneeAddressId:
      input.consigneeAddressId || (bkg as any).consigneeAddressId || undefined,
    notifyAddressId:
      input.notifyAddressId || (bkg as any).notifyAddressId || undefined,
    dischargeAgentAddressId:
      input.dischargeAgentAddressId ||
      (bkg as any).dischargeAgentAddressId ||
      undefined,
    isToOrder:
      input.isToOrder !== undefined
        ? input.isToOrder
        : (bkg as any).isToOrder || undefined,
    orderOf: input.orderOf || (bkg as any).orderOf || undefined,
    fallbackShipperName: shipperNameVal,
    fallbackConsigneeName: consigneeNameVal,
  });

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
    notifyParty: input.isToOrder
      ? "Mandatory Notify Party"
      : "Same as Consignee",
    blParties: resolvedBlSnapshot,
    shipperBox: resolvedBlSnapshot.shipper.rawBlock,
    consigneeBox: resolvedBlSnapshot.consignee.rawBlock,
    notifyBox: resolvedBlSnapshot.notify.rawBlock,
    agentBox: resolvedBlSnapshot.agent.rawBlock,
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

  // 5. Materialize Port Drayage Transport Order if drayageQuote is present
  let createdDrayageOrder: any = null;
  const drayageData = details.drayageQuote;
  if (drayageData) {
    try {
      // 5.1 Resolve origin port terminal address
      const terminalUnLocode = bkg.destination || "ESBCN";
      const terminalCandidates = await db
        .select()
        .from(addresses)
        .where(
          and(
            or(
              eq(addresses.addressType, "TRM"),
              eq(addresses.addressType, "TERMINAL"),
            ),
            eq(addresses.unLocode, terminalUnLocode),
          ),
        )
        .limit(1);

      let originTerminal = terminalCandidates[0];
      if (!originTerminal) {
        const anyTerminal = await db
          .select()
          .from(addresses)
          .where(
            or(
              eq(addresses.addressType, "TRM"),
              eq(addresses.addressType, "TERMINAL"),
            ),
          )
          .limit(1);
        originTerminal = anyTerminal[0];
      }

      // 5.2 Resolve destination delivery address
      const targetDestId =
        input.drayageDestinationAddressId ||
        drayageData.destinationAddressId ||
        details.drayageDestinationAddressId ||
        input.consigneeAddressId ||
        (bkg as any).consigneeAddressId;

      let destinationAddress: any = null;
      if (targetDestId) {
        const destRows = await db
          .select()
          .from(addresses)
          .where(eq(addresses.id, targetDestId))
          .limit(1);
        destinationAddress = destRows[0] || null;
      }

      if (!destinationAddress) {
        const warehouseRows = await db
          .select()
          .from(addresses)
          .where(
            or(
              eq(addresses.addressType, "WH"),
              eq(addresses.addressType, "CUS"),
              eq(addresses.addressType, "WAREHOUSE"),
            ),
          )
          .limit(1);
        destinationAddress = warehouseRows[0] || null;
      }

      // 5.3 Resolve haulier address
      const targetHaulierId =
        input.haulierAddressId ||
        drayageData.haulierAddressId ||
        details.haulierAddressId;

      let haulierAddress: any = null;
      if (targetHaulierId) {
        const haulierRows = await db
          .select()
          .from(addresses)
          .where(eq(addresses.id, targetHaulierId))
          .limit(1);
        haulierAddress = haulierRows[0] || null;
      }

      if (!haulierAddress) {
        const anyHaulier = await db
          .select()
          .from(addresses)
          .where(
            or(
              eq(addresses.addressType, "HAU"),
              eq(addresses.addressType, "HAULIER"),
            ),
          )
          .limit(1);
        haulierAddress = anyHaulier[0] || null;
      }

      // 5.4 Insert drayage transport order if all 3 addresses are present
      if (originTerminal && destinationAddress && haulierAddress) {
        const orderId = `dry_${uuidv4().substring(0, 8)}`;
        const orderNumber = `DRY-${year}${String(now.getMonth() + 1).padStart(2, "0")}-${crypto.randomInt(1000, 10000)}`;

        const distKm = Number(drayageData.distanceKm) || 42.5;
        const bRate =
          Number(drayageData.baseRate ?? drayageData.baseRateEuro) || 280;
        const fuelSur =
          Number(drayageData.fuelSurcharge ?? drayageData.fuelSurchargeEuro) ||
          42;
        const tolls =
          Number(drayageData.tollsCost ?? drayageData.tollsEurovignette) || 12;
        const extras = Number(drayageData.extraSurcharges) || 0;
        const subtotal =
          Number(drayageData.subtotalCost ?? drayageData.subtotalNet) ||
          bRate + fuelSur + tolls + extras;
        const margin =
          Number(drayageData.profitMargin) ||
          Number((subtotal * 0.15).toFixed(2));
        const totalGross =
          Number(drayageData.totalGrossCost ?? drayageData.totalGross) ||
          subtotal + margin;

        const co2Wtw =
          Number(
            drayageData.co2WtwKg ?? drayageData.conventionalDieselKgCO2e,
          ) || 38.2;
        const co2Ttw =
          Number(drayageData.co2TtwKg) || Number((co2Wtw * 0.8).toFixed(1));
        const co2Wte =
          Number(drayageData.co2WteKg) || Number((co2Wtw * 0.2).toFixed(1));
        const intensity = Number(drayageData.emissionsIntensityFactor) || 0.062;

        const pin = String(crypto.randomInt(1000, 10000));
        const qrDigest = crypto
          .createHash("sha256")
          .update(
            `${orderNumber}:${haulierAddress.companyName}:${totalGross}:${pin}`,
          )
          .digest("hex");

        const windowStart = new Date(
          now.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString();
        const windowEnd = new Date(
          now.getTime() + 28 * 60 * 60 * 1000,
        ).toISOString();

        await db.insert(drayageTransportOrders).values({
          id: orderId,
          orderNumber,
          status: "DISPATCHED",
          shipmentId,
          bookingReference: bkg.referenceNumber,
          containerNumber,
          containerType: bkg.equipment || "40HC",
          cargoWeightKg: weightKg,
          isDangerousGoods: !!drayageData.isDangerousGoods,
          requiresGenset: !!drayageData.requiresGenset,
          haulierAddressId: haulierAddress.id,
          originAddressId: originTerminal.id,
          destinationAddressId: destinationAddress.id,
          distanceKm: distKm,
          baseRate: bRate,
          fuelSurcharge: fuelSur,
          tollsCost: tolls,
          extraSurcharges: extras,
          subtotalCost: subtotal,
          profitMargin: margin,
          totalGrossCost: totalGross,
          currency: drayageData.currency || "EUR",
          co2WtwKg: co2Wtw,
          co2TtwKg: co2Ttw,
          co2WteKg: co2Wte,
          emissionsIntensityFactor: intensity,
          driverPickupPin: pin,
          qrDigest,
          appointmentWindowStart: windowStart,
          appointmentWindowEnd: windowEnd,
          notes: `Port Drayage dispatched from booking ${bkg.referenceNumber} to inland destination.`,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });

        const drayageEvt = {
          id: `evt_${uuidv4().substring(0, 8)}`,
          shipmentId,
          status: "DRAYAGE_DISPATCHED",
          location: `${originTerminal.companyName || terminalUnLocode} ➔ ${destinationAddress.city || "Inland"} (${distKm} km)`,
          recordedAt: new Date(now.getTime() + 3000),
        };
        await db.insert(shipmentEventLogs).values(drayageEvt);
        milestoneEvents.push(drayageEvt);

        createdDrayageOrder = {
          id: orderId,
          orderNumber,
          status: "DISPATCHED",
          originTerminal: originTerminal.companyName,
          destination:
            destinationAddress.companyName || destinationAddress.city,
          haulier: haulierAddress.companyName,
          distanceKm: distKm,
          totalGrossCost: totalGross,
          currency: drayageData.currency || "EUR",
          co2WtwKg: co2Wtw,
        };
      }
    } catch (drayageErr) {
      console.error(
        "Failed to auto-materialize drayage transport order:",
        drayageErr,
      );
    }
  }

  // 6. Update Booking Status to CONFIRMED with full linkage
  const updatedDetails = {
    ...details,
    carrierBookingNumber,
    shipmentId,
    trackingNumber,
    blDocumentId,
    blReference,
    containerNumber,
    sealNumber,
    drayageOrderId: createdDrayageOrder?.id || details.drayageOrderId || null,
    confirmedAt: now.toISOString(),
  };

  const updatedBookingRows = await db
    .update(bookings)
    .set({
      status: "CONFIRMED",
      vessel: vesselName,
      voyage: voyageNumber,
      cargoDetails: JSON.stringify(updatedDetails),
      shipperAddressId:
        input.shipperAddressId || (bkg as any).shipperAddressId || null,
      consigneeAddressId:
        input.consigneeAddressId || (bkg as any).consigneeAddressId || null,
      notifyAddressId:
        input.notifyAddressId || (bkg as any).notifyAddressId || null,
      dischargeAgentAddressId:
        input.dischargeAgentAddressId ||
        (bkg as any).dischargeAgentAddressId ||
        null,
      isToOrder:
        input.isToOrder !== undefined
          ? !!input.isToOrder
          : !!(bkg as any).isToOrder,
      orderOf:
        input.orderOf !== undefined
          ? input.orderOf
          : (bkg as any).orderOf || null,
      blPartiesSnapshot: JSON.stringify(resolvedBlSnapshot),
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
    drayageOrder: createdDrayageOrder,
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
