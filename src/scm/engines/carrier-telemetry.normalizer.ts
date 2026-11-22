/**
 * @file carrier-telemetry.normalizer.ts
 * @description Pure domain normalizers for multi-modal carrier tracking events (DCSA 2026, IATA Cargo-IMP/XML FSU, AIS).
 * Normalizes disparate carrier telemetries into a unified NormalizedCarrierEvent schema with trust ranking and milestone mapping.
 * @module @atlas/scm/engines/carrier-telemetry-normalizer
 * @see {@link docs/adr/0034-carrier-track-and-trace-async-ingestion-and-predictive-resolution.md}
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// 1. DOMAIN TYPES & ENUMS
// ============================================================================

export type CarrierTransportMode = "OCEAN" | "AIR" | "ROAD" | "RAIL";

export type CarrierTelemetrySourceType =
  | "TERMINAL_PORT_CUSTOMS"
  | "CARRIER_DCSA_EDI"
  | "CARRIER_AIR_FSU"
  | "IOT_AIS_TELEMETRY"
  | "MANUAL_OPERATOR";

export const CARRIER_TRUST_RANK: Record<CarrierTelemetrySourceType, number> = {
  TERMINAL_PORT_CUSTOMS: 4,
  CARRIER_DCSA_EDI: 3,
  CARRIER_AIR_FSU: 3,
  IOT_AIS_TELEMETRY: 2,
  MANUAL_OPERATOR: 1,
};

export type EventClassifier = "ACT" | "EST" | "PLN";

export type MacroPhase =
  "ORIGIN_PRODUCTION" | "INTERNATIONAL_TRANSIT" | "FINAL_CUSTOMS";

export interface NormalizedCarrierEvent {
  eventId: string;
  transportMode: CarrierTransportMode;
  sourceType: CarrierTelemetrySourceType;
  trustRank: number;
  eventClassifier: EventClassifier;
  eventDateTime: string; // ISO 8601 string
  rawEventCode: string;
  canonicalMilestoneCode: string;
  macroPhase: MacroPhase;
  locationLocode: string;
  autoResolvesExceptionCategory?: string;

  // Multi-key resolution references
  carrierBookingReference?: string;
  transportDocumentReference?: string; // MBL / HBL
  airWaybillNumber?: string; // AWB (e.g., 020-12345675)
  equipmentReference?: string; // Container (e.g., MSCU9821034)
  vesselImoNumber?: string; // 7 digits
  vesselName?: string;
  voyageNumber?: string;
  flightNumber?: string;

  // Geographic and positioning details
  latitude?: number;
  longitude?: number;
  speedKnots?: number;
  etaDestination?: string;

  // Full raw payload preservation
  rawPayload: Record<string, unknown>;
}

// ============================================================================
// 2. HELPER UTILITIES
// ============================================================================

/**
 * Validates a 7-digit IMO ship identifier using the weighted modulus-10 checksum algorithm.
 * Formula: sum(d[i] * (8 - i)) mod 10 = d[7] for i = 1..6.
 */
export function validateImoChecksum(
  imo: string | number | undefined | null,
): boolean {
  if (!imo) return false;
  const cleaned = String(imo).replace(/\D/g, "");
  if (cleaned.length !== 7) return false;

  const digits = cleaned.split("").map((d) => parseInt(d, 10));
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    sum += digits[i] * (8 - (i + 1));
  }
  const checkDigit = sum % 10;
  return checkDigit === digits[6];
}

/**
 * Safely parses and validates an ISO 8601 timestamp string, falling back to current UTC ISO.
 */
function toSafeIsoDate(val: unknown): string {
  if (typeof val === "string" && val.trim().length > 0) {
    const parsed = new Date(val);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString();
  }
  return new Date().toISOString();
}

// ============================================================================
// 3. DCSA 2026 OCEAN EVENT NORMALIZER
// ============================================================================

interface RawDcsaPayload {
  eventId?: string;
  eventType?: string; // 'EQUIPMENT' | 'TRANSPORT' | 'SHIPMENT'
  eventClassifierCode?: string; // 'ACT' | 'EST' | 'PLN'
  eventDateTime?: string;
  eventTypeCode?: string; // 'GTIN' | 'LOAD' | 'DEPA' | 'ARRI' | 'DISC' | 'GTOT' | 'HOLD' | 'RELE'
  carrierBookingReference?: string;
  transportDocumentReference?: string;
  equipmentReference?: string;
  locationLocode?: string;
  vesselImoNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  [key: string]: unknown;
}

const DCSA_CODE_MAP: Record<
  string,
  {
    milestone: string;
    phase: MacroPhase;
    autoResolve?: string;
  }
> = {
  GTIN: {
    milestone: "GATE_IN_ORIGIN",
    phase: "ORIGIN_PRODUCTION",
    autoResolve: "CRD_CUTOFF_BREACH",
  },
  LOAD: {
    milestone: "CONTAINER_LOADED",
    phase: "INTERNATIONAL_TRANSIT",
    autoResolve: "ROLLOVER_RISK",
  },
  DEPA: {
    milestone: "VESSEL_DEPARTED",
    phase: "INTERNATIONAL_TRANSIT",
    autoResolve: "CARRIER_DELAY",
  },
  ARRI: {
    milestone: "VESSEL_ARRIVED",
    phase: "INTERNATIONAL_TRANSIT",
    autoResolve: "TRANSSHIPMENT_DWELL",
  },
  DISC: {
    milestone: "CONTAINER_DISCHARGED",
    phase: "INTERNATIONAL_TRANSIT",
    autoResolve: "PORT_CONGESTION",
  },
  HOLD: {
    milestone: "CUSTOMS_HOLD",
    phase: "FINAL_CUSTOMS",
  },
  RELE: {
    milestone: "CUSTOMS_RELEASED",
    phase: "FINAL_CUSTOMS",
    autoResolve: "CUSTOMS_HOLD",
  },
  GTOT: {
    milestone: "GATE_OUT_DESTINATION",
    phase: "FINAL_CUSTOMS",
    autoResolve: "ETA_RDD_BREACH",
  },
};

export function normalizeDcsaEvent(raw: unknown): NormalizedCarrierEvent {
  const payload = (
    typeof raw === "object" && raw !== null ? raw : {}
  ) as RawDcsaPayload;

  const eventTypeCode = (payload.eventTypeCode || "DEPA").toUpperCase();
  const mapping = DCSA_CODE_MAP[eventTypeCode] || {
    milestone: `OCEAN_${eventTypeCode}`,
    phase: "INTERNATIONAL_TRANSIT" as MacroPhase,
  };

  const classifier = (payload.eventClassifierCode || "ACT").toUpperCase();
  const eventClassifier: EventClassifier =
    classifier === "EST" || classifier === "PLN" ? classifier : "ACT";

  return {
    eventId:
      payload.eventId || `dcsa_evt_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
    transportMode: "OCEAN",
    sourceType: "CARRIER_DCSA_EDI",
    trustRank: CARRIER_TRUST_RANK.CARRIER_DCSA_EDI,
    eventClassifier,
    eventDateTime: toSafeIsoDate(payload.eventDateTime),
    rawEventCode: eventTypeCode,
    canonicalMilestoneCode: mapping.milestone,
    macroPhase: mapping.phase,
    locationLocode: (payload.locationLocode || "ESVLC").toUpperCase(),
    autoResolvesExceptionCategory: mapping.autoResolve,
    carrierBookingReference: payload.carrierBookingReference || undefined,
    transportDocumentReference: payload.transportDocumentReference || undefined,
    equipmentReference: payload.equipmentReference || undefined,
    vesselImoNumber: payload.vesselImoNumber || undefined,
    vesselName: payload.vesselName || undefined,
    voyageNumber: payload.voyageNumber || undefined,
    rawPayload: payload as Record<string, unknown>,
  };
}

// ============================================================================
// 4. IATA CARGO-IMP / CARGO-XML FSU NORMALIZER (AIR FREIGHT)
// ============================================================================

interface RawAirFsuPayload {
  eventId?: string;
  statusCode?: string; // 'RCS' | 'RCT' | 'MAN' | 'DEP' | 'ARR' | 'RCF' | 'NFD' | 'AWD' | 'DLV' | 'DIS'
  awbNumber?: string; // e.g. '020-12345675'
  hawbNumber?: string;
  flightNumber?: string; // e.g. 'LH8220'
  flightDate?: string;
  eventDateTime?: string;
  stationCode?: string; // e.g. 'FRA', 'MAD', 'HKG'
  pieces?: number;
  weightKg?: number;
  discrepancyCode?: string;
  [key: string]: unknown;
}

const AIR_FSU_CODE_MAP: Record<
  string,
  {
    milestone: string;
    phase: MacroPhase;
    autoResolve?: string;
  }
> = {
  RCS: {
    milestone: "CARGO_RECEIVED",
    phase: "ORIGIN_PRODUCTION",
    autoResolve: "CRD_CUTOFF_BREACH",
  },
  RCT: {
    milestone: "TRANSFER_RECEIVED",
    phase: "INTERNATIONAL_TRANSIT",
  },
  MAN: {
    milestone: "FLIGHT_MANIFESTED",
    phase: "INTERNATIONAL_TRANSIT",
  },
  DEP: {
    milestone: "FLIGHT_DEPARTED",
    phase: "INTERNATIONAL_TRANSIT",
    autoResolve: "CARRIER_DELAY",
  },
  ARR: {
    milestone: "FLIGHT_ARRIVED",
    phase: "INTERNATIONAL_TRANSIT",
    autoResolve: "TRANSSHIPMENT_DWELL",
  },
  RCF: {
    milestone: "CARGO_UNLOADED",
    phase: "INTERNATIONAL_TRANSIT",
    autoResolve: "PORT_CONGESTION",
  },
  NFD: {
    milestone: "CONSIGNEE_NOTIFIED",
    phase: "FINAL_CUSTOMS",
  },
  AWD: {
    milestone: "DOCS_DELIVERED",
    phase: "FINAL_CUSTOMS",
  },
  DLV: {
    milestone: "DELIVERED_FINAL",
    phase: "FINAL_CUSTOMS",
    autoResolve: "ETA_RDD_BREACH",
  },
  DIS: {
    milestone: "AIR_DISCREPANCY_HOLD",
    phase: "FINAL_CUSTOMS",
  },
};

export function normalizeAirFsuEvent(raw: unknown): NormalizedCarrierEvent {
  const payload = (
    typeof raw === "object" && raw !== null ? raw : {}
  ) as RawAirFsuPayload;

  const rawStatusCode = (payload.statusCode || "DEP").toUpperCase();
  const mapping = AIR_FSU_CODE_MAP[rawStatusCode] || {
    milestone: `AIR_${rawStatusCode}`,
    phase: "INTERNATIONAL_TRANSIT" as MacroPhase,
  };

  // Canonicalize station 3-letter IATA code or 5-letter UN/LOCODE
  const station = (payload.stationCode || "MAD").toUpperCase();

  return {
    eventId:
      payload.eventId || `fsu_evt_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
    transportMode: "AIR",
    sourceType: "CARRIER_AIR_FSU",
    trustRank: CARRIER_TRUST_RANK.CARRIER_AIR_FSU,
    eventClassifier: "ACT",
    eventDateTime: toSafeIsoDate(payload.eventDateTime || payload.flightDate),
    rawEventCode: rawStatusCode,
    canonicalMilestoneCode: mapping.milestone,
    macroPhase: mapping.phase,
    locationLocode: station.length === 3 ? `ES${station}` : station,
    autoResolvesExceptionCategory: mapping.autoResolve,
    airWaybillNumber: payload.awbNumber || undefined,
    transportDocumentReference:
      payload.hawbNumber || payload.awbNumber || undefined,
    flightNumber: payload.flightNumber || undefined,
    rawPayload: payload as Record<string, unknown>,
  };
}

// ============================================================================
// 5. AIS SATELLITE / TERRESTRIAL TELEMETRY NORMALIZER
// ============================================================================

interface RawAisPayload {
  eventId?: string;
  imoNumber?: string | number;
  mmsi?: string | number;
  vesselName?: string;
  latitude?: number;
  longitude?: number;
  speedKnots?: number;
  navigationalStatus?: string; // 'UNDERWAY', 'ANCHORED', 'BERTHED', 'MOORED'
  destinationLocode?: string;
  eta?: string;
  timestamp?: string;
  trackingNumber?: string;
  [key: string]: unknown;
}

export function normalizeAisEvent(raw: unknown): NormalizedCarrierEvent {
  const payload = (
    typeof raw === "object" && raw !== null ? raw : {}
  ) as RawAisPayload;

  const navStatus = (payload.navigationalStatus || "UNDERWAY").toUpperCase();
  const speed = typeof payload.speedKnots === "number" ? payload.speedKnots : 0;

  let milestone = "VESSEL_EN_ROUTE";
  const phase: MacroPhase = "INTERNATIONAL_TRANSIT";
  let autoResolve: string | undefined;

  if (
    navStatus.includes("BERTH") ||
    navStatus.includes("MOOR") ||
    (speed === 0 && navStatus.includes("ANCH"))
  ) {
    milestone = "VESSEL_BERTHED";
    autoResolve = "PORT_CONGESTION";
  } else if (navStatus.includes("UNDERWAY")) {
    milestone = "VESSEL_EN_ROUTE";
  }

  const imoStr = payload.imoNumber
    ? String(payload.imoNumber).trim()
    : undefined;

  return {
    eventId:
      payload.eventId || `ais_evt_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
    transportMode: "OCEAN",
    sourceType: "IOT_AIS_TELEMETRY",
    trustRank: CARRIER_TRUST_RANK.IOT_AIS_TELEMETRY,
    eventClassifier: "ACT",
    eventDateTime: toSafeIsoDate(payload.timestamp),
    rawEventCode: navStatus,
    canonicalMilestoneCode: milestone,
    macroPhase: phase,
    locationLocode: (payload.destinationLocode || "ESVLC").toUpperCase(),
    autoResolvesExceptionCategory: autoResolve,
    vesselImoNumber: imoStr,
    vesselName: payload.vesselName || undefined,
    latitude: payload.latitude,
    longitude: payload.longitude,
    speedKnots: speed,
    etaDestination: payload.eta ? toSafeIsoDate(payload.eta) : undefined,
    carrierBookingReference: payload.trackingNumber || undefined,
    rawPayload: payload as Record<string, unknown>,
  };
}

// ============================================================================
// 6. POLYMORPHIC AUTO-DETECTION NORMALIZER
// ============================================================================

/**
 * Automatically inspects raw carrier webhook payloads and dispatches to the corresponding
 * specialized domain normalizer (DCSA, Air FSU, or AIS).
 */
export function normalizeCarrierEvent(
  raw: unknown,
  inferredSource?: CarrierTelemetrySourceType,
): NormalizedCarrierEvent {
  if (typeof raw !== "object" || raw === null) {
    return normalizeDcsaEvent({});
  }

  const p = raw as Record<string, unknown>;

  if (
    inferredSource === "CARRIER_AIR_FSU" ||
    p.awbNumber ||
    p.statusCode ||
    p.flightNumber
  ) {
    return normalizeAirFsuEvent(raw);
  }

  if (
    inferredSource === "IOT_AIS_TELEMETRY" ||
    p.mmsi ||
    p.navigationalStatus ||
    (p.latitude && p.longitude && p.speedKnots !== undefined)
  ) {
    return normalizeAisEvent(raw);
  }

  return normalizeDcsaEvent(raw);
}
