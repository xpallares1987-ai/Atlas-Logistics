/**
 * @file documents.routes.ts
 * @description Operational route handlers for document vault, digital signing, template emission, and binary PDF streaming.
 * @module @atlas/routes/documents
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync, FastifyRequest } from "fastify";
import {
  PDFService,
  HBLData,
  BookingConfirmationData,
} from "../services/pdf.service.js";
import {
  DocumentSignerService,
  OfficialDocumentType,
} from "../services/documents/index.js";
import { storageService } from "../services/storage/storage.service.js";
import { db } from "../db/index.js";
import { shipments, locations, documents } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
  openApiObject,
} from "./openapi.schemas.js";

const DOCUMENTS_TAG = ["Documents & Digital Signing"] as const;

// ============================================================================
// SCHEMAS & TYPE DEFINITIONS
// ============================================================================

const generateDocSchema = z.object({
  type: z.enum([
    "HBL",
    "DUA",
    "ECMR",
    "AWB",
    "CIM",
    "INSURANCE_CERT",
    "CONTRACT",
    "GDP_CERT",
    "CBAM_DECLARATION",
    "DGR_DECLARATION",
    "AEO_7POINT",
    "LAYTIME_SHEET",
  ]),
  documentReference: z.string().optional(),
  shipmentId: z.string().optional(),
  payloadData: z.record(z.string(), z.unknown()),
  signer: z
    .object({
      signedBy: z.string().min(1),
      signerTitle: z.string().min(1),
      signerCertificate: z.string().optional(),
    })
    .optional(),
});

const signDocSchema = z.object({
  signedBy: z.string().min(1, "Signer name required"),
  signerTitle: z.string().min(1, "Signer title required"),
  signerCertificate: z.string().optional(),
});

const presignedUploadSchema = z.object({
  name: z.string().min(1, "Filename is required"),
  type: z.string().default("ATTACHMENT"),
  mimeType: z.string().min(1, "MIME type is required"),
  shipmentId: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
});

const confirmUploadSchema = z.object({
  fileSize: z.number().int().positive().optional(),
  sha256Hash: z.string().optional(),
});

interface MultipartPart {
  type: string;
  fieldname: string;
  filename?: string;
  value?: unknown;
  toBuffer?: () => Promise<Buffer>;
}

function sanitizeHeaderFilename(name: string): string {
  const base = path.basename(name || "document");
  return base.replace(/[^a-zA-Z0-9._-]/g, "_") || "document";
}

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

export const documentsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * List all documents in the vault with optional filters
   */
  fastify.get(
    "/",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary:
          "List vault documents with optional type, status, and shipment filters",
        querystring: openApiObject({
          type: { type: "string" },
          status: { type: "string" },
          shipmentId: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as {
          type?: string;
          status?: string;
          shipmentId?: string;
        };
        const docs = await DocumentSignerService.listDocuments(
          query.type,
          query.status,
          query.shipmentId,
        );
        return reply.send(docs);
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to list documents" });
      }
    },
  );

  /**
   * Catalog of 12 document templates with default schemas
   */
  fastify.get(
    "/templates",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary: "List catalog of 12 official multimodal document templates",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      const templates = DocumentSignerService.getDocumentTemplates();
      return reply.send({ success: true, data: templates });
    },
  );

  /**
   * Generate an official multimodal document, compute SHA-256 hash, and store in vault
   */
  fastify.post(
    "/generate",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary:
          "Emit an official multimodal document, hash with SHA-256, and store in vault",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = generateDocSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Invalid document generation payload",
            details: parsed.error.issues,
          });
        }

        const result = await DocumentSignerService.emitDocument({
          type: parsed.data.type as OfficialDocumentType,
          documentReference: parsed.data.documentReference,
          shipmentId: parsed.data.shipmentId,
          payloadData: parsed.data.payloadData,
          signer: parsed.data.signer,
          userId: request.user?.id,
        });

        return reply.status(201).send({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        fastify.log.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate document";
        return reply.status(500).send({ error: message });
      }
    },
  );

  /**
   * Stream/download official binary PDF
   */
  fastify.get(
    "/:id/pdf",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary: "Stream official binary PDF for a stored vault document",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const pdfBuffer = await DocumentSignerService.getDocumentPdf(id);

        reply.header("Content-Type", "application/pdf");
        reply.header("Content-Disposition", `inline; filename="${id}.pdf"`);
        return reply.send(pdfBuffer);
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.status(404).send({ error: "Document PDF not found" });
      }
    },
  );

  /**
   * Apply cryptographic digital signature to an existing document
   */
  fastify.post(
    "/:id/sign",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary: "Apply a cryptographic digital signature to a stored document",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const parsed = signDocSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Invalid signature payload",
            details: parsed.error.issues,
          });
        }

        const signed = await DocumentSignerService.signDocument(id, {
          signedBy: parsed.data.signedBy,
          signerTitle: parsed.data.signerTitle,
          signerCertificate: parsed.data.signerCertificate,
        });

        return reply.send({
          success: true,
          data: signed,
        });
      } catch (error: unknown) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : "Failed to sign document";
        return reply.status(404).send({ error: message });
      }
    },
  );

  /**
   * Public verification of document authenticity by SHA-256 hash or reference
   */
  fastify.get(
    "/verify/:hash",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary:
          "Verify document authenticity by SHA-256 digest or document reference",
        params: buildParamSchema(
          "hash",
          "SHA-256 document hash or reference code.",
        ),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { hash } = request.params as { hash: string };
        const verification =
          await DocumentSignerService.verifyAuthenticity(hash);
        return reply.send(verification);
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to verify document" });
      }
    },
  );

  /**
   * Legacy routes for backwards compatibility
   */
  fastify.get(
    "/hbl/:shipmentId",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary:
          "Generate and download a legacy House Bill of Lading (HBL) PDF",
        params: buildParamSchema("shipmentId", "Target shipment identifier."),
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const shipmentRes = await db
          .select({
            id: shipments.id,
            origin: locations.name,
            destination: locations.name,
          })
          .from(shipments)
          .leftJoin(locations, eq(shipments.portOfEntryId, locations.id))
          .where(eq(shipments.id, shipmentId))
          .limit(1);

        if (shipmentRes.length === 0) {
          return reply.code(404).send({ error: "Shipment not found" });
        }

        const s = shipmentRes[0];
        const data: HBLData = {
          shipmentId: s.id,
          shipper: "Global Exports Inc.",
          consignee: "Atlas Client",
          portOfLoading: s.origin || "Valencia Port",
          portOfDischarge: s.destination || "New York Harbor",
          vessel: "MSC Demo",
          voyage: "001A",
          containers: [],
          commodities: [
            {
              description: "General Cargo",
              pieces: 10,
              grossWeightKg: 5000,
              volumeCbm: 15,
            },
          ],
        };

        const pdfBuffer = await PDFService.generateHBL(data);

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename=HBL-${data.shipmentId}.pdf`,
        );
        return reply.send(pdfBuffer);
      } catch (error: unknown) {
        fastify.log.error({ err: error }, "PDF Generation Error");
        return reply.code(500).send({ error: "Failed to generate PDF" });
      }
    },
  );

  fastify.post(
    "/booking-confirmation",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary: "Generate and stream a Booking Confirmation PDF document",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as BookingConfirmationData;
        if (!data || !data.referenceNumber) {
          return reply
            .code(400)
            .send({ error: "Missing required booking data" });
        }

        const pdfBuffer = await PDFService.generateBookingConfirmation(data);

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename=Booking-${data.referenceNumber}.pdf`,
        );
        return reply.send(pdfBuffer);
      } catch (error: unknown) {
        fastify.log.error({ err: error }, "PDF Generation Error");
        return reply.code(500).send({ error: "Failed to generate PDF" });
      }
    },
  );

  fastify.route({
    method: "POST",
    url: "/upload",
    schema: {
      tags: [...DOCUMENTS_TAG],
      summary: "Upload a binary document file via multipart/form-data",
      response: {
        200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        ...buildErrorResponses([400, 401, 403, 500]),
      },
    },
    handler: async (request: FastifyRequest, reply) => {
      try {
        let originalFilename = "";
        let fileBuffer: Buffer | null = null;
        const bodyFields: Record<string, string> = {};

        // Mode 1: @fastify/multipart with attachFieldsToBody: true populates request.body
        const rawBody = request.body as Record<string, unknown> | undefined;
        if (
          rawBody &&
          typeof rawBody === "object" &&
          !Array.isArray(rawBody) &&
          Object.keys(rawBody).length > 0
        ) {
          for (const [key, rawVal] of Object.entries(rawBody)) {
            const candidate = Array.isArray(rawVal) ? rawVal[0] : rawVal;
            if (candidate && typeof candidate === "object") {
              const partObj = candidate as MultipartPart;
              if (
                typeof partObj.toBuffer === "function" &&
                typeof partObj.filename === "string" &&
                !fileBuffer
              ) {
                originalFilename = partObj.filename;
                fileBuffer = await partObj.toBuffer();
              } else if (partObj.value !== undefined) {
                bodyFields[key] = String(partObj.value);
              }
            } else if (
              typeof candidate === "string" ||
              typeof candidate === "number"
            ) {
              bodyFields[key] = String(candidate);
            }
          }
        } else {
          // Mode 2: Streaming multipart via request.parts()
          const reqWithParts = request as FastifyRequest & {
            parts?: () => AsyncIterable<MultipartPart>;
          };
          if (typeof reqWithParts.parts === "function") {
            for await (const part of reqWithParts.parts()) {
              if (part.type === "file" && part.filename && part.toBuffer) {
                if (!fileBuffer) {
                  originalFilename = part.filename;
                  fileBuffer = await part.toBuffer();
                } else {
                  await part.toBuffer();
                }
              } else if (part.fieldname && part.value !== undefined) {
                bodyFields[part.fieldname] = String(part.value);
              }
            }
          }
        }

        if (!fileBuffer || !originalFilename) {
          return reply.code(400).send({ error: "No file provided" });
        }

        const cleanBaseName = sanitizeHeaderFilename(originalFilename);
        const uploadDir = path.resolve(process.cwd(), "uploads");
        await fs.promises.mkdir(uploadDir, { recursive: true });
        const safeFilename = `${crypto.randomUUID()}-${cleanBaseName}`;
        const filePath = path.resolve(uploadDir, safeFilename);
        if (!filePath.startsWith(uploadDir + path.sep)) {
          return reply.code(400).send({ error: "Invalid upload filename" });
        }
        await fs.promises.writeFile(filePath, fileBuffer);

        const requestedShipmentId = (bodyFields.shipmentId || "").trim();
        let resolvedShipmentId = "";
        if (requestedShipmentId && requestedShipmentId !== "sh_general") {
          const found = await db
            .select({ id: shipments.id })
            .from(shipments)
            .where(eq(shipments.id, requestedShipmentId))
            .limit(1);
          if (found.length === 0) {
            return reply.code(400).send({
              error: `Shipment '${requestedShipmentId}' does not exist`,
            });
          }
          resolvedShipmentId = found[0].id;
        } else {
          const demoOrFirst = await db
            .select({ id: shipments.id })
            .from(shipments)
            .where(eq(shipments.id, "sh_demo_01"))
            .limit(1);
          if (demoOrFirst.length > 0) {
            resolvedShipmentId = demoOrFirst[0].id;
          } else {
            const anyShipment = await db
              .select({ id: shipments.id })
              .from(shipments)
              .limit(1);
            if (anyShipment.length === 0) {
              return reply.code(400).send({
                error: "No valid shipment exists to attach uploaded document",
              });
            }
            resolvedShipmentId = anyShipment[0].id;
          }
        }

        const fileUrl = `/api/documents/download/${safeFilename}`;
        const docType = bodyFields.type || "Commercial Invoice";

        const docId = crypto.randomUUID();
        const sha256 = crypto
          .createHash("sha256")
          .update(fileBuffer)
          .digest("hex");

        await db.insert(documents).values({
          id: docId,
          shipmentId: resolvedShipmentId,
          name: cleanBaseName,
          type: docType,
          url: fileUrl,
          sha256Hash: sha256,
          fileSize: fileBuffer.length,
          status: "EMITTED",
        });

        return reply.send({
          success: true,
          id: docId,
          shipmentId: resolvedShipmentId,
          type: docType,
          url: fileUrl,
          name: cleanBaseName,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  });

  fastify.get(
    "/download/:filename",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary: "Download an uploaded document artifact by sanitized filename",
        params: buildParamSchema("filename", "Stored upload filename."),
        response: {
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { filename } = request.params as { filename: string };
        const baseFilename = path.basename(filename);
        if (
          !filename ||
          baseFilename !== filename ||
          filename.includes("/") ||
          filename.includes("\\") ||
          filename.includes("..") ||
          filename.includes("\0")
        ) {
          return reply.code(400).send({ error: "Invalid filename" });
        }

        const uploadsRoot = path.resolve(process.cwd(), "uploads");
        const filePath = path.resolve(uploadsRoot, baseFilename);
        if (!filePath.startsWith(uploadsRoot + path.sep)) {
          return reply.code(400).send({ error: "Invalid filename" });
        }

        if (!fs.existsSync(filePath)) {
          return reply.code(404).send({ error: "File not found" });
        }

        const fileBuffer = await fs.promises.readFile(filePath);
        const safeHeaderName = sanitizeHeaderFilename(baseFilename);
        reply.header(
          "Content-Disposition",
          `inline; filename="${safeHeaderName}"`,
        );
        const ext = path.extname(baseFilename).toLowerCase();
        const mimeTypes: Record<string, string> = {
          ".pdf": "application/pdf",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
        };
        reply.header(
          "Content-Type",
          mimeTypes[ext] || "application/octet-stream",
        );
        return reply.send(fileBuffer);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // ============================================================================
  // PRESIGNED S3 OBJECT STORAGE (MinIO / AWS S3)
  // ============================================================================

  fastify.post(
    "/presigned-upload",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary:
          "Request a presigned PUT URL for direct client-to-storage upload",
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parseRes = presignedUploadSchema.safeParse(request.body);
        if (!parseRes.success) {
          return reply.code(400).send({
            error: "Validation error",
            details: parseRes.error.flatten().fieldErrors,
          });
        }

        const { name, type, mimeType, shipmentId, fileSize } = parseRes.data;
        const docId = `doc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        const sanitizedBaseName = path
          .basename(name)
          .replace(/[^a-zA-Z0-9._-]/g, "_");
        const s3Key = `documents/${type}/${docId}-${sanitizedBaseName}`;

        const uploadUrl = await storageService.getPresignedUploadUrl(
          s3Key,
          mimeType,
          900, // 15 minutes
        );

        // Insert pending document entry in SQLite WAL ledger
        await db.insert(documents).values({
          id: docId,
          name: sanitizedBaseName,
          type,
          shipmentId: shipmentId || null,
          url: s3Key,
          fileSize: fileSize || null,
          status: "PENDING",
        });

        return reply.code(201).send({
          success: true,
          documentId: docId,
          uploadUrl,
          key: s3Key,
          expiresIn: 900,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post(
    "/:id/confirm",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary: "Confirm direct client upload and mark document AVAILABLE",
        params: buildParamSchema("id", "Target document UUID."),
        response: {
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const bodyParse = confirmUploadSchema.safeParse(request.body || {});

        const [doc] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, id))
          .limit(1);

        if (!doc) {
          return reply.code(404).send({ error: "Document not found" });
        }

        let verifiedSize = bodyParse.success
          ? bodyParse.data.fileSize
          : undefined;
        try {
          const head = await storageService.headObject(doc.url);
          if (head.ContentLength) {
            verifiedSize = head.ContentLength;
          }
        } catch {
          // If storage inspection fails in dev/offline, proceed with provided metadata
        }

        const sha256 = bodyParse.success
          ? bodyParse.data.sha256Hash
          : undefined;

        await db
          .update(documents)
          .set({
            status: "AVAILABLE",
            fileSize: verifiedSize || doc.fileSize,
            sha256Hash: sha256 || doc.sha256Hash,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, id));

        return reply.send({
          success: true,
          status: "AVAILABLE",
          documentId: id,
          key: doc.url,
          fileSize: verifiedSize || doc.fileSize,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.get(
    "/:id/download-url",
    {
      schema: {
        tags: [...DOCUMENTS_TAG],
        summary: "Get a temporary presigned GET URL for secure download",
        params: buildParamSchema("id", "Target document UUID."),
        response: {
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const [doc] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, id))
          .limit(1);

        if (!doc) {
          return reply.code(404).send({ error: "Document not found" });
        }

        const downloadUrl = await storageService.getPresignedDownloadUrl(
          doc.url,
          900, // 15 minutes
        );

        return reply.send({
          success: true,
          documentId: id,
          downloadUrl,
          expiresIn: 900,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );
};

export default documentsRoutes;
