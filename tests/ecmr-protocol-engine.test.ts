/**
 * @file ecmr-protocol-engine.test.ts
 * @description Unit tests for UNECE Geneva e-CMR Protocol engine, eIDAS signature chain validation, and Roadside Inspection QR tokens.
 */

import { describe, it, expect } from "vitest";
import {
  computeDeterministicDigest,
  calculateTotalGrossWeight,
  checkHasAdrClassification,
  validateSignatureChain,
  generateRoadsideInspectionToken,
  type EcmrConsignmentNote,
  type EidasSignature,
  type EcmrGoodsItem,
} from "../src/scm/engines/ecmr-protocol.engine.js";

describe("UNECE Geneva e-CMR Deterministic Engine", () => {
  const sampleGoods: EcmrGoodsItem[] = [
    {
      itemNumber: 1,
      numberOfPackages: 4,
      packageType: "PALLET",
      description: "Automotive engine parts",
      grossWeightKg: 1250.5,
      isAdrDangerousGoods: false,
    },
    {
      itemNumber: 2,
      numberOfPackages: 2,
      packageType: "IBC",
      description: "Ethanol solution in drums",
      grossWeightKg: 850.0,
      isAdrDangerousGoods: true,
      adrUnNumber: "UN1170",
      adrClass: "3",
    },
  ];

  it("calculates total gross weight accurately across multiple line items", () => {
    const total = calculateTotalGrossWeight(sampleGoods);
    expect(total).toBe(2100.5);
  });

  it("detects ADR dangerous goods classification correctly", () => {
    expect(checkHasAdrClassification(sampleGoods)).toBe(true);
    expect(checkHasAdrClassification([sampleGoods[0]])).toBe(false);
  });

  it("generates 64-character deterministic digests without external dependencies", () => {
    const d1 = computeDeterministicDigest("CMR-2026-TEST-001");
    const d2 = computeDeterministicDigest("CMR-2026-TEST-001");
    const d3 = computeDeterministicDigest("CMR-2026-TEST-002");

    expect(d1).toHaveLength(64);
    expect(d1).toBe(d2);
    expect(d1).not.toBe(d3);
  });
});

describe("eIDAS Electronic Signature Chain Validation", () => {
  it("validates a complete and sequential 3-party eIDAS signature chain", () => {
    const signatures: EidasSignature[] = [
      {
        role: "CONSIGNOR",
        signatoryName: "Hans Gruber",
        certificateThumbprint: "THUMB_CONSIGNOR_01",
        signedAt: "2026-11-23T08:00:00Z",
        signatureDigestSha256: "SIG_DIGEST_01",
      },
      {
        role: "CARRIER",
        signatoryName: "Jan de Vries",
        certificateThumbprint: "THUMB_CARRIER_02",
        signedAt: "2026-11-23T09:30:00Z",
        signatureDigestSha256: "SIG_DIGEST_02",
      },
      {
        role: "CONSIGNEE",
        signatoryName: "Marie Dubois",
        certificateThumbprint: "THUMB_CONSIGNEE_03",
        signedAt: "2026-11-24T14:15:00Z",
        signatureDigestSha256: "SIG_DIGEST_03",
      },
    ];

    const result = validateSignatureChain(signatures);
    expect(result.isValid).toBe(true);
    expect(result.validChain).toBe(true);
    expect(result.signaturesVerified).toBe(3);
    expect(result.missingRoles).toHaveLength(0);
  });

  it("detects when intermediate signatures are still pending (in-transit status)", () => {
    const partialSignatures: EidasSignature[] = [
      {
        role: "CONSIGNOR",
        signatoryName: "Hans Gruber",
        certificateThumbprint: "THUMB_CONSIGNOR_01",
        signedAt: "2026-11-23T08:00:00Z",
        signatureDigestSha256: "SIG_DIGEST_01",
      },
      {
        role: "CARRIER",
        signatoryName: "Jan de Vries",
        certificateThumbprint: "THUMB_CARRIER_02",
        signedAt: "2026-11-23T09:30:00Z",
        signatureDigestSha256: "SIG_DIGEST_02",
      },
    ];

    const result = validateSignatureChain(partialSignatures);
    expect(result.isValid).toBe(true);
    expect(result.signaturesVerified).toBe(2);
    expect(result.missingRoles).toContain("CONSIGNEE");
  });

  it("rejects signatures with out-of-order timestamps", () => {
    const invalidSignatures: EidasSignature[] = [
      {
        role: "CONSIGNOR",
        signatoryName: "Hans Gruber",
        certificateThumbprint: "THUMB_CONSIGNOR_01",
        signedAt: "2026-11-23T12:00:00Z",
        signatureDigestSha256: "SIG_DIGEST_01",
      },
      {
        role: "CARRIER",
        signatoryName: "Jan de Vries",
        certificateThumbprint: "THUMB_CARRIER_02",
        signedAt: "2026-11-23T08:00:00Z", // signed in the past!
        signatureDigestSha256: "SIG_DIGEST_02",
      },
    ];

    const result = validateSignatureChain(invalidSignatures);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/out of sequential order/);
  });
});

describe("Roadside Inspection QR Token Generation (UNECE Art. 5)", () => {
  const sampleNote: EcmrConsignmentNote = {
    consignmentNumber: "CMR-2026-ES-000412",
    issuedAt: "2026-11-23T08:30:00Z",
    placeOfTakingOver: {
      city: "Barcelona",
      countryCode: "ES",
      date: "2026-11-23",
    },
    placeOfDelivery: {
      city: "Lyon",
      countryCode: "FR",
    },
    consignor: {
      name: "SEAT Componentes SA",
      taxId: "ESA08004455",
      streetAddress: "Autovia A-2 Km 585",
      cityName: "Martorell",
      countryCode: "ES",
      postalCode: "08760",
    },
    carrier: {
      name: "Trans-Iberica Logistics SL",
      taxId: "ESB66778899",
      streetAddress: "Poligono Industrial Prat",
      cityName: "El Prat de Llobregat",
      countryCode: "ES",
      postalCode: "08820",
    },
    consignee: {
      name: "Renault SAS",
      taxId: "FR12345678901",
      streetAddress: "13-15 Quai Le Gallo",
      cityName: "Boulogne-Billancourt",
      countryCode: "FR",
      postalCode: "92100",
    },
    vehicles: {
      tractorPlate: "9876-LMN",
      trailerPlate: "R-1234-XYZ",
      carrierLicenseNumber: "EU-TRANS-2026-0988",
      driverFullName: "Carlos Gomez Perez",
      driverIdDocument: "47889900K",
    },
    goods: [
      {
        itemNumber: 1,
        numberOfPackages: 6,
        packageType: "PALLET",
        description: "Gearbox assemblies",
        grossWeightKg: 2450.0,
        isAdrDangerousGoods: false,
      },
    ],
    signatures: [
      {
        role: "CONSIGNOR",
        signatoryName: "Juan Martinez",
        certificateThumbprint: "CERT_SEAT_01",
        signedAt: "2026-11-23T08:30:00Z",
        signatureDigestSha256: "DIGEST_CONSIGNOR",
      },
      {
        role: "CARRIER",
        signatoryName: "Carlos Gomez Perez",
        certificateThumbprint: "CERT_DRIVER_02",
        signedAt: "2026-11-23T09:00:00Z",
        signatureDigestSha256: "DIGEST_CARRIER",
      },
    ],
    status: "ACCEPTED_BY_CARRIER",
  };

  it("generates structured roadside token with 16-character integrity digest", () => {
    const token = generateRoadsideInspectionToken(sampleNote);

    expect(token.version).toBe("1.0");
    expect(token.cmrNumber).toBe("CMR-2026-ES-000412");
    expect(token.status).toBe("ACCEPTED_BY_CARRIER");
    expect(token.consignor).toBe("SEAT Componentes SA");
    expect(token.vehicle).toBe("9876-LMN / R-1234-XYZ");
    expect(token.totalWeightKg).toBe(2450.0);
    expect(token.isAdr).toBe(false);
    expect(token.integrityDigest).toHaveLength(16);
    expect(token.verificationUrl).toContain("CMR-2026-ES-000412");
    expect(token.verificationUrl).toContain(`chk=${token.integrityDigest}`);
  });
});
