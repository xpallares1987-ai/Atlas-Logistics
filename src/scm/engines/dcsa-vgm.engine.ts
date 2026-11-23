/**
 * @file dcsa-vgm.engine.ts
 * @description Pure domain calculation engine for DCSA v3.0 Container Lifecycles and SOLAS Verified Gross Mass (VGM).
 * Implements ISO 6346 Modulus-11 container check-digit validation, SOLAS Method 1/2 calculations,
 * deterministic EDIFACT VERMAS (D.16B) synthesis, and DCSA v3.0 JSON payload transformations.
 * @module @atlas/scm/engines/dcsa-vgm
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

// ============================================================================
// 1. DOMAIN ENUMS & DATA CONTRACTS
// ============================================================================

export type VgmWeighingMethod = "METHOD_1" | "METHOD_2";

export interface Iso6346ValidationResult {
  isValid: boolean;
  ownerCode?: string;
  categoryIdentifier?: string;
  serialNumber?: string;
  checkDigit?: number;
  calculatedCheckDigit?: number;
  formattedNumber?: string;
}

export interface VgmCalculationInput {
  weighingMethod: VgmWeighingMethod;
  tareWeightKg: number;
  // Method 1 parameters
  scaleGrossWeightKg?: number;
  scaleAccuracyTolerancePercent?: number;
  // Method 2 parameters
  cargoNetMassKg?: number;
  packagingMassKg?: number;
  securingDunnageMassKg?: number;
  maxPayloadKg?: number;
}

export interface VgmCalculationResult {
  isValid: boolean;
  verifiedGrossMassKg: number;
  weighingMethod: VgmWeighingMethod;
  withinPayloadCapacity: boolean;
  calculatedWeightBreakdown?: {
    tareWeightKg: number;
    cargoNetMassKg: number;
    packagingMassKg: number;
    securingDunnageMassKg: number;
  };
  validationErrors: string[];
}

export interface VermasDeclarationInput {
  declarationReference: string;
  bookingReference: string;
  containerNumber: string;
  isoSizeType?: string; // e.g. 42G1 or 40HC
  verifiedGrossMassKg: number;
  weighingMethod: VgmWeighingMethod;
  weighingDateTime: string; // ISO 8601 string
  authorizedPersonName: string;
  weighingPartyName: string;
  certifiedScaleId?: string;
  solasApprovalNumber?: string;
}

export interface VermasAckResult {
  reference?: string;
  containerNumber?: string;
  status: "VGM_ACCEPTED" | "VGM_REJECTED";
  rejectionReason?: string;
  acknowledgedAt: string;
}

// ============================================================================
// 2. ISO 6346 MODULUS-11 CHECK DIGIT ENGINE
// ============================================================================

const ISO_LETTER_VALUES: Record<string, number> = {
  A: 10,
  B: 12,
  C: 13,
  D: 14,
  E: 15,
  F: 16,
  G: 17,
  H: 18,
  I: 19,
  J: 20,
  K: 21,
  L: 23,
  M: 24,
  N: 25,
  O: 26,
  P: 27,
  Q: 28,
  R: 29,
  S: 30,
  T: 31,
  U: 32,
  V: 34,
  W: 35,
  X: 36,
  Y: 37,
  Z: 38,
};

/**
 * Validates a shipping container number according to standard ISO 6346 Modulus-11.
 * Standard format: 4 letters (Owner Code 3 + Category 1) + 6 digits (Serial) + 1 digit (Check Digit).
 */
export function validateIso6346(
  containerNumber: string,
): Iso6346ValidationResult {
  const cleaned = containerNumber.replace(/[\s-]/g, "").toUpperCase();

  if (!/^[A-Z]{4}\d{7}$/.test(cleaned)) {
    return { isValid: false };
  }

  const ownerCode = cleaned.slice(0, 3);
  const categoryIdentifier = cleaned.slice(3, 4);
  const serialNumber = cleaned.slice(4, 10);
  const checkDigit = parseInt(cleaned.slice(10, 11), 10);

  // Compute Modulus-11 checksum
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = cleaned[i];
    const val = /[A-Z]/.test(char)
      ? ISO_LETTER_VALUES[char]
      : parseInt(char, 10);
    sum += val * Math.pow(2, i);
  }

  const remainder = sum % 11;
  const calculatedCheckDigit = remainder === 10 ? 0 : remainder;
  const isValid = checkDigit === calculatedCheckDigit;

  return {
    isValid,
    ownerCode,
    categoryIdentifier,
    serialNumber,
    checkDigit,
    calculatedCheckDigit,
    formattedNumber: `${ownerCode}${categoryIdentifier}-${serialNumber}-${checkDigit}`,
  };
}

// ============================================================================
// 3. SOLAS VGM CALCULATION & VERIFICATION
// ============================================================================

/**
 * Calculates and validates Verified Gross Mass according to SOLAS Chapter VI Regulation 2.
 */
export function calculateVgmWeight(
  method: VgmWeighingMethod,
  input: VgmCalculationInput,
): VgmCalculationResult {
  const errors: string[] = [];
  let verifiedGrossMassKg = 0;

  if (input.tareWeightKg <= 0) {
    errors.push("Container tare weight must be greater than zero.");
  }

  if (method === "METHOD_1") {
    if (!input.scaleGrossWeightKg || input.scaleGrossWeightKg <= 0) {
      errors.push(
        "Method 1 requires a certified scale gross weight greater than zero.",
      );
    } else if (input.scaleGrossWeightKg < input.tareWeightKg) {
      errors.push(
        "Scale gross weight cannot be less than container tare weight.",
      );
    } else {
      verifiedGrossMassKg = Math.round(input.scaleGrossWeightKg);
    }
  } else {
    // METHOD_2: Tare + Cargo + Packaging + Dunnage
    const cargo = input.cargoNetMassKg ?? 0;
    const packaging = input.packagingMassKg ?? 0;
    const dunnage = input.securingDunnageMassKg ?? 0;

    if (cargo <= 0) {
      errors.push("Method 2 requires cargo net mass greater than zero.");
    }

    verifiedGrossMassKg = Math.round(
      input.tareWeightKg + cargo + packaging + dunnage,
    );
  }

  const maxPayload = input.maxPayloadKg ?? 28000;
  const maxGrossAllowed = input.tareWeightKg + maxPayload;
  const withinPayloadCapacity = verifiedGrossMassKg <= maxGrossAllowed;

  if (!withinPayloadCapacity) {
    errors.push(
      `Verified Gross Mass (${verifiedGrossMassKg} kg) exceeds container maximum certified gross rating (${maxGrossAllowed} kg).`,
    );
  }

  return {
    isValid: errors.length === 0,
    verifiedGrossMassKg,
    weighingMethod: method,
    withinPayloadCapacity,
    calculatedWeightBreakdown: {
      tareWeightKg: input.tareWeightKg,
      cargoNetMassKg: input.cargoNetMassKg ?? 0,
      packagingMassKg: input.packagingMassKg ?? 0,
      securingDunnageMassKg: input.securingDunnageMassKg ?? 0,
    },
    validationErrors: errors,
  };
}

// ============================================================================
// 4. EDIFACT VERMAS (D.16B) SYNTHESIS
// ============================================================================

/**
 * Generates an EDIFACT VERMAS D.16B message string according to SMDG guidelines.
 */
export function synthesizeEdifactVermas(input: VermasDeclarationInput): string {
  const dateFormatted = input.weighingDateTime
    .replace(/[-:T]/g, "")
    .slice(0, 12);
  const nowFormatted = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 12);

  const segments = [
    `UNB+UNOA:2+ATLAS-LOGISTICS+CARRIER+${nowFormatted.slice(0, 8)}:${nowFormatted.slice(8, 12)}+${input.declarationReference}'`,
    `UNH+1+VERMAS:D:16B:UN:SMDG20'`,
    `BGM+VGM+${input.declarationReference}+9'`,
    `DTM+137:${dateFormatted}:203'`,
    `RFF+BN:${input.bookingReference}'`,
    `EQD+CN+${input.containerNumber}+${input.isoSizeType ?? "42G1"}'`,
    `MEA+AAE+VGM+KGM:${input.verifiedGrossMassKg}'`,
    `FTX+ZZZ+++${input.weighingMethod === "METHOD_1" ? "SM1:WEIGHED_CONTAINER" : "SM2:CALCULATED_MASS"}'`,
    `NAD+WPA+++${input.weighingPartyName}'`,
    `CTA+RP+:${input.authorizedPersonName}'`,
  ];

  if (input.certifiedScaleId) {
    segments.push(`RFF+SCA:${input.certifiedScaleId}'`);
  }

  segments.push(`UNT+${segments.length}+1'`);
  segments.push(`UNZ+1+${input.declarationReference}'`);

  return segments.join("\n");
}

// ============================================================================
// 5. DCSA v3.0 JSON VGM PAYLOAD SYNTHESIS
// ============================================================================

/**
 * Formats standard DCSA v3.0 Verified Gross Mass JSON declaration payload.
 */
export function synthesizeDcsaJsonVgm(
  input: VermasDeclarationInput,
): Record<string, unknown> {
  return {
    documentParty: {
      partyName: input.weighingPartyName,
      identifyingCodes: [],
    },
    bookingReference: input.bookingReference,
    equipmentReference: input.containerNumber,
    verifiedGrossMass: input.verifiedGrossMassKg,
    unit: "KGM",
    weighingMethod: input.weighingMethod,
    weighingDateTime: input.weighingDateTime,
    authorizedPerson: input.authorizedPersonName,
    scaleId: input.certifiedScaleId ?? null,
    approvalNumber: input.solasApprovalNumber ?? null,
    transportDocumentReference: null,
  };
}

// ============================================================================
// 6. INBOUND VERMAS ACKNOWLEDGMENT PARSER
// ============================================================================

/**
 * Parses inbound carrier VERMAS acknowledgments (EDIFACT APERAK/CONTRL or JSON response).
 */
export function parseVermasAck(rawPayload: string): VermasAckResult {
  const acknowledgedAt = new Date().toISOString();

  if (rawPayload.trim().startsWith("{")) {
    try {
      const json = JSON.parse(rawPayload);
      const statusRaw = String(
        json.status || json.responseStatus || "",
      ).toUpperCase();
      const status: "VGM_ACCEPTED" | "VGM_REJECTED" =
        statusRaw.includes("REJECT") || statusRaw.includes("ERROR")
          ? "VGM_REJECTED"
          : "VGM_ACCEPTED";

      return {
        reference: json.declarationReference || json.reference,
        containerNumber: json.containerNumber || json.equipmentReference,
        status,
        rejectionReason: json.rejectionReason || json.errorMessage,
        acknowledgedAt,
      };
    } catch {
      // Fall through to EDIFACT parsing
    }
  }

  // Parse EDIFACT response
  const isAccepted = !rawPayload.includes("REJ") && !rawPayload.includes("ERR");
  const refMatch = rawPayload.match(/BGM\+[^+]+\+([A-Za-z0-9_-]+)/);
  const eqdMatch = rawPayload.match(/EQD\+CN\+([A-Za-z0-9_-]+)/);
  const ftxMatch = rawPayload.match(
    /FTX\+[A-Za-z0-9_-]+\+\+\+([A-Za-z0-9_\s.-]+)'/,
  );

  return {
    reference: refMatch ? refMatch[1] : undefined,
    containerNumber: eqdMatch ? eqdMatch[1] : undefined,
    status: isAccepted ? "VGM_ACCEPTED" : "VGM_REJECTED",
    rejectionReason: !isAccepted && ftxMatch ? ftxMatch[1].trim() : undefined,
    acknowledgedAt,
  };
}
