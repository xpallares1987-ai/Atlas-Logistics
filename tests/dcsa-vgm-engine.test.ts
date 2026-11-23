/**
 * @file dcsa-vgm-engine.test.ts
 * @description Unit tests for DCSA v3.0 & SOLAS VGM Calculation Engine.
 * Tests ISO 6346 Modulus-11 check-digit verification, Method 1/2 VGM calculations,
 * EDIFACT VERMAS synthesis, DCSA JSON formatting, and acknowledgment parsing.
 * @module @atlas/tests/dcsa-vgm-engine
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { describe, it, expect } from "vitest";
import {
  validateIso6346,
  calculateVgmWeight,
  synthesizeEdifactVermas,
  synthesizeDcsaJsonVgm,
  parseVermasAck,
  type VermasDeclarationInput,
} from "../src/scm/engines/dcsa-vgm.engine.js";

describe("DCSA & SOLAS VGM Engine - ISO 6346 Validation", () => {
  it("validates legitimate ISO 6346 container numbers with correct check digit", () => {
    // Canonical valid container numbers
    const valid1 = validateIso6346("CSQU3054383");
    expect(valid1.isValid).toBe(true);
    expect(valid1.ownerCode).toBe("CSQ");
    expect(valid1.categoryIdentifier).toBe("U");
    expect(valid1.serialNumber).toBe("305438");
    expect(valid1.checkDigit).toBe(3);

    const valid2 = validateIso6346("MSKU9284710");
    expect(valid2.isValid).toBe(true);
    expect(valid2.checkDigit).toBe(0);
  });

  it("rejects invalid container numbers with corrupt check digit or format", () => {
    const invalidCheckDigit = validateIso6346("CSQU3054385");
    expect(invalidCheckDigit.isValid).toBe(false);
    expect(invalidCheckDigit.calculatedCheckDigit).toBe(3);

    const invalidFormat = validateIso6346("INVALID-123");
    expect(invalidFormat.isValid).toBe(false);
  });

  it("handles spaces and hyphens gracefully during normalization", () => {
    const formatted = validateIso6346("CSQU-305438-3");
    expect(formatted.isValid).toBe(true);
    expect(formatted.formattedNumber).toBe("CSQU-305438-3");
  });
});

describe("DCSA & SOLAS VGM Engine - Weight Calculation & Verification", () => {
  it("calculates Method 1 VGM directly from certified scale gross weight", () => {
    const result = calculateVgmWeight("METHOD_1", {
      weighingMethod: "METHOD_1",
      tareWeightKg: 3800,
      scaleGrossWeightKg: 24500,
      maxPayloadKg: 28200,
    });

    expect(result.isValid).toBe(true);
    expect(result.verifiedGrossMassKg).toBe(24500);
    expect(result.withinPayloadCapacity).toBe(true);
    expect(result.validationErrors).toHaveLength(0);
  });

  it("calculates Method 2 VGM by summing tare, cargo, packaging, and dunnage", () => {
    const result = calculateVgmWeight("METHOD_2", {
      weighingMethod: "METHOD_2",
      tareWeightKg: 3800,
      cargoNetMassKg: 18500,
      packagingMassKg: 650,
      securingDunnageMassKg: 250,
      maxPayloadKg: 28200,
    });

    expect(result.isValid).toBe(true);
    expect(result.verifiedGrossMassKg).toBe(23200); // 3800 + 18500 + 650 + 250
    expect(result.withinPayloadCapacity).toBe(true);
  });

  it("flags violation when gross mass exceeds maximum certified payload limit", () => {
    const result = calculateVgmWeight("METHOD_1", {
      weighingMethod: "METHOD_1",
      tareWeightKg: 3800,
      scaleGrossWeightKg: 35000,
      maxPayloadKg: 26000, // Max allowed gross = 29800
    });

    expect(result.isValid).toBe(false);
    expect(result.withinPayloadCapacity).toBe(false);
    expect(result.validationErrors[0]).toContain(
      "exceeds container maximum certified gross rating",
    );
  });
});

describe("DCSA & SOLAS VGM Engine - EDIFACT VERMAS & DCSA JSON Synthesis", () => {
  const sampleDeclaration: VermasDeclarationInput = {
    declarationReference: "VGM-2026-ESVLC-0012",
    bookingReference: "BK-2026-67116",
    containerNumber: "MSKU9284712",
    isoSizeType: "42G1",
    verifiedGrossMassKg: 24500,
    weighingMethod: "METHOD_1",
    weighingDateTime: "2026-11-23T14:30:00.000Z",
    authorizedPersonName: "Carlos Mendez",
    weighingPartyName: "Valencia Terminal Weighing S.L.",
    certifiedScaleId: "SCALE-ESVLC-T1-04",
  };

  it("synthesizes compliant EDIFACT VERMAS D.16B message string", () => {
    const vermas = synthesizeEdifactVermas(sampleDeclaration);

    expect(vermas).toContain("UNH+1+VERMAS:D:16B:UN:SMDG20'");
    expect(vermas).toContain("BGM+VGM+VGM-2026-ESVLC-0012+9'");
    expect(vermas).toContain("RFF+BN:BK-2026-67116'");
    expect(vermas).toContain("EQD+CN+MSKU9284712+42G1'");
    expect(vermas).toContain("MEA+AAE+VGM+KGM:24500'");
    expect(vermas).toContain("FTX+ZZZ+++SM1:WEIGHED_CONTAINER'");
    expect(vermas).toContain("NAD+WPA+++Valencia Terminal Weighing S.L.'");
    expect(vermas).toContain("CTA+RP+:Carlos Mendez'");
    expect(vermas).toContain("RFF+SCA:SCALE-ESVLC-T1-04'");
    expect(vermas).toContain("UNT+");
    expect(vermas).toContain("UNZ+1+VGM-2026-ESVLC-0012'");
  });

  it("synthesizes standard DCSA v3.0 JSON VGM payload", () => {
    const dcsaJson = synthesizeDcsaJsonVgm(sampleDeclaration);

    expect(dcsaJson.bookingReference).toBe("BK-2026-67116");
    expect(dcsaJson.equipmentReference).toBe("MSKU9284712");
    expect(dcsaJson.verifiedGrossMass).toBe(24500);
    expect(dcsaJson.unit).toBe("KGM");
    expect(dcsaJson.weighingMethod).toBe("METHOD_1");
    expect(dcsaJson.authorizedPerson).toBe("Carlos Mendez");
    expect(dcsaJson.scaleId).toBe("SCALE-ESVLC-T1-04");
  });

  it("parses EDIFACT and JSON VERMAS acknowledgments", () => {
    const edifactAck = `UNB+UNOA:2+CARRIER+ATLAS+261123:1440+VGM-ACK-01'
UNH+1+APERAK:D:16B:UN'
BGM+VGM+VGM-2026-ESVLC-0012+9'
EQD+CN+MSKU9284712'
UNT+4+1'
UNZ+1+VGM-ACK-01'`;

    const parsedEdifact = parseVermasAck(edifactAck);
    expect(parsedEdifact.status).toBe("VGM_ACCEPTED");
    expect(parsedEdifact.reference).toBe("VGM-2026-ESVLC-0012");
    expect(parsedEdifact.containerNumber).toBe("MSKU9284712");

    const jsonAck = JSON.stringify({
      declarationReference: "VGM-2026-ESVLC-0012",
      status: "VGM_REJECTED",
      rejectionReason: "Container not gated in at terminal",
    });

    const parsedJson = parseVermasAck(jsonAck);
    expect(parsedJson.status).toBe("VGM_REJECTED");
    expect(parsedJson.rejectionReason).toBe(
      "Container not gated in at terminal",
    );
  });
});
