import { FastifyPluginAsync } from "fastify";
import {
  PDFService,
  HBLData,
  BookingConfirmationData,
} from "../services/pdf.service.js";
import {
  DocumentSignerService,
  OfficialDocumentType,
} from "../services/documents/index.js";
import { db } from "../db/index.js";
import { shipments, locations, documents } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";

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
  payloadData: z.record(z.string(), z.any()),
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

export const documentsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * List all documents in the vault with optional filters
   */
  fastify.get("/", async (request, reply) => {
    try {
      const query = request.query as { type?: string; status?: string };
      const docs = await DocumentSignerService.listDocuments(
        query.type,
        query.status,
      );
      return reply.send(docs);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to list documents" });
    }
  });

  /**
   * Catalog of 12 document templates with default schemas
   */
  fastify.get("/templates", async (_request, reply) => {
    const templates = DocumentSignerService.getDocumentTemplates();
    return reply.send({ success: true, data: templates });
  });

  /**
   * Generate an official multimodal document, compute SHA-256 hash, and store in vault
   */
  fastify.post("/generate", async (request, reply) => {
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
        userId: (request as any).user?.id,
      });

      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || "Failed to generate document" });
    }
  });

  /**
   * Stream/download official binary PDF
   */
  fastify.get("/:id/pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const pdfBuffer = await DocumentSignerService.getDocumentPdf(id);

      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `inline; filename="${id}.pdf"`);
      return reply.send(pdfBuffer);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(404).send({ error: "Document PDF not found" });
    }
  });

  /**
   * Apply cryptographic digital signature to an existing document
   */
  fastify.post("/:id/sign", async (request, reply) => {
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
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(404).send({ error: error.message || "Failed to sign document" });
    }
  });

  /**
   * Public verification of document authenticity by SHA-256 hash or reference
   */
  fastify.get("/verify/:hash", async (request, reply) => {
    try {
      const { hash } = request.params as { hash: string };
      const verification = await DocumentSignerService.verifyAuthenticity(hash);
      return reply.send(verification);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to verify document" });
    }
  });

  /**
   * Legacy routes for backwards compatibility
   */
  fastify.get("/hbl/:shipmentId", async (request, reply) => {
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
    } catch (error: any) {
      fastify.log.error("PDF Generation Error:", error);
      return reply.code(500).send({ error: "Failed to generate PDF" });
    }
  });

  fastify.post("/booking-confirmation", async (request, reply) => {
    try {
      const data = request.body as BookingConfirmationData;
      if (!data || !data.referenceNumber) {
        return reply.code(400).send({ error: "Missing required booking data" });
      }

      const pdfBuffer = await PDFService.generateBookingConfirmation(data);

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename=Booking-${data.referenceNumber}.pdf`,
      );
      return reply.send(pdfBuffer);
    } catch (error: any) {
      fastify.log.error("PDF Generation Error:", error);
      return reply.code(500).send({ error: "Failed to generate PDF" });
    }
  });

  fastify.route({
    method: "POST",
    url: "/upload",
    handler: async (request: any, reply) => {
      try {
        const parts = request.parts();
        let fileObj: any = null;
        const body: Record<string, any> = {};

        for await (const part of parts) {
          if (part.type === "file") {
            fileObj = part;
            break;
          } else {
            body[part.fieldname] = part.value;
          }
        }

        if (!fileObj) {
          return reply.code(400).send({ error: "No file provided" });
        }

        const fileBuffer = await fileObj.toBuffer();
        const uploadDir = path.join(process.cwd(), "uploads");
        await fs.promises.mkdir(uploadDir, { recursive: true });
        const safeFilename = `${crypto.randomUUID()}-${fileObj.filename}`;
        const filePath = path.join(uploadDir, safeFilename);
        await fs.promises.writeFile(filePath, fileBuffer);

        const fileUrl = `/api/documents/download/${safeFilename}`;
        const shipmentId =
          body.shipmentId?.value || body.shipmentId || "sh_general";
        const docType = body.type?.value || body.type || "Commercial Invoice";

        const docId = crypto.randomUUID();
        const sha256 = crypto
          .createHash("sha256")
          .update(fileBuffer)
          .digest("hex");

        await db.insert(documents).values({
          id: docId,
          shipmentId: shipmentId,
          name: fileObj.filename,
          type: docType,
          url: fileUrl,
          sha256Hash: sha256,
          fileSize: fileBuffer.length,
          status: "EMITTED",
        });

        return reply.send({ success: true, url: fileUrl, name: fileObj.filename });
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    },
  });

  fastify.get("/download/:filename", async (request, reply) => {
    try {
      const { filename } = request.params as { filename: string };
      if (
        filename.includes("/") ||
        filename.includes("\\") ||
        filename.includes("..")
      ) {
        return reply.code(400).send({ error: "Invalid filename" });
      }

      const uploadsRoot = path.resolve(process.cwd(), "uploads");
      const filePath = path.join(uploadsRoot, filename);

      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: "File not found" });
      }

      const fileBuffer = await fs.promises.readFile(filePath);
      reply.header("Content-Disposition", `inline; filename="${filename}"`);
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
      };
      reply.header("Content-Type", mimeTypes[ext] || "application/octet-stream");
      return reply.send(fileBuffer);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
};

export default documentsRoutes;
