import { describe, it, expect } from "vitest";
import {
  digitalSignatureService,
  DigitalSignaturePayload,
} from "./digital-signature";

describe("WebCrypto Digital Signature Engine", () => {
  it("should generate a valid digital seal using SubtleCrypto SHA-256", async () => {
    const payload: DigitalSignaturePayload = {
      documentId: "PED-2026-SAT-004128",
      documentType: "PEDIMENTO",
      issuerId: "USR-ADUANA-99",
      issuerOrg: "Atlas Global Forwarding S.A.",
      content: {
        pedimento: "26 48 3001 6001234",
        aduana: "480",
        patente: "3001",
        regimen: "A1",
        fleteUSD: 4500,
      },
    };

    const result = await digitalSignatureService.signDocument(payload);

    expect(result.isValid).toBe(true);
    expect(result.documentId).toBe("PED-2026-SAT-004128");
    expect(result.documentType).toBe("PEDIMENTO");
    expect(result.digitalSealSha256).toHaveLength(64);
    expect(result.verificationMethod).toBe("WebCrypto API (SubtleCrypto Native)");
  });

  it("should verify a matching digital seal accurately", async () => {
    const payload: DigitalSignaturePayload = {
      documentId: "BL-MAERSK-2026-881",
      documentType: "BILL_OF_LADING",
      issuerId: "OFFICER-01",
      issuerOrg: "Maersk Line Logistics",
      content: "CARGO: 40ft HC CONTAINER WITH PHARMA REEFER",
      timestamp: 1791160000000,
    };

    const signature = await digitalSignatureService.signDocument(payload);
    const isValid = await digitalSignatureService.verifyDocumentSignature(payload, signature);

    expect(isValid).toBe(true);
  });

  it("should detect tampering if the document content is modified", async () => {
    const originalPayload: DigitalSignaturePayload = {
      documentId: "ECMR-EU-9921",
      documentType: "E_CMR",
      issuerId: "CARRIER-DE-01",
      issuerOrg: "DHL Freight Express",
      content: "32 PALLETS OF CHEMICALS - TOTAL WEIGHT: 18,500 KG",
      timestamp: 1791160000000,
    };

    const signature = await digitalSignatureService.signDocument(originalPayload);

    // Tampered payload with altered cargo weight
    const tamperedPayload: DigitalSignaturePayload = {
      ...originalPayload,
      content: "32 PALLETS OF CHEMICALS - TOTAL WEIGHT: 22,000 KG",
    };

    const isValid = await digitalSignatureService.verifyDocumentSignature(tamperedPayload, signature);
    expect(isValid).toBe(false);
  });
});
