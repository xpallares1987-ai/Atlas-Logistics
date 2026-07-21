import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db } from "../db/db.config.js";
import { shipments, shipmentDocuments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { zbc } from "../bpm/client.js";
import { Storage } from "@google-cloud/storage";
import { publishDocumentUploaded } from "../services/pubsub.service.js";
import { validate } from "../middleware/validate.js";
import { CreateShipmentSchema, UpdateShipmentSchema } from "@atlas/shared/src/logistics-schemas.js";

const storage = new Storage();
const BUCKET_NAME = "atlas-logistics-docs-100198375762";

const shipmentsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/", async (request, reply) => {
    try {
      const allShipments = await db.select().from(shipments);
      return allShipments;
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/", { preHandler: [validate(CreateShipmentSchema)] }, async (request, reply) => {
    try {
      const { documentBase64, documentMimeType, documentName, ...shipmentData } = request.body as any;

      const newShipment = await db.insert(shipments).values(shipmentData).returning();
      const shipment = newShipment[0];

      if (documentBase64 && documentName) {
        const bucket = storage.bucket(BUCKET_NAME);
        const uniqueFileName = `bookings/${shipment.id}-${documentName}`;
        const file = bucket.file(uniqueFileName);
        const buffer = Buffer.from(documentBase64, "base64");
        
        await file.save(buffer, { contentType: documentMimeType || "application/pdf" });
        const gcsUrl = `gs://${BUCKET_NAME}/${uniqueFileName}`;

        await db.insert(shipmentDocuments).values({
          shipmentId: shipment.id,
          documentType: "BOOKING_INSTRUCTION",
          fileName: documentName,
          mimeType: documentMimeType || "application/pdf",
          gcsUrl: gcsUrl,
        });

        await publishDocumentUploaded({
          shipmentId: shipment.id,
          gcsUrl: gcsUrl,
          mimeType: documentMimeType || "application/pdf",
        });
      }

      return shipment;
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.put("/:id", { preHandler: [validate(UpdateShipmentSchema)] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const updatedShipment = await db
        .update(shipments)
        .set({ ...(request.body as any), updatedAt: new Date() })
        .where(eq(shipments.id, id))
        .returning();

      if ((request.body as any).status === "ON_BOARD") {
        try {
          await zbc.createProcessInstance({
            bpmnProcessId: "billing-choreography",
            variables: {
              shipmentId: updatedShipment[0].id,
              referenceNumber: updatedShipment[0].referenceNumber,
              customerId: updatedShipment[0].billingPartyId || updatedShipment[0].supplierId || "UNKNOWN",
            },
          });
        } catch (bpmnError) {
          fastify.log.error(`[Camunda] Falló al disparar la coreografía:`, bpmnError);
        }
      }

      return updatedShipment[0];
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.delete("/:id", async (request, reply) => {
    try {
      const { id } = request.params as any;
      await db.delete(shipments).where(eq(shipments.id, id));
      return { success: true };
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/:referenceNumber", async (request, reply) => {
    try {
      const { referenceNumber } = request.params as any;
      const shipmentRecords = await db
        .select()
        .from(shipments)
        .where(eq(shipments.referenceNumber, referenceNumber));
        
      if (shipmentRecords.length === 0) {
        reply.code(404).send({ error: "Shipment not found" });
        return;
      }

      const shipment = shipmentRecords[0];
      return {
        referenceNumber: shipment.referenceNumber,
        status: shipment.status,
        originId: shipment.originLocationId,
        destinationId: shipment.destinationLocationId,
        createdAt: shipment.createdAt,
        events: [
          {
            id: "mock-1",
            shipmentId: shipment.id,
            milestoneType: "CREATED",
            milestoneDate: shipment.createdAt || new Date(),
            description: "Shipment created and awaiting processing.",
          },
        ],
      };
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default shipmentsRoutes;
