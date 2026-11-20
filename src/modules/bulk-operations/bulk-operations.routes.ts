/**
 * @file bulk-operations.routes.ts
 * @description Fastify routes for Solid & Liquid Bulk Vessel Operations, UN ECE Hydrostatic Draft Surveys, IMSBC Code TML/Liquefaction evaluation, IMO International Grain Code stability, ASTM D1250 Table 54 Ullage tank surveys, and PDF reports.
 * @module @atlas/api/modules/bulk-operations/routes
 */

import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { DraftSurveyCalculatorService } from "./draft-survey-calculator.service.js";
import { ImsbcLiquefactionEvaluatorService } from "./imsbc-liquefaction-evaluator.service.js";
import { GrainStabilityCalculatorService } from "./grain-stability-calculator.service.js";
import { AstmUllageTankSurveyService } from "./astm-ullage-tank-survey.service.js";
import { PDFService } from "../../services/pdf.service.js";
import crypto from "crypto";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. DOMAIN PAYLOAD INTERFACES
// ============================================================================

type BulkVesselOpInsert = typeof schema.bulkVesselOperations.$inferInsert;
type DraftSurveyInput = Parameters<
  typeof DraftSurveyCalculatorService.calculateDraftSurvey
>[0];
type ImsbcEvaluateInput = Parameters<
  typeof ImsbcLiquefactionEvaluatorService.evaluateCargo
>[0];
type GrainStabilityInput = Parameters<
  typeof GrainStabilityCalculatorService.calculateGrainStability
>[0];
type TankUllageInput = Parameters<
  typeof AstmUllageTankSurveyService.calculateLiquidQuantity
>[0];

type CreateVesselOperationBody = Partial<BulkVesselOpInsert>;

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

export const bulkOperationsRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. List Vessel Operations
  fastify.get(
    "/vessel-operations",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary: "List all solid and liquid bulk vessel port operations",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const ops = await db
          .select()
          .from(schema.bulkVesselOperations)
          .orderBy(desc(schema.bulkVesselOperations.createdAt));
        return reply.send({ success: true, data: ops });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 2. Get Vessel Operation Details
  fastify.get(
    "/vessel-operations/:id",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary:
          "Retrieve bulk vessel operation detail with draft surveys, IMSBC declarations, grain stability plans, and ullage surveys",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 3. Create Vessel Operation
  fastify.post(
    "/vessel-operations",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary: "Create a new bulk carrier or tanker port call operation",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body =
          (request.body as CreateVesselOperationBody | undefined) || {};
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 4. Calculate Hydrostatic Draft Survey
  fastify.post(
    "/calculate-draft-survey",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary:
          "Calculate UN ECE hydrostatic draft survey and Nemoto trim corrections",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as DraftSurveyInput;
        const res = DraftSurveyCalculatorService.calculateDraftSurvey(body);
        return reply.send({ success: true, calculation: res });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 5. Evaluate IMSBC TML / Liquefaction Safety
  fastify.post(
    "/evaluate-imsbc-tml",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary:
          "Evaluate IMSBC Code Group A Transportable Moisture Limit (TML) liquefaction safety",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as ImsbcEvaluateInput;
        const res = ImsbcLiquefactionEvaluatorService.evaluateCargo(body);
        return reply.send({ success: true, evaluation: res });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 6. Calculate IMO Grain Code Stability
  fastify.post(
    "/calculate-grain-stability",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary:
          "Calculate IMO International Grain Code heeling moments and metacentric stability",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as GrainStabilityInput;
        const res =
          GrainStabilityCalculatorService.calculateGrainStability(body);
        return reply.send({ success: true, stability: res });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 7. Calculate Tanker Liquid Quantity (ASTM Table 54)
  fastify.post(
    "/calculate-tank-ullage",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary:
          "Calculate liquid bulk tanker quantity using ASTM D1250 Table 54 VCF volume correction",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as TankUllageInput;
        const res = AstmUllageTankSurveyService.calculateLiquidQuantity(body);
        return reply.send({ success: true, ullageQuantity: res });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 8. PDF: Draft Survey Report PDF
  fastify.get(
    "/draft-surveys/:id/report-pdf",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary: "Download UN ECE Hydrostatic Draft Survey Report PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 9. PDF: IMSBC Cargo Declaration PDF
  fastify.get(
    "/imsbc-declarations/:id/declaration-pdf",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary: "Download IMSBC Code Form for Cargo Information PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 10. PDF: Grain Stability Plan PDF
  fastify.get(
    "/grain-stability-plans/:id/plan-pdf",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary:
          "Download IMO International Grain Code Stability Calculation Plan PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 11. PDF: Tanker Ullage Survey PDF
  fastify.get(
    "/ullage-surveys/:id/survey-pdf",
    {
      schema: {
        tags: ["Bulk & Tanker Operations"],
        summary:
          "Download ASTM D1250 Liquid Bulk Tanker Ullage Survey Report PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );
};
