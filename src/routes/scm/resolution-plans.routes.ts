/**
 * @file resolution-plans.routes.ts
 * @description Fastify REST routes for Autonomous Disruption Resolution and Automated Rerouting.
 * Provides endpoints for multi-criteria plan synthesis, Pareto recommendation inspection,
 * 1-click execution, and rejection (ADR 0036).
 * @module @atlas/api/routes/scm/resolution-plans
 * @see {@link docs/adr/0036-autonomous-disruption-resolution-and-automated-rerouting-engine.md}
 */

import { FastifyPluginAsync } from "fastify";
import {
  synthesizeResolutionPlansForException,
  listResolutionPlans,
  getResolutionPlanDetail,
  executeResolutionPlan,
  rejectResolutionPlan,
  type SynthesizePlansInput,
  type ListResolutionPlansFilters,
} from "../../services/autonomous-resolution.service.js";
import {
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "../openapi.schemas.js";
import { DEFAULT_OPERATOR_ACTOR } from "../../scm/kernel/primitives.js";

// ============================================================================
// 1. OPENAPI SCHEMA DEFINITIONS
// ============================================================================

const RESOLUTION_PLAN_PROPERTIES = {
  id: { type: "string" },
  tenantId: { type: "string" },
  exceptionId: { type: "string" },
  poId: { type: "string" },
  bookingId: { anyOf: [{ type: "string" }, { type: "null" }] },
  shipmentId: { anyOf: [{ type: "string" }, { type: "null" }] },
  planType: { type: "string" },
  status: { type: "string" },
  confidenceScore: { type: "string" },
  recommendationRank: { type: "number" },
  estimatedTransitDays: { type: "number" },
  transitTimeDeltaHours: { type: "number" },
  costDeltaAmount: { type: "string" },
  costDeltaCurrency: { type: "string" },
  carbonDeltaKgCo2: { anyOf: [{ type: "string" }, { type: "null" }] },
  justification: { type: "string" },
  policyEvaluationJson: {
    anyOf: [{ type: "object", additionalProperties: true }, { type: "null" }],
  },
  actionPayloadJson: {
    anyOf: [{ type: "object", additionalProperties: true }, { type: "null" }],
  },
  executionError: { anyOf: [{ type: "string" }, { type: "null" }] },
  approvedBy: { anyOf: [{ type: "string" }, { type: "null" }] },
  approvedAt: {
    anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
  },
  executedAt: {
    anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
  },
  createdAt: { anyOf: [{ type: "string" }, { type: "number" }] },
  updatedAt: {
    anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
  },
};

const EXECUTION_LOG_PROPERTIES = {
  id: { type: "string" },
  tenantId: { type: "string" },
  planId: { type: "string" },
  stepIndex: { type: "number" },
  stepName: { type: "string" },
  status: { type: "string" },
  detailsJson: {
    anyOf: [{ type: "object", additionalProperties: true }, { type: "null" }],
  },
  errorMessage: { anyOf: [{ type: "string" }, { type: "null" }] },
  executedAt: {
    anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
  },
  createdAt: { anyOf: [{ type: "string" }, { type: "number" }] },
};

const PLAN_DETAIL_RESPONSE_SCHEMA = openApiObject({
  plan: openApiObject(RESOLUTION_PLAN_PROPERTIES),
  executionLogs: openApiArray(EXECUTION_LOG_PROPERTIES),
});

// ============================================================================
// 2. FASTIFY PLUGIN & ROUTE HANDLERS
// ============================================================================

export const resolutionPlansRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/scm/disruptions/plans
   * List resolution plans filterable by exceptionId, poId, status
   */
  app.get<{
    Querystring: ListResolutionPlansFilters;
  }>(
    "/plans",
    {
      schema: {
        description:
          "List disruption resolution plans filtered by exception, PO, or status",
        tags: ["SCM Disruption Resolution", "Control Tower"],
        querystring: {
          type: "object",
          properties: {
            tenantId: { type: "string" },
            exceptionId: { type: "string" },
            poId: { type: "string" },
            status: { type: "string" },
          },
        },
        response: {
          200: openApiArray(RESOLUTION_PLAN_PROPERTIES),
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const plans = await listResolutionPlans(request.query);
      return reply.send(plans);
    },
  );

  /**
   * GET /api/scm/disruptions/plans/:id
   * Get plan details and execution audit logs
   */
  app.get<{
    Params: { id: string };
    Querystring: { tenantId?: string };
  }>(
    "/plans/:id",
    {
      schema: {
        description:
          "Get detailed resolution plan with rerouting execution logs",
        tags: ["SCM Disruption Resolution", "Control Tower"],
        params: OPENAPI_ID_PARAMS_SCHEMA,
        querystring: {
          type: "object",
          properties: {
            tenantId: { type: "string" },
          },
        },
        response: {
          200: PLAN_DETAIL_RESPONSE_SCHEMA,
          ...buildErrorResponses([404, 500]),
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.query.tenantId ?? "tenant_default";
      const result = await getResolutionPlanDetail(request.params.id, tenantId);

      if (!result) {
        return reply.code(404).send({
          error: `Resolution plan '${request.params.id}' not found`,
          code: "NOT_FOUND",
        });
      }

      return reply.send(result);
    },
  );

  /**
   * POST /api/scm/disruptions/plans/synthesize
   * Synthesizes and scores candidate mitigation plans for an active exception
   */
  app.post<{
    Body: SynthesizePlansInput;
  }>(
    "/plans/synthesize",
    {
      schema: {
        description:
          "Synthesize and rank multi-criteria disruption resolution plans for an exception",
        tags: ["SCM Disruption Resolution", "Control Tower"],
        body: {
          type: "object",
          required: ["exceptionId"],
          properties: {
            exceptionId: { type: "string" },
            tenantId: { type: "string" },
            forceReevaluation: { type: "boolean" },
          },
        },
        response: {
          200: openApiArray(RESOLUTION_PLAN_PROPERTIES),
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const plans = await synthesizeResolutionPlansForException(
          request.body,
          DEFAULT_OPERATOR_ACTOR,
        );
        return reply.send(plans);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Synthesis failed";
        return reply.code(400).send({
          error: message,
          code: "SYNTHESIS_ERROR",
        });
      }
    },
  );

  /**
   * POST /api/scm/disruptions/plans/:id/execute
   * Atomic 1-click execution of a resolution plan
   */
  app.post<{
    Params: { id: string };
    Body?: { notes?: string; tenantId?: string };
  }>(
    "/plans/:id/execute",
    {
      schema: {
        description:
          "Execute a disruption resolution plan and mutate physical routing/milestones",
        tags: ["SCM Disruption Resolution", "Control Tower"],
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: {
          type: "object",
          properties: {
            notes: { type: "string" },
            tenantId: { type: "string" },
          },
        },
        response: {
          200: openApiObject(RESOLUTION_PLAN_PROPERTIES),
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const executed = await executeResolutionPlan(
          {
            planId: request.params.id,
            tenantId: request.body?.tenantId,
            notes: request.body?.notes,
          },
          DEFAULT_OPERATOR_ACTOR,
        );
        return reply.send(executed);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Execution failed";
        return reply.code(400).send({
          error: message,
          code: "EXECUTION_ERROR",
        });
      }
    },
  );

  /**
   * POST /api/scm/disruptions/plans/:id/reject
   * Reject a candidate resolution plan
   */
  app.post<{
    Params: { id: string };
    Body: { reason: string; tenantId?: string };
  }>(
    "/plans/:id/reject",
    {
      schema: {
        description:
          "Reject a candidate resolution plan with a mandatory audit reason",
        tags: ["SCM Disruption Resolution", "Control Tower"],
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: {
          type: "object",
          required: ["reason"],
          properties: {
            reason: { type: "string" },
            tenantId: { type: "string" },
          },
        },
        response: {
          200: openApiObject(RESOLUTION_PLAN_PROPERTIES),
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const rejected = await rejectResolutionPlan(
          {
            planId: request.params.id,
            reason: request.body.reason,
            tenantId: request.body.tenantId,
          },
          DEFAULT_OPERATOR_ACTOR,
        );
        return reply.send(rejected);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Rejection failed";
        return reply.code(400).send({
          error: message,
          code: "REJECTION_ERROR",
        });
      }
    },
  );
};

export default resolutionPlansRoutes;
