import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import {
  railCorridors,
  railTerminals,
  railWagons,
  railConsignments,
  railTrainConsists,
  railTrainWagonAllocations,
} from "../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import {
  RailPhysicsService,
  TrainConsistBrakingInput,
  UicLineCategory,
} from "../services/rail/rail-physics.service.js";
import { TafTsiXmlService } from "../services/rail/taf-tsi-xml.service.js";
import { PDFService } from "../services/pdf.service.js";

export const railRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication hook
  fastify.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply
        .status(401)
        .send({ error: "Unauthorized", message: "Invalid or missing token" });
    }
  });

  // GET /api/rail/corridors
  fastify.get("/corridors", async (req, reply) => {
    try {
      const corridors = await db.select().from(railCorridors);
      return reply.send(corridors);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/rail/terminals
  fastify.get("/terminals", async (req, reply) => {
    try {
      const terminals = await db.select().from(railTerminals);
      return reply.send(terminals);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/rail/wagons
  fastify.get("/wagons", async (req, reply) => {
    try {
      const wagons = await db.select().from(railWagons);
      return reply.send(wagons);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/rail/consignments
  fastify.get("/consignments", async (req, reply) => {
    const { status, corridorId, q } = req.query as {
      status?: string;
      corridorId?: string;
      q?: string;
    };

    try {
      const list = await db
        .select()
        .from(railConsignments)
        .orderBy(desc(railConsignments.createdAt));

      let filtered = list;
      if (status && status !== "ALL") {
        filtered = filtered.filter((c) => c.status === status);
      }
      if (corridorId && corridorId !== "ALL") {
        filtered = filtered.filter((c) => c.corridorId === corridorId);
      }
      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.cimNumber.toLowerCase().includes(query) ||
            c.senderName.toLowerCase().includes(query) ||
            c.consigneeName.toLowerCase().includes(query) ||
            c.railwayUndertakingRu.toLowerCase().includes(query),
        );
      }

      return reply.send(filtered);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/rail/consignments/:id
  fastify.get("/consignments/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const consignment = await db
        .select()
        .from(railConsignments)
        .where(eq(railConsignments.id, id))
        .get();

      if (!consignment) {
        return reply
          .status(404)
          .send({ error: "CIM Rail Consignment not found" });
      }

      const allocations = await db
        .select()
        .from(railTrainWagonAllocations)
        .where(eq(railTrainWagonAllocations.consignmentId, id));

      return reply.send({
        ...consignment,
        allocations,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/rail/trains
  fastify.get("/trains", async (req, reply) => {
    try {
      const trains = await db
        .select()
        .from(railTrainConsists)
        .orderBy(desc(railTrainConsists.createdAt));
      return reply.send(trains);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/rail/trains/:id
  fastify.get("/trains/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const train = await db
        .select()
        .from(railTrainConsists)
        .where(eq(railTrainConsists.id, id))
        .get();

      if (!train) {
        return reply.status(404).send({ error: "Train consist not found" });
      }

      const allocations = await db
        .select()
        .from(railTrainWagonAllocations)
        .where(eq(railTrainWagonAllocations.trainConsistId, id));

      return reply.send({
        ...train,
        allocations,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // POST /api/rail/calculate-physics
  fastify.post("/calculate-physics", async (req, reply) => {
    const input = req.body as TrainConsistBrakingInput;

    if (!input || !Array.isArray(input.wagons)) {
      return reply.status(400).send({ error: "wagons array is required" });
    }

    const result = RailPhysicsService.calculateTrainConsistBraking(input);
    return reply.send({
      success: true,
      result,
    });
  });

  // POST /api/rail/calculate-axle-load
  fastify.post("/calculate-axle-load", async (req, reply) => {
    const { wagonTareTonnes, payloadTonnes, numberOfAxles, lineCategory } =
      req.body as {
        wagonTareTonnes: number;
        payloadTonnes: number;
        numberOfAxles?: number;
        lineCategory?: UicLineCategory;
      };

    if (wagonTareTonnes === undefined || payloadTonnes === undefined) {
      return reply
        .status(400)
        .send({ error: "wagonTareTonnes and payloadTonnes are required" });
    }

    const result = RailPhysicsService.calculateAxleLoad(
      wagonTareTonnes,
      payloadTonnes,
      numberOfAxles || 4,
      lineCategory || "D",
    );

    return reply.send({
      success: true,
      result,
    });
  });

  // POST /api/rail/consignments/:id/status
  fastify.post("/consignments/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, remarks } = req.body as {
      status:
        | "PLANNED"
        | "TRAIN_FORMED"
        | "IN_TRANSIT"
        | "GAUGE_TRANSFERRED"
        | "DELIVERED";
      remarks?: string;
    };

    if (!status) {
      return reply.status(400).send({ error: "status is required" });
    }

    try {
      const consignment = await db
        .select()
        .from(railConsignments)
        .where(eq(railConsignments.id, id))
        .get();

      if (!consignment) {
        return reply.status(404).send({ error: "Consignment not found" });
      }

      await db
        .update(railConsignments)
        .set({
          status,
          remarks: remarks || consignment.remarks,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(railConsignments.id, id));

      return reply.send({
        success: true,
        message: `Consignment ${consignment.cimNumber} updated to ${status}`,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/rail/consignments/:id/cim-pdf
  fastify.get("/consignments/:id/cim-pdf", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const consignment = await db
        .select()
        .from(railConsignments)
        .where(eq(railConsignments.id, id))
        .get();

      if (!consignment) {
        return reply.status(404).send({ error: "Consignment not found" });
      }

      const allocations = await db
        .select()
        .from(railTrainWagonAllocations)
        .where(eq(railTrainWagonAllocations.consignmentId, id));

      const pdfBuffer = await PDFService.generateCimConsignmentNote(
        consignment,
        allocations,
      );

      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `inline; filename="CIM_${consignment.cimNumber}.pdf"`,
        )
        .send(pdfBuffer);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "PDF Generation Error", message: err.message });
    }
  });

  // GET /api/rail/trains/:id/braking-sheet-pdf
  fastify.get("/trains/:id/braking-sheet-pdf", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const train = await db
        .select()
        .from(railTrainConsists)
        .where(eq(railTrainConsists.id, id))
        .get();

      if (!train) {
        return reply.status(404).send({ error: "Train not found" });
      }

      const allocations = await db
        .select()
        .from(railTrainWagonAllocations)
        .where(eq(railTrainWagonAllocations.trainConsistId, id));

      const pdfBuffer = await PDFService.generateTrainBrakingSheet(
        train,
        allocations,
      );

      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `inline; filename="Brake_Sheet_${train.trainRunNumber}.pdf"`,
        )
        .send(pdfBuffer);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "PDF Generation Error", message: err.message });
    }
  });

  // GET /api/rail/trains/:id/taf-tsi-xml
  fastify.get("/trains/:id/taf-tsi-xml", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const train = await db
        .select()
        .from(railTrainConsists)
        .where(eq(railTrainConsists.id, id))
        .get();

      if (!train) {
        return reply.status(404).send({ error: "Train not found" });
      }

      const allocations = await db
        .select()
        .from(railTrainWagonAllocations)
        .where(eq(railTrainWagonAllocations.trainConsistId, id));

      const xmlString = TafTsiXmlService.generateTrainCompositionMessage(
        train,
        allocations,
      );

      return reply
        .header("Content-Type", "application/xml")
        .header(
          "Content-Disposition",
          `attachment; filename="TAF_TSI_${train.trainRunNumber}.xml"`,
        )
        .send(xmlString);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "XML Generation Error", message: err.message });
    }
  });
};
