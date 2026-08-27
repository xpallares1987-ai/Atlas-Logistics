import { FastifyPluginAsync } from "fastify";
import { PDFService, HBLData } from "../services/pdf.service.js";
import { db } from "../db/index.js";
import { shipments, locations, documents } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const documentsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/hbl/:shipmentId", async (request, reply) => {
    try {
      const { shipmentId } = request.params as { shipmentId: string };
      const shipmentRes = await db
        .select({
          id: shipments.id,
          origin: locations.name,
          destination: locations.name, // Mocked for simplicity
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
        portOfLoading: s.origin || "Unknown",
        portOfDischarge: s.destination || "Unknown",
        vessel: "MSC Demo",
        voyage: "001A",
        containers: [],
        commodities: [{ description: "General Cargo", pieces: 10, grossWeightKg: 5000, volumeCbm: 15 }],
      };

      const pdfBuffer = await PDFService.generateHBL(data);

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename=HBL-${data.shipmentId}.pdf`,
      );
      reply.send(pdfBuffer);
    } catch (error: any) {
      fastify.log.error("PDF Generation Error:", error);
      reply.code(500).send({ error: "Failed to generate PDF" });
    }
  });

  fastify.get("/", async (request, reply) => {
    try {
      const query = request.query as { shipmentId?: string };
      let q = db.select().from(documents).$dynamic();
      
      if (query.shipmentId) {
        q = q.where(eq(documents.shipmentId, query.shipmentId));
      }
      
      const allDocs = await q.orderBy(documents.createdAt);
      return reply.send(allDocs);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/hbl", async (request, reply) => {
    try {
      const data = request.body as HBLData;
      
      if (!data || !data.shipmentId) {
        return reply.code(400).send({ error: "Missing required HBL data" });
      }

      const pdfBuffer = await PDFService.generateHBL(data);

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename=HBL-${data.shipmentId}.pdf`,
      );
      return reply.send(pdfBuffer);
    } catch (error: any) {
      fastify.log.error("PDF Generation Error:", error);
      reply.code(500).send({ error: "Failed to generate PDF" });
    }
  });

  fastify.post("/upload", {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "1 minute",
      },
    },
    handler: async (request, reply) => {
      try {
        const body = request.body as any;
        const data = body.file;
        if (!data) {
          return reply.code(400).send({ error: "No file uploaded" });
        }

        const fileBuffer = await data.toBuffer();
        
        // Persist to local filesystem (Document Vault)
        const uploadDir = path.join(process.cwd(), "uploads");
        await fs.promises.mkdir(uploadDir, { recursive: true });
        const originalFilename = path.basename(data.filename).replace(/[^A-Za-z0-9._-]/g, "_");
        const safeFilename = `${crypto.randomUUID()}-${originalFilename}`;
        const filePath = path.join(uploadDir, safeFilename);
        await fs.promises.writeFile(filePath, fileBuffer);
        
        const fileUrl = `/api/documents/download/${safeFilename}`;

        const shipmentId = body.shipmentId?.value;
        const docType = body.type?.value || "Commercial Invoice";

        if (shipmentId) {
          await db.insert(documents).values({
            id: crypto.randomUUID(),
            shipmentId: shipmentId,
            name: data.filename,
            type: docType,
            url: fileUrl,
          });
        }

        reply.send({ success: true, url: fileUrl, name: data.filename });
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    },
  });

  fastify.get("/download/:filename", {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: "1 minute",
      },
    },
    handler: async (request, reply) => {
      try {
        const { filename } = request.params as { filename: string };

        // Allow only simple filenames (no path separators / traversal)
        const filenamePattern = /^[A-Za-z0-9._-]+$/;
        if (!filenamePattern.test(filename) || path.basename(filename) !== filename) {
          return reply.code(400).send({ error: "Invalid filename" });
        }

        const uploadsRoot = path.resolve(process.cwd(), "uploads");
        const filePath = path.resolve(uploadsRoot, filename);

        if (filePath !== uploadsRoot && !filePath.startsWith(uploadsRoot + path.sep)) {
          return reply.code(400).send({ error: "Invalid filename" });
        }
        
        if (!fs.existsSync(filePath)) {
          return reply.code(404).send({ error: "File not found" });
        }

        const fileBuffer = await fs.promises.readFile(filePath);
        reply.header("Content-Disposition", `inline; filename="${filename}"`);
        // Infer content type roughly based on extension, defaulting to octet-stream
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
        reply.code(500).send({ error: error.message });
      }
    },
  });
};

export default documentsRoutes;
