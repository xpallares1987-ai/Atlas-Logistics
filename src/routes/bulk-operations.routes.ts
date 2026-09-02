import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { DraftSurveyCalculatorService } from "../services/bulk-operations/draft-survey-calculator.service.js";
import { ImsbcLiquefactionEvaluatorService } from "../services/bulk-operations/imsbc-liquefaction-evaluator.service.js";
import { GrainStabilityCalculatorService } from "../services/bulk-operations/grain-stability-calculator.service.js";
import { AstmUllageTankSurveyService } from "../services/bulk-operations/astm-ullage-tank-survey.service.js";
import { PDFService } from "../services/pdf.service.js";
import crypto from "crypto";

export const bulkOperationsRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. List Vessel Operations
  fastify.get("/vessel-operations", async (request, reply) => {
    try {
      const ops = await db
        .select()
        .from(schema.bulkVesselOperations)
        .orderBy(desc(schema.bulkVesselOperations.createdAt));
      return reply.send({ success: true, data: ops });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 2. Get Vessel Operation Details
  fastify.get("/vessel-operations/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [op] = await db
        .select()
        .from(schema.bulkVesselOperations)
        .where(eq(schema.bulkVesselOperations.id, id));

      if (!op) {
        return reply
          .status(404)
          .send({ success: false, error: "Vessel Operation not found" });
      }

      const draftSurveys = await db
        .select()
        .from(schema.bulkDraftSurveys)
        .where(eq(schema.bulkDraftSurveys.operationId, id));

      const imsbcDeclarations = await db
        .select()
        .from(schema.bulkImsbcDeclarations)
        .where(eq(schema.bulkImsbcDeclarations.operationId, id));

      const grainPlans = await db
        .select()
        .from(schema.bulkGrainStabilityPlans)
        .where(eq(schema.bulkGrainStabilityPlans.operationId, id));

      const ullageSurveys = await db
        .select()
        .from(schema.bulkUllageSurveys)
        .where(eq(schema.bulkUllageSurveys.operationId, id));

      return reply.send({
        success: true,
        data: {
          ...op,
          draftSurveys,
          imsbcDeclarations,
          grainPlans,
          ullageSurveys,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 3. Create Vessel Operation
  fastify.post("/vessel-operations", async (request, reply) => {
    try {
      const body = request.body as any;
      const opId = `bulk_op_${crypto.randomUUID().slice(0, 8)}`;

      await db.insert(schema.bulkVesselOperations).values({
        id: opId,
        vesselName: body.vesselName || "MV Vessel",
        imoNumber: body.imoNumber || "9999999",
        callSign: body.callSign || null,
        vesselType: body.vesselType || "PANAMAX_BULKER",
        portName: body.portName || "Puerto de Gijón",
        terminalName: body.terminalName || "Terminal de Graneles",
        berthNumber: body.berthNumber || "Muelle 1",
        cargoCategory: body.cargoCategory || "SOLID_MINERAL_BULK",
        operationType: body.operationType || "LOADING",
        targetCargoTonnage: body.targetCargoTonnage || 50000,
        etaDate: body.etaDate || new Date().toISOString().substring(0, 10),
        etdDate: body.etdDate || null,
        actualCommencedDate: body.actualCommencedDate || null,
        actualCompletedDate: body.actualCompletedDate || null,
        status: body.status || "SCHEDULED",
      });

      const [newOp] = await db
        .select()
        .from(schema.bulkVesselOperations)
        .where(eq(schema.bulkVesselOperations.id, opId));

      return reply.status(201).send({ success: true, data: newOp });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 4. Calculate Hydrostatic Draft Survey
  fastify.post("/calculate-draft-survey", async (request, reply) => {
    try {
      const body = request.body as any;
      const res = DraftSurveyCalculatorService.calculateDraftSurvey(body);
      return reply.send({ success: true, calculation: res });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 5. Evaluate IMSBC TML / Liquefaction Safety
  fastify.post("/evaluate-imsbc-tml", async (request, reply) => {
    try {
      const body = request.body as any;
      const res = ImsbcLiquefactionEvaluatorService.evaluateCargo(body);
      return reply.send({ success: true, evaluation: res });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 6. Calculate IMO Grain Code Stability
  fastify.post("/calculate-grain-stability", async (request, reply) => {
    try {
      const body = request.body as any;
      const res = GrainStabilityCalculatorService.calculateGrainStability(body);
      return reply.send({ success: true, stability: res });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 7. Calculate Tanker Liquid Quantity (ASTM Table 54)
  fastify.post("/calculate-tank-ullage", async (request, reply) => {
    try {
      const body = request.body as any;
      const res = AstmUllageTankSurveyService.calculateLiquidQuantity(body);
      return reply.send({ success: true, ullageQuantity: res });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 8. PDF: Draft Survey Report PDF
  fastify.get("/draft-surveys/:id/report-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [survey] = await db
        .select()
        .from(schema.bulkDraftSurveys)
        .where(eq(schema.bulkDraftSurveys.id, id));

      if (!survey) {
        return reply
          .status(404)
          .send({ success: false, error: "Draft Survey not found" });
      }

      const [vesselOp] = await db
        .select()
        .from(schema.bulkVesselOperations)
        .where(eq(schema.bulkVesselOperations.id, survey.operationId));

      const pdfBuffer = await PDFService.generateDraftSurveyReportPdf(
        survey,
        vesselOp,
      );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Draft_Survey_${survey.surveyType}_${vesselOp?.vesselName || "Vessel"}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 9. PDF: IMSBC Cargo Declaration PDF
  fastify.get(
    "/imsbc-declarations/:id/declaration-pdf",
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const [imsbc] = await db
          .select()
          .from(schema.bulkImsbcDeclarations)
          .where(eq(schema.bulkImsbcDeclarations.id, id));

        if (!imsbc) {
          return reply
            .status(404)
            .send({ success: false, error: "IMSBC Declaration not found" });
        }

        const [vesselOp] = await db
          .select()
          .from(schema.bulkVesselOperations)
          .where(eq(schema.bulkVesselOperations.id, imsbc.operationId));

        const pdfBuffer = await PDFService.generateImsbcCargoDeclarationPdf(
          imsbc,
          vesselOp,
        );
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="IMSBC_Declaration_${imsbc.declarationReference}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err: any) {
        request.log.error(err);
        return reply.status(500).send({ success: false, error: err.message });
      }
    },
  );

  // 10. PDF: Grain Stability Plan PDF
  fastify.get("/grain-stability-plans/:id/plan-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [grainPlan] = await db
        .select()
        .from(schema.bulkGrainStabilityPlans)
        .where(eq(schema.bulkGrainStabilityPlans.id, id));

      if (!grainPlan) {
        return reply
          .status(404)
          .send({ success: false, error: "Grain Stability Plan not found" });
      }

      const [vesselOp] = await db
        .select()
        .from(schema.bulkVesselOperations)
        .where(eq(schema.bulkVesselOperations.id, grainPlan.operationId));

      const pdfBuffer = await PDFService.generateGrainStabilityPlanPdf(
        grainPlan,
        vesselOp,
      );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Grain_Stability_Plan_${grainPlan.planReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 11. PDF: Tanker Ullage Survey PDF
  fastify.get("/ullage-surveys/:id/survey-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [ullageSurvey] = await db
        .select()
        .from(schema.bulkUllageSurveys)
        .where(eq(schema.bulkUllageSurveys.id, id));

      if (!ullageSurvey) {
        return reply
          .status(404)
          .send({ success: false, error: "Ullage Survey not found" });
      }

      const [vesselOp] = await db
        .select()
        .from(schema.bulkVesselOperations)
        .where(eq(schema.bulkVesselOperations.id, ullageSurvey.operationId));

      const pdfBuffer = await PDFService.generateUllageTankSurveyPdf(
        ullageSurvey,
        vesselOp,
      );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Ullage_Survey_${ullageSurvey.surveyReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
};
