/**
 * @file air-cargo-xml.engine.ts
 * @description Pure deterministic calculation engine for IATA Cargo-XML messaging, Modulo-7 AWB check-digit verification, and FWB/FHL/FSU schema synthesis.
 * @module @atlas/scm/engines/air-cargo-xml
 *
 * Invariants:
 * - 100% Pure TypeScript: Zero database, ORM, Fastify HTTP, or Node.js filesystem imports.
 * - Standard: IATA Cargo-XML Resolution 670 / Resolution 600b.
 * - Check digit rule: Modulo-7 applied to the 7-digit serial number.
 */

// ============================================================================
// 1. DOMAIN INTERFACES & TYPES
// ============================================================================

export type IataMilestoneCode =
  | "RCS" // Received from Shipper (cargo accepted)
  | "DEP" // Departed on flight
  | "ARR" // Arrived at destination
  | "RCF" // Received from Flight
  | "NFD" // Notified Consignee / Broker
  | "AWD" // Documents Delivered
  | "DLV" // Delivered to Consignee
  | "DIS"; // Discrepancy (damaged, missing)

export interface AwbValidationResult {
  isValid: boolean;
  prefix: string; // 3-digit IATA airline prefix (e.g. "020" Lufthansa)
  serial: string; // 7-digit serial number
  checkDigit: number; // 1-digit check digit
  computedCheckDigit: number;
  formatted: string; // "PPP-NNNNNNNC"
  error?: string;
}

export interface IataParty {
  name: string;
  streetAddress: string;
  cityName: string;
  countryCode: string; // ISO 2-letter
  postalCode?: string;
  accountNumber?: string;
}

export interface IataFlightBooking {
  carrierCode: string; // 2-letter IATA (e.g. "LH")
  flightNumber: string; // e.g. "400"
  departureDate: string; // YYYY-MM-DD
  originAirport: string; // 3-letter IATA (e.g. "FRA")
  destinationAirport: string; // 3-letter IATA (e.g. "JFK")
}

export interface IataFwbPayload {
  awbNumber: string; // e.g. "020-12345675"
  originAirport: string; // 3-letter IATA
  destinationAirport: string; // 3-letter IATA
  piecesCount: number;
  grossWeightKg: number;
  volumeCbm?: number;
  chargeableWeightKg: number;
  natureOfGoods: string;
  shipper: IataParty;
  consignee: IataParty;
  flights: IataFlightBooking[];
  chargeCode?: "PP" | "CC"; // Prepaid / Collect
  currencyCode?: string; // default "EUR"
}

export interface IataHouseWaybillItem {
  hawbNumber: string;
  piecesCount: number;
  grossWeightKg: number;
  natureOfGoods: string;
  shipper: IataParty;
  consignee: IataParty;
}

export interface IataFhlPayload {
  masterAwbNumber: string;
  originAirport: string;
  destinationAirport: string;
  totalPiecesCount: number;
  totalGrossWeightKg: number;
  houses: IataHouseWaybillItem[];
}

export interface IataFsuPayload {
  awbNumber: string;
  originAirport: string;
  destinationAirport: string;
  milestoneCode: IataMilestoneCode;
  eventTimestamp: string; // ISO-8601
  piecesCount: number;
  grossWeightKg: number;
  flight?: IataFlightBooking;
  discrepancyCode?: string;
}

export interface ParsedIataMessage {
  messageType: "FWB" | "FHL" | "FSU" | "UNKNOWN";
  awbNumber: string;
  originAirport: string;
  destinationAirport: string;
  piecesCount: number;
  grossWeightKg: number;
  milestoneCode?: IataMilestoneCode;
  parsedAt: string;
}

// ============================================================================
// 2. MODULO-7 CHECK-DIGIT ENGINE (IATA RESOLUTION 600b)
// ============================================================================

/**
 * Calculates the IATA standard Modulo-7 check digit for a 7-digit air waybill serial number.
 * Algorithm: SerialNumber % 7
 */
export function calculateAwbCheckDigit(serial7Digits: string | number): number {
  const cleanSerial = String(serial7Digits).replace(/\D/g, "");
  if (cleanSerial.length !== 7) {
    throw new Error(
      `Invalid AWB serial length. Expected exactly 7 numeric digits, received: "${serial7Digits}"`,
    );
  }
  const numericVal = parseInt(cleanSerial, 10);
  return numericVal % 7;
}

/**
 * Validates any 11-digit AWB number formatted as PPP-NNNNNNNC, PPPNNNNNNNC, or PPP NNNNNNNC.
 * Validates format, 3-digit airline prefix, 7-digit serial, and the Modulo-7 check digit.
 */
export function validateIataAwbNumber(rawAwb: string): AwbValidationResult {
  if (!rawAwb || typeof rawAwb !== "string") {
    return {
      isValid: false,
      prefix: "",
      serial: "",
      checkDigit: -1,
      computedCheckDigit: -1,
      formatted: "",
      error: "AWB number must be a non-empty string.",
    };
  }

  const clean = rawAwb.replace(/[\s-]/g, "");

  if (!/^\d{11}$/.test(clean)) {
    return {
      isValid: false,
      prefix: clean.slice(0, 3),
      serial: clean.slice(3, 10),
      checkDigit: clean.length === 11 ? parseInt(clean[10], 10) : -1,
      computedCheckDigit: -1,
      formatted: rawAwb,
      error: `AWB must contain exactly 11 digits (3 prefix + 7 serial + 1 check digit). Received length: ${clean.length}`,
    };
  }

  const prefix = clean.slice(0, 3);
  const serial = clean.slice(3, 10);
  const checkDigit = parseInt(clean[10], 10);
  const computedCheckDigit = parseInt(serial, 10) % 7;
  const formatted = `${prefix}-${serial}${checkDigit}`;

  if (checkDigit !== computedCheckDigit) {
    return {
      isValid: false,
      prefix,
      serial,
      checkDigit,
      computedCheckDigit,
      formatted,
      error: `Modulo-7 check-digit mismatch. Serial ${serial} % 7 is ${computedCheckDigit}, but provided check digit was ${checkDigit}.`,
    };
  }

  return {
    isValid: true,
    prefix,
    serial,
    checkDigit,
    computedCheckDigit,
    formatted,
  };
}

// ============================================================================
// 3. XML SANITIZATION & BUILDERS
// ============================================================================

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderPartyXml(tagName: string, party: IataParty): string {
  return `    <${tagName}>
      <Name>${escapeXml(party.name)}</Name>
      <StreetAddress>${escapeXml(party.streetAddress)}</StreetAddress>
      <CityName>${escapeXml(party.cityName)}</CityName>
      <CountryCode>${escapeXml(party.countryCode.toUpperCase())}</CountryCode>${
        party.postalCode
          ? `\n      <PostalCode>${escapeXml(party.postalCode)}</PostalCode>`
          : ""
      }${
        party.accountNumber
          ? `\n      <AccountNumber>${escapeXml(party.accountNumber)}</AccountNumber>`
          : ""
      }
    </${tagName}>`;
}

/**
 * Synthesizes an official IATA Cargo-XML FWB (e-AWB Master Air Waybill) document.
 */
export function synthesizeFwbXml(payload: IataFwbPayload): string {
  const validation = validateIataAwbNumber(payload.awbNumber);
  if (!validation.isValid) {
    throw new Error(`Cannot synthesize FWB: ${validation.error}`);
  }

  const flightsXml = payload.flights
    .map(
      (f) => `    <FlightBooking>
      <CarrierCode>${escapeXml(f.carrierCode.toUpperCase())}</CarrierCode>
      <FlightNumber>${escapeXml(f.flightNumber)}</FlightNumber>
      <DepartureDate>${escapeXml(f.departureDate)}</DepartureDate>
      <OriginAirport>${escapeXml(f.originAirport.toUpperCase())}</OriginAirport>
      <DestinationAirport>${escapeXml(f.destinationAirport.toUpperCase())}</DestinationAirport>
    </FlightBooking>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<IataCargoXml MessageType="FWB" Version="3.0">
  <Header>
    <MessageReference>${validation.formatted}-${Date.now()}</MessageReference>
    <Timestamp>${new Date().toISOString()}</Timestamp>
  </Header>
  <MasterAirWaybill>
    <AwbNumber>${validation.formatted}</AwbNumber>
    <OriginAirport>${escapeXml(payload.originAirport.toUpperCase())}</OriginAirport>
    <DestinationAirport>${escapeXml(payload.destinationAirport.toUpperCase())}</DestinationAirport>
    <PiecesCount>${payload.piecesCount}</PiecesCount>
    <GrossWeightKg>${payload.grossWeightKg.toFixed(2)}</GrossWeightKg>
    <ChargeableWeightKg>${payload.chargeableWeightKg.toFixed(2)}</ChargeableWeightKg>${
      payload.volumeCbm !== undefined
        ? `\n    <VolumeCbm>${payload.volumeCbm.toFixed(3)}</VolumeCbm>`
        : ""
    }
    <NatureOfGoods>${escapeXml(payload.natureOfGoods)}</NatureOfGoods>
    <ChargeCode>${payload.chargeCode || "PP"}</ChargeCode>
    <CurrencyCode>${escapeXml(payload.currencyCode || "EUR")}</CurrencyCode>
${renderPartyXml("Shipper", payload.shipper)}
${renderPartyXml("Consignee", payload.consignee)}
  </MasterAirWaybill>
  <RoutingLegs>
${flightsXml}
  </RoutingLegs>
</IataCargoXml>`;
}

/**
 * Synthesizes an official IATA Cargo-XML FHL (House Waybill Consolidation Manifest) document.
 */
export function synthesizeFhlXml(payload: IataFhlPayload): string {
  const validation = validateIataAwbNumber(payload.masterAwbNumber);
  if (!validation.isValid) {
    throw new Error(`Cannot synthesize FHL: ${validation.error}`);
  }

  const housesXml = payload.houses
    .map(
      (h) => `    <HouseWaybill>
      <HawbNumber>${escapeXml(h.hawbNumber)}</HawbNumber>
      <PiecesCount>${h.piecesCount}</PiecesCount>
      <GrossWeightKg>${h.grossWeightKg.toFixed(2)}</GrossWeightKg>
      <NatureOfGoods>${escapeXml(h.natureOfGoods)}</NatureOfGoods>
${renderPartyXml("Shipper", h.shipper)}
${renderPartyXml("Consignee", h.consignee)}
    </HouseWaybill>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<IataCargoXml MessageType="FHL" Version="3.0">
  <Header>
    <MessageReference>${validation.formatted}-FHL-${Date.now()}</MessageReference>
    <Timestamp>${new Date().toISOString()}</Timestamp>
  </Header>
  <ConsolidationMaster>
    <MasterAwbNumber>${validation.formatted}</MasterAwbNumber>
    <OriginAirport>${escapeXml(payload.originAirport.toUpperCase())}</OriginAirport>
    <DestinationAirport>${escapeXml(payload.destinationAirport.toUpperCase())}</DestinationAirport>
    <TotalPiecesCount>${payload.totalPiecesCount}</TotalPiecesCount>
    <TotalGrossWeightKg>${payload.totalGrossWeightKg.toFixed(2)}</TotalGrossWeightKg>
  </ConsolidationMaster>
  <HouseWaybills>
${housesXml}
  </HouseWaybills>
</IataCargoXml>`;
}

/**
 * Synthesizes an official IATA Cargo-XML FSU (Freight Status Update) document.
 */
export function synthesizeFsuXml(payload: IataFsuPayload): string {
  const validation = validateIataAwbNumber(payload.awbNumber);
  if (!validation.isValid) {
    throw new Error(`Cannot synthesize FSU: ${validation.error}`);
  }

  const flightXml = payload.flight
    ? `\n    <FlightDetails>
      <CarrierCode>${escapeXml(payload.flight.carrierCode.toUpperCase())}</CarrierCode>
      <FlightNumber>${escapeXml(payload.flight.flightNumber)}</FlightNumber>
      <DepartureDate>${escapeXml(payload.flight.departureDate)}</DepartureDate>
    </FlightDetails>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<IataCargoXml MessageType="FSU" Version="3.0">
  <Header>
    <MessageReference>${validation.formatted}-FSU-${payload.milestoneCode}-${Date.now()}</MessageReference>
    <Timestamp>${new Date().toISOString()}</Timestamp>
  </Header>
  <StatusEvent>
    <AwbNumber>${validation.formatted}</AwbNumber>
    <OriginAirport>${escapeXml(payload.originAirport.toUpperCase())}</OriginAirport>
    <DestinationAirport>${escapeXml(payload.destinationAirport.toUpperCase())}</DestinationAirport>
    <MilestoneCode>${payload.milestoneCode}</MilestoneCode>
    <EventTimestamp>${payload.eventTimestamp}</EventTimestamp>
    <PiecesCount>${payload.piecesCount}</PiecesCount>
    <GrossWeightKg>${payload.grossWeightKg.toFixed(2)}</GrossWeightKg>${flightXml}${
      payload.discrepancyCode
        ? `\n    <DiscrepancyCode>${escapeXml(payload.discrepancyCode)}</DiscrepancyCode>`
        : ""
    }
  </StatusEvent>
</IataCargoXml>`;
}

// ============================================================================
// 4. PARSING ENGINE (XML PARSER)
// ============================================================================

function extractTagValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Parses an inbound IATA Cargo-XML string and extracts core dispatch fields.
 */
export function parseIataCargoXml(xmlString: string): ParsedIataMessage {
  if (!xmlString || typeof xmlString !== "string") {
    throw new Error("Invalid XML payload: must be a non-empty string.");
  }

  let messageType: "FWB" | "FHL" | "FSU" | "UNKNOWN" = "UNKNOWN";
  if (xmlString.includes('MessageType="FWB"')) messageType = "FWB";
  else if (xmlString.includes('MessageType="FHL"')) messageType = "FHL";
  else if (xmlString.includes('MessageType="FSU"')) messageType = "FSU";

  const rawAwb =
    extractTagValue(xmlString, "AwbNumber") ||
    extractTagValue(xmlString, "MasterAwbNumber") ||
    "";
  const validation = validateIataAwbNumber(rawAwb);

  const originAirport = extractTagValue(xmlString, "OriginAirport") || "";
  const destinationAirport =
    extractTagValue(xmlString, "DestinationAirport") || "";
  const piecesCount =
    parseInt(
      extractTagValue(xmlString, "PiecesCount") ||
        extractTagValue(xmlString, "TotalPiecesCount") ||
        "0",
      10,
    ) || 0;
  const grossWeightKg =
    parseFloat(
      extractTagValue(xmlString, "GrossWeightKg") ||
        extractTagValue(xmlString, "TotalGrossWeightKg") ||
        "0.0",
    ) || 0.0;
  const milestoneCode = extractTagValue(
    xmlString,
    "MilestoneCode",
  ) as IataMilestoneCode | null;

  return {
    messageType,
    awbNumber: validation.isValid ? validation.formatted : rawAwb,
    originAirport,
    destinationAirport,
    piecesCount,
    grossWeightKg,
    milestoneCode: milestoneCode || undefined,
    parsedAt: new Date().toISOString(),
  };
}
