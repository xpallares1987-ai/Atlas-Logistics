import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  calculateCarbonSchema,
  carbonOffsetSchema,
  compareGreenRouteSchema,
} from "@atlas/shared";
import { db } from "../db/index.js";
import {
  carbonCalculations,
  carbonCalculationLegs,
  carbonOffsetProjects,
  carbonCertificates,
} from "../db/schema/index.js";
import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { GlecCalculatorService } from "../services/carbon/glec-calculator.service.js";
import {
  CarbonOffsetDomainError,
  CarbonOffsetService,
} from "../services/carbon/carbon-offset.service.js";
import { CarbonPdfService } from "../services/carbon/carbon-pdf.service.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

const calculationListQuerySchema = paginationSchema.extend({
  entityType: z.enum(["ALL", "SHIPMENT", "QUOTE", "SIMULATION"]).default("ALL"),
  status: z
    .enum(["ALL", "CALCULATED", "OFFSET_PENDING", "OFFSET_COMPLETED"])
    .default("ALL"),
  q: z.string().trim().max(100).optional(),
});

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

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
      const [metrics, activeProjects, issuedCertificates] = await Promise.all([
        db
          .select({
            totalCalculations: count(),
            totalTco2eWtw: sql<number>`coalesce(sum(${carbonCalculations.totalTco2eWtw}), 0)`,
            totalTco2eTtw: sql<number>`coalesce(sum(${carbonCalculations.totalTco2eTtw}), 0)`,
            totalTco2eWtt: sql<number>`coalesce(sum(${carbonCalculations.totalTco2eWtt}), 0)`,
            totalDistanceKm: sql<number>`coalesce(sum(${carbonCalculations.totalDistanceKm}), 0)`,
            totalTco2eOffset: sql<number>`coalesce(sum(case when ${carbonCalculations.status} = 'OFFSET_COMPLETED' then ${carbonCalculations.totalTco2eWtw} else 0 end), 0)`,
            totalOffsetInvestmentEur: sql<number>`coalesce(sum(case when ${carbonCalculations.status} = 'OFFSET_COMPLETED' then ${carbonCalculations.offsetCostEur} else 0 end), 0)`,
            avgCarbonIntensity: sql<number>`coalesce(avg(${carbonCalculations.carbonIntensityGco2ePerTkm}), 0)`,
          })
          .from(carbonCalculations)
          .get(),
        db
          .select({ value: count() })
          .from(carbonOffsetProjects)
          .where(eq(carbonOffsetProjects.active, true))
          .get(),
        db.select({ value: count() }).from(carbonCertificates).get(),
      ]);

      const totalCalculations = metrics?.totalCalculations ?? 0;
      const totalTco2eWtw = metrics?.totalTco2eWtw ?? 0;
      const totalTco2eTtw = metrics?.totalTco2eTtw ?? 0;
      const totalTco2eWtt = metrics?.totalTco2eWtt ?? 0;
      const totalDistanceKm = metrics?.totalDistanceKm ?? 0;
      const totalTco2eOffset = metrics?.totalTco2eOffset ?? 0;
      const totalOffsetInvestmentEur = metrics?.totalOffsetInvestmentEur ?? 0;

      const offsetPercentage =
        totalTco2eWtw > 0
          ? Number(((totalTco2eOffset / totalTco2eWtw) * 100).toFixed(1))
          : 0;

      const avgCarbonIntensity = Number(
        (metrics?.avgCarbonIntensity ?? 0).toFixed(2),
      );

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
        activeProjectsCount: activeProjects?.value ?? 0,
        issuedCertificatesCount: issuedCertificates?.value ?? 0,
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
    try {
      const { entityType, status, q, page, pageSize } =
        calculationListQuerySchema.parse(req.query);
      const searchPattern = q ? `%${escapeLikePattern(q)}%` : undefined;
      const where = and(
        entityType === "ALL"
          ? undefined
          : eq(carbonCalculations.entityType, entityType),
        status === "ALL" ? undefined : eq(carbonCalculations.status, status),
        searchPattern
          ? or(
              sql`${carbonCalculations.referenceCode} LIKE ${searchPattern} ESCAPE ${"\\"}`,
              sql`${carbonCalculations.originCity} LIKE ${searchPattern} ESCAPE ${"\\"}`,
              sql`${carbonCalculations.destinationCity} LIKE ${searchPattern} ESCAPE ${"\\"}`,
            )
          : undefined,
      );
      const [items, total] = await Promise.all([
        db
          .select()
          .from(carbonCalculations)
          .where(where)
          .orderBy(
            desc(carbonCalculations.createdAt),
            desc(carbonCalculations.id),
          )
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ value: count() })
          .from(carbonCalculations)
          .where(where)
          .get(),
      ]);

      return reply
        .header("x-total-count", total?.value ?? 0)
        .header("x-page", page)
        .header("x-page-size", pageSize)
        .send(items);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply
          .status(400)
          .send({ error: "Validation error", details: err.issues });
      }
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
      const body = calculateCarbonSchema.parse(req.body);
      const journey = GlecCalculatorService.calculateJourney(body.legs);
      if (journey.totalTco2eWtw <= 0) {
        return reply.status(400).send({
          error: "Validation error",
          message: "Journey emissions are below the supported precision",
        });
      }
      const calculationId = uuidv4();
      const referenceCode =
        body.referenceCode || `CALC-${Date.now().toString().slice(-6)}`;
      const entityType = body.entityType || "SIMULATION";

      await db.transaction(async (tx) => {
        await tx.insert(carbonCalculations).values({
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
          await tx.insert(carbonCalculationLegs).values({
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
      });

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
      const base = GlecCalculatorService.calculateJourney(body.legs);
      if (base.totalTco2eWtw <= 0) {
        return reply.status(400).send({
          error: "Validation error",
          message: "Journey emissions are below the supported precision",
        });
      }
      const alternatives = GlecCalculatorService.generateGreenAlternatives(
        body.legs,
      );

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
      const body = carbonOffsetSchema.parse(req.body);
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
      if (err instanceof CarbonOffsetDomainError) {
        return reply.status(err.statusCode).send({
          error: "Offset Processing Error",
          message: err.message,
        });
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
      const { page, pageSize } = paginationSchema.parse(req.query);
      const [certificates, total] = await Promise.all([
        db
          .select()
          .from(carbonCertificates)
          .orderBy(
            desc(carbonCertificates.issuedAt),
            desc(carbonCertificates.id),
          )
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ value: count() }).from(carbonCertificates).get(),
      ]);
      return reply
        .header("x-total-count", total?.value ?? 0)
        .header("x-page", page)
        .header("x-page-size", pageSize)
        .send(certificates);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply
          .status(400)
          .send({ error: "Validation error", details: err.issues });
      }
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
