import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import {
  coldChainProfiles,
  coldChainShipments,
  temperatureReadings,
} from "../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import {
  MktCalculatorService,
  MktEvaluationInput,
} from "../services/cold-chain/mkt-calculator.service.js";
import {
  ThermalPhysicsService,
  DryIceSimulationInput,
  ReeferPowerSimulationInput,
} from "../services/cold-chain/thermal-physics.service.js";
import { PDFService } from "../services/pdf.service.js";

export const coldChainRoutes: FastifyPluginAsync = async (fastify) => {
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

  // GET /api/cold-chain/profiles
  fastify.get("/profiles", async (req, reply) => {
    try {
      const profiles = await db.select().from(coldChainProfiles);
      return reply.send(profiles);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/cold-chain/shipments
  fastify.get("/shipments", async (req, reply) => {
    const { profileId, verdict, q } = req.query as {
      profileId?: string;
      verdict?: string;
      q?: string;
    };

    try {
      const shipmentsList = await db
        .select()
        .from(coldChainShipments)
        .orderBy(desc(coldChainShipments.createdAt));

      let filtered = shipmentsList;
      if (profileId && profileId !== "ALL") {
        filtered = filtered.filter((s) => s.profileId === profileId);
      }
      if (verdict && verdict !== "ALL") {
        filtered = filtered.filter((s) => s.gdpReleaseVerdict === verdict);
      }
      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.trackingNumber.toLowerCase().includes(query) ||
            s.batchNumber.toLowerCase().includes(query) ||
            s.productDescription.toLowerCase().includes(query) ||
            s.loggerSerialNumber.toLowerCase().includes(query),
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

  // GET /api/cold-chain/shipments/:id
  fastify.get("/shipments/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const shipment = await db
        .select()
        .from(coldChainShipments)
        .where(eq(coldChainShipments.id, id))
        .get();

      if (!shipment) {
        return reply
          .status(404)
          .send({ error: "Cold chain shipment not found" });
      }

      const profile = await db
        .select()
        .from(coldChainProfiles)
        .where(eq(coldChainProfiles.id, shipment.profileId))
        .get();

      const readings = await db
        .select()
        .from(temperatureReadings)
        .where(eq(temperatureReadings.coldChainShipmentId, id))
        .orderBy(desc(temperatureReadings.recordedAt));

      return reply.send({
        ...shipment,
        profile,
        readings,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // POST /api/cold-chain/calculate-mkt
  fastify.post("/calculate-mkt", async (req, reply) => {
    const input = req.body as MktEvaluationInput;

    if (!input || !Array.isArray(input.readings)) {
      return reply.status(400).send({ error: "Readings array is required" });
    }

    const evaluation = MktCalculatorService.evaluateShipment(input);
    return reply.send({
      success: true,
      evaluation,
    });
  });

  // POST /api/cold-chain/simulate-dry-ice
  fastify.post("/simulate-dry-ice", async (req, reply) => {
    const input = req.body as DryIceSimulationInput;

    if (!input || input.currentWeightKg === undefined) {
      return reply.status(400).send({ error: "currentWeightKg is required" });
    }

    const result = ThermalPhysicsService.calculateDryIceHoldover(input);
    return reply.send({
      success: true,
      result,
    });
  });

  // POST /api/cold-chain/simulate-reefer-power
  fastify.post("/simulate-reefer-power", async (req, reply) => {
    const input = req.body as ReeferPowerSimulationInput;

    if (
      !input ||
      input.ambientTempCelsius === undefined ||
      input.setpointCelsius === undefined ||
      input.transitHours === undefined
    ) {
      return reply.status(400).send({ error: "Missing required parameters" });
    }

    const result = ThermalPhysicsService.calculateReeferPowerAndFuel(input);
    return reply.send({
      success: true,
      result,
    });
  });

  // POST /api/cold-chain/shipments/:id/release (GDP Responsible Person sign-off)
  fastify.post("/shipments/:id/release", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { gdpReleaseVerdict, responsiblePersonName, qualityAuditNotes } =
      req.body as {
        gdpReleaseVerdict:
          | "RELEASED_FOR_DISTRIBUTION"
          | "QUARANTINE_INVESTIGATION"
          | "REJECTED_DISPOSAL";
        responsiblePersonName: string;
        qualityAuditNotes?: string;
      };

    if (!gdpReleaseVerdict || !responsiblePersonName) {
      return reply
        .status(400)
        .send({ error: "Verdict and Responsible Person name are required" });
    }

    try {
      const shipment = await db
        .select()
        .from(coldChainShipments)
        .where(eq(coldChainShipments.id, id))
        .get();

      if (!shipment) {
        return reply.status(404).send({ error: "Shipment not found" });
      }

      await db
        .update(coldChainShipments)
        .set({
          gdpReleaseVerdict,
          responsiblePersonName,
          qualityAuditNotes: qualityAuditNotes || shipment.qualityAuditNotes,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(coldChainShipments.id, id));

      return reply.send({
        success: true,
        message: `Shipment ${shipment.trackingNumber} successfully updated to verdict: ${gdpReleaseVerdict}`,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/cold-chain/shipments/:id/certificate-pdf
  fastify.get("/shipments/:id/certificate-pdf", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const shipment = await db
        .select()
        .from(coldChainShipments)
        .where(eq(coldChainShipments.id, id))
        .get();

      if (!shipment) {
        return reply.status(404).send({ error: "Shipment not found" });
      }

      const profile = await db
        .select()
        .from(coldChainProfiles)
        .where(eq(coldChainProfiles.id, shipment.profileId))
        .get();

      const readings = await db
        .select()
        .from(temperatureReadings)
        .where(eq(temperatureReadings.coldChainShipmentId, id))
        .orderBy(desc(temperatureReadings.recordedAt));

      const pdfBuffer = await PDFService.generateGdpReleaseCertificate(
        shipment,
        readings,
        profile,
      );

      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `inline; filename="Pharma_GDP_Certificate_${shipment.trackingNumber}.pdf"`,
        )
        .send(pdfBuffer);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "PDF Generation Error", message: err.message });
    }
  });
};
