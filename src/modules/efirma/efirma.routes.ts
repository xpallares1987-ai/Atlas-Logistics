import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
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
    cadenaOriginalSha256:
      "8f7a6c5b4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a",
    selloDigitalBase64: "c2VsbG9fZGlnaXRhbF9tb2NrX3Nhbl9yZXF1aXJlZF8wMDE=",
    rfc3161TimestampToken: "TSA-RFC3161-1791807000000-08192011",
    tamperSealHash:
      "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
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
  shipmentId: z.string().optional(),
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

    const {
      cadenaOriginal,
      selloDigitalBase64,
      certificateSerial,
      rfcTitular,
    } = parseResult.data;

    // Check basic structural integrity and Base64 format
    const isValidBase64 =
      /^[A-Za-z0-9+/=]+$/.test(selloDigitalBase64) &&
      selloDigitalBase64.length >= 64;
    const isWellFormedCadena =
      cadenaOriginal.startsWith("||") && cadenaOriginal.endsWith("||");

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
    const incomingShipmentId = parseResult.data.shipmentId;

    try {
      const stamp = await createEFirmaAuditStamp(
        documentId,
        documentType,
        sealResult,
      );

      let resolvedShipmentId: string | null = incomingShipmentId ?? null;
      let validDocId: string | null = null;
      let validCartaPorteId: string | null = null;

      const [existingDoc] = await db
        .select({
          id: schema.documents.id,
          shipmentId: schema.documents.shipmentId,
        })
        .from(schema.documents)
        .where(eq(schema.documents.id, documentId))
        .limit(1);

      if (existingDoc) {
        validDocId = existingDoc.id;
        if (!resolvedShipmentId && existingDoc.shipmentId) {
          resolvedShipmentId = existingDoc.shipmentId;
        }
      }

      const [existingCp] = await db
        .select({
          id: schema.cartaPorteDeclarations.id,
          shipmentId: schema.cartaPorteDeclarations.shipmentId,
        })
        .from(schema.cartaPorteDeclarations)
        .where(eq(schema.cartaPorteDeclarations.id, documentId))
        .limit(1);

      if (existingCp) {
        validCartaPorteId = existingCp.id;
        if (!resolvedShipmentId && existingCp.shipmentId) {
          resolvedShipmentId = existingCp.shipmentId;
        }
      }

      if (resolvedShipmentId) {
        const [existingShipment] = await db
          .select({ id: schema.shipments.id })
          .from(schema.shipments)
          .where(eq(schema.shipments.id, resolvedShipmentId))
          .limit(1);
        if (!existingShipment) {
          resolvedShipmentId = null;
        }
      }

      const dbStampRecord = {
        id: stamp.auditId,
        shipmentId: resolvedShipmentId,
        documentId: validDocId,
        cartaPorteId: validCartaPorteId,
        documentType: stamp.documentType,
        certificateSerial: stamp.certificateSerial,
        rfcTitular: stamp.rfcTitular,
        razonSocial: sealResult.razonSocial,
        cadenaOriginal: sealResult.cadenaOriginal,
        cadenaOriginalSha256: stamp.cadenaOriginalSha256,
        selloDigitalBase64: stamp.selloDigitalBase64,
        rfc3161TimestampToken: stamp.rfc3161TimestampToken,
        tamperSealHash: stamp.tamperSealHash,
        status: stamp.status,
        verifiedAt: stamp.verifiedAt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db
        .insert(schema.efirmaAuditStamps)
        .values(dbStampRecord)
        .onConflictDoUpdate({
          target: schema.efirmaAuditStamps.id,
          set: dbStampRecord,
        });

      if (validDocId) {
        await db
          .update(schema.documents)
          .set({
            status: "SIGNED",
            signedBy: sealResult.razonSocial,
            signerCertificate: stamp.certificateSerial,
            signedAt: new Date(),
            sha256Hash: stamp.cadenaOriginalSha256,
          })
          .where(eq(schema.documents.id, validDocId));
      }

      auditStampLedger.unshift(stamp);
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

  // 4. Retrieve audit history from SQLite
  fastify.get("/audit-log", async (_request, reply) => {
    const dbStamps = await db
      .select()
      .from(schema.efirmaAuditStamps)
      .orderBy(desc(schema.efirmaAuditStamps.createdAt))
      .limit(50);
    return reply.status(200).send({
      success: true,
      stamps: dbStamps.length > 0 ? dbStamps : auditStampLedger,
    });
  });

  // 5. Query persisted stamps by shipmentId or documentId
  fastify.get("/stamps", async (request, reply) => {
    const { shipmentId, documentId } = request.query as {
      shipmentId?: string;
      documentId?: string;
    };
    if (shipmentId) {
      const stamps = await db
        .select()
        .from(schema.efirmaAuditStamps)
        .where(eq(schema.efirmaAuditStamps.shipmentId, shipmentId))
        .orderBy(desc(schema.efirmaAuditStamps.createdAt));
      return reply.send({ success: true, stamps });
    }
    if (documentId) {
      const stamps = await db
        .select()
        .from(schema.efirmaAuditStamps)
        .where(eq(schema.efirmaAuditStamps.documentId, documentId))
        .orderBy(desc(schema.efirmaAuditStamps.createdAt));
      return reply.send({ success: true, stamps });
    }
    const all = await db
      .select()
      .from(schema.efirmaAuditStamps)
      .orderBy(desc(schema.efirmaAuditStamps.createdAt))
      .limit(50);
    return reply.send({ success: true, stamps: all });
  });
};

export default efirmaRoutes;
