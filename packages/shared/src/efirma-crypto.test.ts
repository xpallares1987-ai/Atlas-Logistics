import { describe, it, expect } from "vitest";
import {
  generateCanonicalCadenaOriginal,
  computeSha256Hex,
  generateSandboxRsaKeyPair,
  signCadenaOriginalWebCrypto,
  verifyDigitalSealWebCrypto,
  createEFirmaAuditStamp,
  extractCertificateMetadata,
  EFIRMA_DEMO_PRESETS,
  EFirmaSigningPayload,
} from "./efirma-crypto.js";

describe("EFirma Zero-Knowledge WebCrypto Engine Tests", () => {
  it("should generate a canonical SAT Cadena Original with standard delimiters", () => {
    const payload: EFirmaSigningPayload = {
      documentType: "PEDIMENTO_ADUANAL",
      documentId: "26-24-3019-1002931",
      rfcEmisor: "AAN940112XX1",
      rfcReceptor: "TEX840211XY9",
      declaredAmountUsd: 145000,
      customTimestamp: "2026-10-15T12:00:00Z",
      rawContent: {
        aduana: "240",
        patente: "3019",
        regimen: "A1",
      },
    };

    const cadena = generateCanonicalCadenaOriginal(payload);
    expect(cadena.startsWith("||4.0|PEDIMENTO_ADUANAL|26-24-3019-1002931|2026-10-15T12:00:00Z|AAN940112XX1|TEX840211XY9|145000.00|")).toBe(true);
    expect(cadena.endsWith("||")).toBe(true);
  });

  it("should compute valid SHA-256 hex digest using WebCrypto", async () => {
    const hash = await computeSha256Hex("SAT_CADENA_ORIGINAL_TEST");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("should generate sandbox RSA-2048 keypair with official SAT certificate metadata", async () => {
    const sandbox = await generateSandboxRsaKeyPair();
    expect(sandbox.publicKey).toBeDefined();
    expect(sandbox.privateKey).toBeDefined();
    expect(sandbox.publicKey.algorithm.name).toBe("RSASSA-PKCS1-v1_5");
    expect(sandbox.metadata.rfcTitular).toBe("AAN940112XX1");
    expect(sandbox.metadata.certificateSerial).toBe("30001000000508192011");
    expect(sandbox.metadata.isExpired).toBe(false);
  });

  it("should sign and verify Cadena Original with RSA-SHA256 (RSASSA-PKCS1-v1_5)", async () => {
    const sandbox = await generateSandboxRsaKeyPair();
    const payload: EFirmaSigningPayload = {
      documentType: "CARTA_PORTE",
      documentId: "EXP-2026-NLD-4401",
      rfcEmisor: "ATR991012AB1",
      rfcReceptor: "TEX840211XY9",
      declaredAmountMxn: 35840,
      rawContent: { idCCP: "CCC9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3" },
    };

    const cadenaOriginal = generateCanonicalCadenaOriginal(payload);
    const sealResult = await signCadenaOriginalWebCrypto(
      cadenaOriginal,
      sandbox.privateKey,
      sandbox.metadata
    );

    expect(sealResult.selloDigitalBase64).toBeDefined();
    expect(sealResult.selloDigitalBase64.length).toBeGreaterThan(100);
    expect(sealResult.algorithm).toBe("RSASSA-PKCS1-v1_5");
    expect(sealResult.hashAlgorithm).toBe("SHA-256");
    expect(sealResult.certificateSerial).toBe(sandbox.metadata.certificateSerial);

    // Verify valid signature
    const isValid = await verifyDigitalSealWebCrypto(
      cadenaOriginal,
      sealResult.selloDigitalBase64,
      sandbox.publicKey
    );
    expect(isValid).toBe(true);

    // Verify tamper detection (altered cadena original must fail)
    const tamperedCadena = cadenaOriginal.replace("35840.00", "99999.00");
    const isTamperedValid = await verifyDigitalSealWebCrypto(
      tamperedCadena,
      sealResult.selloDigitalBase64,
      sandbox.publicKey
    );
    expect(isTamperedValid).toBe(false);
  });

  it("should create an RFC 3161 compliant audit stamp token", async () => {
    const sandbox = await generateSandboxRsaKeyPair();
    const cadena = "||4.0|CUSTOMS_RELEASE|REL-001|2026-10-15T00:00:00Z|RFC1|RFC2|0.00|DATA||";
    const seal = await signCadenaOriginalWebCrypto(cadena, sandbox.privateKey, sandbox.metadata);

    const auditStamp = await createEFirmaAuditStamp("REL-001", "CUSTOMS_RELEASE", seal);
    expect(auditStamp.auditId).toContain("AUD-SAT-");
    expect(auditStamp.documentId).toBe("REL-001");
    expect(auditStamp.rfc3161TimestampToken).toContain("TSA-RFC3161-");
    expect(auditStamp.tamperSealHash).toHaveLength(64);
    expect(auditStamp.status).toBe("VALIDATED_AND_SEALED");
  });

  it("should extract certificate metadata from DER buffer or string input", () => {
    const meta = extractCertificateMetadata("mock_der_cert_content_test", "IMP200812KL1", "IMPORTADORA DEL PACIFICO S.A.");
    expect(meta.rfcTitular).toBe("IMP200812KL1");
    expect(meta.razonSocial).toBe("IMPORTADORA DEL PACIFICO S.A.");
    expect(meta.certificateSerial.startsWith("300010000005")).toBe(true);
    expect(meta.isExpired).toBe(false);
    expect(meta.issuer).toContain("SAT");
  });

  it("should successfully sign and verify all 4 official demo presets", async () => {
    const sandbox = await generateSandboxRsaKeyPair();
    const presets = Object.values(EFIRMA_DEMO_PRESETS);
    expect(presets).toHaveLength(4);

    for (const preset of presets) {
      const cadena = generateCanonicalCadenaOriginal(preset as EFirmaSigningPayload);
      const seal = await signCadenaOriginalWebCrypto(cadena, sandbox.privateKey, sandbox.metadata);
      expect(seal.selloDigitalBase64).toBeDefined();

      const valid = await verifyDigitalSealWebCrypto(cadena, seal.selloDigitalBase64, sandbox.publicKey);
      expect(valid).toBe(true);
    }
  });
});
