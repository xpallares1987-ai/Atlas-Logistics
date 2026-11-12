/**
 * @file bookingHelpers.ts
 * @description Pure domain helpers for mapping relational SQLite ocean booking rows, formatting rate-lock timers, and building multi-carrier spot quotes.
 * @module @atlas/frontend/components/bookings/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import {
  CARRIER_METADATA,
  type OceanBooking,
  type RateLockQuote,
  type CarrierCode,
} from "@atlas/shared";

// ============================================================================
// 1. CANONICAL FALLBACK RECORD
// ============================================================================

export const CANONICAL_FALLBACK_OCEAN_BOOKING: OceanBooking = {
  id: "bk_demo_01",
  bookingNumber: "BK-2026-67116",
  referenceNumber: "BK-2026-67116",
  carrier: "MSC",
  carrierScac: "MSCU",
  originPort: "ESVLC",
  destinationPort: "USNYC",
  vesselName: "MSC ISABELLA",
  voyageNumber: "VOY-2026-88",
  commodityDescription: "Industrial Robotics & Tooling",
  status: "CONFIRMED",
  requestedEquipment: {
    isoType: "40HC",
    quantity: 1,
  },
  rateLock: {
    quoteId: "QTE-MSCU-ESVLC-USNYC",
    carrier: "MSC",
    carrierName: "Mediterranean Shipping Company (MSC)",
    carrierScac: "MSCU",
    originPort: "ESVLC",
    destPort: "USNYC",
    containerType: "40HC",
    oceanFreightUsd: 2080,
    bafUsd: 340,
    thcOriginUsd: 140,
    thcDestUsd: 280,
    totalSpotUsd: 2840,
    validityExpiresAt: "2026-11-20T23:59:59Z",
    rateLockToken: "RL-MSCU-2026-LOCK",
    freeTimeDays: 6,
    transitTimeDays: 15,
  },
  cutOffs: {
    cargoCutOff: "2026-11-12T18:00:00Z",
    vgmCutOff: "2026-11-13T12:00:00Z",
    customsCutOff: "2026-11-13T16:00:00Z",
    siCutOff: "2026-11-14T10:00:00Z",
    estimatedDeparture: "2026-11-15T08:00:00Z",
    estimatedArrival: "2026-11-30T14:00:00Z",
  },
  shippingInstructions: {
    bookingReference: "BK-2026-67116",
    carrierScac: "MSCU",
    shipperName: "Atlas Global Imports S.L.",
    shipperAddress: "Zaragoza / Barcelona Logistics Park",
    consigneeName: "European Distribution Hub B.V.",
    consigneeAddress: "Port Newark Container Terminal (PNCT), Gate 3",
    notifyPartyName: "System Admin (Global Systems & Logistics Lead)",
    blType: "WAYBILL",
    freightPaymentTerm: "PREPAID",
    placeOfIssue: "Valencia",
    siStatus: "ACCEPTED",
    containerDetails: [
      {
        containerNumber: "MSKU9284712",
        sealNumber: "ISO-17712-H-881920",
        tareWeightKg: 3880,
        verifiedGrossMassKg: 28450,
        packagesCount: 48,
        packageType: "Industrial Crates",
        cargoDescription: "Industrial Robotics & Tooling",
        hsCode: "8479.89",
      },
    ],
  },
  equipmentRelease: {
    releaseOrderNumber: "REL-MSCU-2026-0912",
    bookingNumber: "BK-2026-67116",
    carrier: "MSC",
    carrierScac: "MSCU",
    depotCode: "DEPOT-VLC-01",
    depotName: "Terminal de Contenedores de Valencia (TCV)",
    depotAddress: "Muelle de Levante s/n, 46024 Valencia",
    containerCount: 1,
    isoType: "40HC",
    validUntil: "2026-11-12",
    pickupPin: "8819",
    qrDigest: "SHA256:881920-REL-MSCU-VALID",
    status: "ISSUED",
    sealNumbersAllocated: ["ISO-17712-H-881920"],
  },
  createdAt: "2026-11-01T08:00:00Z",
  updatedAt: "2026-11-05T12:00:00Z",
};

// ============================================================================
// 2. RELATIONAL MAPPERS & FORMATTERS
// ============================================================================

/**
 * Maps SQLite ocean booking detail and parent booking rows to a domain OceanBooking object.
 */
export function mapDbToOceanBooking(
  detail: any,
  parentBooking: any,
): OceanBooking {
  if (!detail && !parentBooking) return CANONICAL_FALLBACK_OCEAN_BOOKING;

  const bkg = parentBooking || detail?.booking || {};
  let parsedCargo: any = {};
  try {
    parsedCargo =
      typeof bkg.cargoDetails === "string"
        ? JSON.parse(bkg.cargoDetails)
        : bkg.cargoDetails || {};
  } catch {}

  const carrierScac = detail?.carrierScac || "MSCU";
  const carrierCode: CarrierCode =
    carrierScac === "MAEU"
      ? "MAERSK"
      : carrierScac === "MSCU"
        ? "MSC"
        : carrierScac === "CMACGM"
          ? "CMA_CGM"
          : carrierScac === "HLCU"
            ? "HAPAG_LLOYD"
            : "MSC";

  const meta = CARRIER_METADATA[carrierCode] || {
    name: "Mediterranean Shipping Company (MSC)",
    scac: "MSCU",
  };

  const cargoCutOff = detail?.cargoCutOff || "2026-11-12T18:00:00Z";
  const vcsCutOff = detail?.vcsCutOff || "2026-11-13T12:00:00Z";
  const docCutOff = detail?.docCutOff || "2026-11-13T16:00:00Z";
  const siCutOff = detail?.siCutOff || "2026-11-14T10:00:00Z";

  const vgmData =
    detail?.vgm || (detail?.vgmJson ? JSON.parse(detail.vgmJson) : null);
  const containerNum = parsedCargo.containerNumber || "MSKU9284712";
  const sealNum = vgmData?.sealNumber || "ISO-17712-H-881920";
  const vgmKg =
    vgmData?.verifiedGrossMassKg || Number(parsedCargo.weight) || 28450;

  return {
    id: detail?.bookingId || bkg.id || "bk_demo_01",
    bookingNumber: bkg.referenceNumber || "BK-2026-67116",
    referenceNumber: bkg.referenceNumber || "BK-2026-67116",
    carrier: carrierCode,
    carrierScac,
    originPort: bkg.origin || "ESVLC",
    destinationPort: bkg.destination || "USNYC",
    vesselName: bkg.vessel || "MSC ISABELLA",
    voyageNumber: bkg.voyage || "VOY-2026-88",
    commodityDescription:
      parsedCargo.description || "Industrial Robotics & Tooling",
    status: (detail?.siStatus === "CONFIRMED"
      ? "CONFIRMED"
      : bkg.status?.toUpperCase() || "CONFIRMED") as any,
    requestedEquipment: {
      isoType: bkg.equipment || "40HC",
      quantity: 1,
    },
    rateLock: {
      quoteId: `QTE-${carrierScac}-${bkg.origin || "ESVLC"}-${bkg.destination || "USNYC"}`,
      carrier: carrierCode,
      carrierName: meta.name,
      carrierScac,
      originPort: bkg.origin || "ESVLC",
      destPort: bkg.destination || "USNYC",
      containerType: bkg.equipment || "40HC",
      oceanFreightUsd: 2080,
      bafUsd: 340,
      thcOriginUsd: 140,
      thcDestUsd: 280,
      totalSpotUsd: 2840,
      validityExpiresAt: "2026-11-20T23:59:59Z",
      rateLockToken: `RL-${carrierScac}-2026-LOCK`,
      freeTimeDays: 6,
      transitTimeDays: 15,
    },
    cutOffs: {
      cargoCutOff,
      vgmCutOff: vcsCutOff,
      customsCutOff: docCutOff,
      siCutOff,
      estimatedDeparture: "2026-11-15T08:00:00Z",
      estimatedArrival: "2026-11-30T14:00:00Z",
    },
    shippingInstructions: {
      bookingReference: bkg.referenceNumber || "BK-2026-67116",
      carrierScac,
      shipperName: bkg.shipperName || "Atlas Global Imports S.L.",
      shipperAddress: "Zaragoza / Barcelona Logistics Park",
      consigneeName: bkg.consigneeName || "European Distribution Hub B.V.",
      consigneeAddress: "Port Newark Container Terminal (PNCT), Gate 3",
      notifyPartyName: "System Admin (Global Systems & Logistics Lead)",
      blType: "WAYBILL",
      freightPaymentTerm: "PREPAID",
      placeOfIssue: (bkg.origin || "Valencia").split(" ")[0],
      siStatus: detail?.siStatus === "CONFIRMED" ? "ACCEPTED" : "DRAFT",
      containerDetails: [
        {
          containerNumber: containerNum,
          sealNumber: sealNum,
          tareWeightKg: 3880,
          verifiedGrossMassKg: vgmKg,
          packagesCount: 48,
          packageType: "Industrial Crates",
          cargoDescription:
            parsedCargo.description || "Industrial Robotics & Tooling",
          hsCode: "8479.89",
        },
      ],
    },
    equipmentRelease: {
      releaseOrderNumber: `REL-${carrierScac}-2026-0912`,
      bookingNumber: bkg.referenceNumber || "BK-2026-67116",
      carrier: carrierCode,
      carrierScac,
      depotCode: "DEPOT-VLC-01",
      depotName: "Terminal de Contenedores de Valencia (TCV)",
      depotAddress: "Muelle de Levante s/n, 46024 Valencia",
      containerCount: 1,
      isoType: bkg.equipment || "40HC",
      validUntil: cargoCutOff.split("T")[0],
      pickupPin: "8819",
      qrDigest: `SHA256:${sealNum}-REL-VALID`,
      status: "ISSUED",
      sealNumbersAllocated: [sealNum],
    },
    createdAt: bkg.createdAt || detail?.createdAt || new Date().toISOString(),
    updatedAt: detail?.updatedAt || bkg.updatedAt || new Date().toISOString(),
  };
}

/**
 * Formats seconds into MM:SS countdown string.
 */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Builds deterministic multi-carrier spot rate quotes for the active booking corridor.
 */
export function buildRateLockQuotes(
  originPort: string,
  destinationPort: string,
  isoType: OceanBooking["requestedEquipment"]["isoType"],
  countdownSeconds: number,
): RateLockQuote[] {
  const carriers: CarrierCode[] = [
    "MAERSK",
    "MSC",
    "CMA_CGM",
    "HAPAG_LLOYD",
    "ONE",
  ];
  const baseMap: Record<
    CarrierCode,
    { freight: number; baf: number; free: number; transit: number }
  > = {
    MAERSK: { freight: 2150, baf: 320, free: 5, transit: 14 },
    MSC: { freight: 2080, baf: 340, free: 6, transit: 15 },
    CMA_CGM: { freight: 2120, baf: 310, free: 7, transit: 16 },
    HAPAG_LLOYD: { freight: 2200, baf: 290, free: 7, transit: 13 },
    ONE: { freight: 2100, baf: 330, free: 5, transit: 15 },
    EVERGREEN: { freight: 2140, baf: 320, free: 6, transit: 15 },
  };

  return carriers.map((code) => {
    const meta = CARRIER_METADATA[code];
    const base = baseMap[code];
    return {
      quoteId: `QTE-${meta.scac}-${originPort}-${destinationPort}`,
      carrier: code,
      carrierName: meta.name,
      carrierScac: meta.scac,
      originPort,
      destPort: destinationPort,
      containerType: isoType,
      oceanFreightUsd: base.freight,
      bafUsd: base.baf,
      thcOriginUsd: 140,
      thcDestUsd: 280,
      totalSpotUsd: base.freight + base.baf + 140 + 280,
      validityExpiresAt: new Date(
        Date.now() + countdownSeconds * 1000,
      ).toISOString(),
      rateLockToken: `RL-${meta.scac}-2026-LOCK`,
      freeTimeDays: base.free,
      transitTimeDays: base.transit,
    };
  });
}
