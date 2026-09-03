import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  carbonCalculations,
  carbonCalculationLegs,
  carbonOffsetProjects,
  carbonCertificates,
} from "../db/schema/index.js";
import { eq, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { GlecCalculatorService } from "../services/carbon/glec-calculator.service.js";
import { CarbonOffsetService } from "../services/carbon/carbon-offset.service.js";
import { CarbonPdfService } from "../services/carbon/carbon-pdf.service.js";

const transportModeSchema = z.enum([
  "OCEAN_CONTAINER",
  "OCEAN_BULK",
  "AIR_FREIGHT",
  "AIR_BELLY",
  "ROAD_DIESEL",
  "ROAD_HVO",
  "ROAD_EV",
  "RAIL_ELECTRIC",
  "RAIL_DIESEL",
]);

const legCalculationSchema = z.object({
  originName: z.string().trim().min(1),
  destinationName: z.string().trim().min(1),
  mode: transportModeSchema,
  distanceKm: z.number().finite().positive(),
  weightKg: z.number().finite().positive(),
});

const calculateSchema = z.object({
  entityType: z.enum(["SHIPMENT", "QUOTE", "SIMULATION"]).optional(),
  entityId: z.string().trim().min(1).optional(),
  referenceCode: z.string().trim().min(1).optional(),
  originCity: z.string().trim().min(1).optional(),
  destinationCity: z.string().trim().min(1).optional(),
  legs: z.array(legCalculationSchema).min(1),
});

const compareGreenRouteSchema = z.object({
  legs: z.array(legCalculationSchema).min(1),
});

const offsetSchema = z.object({
  calculationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  beneficiaryName: z.string().trim().min(1).default("Atlas Logistics Customer"),
});

export const carbonRoutes: FastifyPluginAsync = async (fastify) => {
  // Optional auth verification hook (allows unauthenticated in test if needed or verifies JWT)
  fastify.addHook("onRequest", async (req, reply) => {
    try {
      if (req.headers.authorization) {
        await req.jwtVerify();
      }
    } catch {
      // Allow gracefully for dev/test endpoints
    }
  });

  // GET /api/carbon/summary - KPI Dashboard Aggregates
  fastify.get("/summary", async (req, reply) => {
    try {
      const calculations = await db.select().from(carbonCalculations);
      const projects = await db.select().from(carbonOffsetProjects);
      const certificates = await db.select().from(carbonCertificates);

      const totalCalculations = calculations.length;
      const totalTco2eWtw = calculations.reduce(
        (sum, c) => sum + (c.totalTco2eWtw || 0),
        0,
      );
      const totalTco2eTtw = calculations.reduce(
        (sum, c) => sum + (c.totalTco2eTtw || 0),
        0,
      );
      const totalTco2eWtt = calculations.reduce(
        (sum, c) => sum + (c.totalTco2eWtt || 0),
        0,
      );
      const totalDistanceKm = calculations.reduce(
        (sum, c) => sum + (c.totalDistanceKm || 0),
        0,
      );

      const offsetCalculations = calculations.filter(
        (c) => c.status === "OFFSET_COMPLETED",
      );
      const totalTco2eOffset = offsetCalculations.reduce(
        (sum, c) => sum + (c.totalTco2eWtw || 0),
        0,
      );
      const totalOffsetInvestmentEur = offsetCalculations.reduce(
        (sum, c) => sum + (c.offsetCostEur || 0),
        0,
      );

      const offsetPercentage =
        totalTco2eWtw > 0
          ? Number(((totalTco2eOffset / totalTco2eWtw) * 100).toFixed(1))
          : 0;

      const avgCarbonIntensity =
        totalCalculations > 0
          ? Number(
              (
                calculations.reduce(
                  (sum, c) => sum + (c.carbonIntensityGco2ePerTkm || 0),
                  0,
                ) / totalCalculations
              ).toFixed(2),
            )
          : 0;

      return reply.send({
        totalCalculations,
        totalTco2eWtw: Number(totalTco2eWtw.toFixed(4)),
        totalTco2eTtw: Number(totalTco2eTtw.toFixed(4)),
        totalTco2eWtt: Number(totalTco2eWtt.toFixed(4)),
        totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
        totalTco2eOffset: Number(totalTco2eOffset.toFixed(4)),
        totalOffsetInvestmentEur: Number(totalOffsetInvestmentEur.toFixed(2)),
        offsetPercentage,
        avgCarbonIntensity,
        activeProjectsCount: projects.filter((p) => p.active).length,
        issuedCertificatesCount: certificates.length,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/carbon/calculations - List calculations with optional filters
  fastify.get("/calculations", async (req, reply) => {
    const { entityType, status, q } = req.query as {
      entityType?: string;
      status?: string;
      q?: string;
    };

    try {
      const list = await db
        .select()
        .from(carbonCalculations)
        .orderBy(desc(carbonCalculations.createdAt));

      let filtered = list;
      if (entityType && entityType !== "ALL") {
        filtered = filtered.filter((c) => c.entityType === entityType);
      }
      if (status && status !== "ALL") {
        filtered = filtered.filter((c) => c.status === status);
      }
      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.referenceCode.toLowerCase().includes(query) ||
            c.originCity.toLowerCase().includes(query) ||
            c.destinationCity.toLowerCase().includes(query),
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

  // GET /api/carbon/calculations/:id - Details with itemized legs
  fastify.get("/calculations/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const calculation = await db
        .select()
        .from(carbonCalculations)
        .where(eq(carbonCalculations.id, id))
        .get();

      if (!calculation) {
        return reply
          .status(404)
          .send({ error: "Carbon calculation not found" });
      }

      const legs = await db
        .select()
        .from(carbonCalculationLegs)
        .where(eq(carbonCalculationLegs.calculationId, id))
        .orderBy(carbonCalculationLegs.legOrder);

      return reply.send({
        ...calculation,
        legs,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // POST /api/carbon/calculate - Execute GLEC v3 calculation and save
  fastify.post("/calculate", async (req, reply) => {
    try {
      const body = calculateSchema.parse(req.body);
      const journey = GlecCalculatorService.calculateJourney(body.legs);
      const calculationId = uuidv4();
      const referenceCode =
        body.referenceCode || `CALC-${Date.now().toString().slice(-6)}`;
      const entityType = body.entityType || "SIMULATION";

      await db.insert(carbonCalculations).values({
        id: calculationId,
        entityType,
        entityId: body.entityId || null,
        referenceCode,
        originCity: body.originCity || body.legs[0].originName,
        destinationCity:
          body.destinationCity ||
          body.legs[body.legs.length - 1].destinationName,
        totalWeightKg: body.legs[0].weightKg,
        totalDistanceKm: journey.totalDistanceKm,
        totalTco2eWtw: journey.totalTco2eWtw,
        totalTco2eTtw: journey.totalTco2eTtw,
        totalTco2eWtt: journey.totalTco2eWtt,
        carbonIntensityGco2ePerTkm: journey.carbonIntensityGco2ePerTkm,
        status: "CALCULATED",
      });

      for (const leg of journey.legs) {
        await db.insert(carbonCalculationLegs).values({
          id: uuidv4(),
          calculationId,
          legOrder: leg.legOrder,
          originName: leg.originName,
          destinationName: leg.destinationName,
          mode: leg.mode,
          distanceKm: leg.distanceKm,
          weightTonnes: leg.weightTonnes,
          emissionFactorWtw: leg.factors.wtw,
          emissionFactorTtw: leg.factors.ttw,
          emissionFactorWtt: leg.factors.wtt,
          legTco2eWtw: leg.legTco2eWtw,
          legTco2eTtw: leg.legTco2eTtw,
          legTco2eWtt: leg.legTco2eWtt,
        });
      }

      return reply.send({
        success: true,
        calculationId,
        referenceCode,
        journey,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply
          .status(400)
          .send({ error: "Validation error", details: err.issues });
      }
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Calculation Error", message: err.message });
    }
  });

  // POST /api/carbon/compare-green-route - Simulate sustainable alternative corridors
  fastify.post("/compare-green-route", async (req, reply) => {
    try {
      const body = compareGreenRouteSchema.parse(req.body);
      const alternatives = GlecCalculatorService.generateGreenAlternatives(
        body.legs,
      );
      const base = GlecCalculatorService.calculateJourney(body.legs);

      return reply.send({
        success: true,
        baseJourney: base,
        alternatives,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply
          .status(400)
          .send({ error: "Validation error", details: err.issues });
      }
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Comparison Error", message: err.message });
    }
  });

  // GET /api/carbon/projects - List verified offset projects
  fastify.get("/projects", async (req, reply) => {
    try {
      const projects = await db
        .select()
        .from(carbonOffsetProjects)
        .where(eq(carbonOffsetProjects.active, true));
      return reply.send(projects);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // POST /api/carbon/offset - Purchase carbon credits and issue certificate
  fastify.post("/offset", async (req, reply) => {
    try {
      const body = offsetSchema.parse(req.body);
      const result = await CarbonOffsetService.processOffset(body);

      return reply.send({
        success: true,
        certificate: result,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply
          .status(400)
          .send({ error: "Validation error", details: err.issues });
      }
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Offset Processing Error", message: err.message });
    }
  });

  // GET /api/carbon/certificates - List all issued certificates
  fastify.get("/certificates", async (req, reply) => {
    try {
      const certificates = await db
        .select()
        .from(carbonCertificates)
        .orderBy(desc(carbonCertificates.issuedAt));
      return reply.send(certificates);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/carbon/certificates/:id/pdf - Stream PDF certificate
  fastify.get("/certificates/:id/pdf", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const cert = await db
        .select()
        .from(carbonCertificates)
        .where(eq(carbonCertificates.id, id))
        .get();

      if (!cert) {
        return reply.status(404).send({ error: "Certificate not found" });
      }

      const calculation = await db
        .select()
        .from(carbonCalculations)
        .where(eq(carbonCalculations.id, cert.calculationId))
        .get();

      const legs = calculation
        ? await db
            .select()
            .from(carbonCalculationLegs)
            .where(eq(carbonCalculationLegs.calculationId, calculation.id))
        : [];

      const pdfBuffer = await CarbonPdfService.generateCertificate({
        certificateNumber: cert.certificateNumber,
        beneficiaryName: cert.beneficiaryName,
        issuedAt: cert.issuedAt,
        referenceCode: calculation?.referenceCode || "N/A",
        originCity: calculation?.originCity || "Origin Port",
        destinationCity: calculation?.destinationCity || "Destination Port",
        totalWeightKg: calculation?.totalWeightKg || 0,
        totalDistanceKm: calculation?.totalDistanceKm || 0,
        totalTco2eWtw: calculation?.totalTco2eWtw || cert.offsetTco2e,
        totalTco2eTtw: calculation?.totalTco2eTtw || 0,
        totalTco2eWtt: calculation?.totalTco2eWtt || 0,
        carbonIntensityGco2ePerTkm:
          calculation?.carbonIntensityGco2ePerTkm || 0,
        projectName: cert.projectName,
        projectStandard: cert.projectStandard,
        amountPaidEur: cert.amountPaidEur,
        qrValidationUrl: cert.qrValidationUrl,
        legs: legs.map((l) => ({
          legOrder: l.legOrder,
          originName: l.originName,
          destinationName: l.destinationName,
          mode: l.mode,
          distanceKm: l.distanceKm,
          legTco2eWtw: l.legTco2eWtw,
        })),
      });

      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `inline; filename="Scope3_Carbon_Certificate_${cert.certificateNumber}.pdf"`,
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
