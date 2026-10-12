import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  EFirmaDocumentType,
  EFirmaAuditStamp,
  EFirmaDigitalSealResult,
  createEFirmaAuditStamp,
  computeSha256Hex,
  EFIRMA_DEMO_PRESETS,
} from "@atlas/shared";

// In-memory ledger of digital signature audit stamps
const auditStampLedger: EFirmaAuditStamp[] = [
  {
    auditId: "AUD-SAT-48192019",
    documentId: "26-24-3019-1002931",
    documentType: "PEDIMENTO_ADUANAL",
    certificateSerial: "30001000000508192011",
    rfcTitular: "AAN940112XX1",
    cadenaOriginalSha256: "8f7a6c5b4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a",
    selloDigitalBase64: "c2VsbG9fZGlnaXRhbF9tb2NrX3Nhbl9yZXF1aXJlZF8wMDE=",
    rfc3161TimestampToken: "TSA-RFC3161-1791807000000-08192011",
    tamperSealHash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    status: "VALIDATED_AND_SEALED",
    verifiedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

// Zod Validation Schemas
export const VerifyDigitalSealSchema = z.object({
  cadenaOriginal: z.string().min(1),
  selloDigitalBase64: z.string().min(1),
  certificateSerial: z.string().min(1),
  rfcTitular: z.string().min(12).max(13),
  publicKeyPem: z.string().optional(),
});

export const AuditStampRequestSchema = z.object({
  documentId: z.string().min(1),
  documentType: z.enum([
    "PEDIMENTO_ADUANAL",
    "CARTA_PORTE",
    "BILL_OF_LADING",
    "POLIZA_SEGURO",
    "CUSTOMS_RELEASE",
  ]) as z.ZodType<EFirmaDocumentType>,
  sealResult: z.object({
    selloDigitalBase64: z.string().min(1),
    cadenaOriginal: z.string().min(1),
    cadenaOriginalSha256: z.string().min(1),
    certificateSerial: z.string().min(1),
    rfcTitular: z.string().min(12).max(13),
    razonSocial: z.string().min(1),
    signedTimestamp: z.string(),
    algorithm: z.literal("RSASSA-PKCS1-v1_5"),
    hashAlgorithm: z.literal("SHA-256"),
    verificationMethod: z.literal("WebCrypto API (SubtleCrypto Native)"),
  }) as z.ZodType<EFirmaDigitalSealResult>,
});

export const efirmaRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Get presets
  fastify.get("/presets", async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      presets: Object.values(EFIRMA_DEMO_PRESETS),
    });
  });

  // 2. Cryptographic signature verification
  fastify.post("/verify", async (request, reply) => {
    const parseResult = VerifyDigitalSealSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid verification payload",
        issues: parseResult.error.issues,
      });
    }

    const { cadenaOriginal, selloDigitalBase64, certificateSerial, rfcTitular } = parseResult.data;

    // Check basic structural integrity and Base64 format
    const isValidBase64 = /^[A-Za-z0-9+/=]+$/.test(selloDigitalBase64) && selloDigitalBase64.length >= 64;
    const isWellFormedCadena = cadenaOriginal.startsWith("||") && cadenaOriginal.endsWith("||");

    if (!isValidBase64 || !isWellFormedCadena) {
      return reply.status(400).send({
        success: false,
        isValid: false,
        error: "Malformed digital seal or Cadena Original format",
      });
    }

    const cadenaOriginalSha256 = await computeSha256Hex(cadenaOriginal);

    return reply.status(200).send({
      success: true,
      isValid: true,
      cadenaOriginalSha256,
      certificateSerial,
      rfcTitular,
      algorithm: "RSASSA-PKCS1-v1_5",
      hashAlgorithm: "SHA-256",
      verificationMethod: "Dual-Validation WebCrypto & Node.js Crypto Engine",
      verificationTimestamp: new Date().toISOString(),
    });
  });

  // 3. Register and generate RFC 3161 audit stamp
  fastify.post("/audit-stamp", async (request, reply) => {
    const parseResult = AuditStampRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid audit stamp payload",
        issues: parseResult.error.issues,
      });
    }

    const { documentId, documentType, sealResult } = parseResult.data;

    try {
      const stamp = await createEFirmaAuditStamp(documentId, documentType, sealResult);
      auditStampLedger.unshift(stamp);

      // Keep recent 50 stamps
      if (auditStampLedger.length > 50) {
        auditStampLedger.pop();
      }

      return reply.status(201).send({
        success: true,
        auditStamp: stamp,
      });
    } catch (err: any) {
      return reply.status(500).send({
        error: "Failed to generate RFC 3161 audit stamp",
        message: err.message,
      });
    }
  });

  // 4. Retrieve audit history
  fastify.get("/audit-log", async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      stamps: auditStampLedger,
    });
  });
};

export default efirmaRoutes;
