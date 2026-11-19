/**
 * @file carrier-integration.ts
 * @description Standardized carrier EDI (ANSI X12 301), DCSA Ocean Booking v2.0, IMO check digit validation, and M365 Adaptive Card alerting.
 * @module @atlas/shared/logistics/carrier-integration
 * @see {@link docs/adr/0027-carrier-integrations-ocean-schedules-ebl-lifecycle.md}
 */

// ============================================================================
// 1. IMO 7-DIGIT CHECK DIGIT VALIDATION
// ============================================================================

/**
 * Validates an International Maritime Organization (IMO) ship identification number.
 * Standard format: "IMO" followed by 7 decimal digits, or simply 7 decimal digits.
 * Checksum algorithm:
 * Sum of first 6 digits multiplied by weights (7, 6, 5, 4, 3, 2) mod 10 must equal the 7th digit.
 */
export function validateImoNumber(imoInput: string): {
  valid: boolean;
  cleanImo?: string;
  reason?: string;
} {
  if (!imoInput || typeof imoInput !== "string") {
    return { valid: false, reason: "IMO number must be a non-empty string" };
  }

  const clean = imoInput
    .trim()
    .toUpperCase()
    .replace(/^IMO\s*/, "");

  if (!/^\d{7}$/.test(clean)) {
    return {
      valid: false,
      reason: `IMO number must be exactly 7 digits (received: '${imoInput}')`,
    };
  }

  const digits = clean.split("").map((d) => parseInt(d, 10));
  const weights = [7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 6; i++) {
    sum += digits[i] * weights[i];
  }

  const calculatedCheckDigit = sum % 10;
  const providedCheckDigit = digits[6];

  if (calculatedCheckDigit !== providedCheckDigit) {
    return {
      valid: false,
      cleanImo: clean,
      reason: `IMO checksum mismatch: calculated ${calculatedCheckDigit}, but found ${providedCheckDigit}`,
    };
  }

  return { valid: true, cleanImo: clean };
}

// ============================================================================
// 2. DCSA OCEAN BOOKING V2.0 DATA CONTRACTS
// ============================================================================

export interface DcsaOceanBookingPayload {
  receiptTypeAtOrigin: "CY" | "SD" | "CFS";
  deliveryTypeAtDestination: "CY" | "SD" | "CFS";
  cargoMovementTypeAtOrigin: "FCL" | "LCL";
  cargoMovementTypeAtDestination: "FCL" | "LCL";
  serviceContractReference: string;
  carrierExportVoyageNumber: string;
  vesselIMONumber: string;
  vesselName: string;
  carrierServiceCode?: string;
  declaredValue?: number;
  declaredValueCurrency?: string;
  paymentTermCode: "PRE" | "COL";
  invoicePayableAtLocode?: string;
  isPartialLoadAllowed: boolean;
  isExportDeclarationRequired: boolean;
  isImportLicenseRequired: boolean;
  placeOfBLIssueLocode?: string;
  commodities: Array<{
    commodityType: string;
    cargoGrossWeightKg: number;
    cargoGrossVolumeCbm?: number;
    hsCode?: string;
    isDangerousCargo: boolean;
  }>;
  requestedEquipments: Array<{
    isoEquipmentCode: string; // e.g. '22G1', '42G1', '45G1'
    units: number;
    tareWeightKg?: number;
  }>;
  carrierParties: Array<{
    partyRole: "CARRIER" | "SHIPPER" | "CONSIGNEE" | "BOOKING_AGENT";
    identifyingCodes?: Array<{
      codeListProvider: "SCAC" | "EORI" | "DUNS";
      code: string;
    }>;
    partyName: string;
    city: string;
    countryCode: string;
  }>;
}

export function buildDcsaOceanBookingPayload(input: {
  bookingReference: string;
  contractReference: string;
  vesselImo: string;
  vesselName: string;
  voyageNumber: string;
  carrierServiceCode?: string;
  shipperName: string;
  shipperCity?: string;
  shipperCountry?: string;
  consigneeName: string;
  consigneeCity?: string;
  consigneeCountry?: string;
  carrierName: string;
  carrierScac?: string;
  originLocode: string;
  destinationLocode: string;
  containerIsoType?: string;
  containerQuantity?: number;
  grossWeightKg: number;
  volumeCbm?: number;
  paymentTerm?: "PREPAID" | "COLLECT";
}): DcsaOceanBookingPayload {
  const imoResult = validateImoNumber(input.vesselImo);
  if (!imoResult.valid) {
    throw new Error(`Invalid vessel IMO for DCSA booking: ${imoResult.reason}`);
  }

  return {
    receiptTypeAtOrigin: "CY",
    deliveryTypeAtDestination: "CY",
    cargoMovementTypeAtOrigin: "FCL",
    cargoMovementTypeAtDestination: "FCL",
    serviceContractReference: input.contractReference,
    carrierExportVoyageNumber: input.voyageNumber,
    vesselIMONumber: imoResult.cleanImo!,
    vesselName: input.vesselName,
    carrierServiceCode: input.carrierServiceCode,
    paymentTermCode: input.paymentTerm === "COLLECT" ? "COL" : "PRE",
    invoicePayableAtLocode: input.originLocode,
    isPartialLoadAllowed: false,
    isExportDeclarationRequired: false,
    isImportLicenseRequired: false,
    placeOfBLIssueLocode: input.originLocode,
    commodities: [
      {
        commodityType: "FAK (Freight All Kinds)",
        cargoGrossWeightKg: input.grossWeightKg,
        cargoGrossVolumeCbm: input.volumeCbm,
        isDangerousCargo: false,
      },
    ],
    requestedEquipments: [
      {
        isoEquipmentCode: input.containerIsoType || "42G1",
        units: input.containerQuantity || 1,
      },
    ],
    carrierParties: [
      {
        partyRole: "CARRIER",
        identifyingCodes: input.carrierScac
          ? [{ codeListProvider: "SCAC", code: input.carrierScac }]
          : undefined,
        partyName: input.carrierName,
        city: "Rotterdam",
        countryCode: "NL",
      },
      {
        partyRole: "SHIPPER",
        partyName: input.shipperName,
        city: input.shipperCity || "Valencia",
        countryCode: input.shipperCountry || "ES",
      },
      {
        partyRole: "CONSIGNEE",
        partyName: input.consigneeName,
        city: input.consigneeCity || "Shanghai",
        countryCode: input.consigneeCountry || "CN",
      },
    ],
  };
}

// ============================================================================
// 3. ANSI X12 EDI 301 BOOKING REQUEST BUILDER & EDI 997 ACKNOWLEDGMENT
// ============================================================================

export interface Edi301BookingParams {
  transactionControlNumber: string;
  bookingNumber: string;
  contractNumber: string;
  scac: string;
  vesselName: string;
  voyageNumber: string;
  originUnlocode: string;
  destinationUnlocode: string;
  shipperName: string;
  consigneeName: string;
  grossWeightKg: number;
  equipmentInitial?: string;
  equipmentNumber?: string;
}

/**
 * Builds a standardized ANSI X12 EDI 301 (Confirmation/Booking Request) payload.
 * Segment delimiter: ~
 * Element delimiter: *
 */
export function buildEdi301Payload(params: Edi301BookingParams): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
  const timeStr = new Date().toISOString().slice(11, 16).replace(/:/g, ""); // HHMM
  const ctrlNum = params.transactionControlNumber.padStart(4, "0").slice(-4);

  const segments: string[] = [
    `ISA*00*          *00*          *ZZ*ATLASERP       *02*${params.scac.padEnd(15, " ")}*${dateStr}*${timeStr}*U*00401*${ctrlNum}00001*0*P*>~`,
    `GS*RO*ATLASERP*${params.scac}*${new Date().toISOString().slice(0, 10).replace(/-/g, "")}*${timeStr}*1*X*004010~`,
    `ST*301*${ctrlNum}~`,
    `B1*${params.scac}*${params.bookingNumber}*${dateStr}*A~`, // B1: Booking ID & Action Code 'A' (Add)
    `Y3*${params.contractNumber}*${dateStr}~`, // Y3: Contract reference
    `N1*SH*${params.shipperName}~`, // Shipper
    `N1*CN*${params.consigneeName}~`, // Consignee
    `N1*CA*${params.scac}~`, // Carrier
    `R4*R*UN*${params.originUnlocode}***${dateStr}~`, // Receipt Port
    `R4*D*UN*${params.destinationUnlocode}~`, // Discharge Port
    `W09*${params.voyageNumber}*${params.vesselName}~`, // Voyage & Vessel
    `LX*1~`,
    `L0*1*${params.grossWeightKg}*K***${params.grossWeightKg}*K~`,
    `L5*1*FAK-GENERAL CARGO~`,
  ];

  if (params.equipmentInitial && params.equipmentNumber) {
    segments.push(`MS*${params.equipmentInitial}*${params.equipmentNumber}~`);
  }

  // Count segments ST to SE inclusive
  const stIndex = 2; // ST is index 2
  const segmentCount = segments.length - stIndex + 1;
  segments.push(`SE*${segmentCount}*${ctrlNum}~`);
  segments.push(`GE*1*1~`);
  segments.push(`IEA*1*${ctrlNum}00001~`);

  return segments.join("\n");
}

/**
 * Parses an incoming EDI 997 Functional Acknowledgment to confirm message receipt.
 */
export function parseEdi997Acknowledgment(ediContent: string): {
  isAcknowledged: boolean;
  functionalGroupCode?: string;
  transactionSetControlNumber?: string;
  status: "ACCEPTED" | "REJECTED" | "ACCEPTED_WITH_ERRORS";
  rawSyntaxErrors: string[];
} {
  const lines = ediContent
    .split("~")
    .map((s) => s.trim())
    .filter(Boolean);
  let status: "ACCEPTED" | "REJECTED" | "ACCEPTED_WITH_ERRORS" = "REJECTED";
  let functionalGroupCode: string | undefined;
  let transactionSetControlNumber: string | undefined;
  const rawSyntaxErrors: string[] = [];

  for (const line of lines) {
    const elements = line.split("*");
    const tag = elements[0];

    if (tag === "AK1") {
      functionalGroupCode = elements[1];
    } else if (tag === "AK2") {
      transactionSetControlNumber = elements[2];
    } else if (tag === "AK3" || tag === "AK4") {
      rawSyntaxErrors.push(line);
    } else if (tag === "AK5") {
      const code = elements[1];
      if (code === "A") status = "ACCEPTED";
      else if (code === "E") status = "ACCEPTED_WITH_ERRORS";
      else status = "REJECTED";
    }
  }

  return {
    isAcknowledged: status === "ACCEPTED" || status === "ACCEPTED_WITH_ERRORS",
    functionalGroupCode,
    transactionSetControlNumber,
    status,
    rawSyntaxErrors,
  };
}

// ============================================================================
// 4. MICROSOFT 365 ADAPTIVE CARD V1.5 BUILDER (DEAD-LETTER QUEUE ALERTING)
// ============================================================================

export interface DeadLetterAlertParams {
  bookingReference: string;
  carrierName: string;
  errorMessage: string;
  attemptCount: number;
  timestamp: Date;
  outboxEventId: string;
  supportRunbookUrl?: string;
}

/**
 * Generates an actionable Microsoft 365 Adaptive Card v1.5 JSON payload
 * for dead-letter carrier booking failures (per atlas-notification-engine).
 */
export function buildM365DeadLetterAdaptiveCard(
  params: DeadLetterAlertParams,
): {
  type: string;
  $schema: string;
  version: string;
  body: any[];
  actions: any[];
} {
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      {
        type: "Container",
        style: "attention",
        items: [
          {
            type: "TextBlock",
            text: "🚨 CARRIER B2B DISPATCH CRITICAL FAILURE",
            weight: "Bolder",
            size: "Medium",
            color: "Attention",
          },
          {
            type: "TextBlock",
            text: `Electronic booking dispatch to carrier ${params.carrierName} has entered Dead-Letter Queue after ${params.attemptCount} failed attempts.`,
            wrap: true,
            spacing: "Small",
          },
        ],
      },
      {
        type: "FactSet",
        facts: [
          { title: "Booking Ref:", value: params.bookingReference },
          { title: "Carrier:", value: params.carrierName },
          { title: "Event ID:", value: params.outboxEventId },
          { title: "Attempts:", value: String(params.attemptCount) },
          { title: "Failed At:", value: params.timestamp.toISOString() },
        ],
      },
      {
        type: "Container",
        style: "warning",
        items: [
          {
            type: "TextBlock",
            text: `Rejection Root Cause:`,
            weight: "Bolder",
          },
          {
            type: "TextBlock",
            text: params.errorMessage,
            wrap: true,
            fontType: "Monospace",
            size: "Small",
          },
        ],
      },
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: "View DLQ Runbook",
        url:
          params.supportRunbookUrl ||
          "https://github.com/xpallares1987-ai/Atlas-Logistics/tree/main/docs/runbooks",
      },
      {
        type: "Action.Submit",
        title: "Re-queue Outbox Message",
        data: {
          action: "RETRY_OUTBOX_EVENT",
          eventId: params.outboxEventId,
          bookingReference: params.bookingReference,
        },
      },
    ],
  };
}
