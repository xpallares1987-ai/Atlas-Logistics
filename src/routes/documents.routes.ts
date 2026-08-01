import { FastifyPluginAsync } from "fastify";
import { PDFService, HBLData } from "../services/pdf.service.js";
import { db } from "../db/index.js";
import { shipments, locations, documents } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

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
        description: "General Cargo (Consolidated)",
        weight: 5000,
        volume: 15,
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
      const allDocs = await db
        .select()
        .from(documents)
        .orderBy(documents.createdAt);
      return reply.send(allDocs);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/upload", async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: "No file uploaded" });
      }

      const fileBuffer = await data.toBuffer();
      // In a real app, upload fileBuffer to S3/GCS. For now, we mock the URL
      const mockUrl = `/storage/mock-${crypto.randomUUID()}-${data.filename}`;

      // We assume shipmentId is passed in the multipart fields
      // If we use attachFieldsToBody: true, request.body is an object with fields
      const body = request.body as any;
      const shipmentId = body.shipmentId?.value;
      const docType = body.type?.value || "Commercial Invoice";

      if (shipmentId) {
        await db.insert(documents).values({
          id: crypto.randomUUID(),
          shipmentId: shipmentId,
          name: data.filename,
          type: docType,
          url: mockUrl,
        });
      }

      reply.send({ success: true, url: mockUrl, name: data.filename });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default documentsRoutes;
