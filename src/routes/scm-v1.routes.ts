/**
 * @file scm-v1.routes.ts
 * @description SCM v1 operational controllers and route handlers covering Orders, Shipments, Route Planning, Cargo, Consolidation, Documents, Customs, Finance, Work Management, and Workflow Engine.
 * @module @atlas/routes/scm-v1
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { desc, eq } from "drizzle-orm";
import { scmOperationalCockpitWorkItemsV2 } from "../db/schema/scm_operational_bff_sqlite.js";
import { validateStationWriteAccess } from "../middleware/station-context.js";
import { db } from "../db/index.js";
import {
  scmOutboxMessages,
  scmInboxProcessedMessages,
} from "../db/schema/scm_foundation.js";
import {
  DomainInvariantError,
  AuthorizationAbacError,
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
} from "../scm/kernel/primitives.js";
import {
  ensureScmFoundationTables,
  outboxBus,
} from "../scm/kernel/outbox-bus.js";
import {
  listDecisionDefinitions,
  publishDecisionTableVersion,
  evaluateDecisionTable,
  getWorkflowStateForShipment,
  getDecisionEvaluationsForShipment,
  advanceWorkflowTokenForShipment,
  toggleWorkflowInstanceState,
} from "../scm/contexts/automation/workflow-rules.context.js";
import {
  createConsolidation,
  addShipmentToConsolidation,
  lockOrCloseConsolidation,
  listConsolidations,
  generateOrUploadDocumentVersion,
  reviewAndApproveDocument,
  issueDocument,
  getDocumentsForShipment,
  createAndSubmitCustomsCase,
  placeCustomsInspectionHold,
  clearCustomsHoldAndRelease,
  getCustomsCasesForShipment,
} from "../scm/contexts/trade-consolidation/trade-consolidation.context.js";
import {
  getShipmentFinanceReadModel,
  addOrUpdateFinancialLine,
  issueSalesInvoice,
  attemptModifyIssuedSalesInvoice,
  issueSalesCreditNote,
  registerAndMatchPurchaseInvoice,
  approvePurchaseInvoicePayment,
} from "../scm/contexts/finance-billing/finance-billing.context.js";
import {
  createCustomerOrder,
  confirmCustomerOrder,
  loadOrderAggregate,
  cancelCustomerOrder,
} from "../scm/contexts/orders/order.context.js";
import {
  createShipmentExecution,
  loadShipmentAggregate,
  markShipmentDeliveredAndClose,
  reopenClosedShipment,
} from "../scm/contexts/shipment-execution/shipment.context.js";
import { publishShipmentRoutePlan } from "../scm/contexts/transport-planning/route-plan.context.js";
import {
  declareShipmentCargo,
  assignShipmentEquipment,
} from "../scm/contexts/cargo-equipment/cargo-equipment.context.js";
import { ingestOperationalTrackingEvent } from "../scm/contexts/tracking-events/tracking-events.context.js";
import {
  toggleSlaStopClock,
  evaluateShipmentDataQuality,
  promoteExceptionsToMacroIncident,
} from "../scm/contexts/control-engines/control-engines.context.js";
import {
  getShipment360ReadModel,
  registerShipment360Projectors,
} from "../scm/contexts/operational-intelligence/shipment360.projector.js";
import {
  listOperationsCockpitItems,
  executeCockpitWorkItem,
  listShipment360ReadModels,
} from "../scm/contexts/operational-intelligence/operations-cockpit.projector.js";
import {
  getShipment360View,
  listShipment360Views,
  listOperationsCockpitItems as listOperationalCockpitItems,
  getCockpitSummary as getOperationalCockpitSummary,
  executeCockpitWorkItem as executeOperationalCockpitWorkItem,
  getShipmentOperationalTimeline,
  getProjectionsHealth,
  rebuildAllOperationalProjections,
} from "../scm/contexts/operational-intelligence/operations-cockpit-bff.context.js";
import {
  raiseOperationalException,
  assignOperationalException,
  resolveOperationalException,
  listOperationalExceptionsForShipment,
  listAllOperationalExceptions,
} from "../scm/contexts/operational-intelligence/operational-exceptions.context.js";
import {
  createOperationalShipment,
  updateOperationalShipment,
  createInitialRoutePlan,
  getOperationalAuditTrail,
} from "../scm/contexts/operational-core/operational-core.context.js";
import {
  createTask,
  addTaskDependency,
  completeTask,
  getTasksForSubject,
} from "../scm/contexts/work-management/work-management.context.js";
import {
  createWorkflowDefinition,
  createWorkflowDefinitionVersion,
  addTaskDefinitionToVersion,
  addDependencyDefinitionToVersion,
  publishWorkflowDefinitionVersion,
  getWorkflowVersionWithDAG,
  listWorkflowDefinitions,
  instantiateWorkflow,
  getWorkflowInstanceById,
  seedStandardWorkflowDefinitions,
} from "../scm/contexts/workflow-engine/workflow-engine.context.js";
import { PDFService, HBLData } from "../services/pdf.service.js";
import { broadcastEvent } from "./events.routes.js";
import {
  computeShipmentGreenCompliance,
  generateShipmentCarbonCertificatePdf,
  generateShipmentCbamReportPdf,
  generateShipmentCbamXml,
  generateShipmentDuaPdf,
  generateShipmentDuaXml,
} from "../scm/contexts/operational-intelligence/green-compliance.projector.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
} from "./openapi.schemas.js";

const SCM_TAG = ["SCM v1 Operational Kernel"] as const;
const SCM_ERROR_RESPONSES = buildErrorResponses([400, 401, 403, 404, 422, 500]);

function extractActorFromRequest(
  request: FastifyRequest,
): SecurityActorContext {
  if (request.user && request.user.id) {
    const rawRoles = (request.user as Record<string, unknown>).roles;
    const roles = Array.isArray(rawRoles)
      ? rawRoles.map((r) => String(r).trim()).filter(Boolean)
      : [String(request.user.role || "USER").trim()];
    const orgId =
      request.user.companyId ||
      (request.user.organizationId as string | undefined) ||
      "";
    return {
      userId: request.user.id,
      organizationId: orgId,
      legalEntityId: DEFAULT_OPERATOR_ACTOR.legalEntityId,
      branchId:
        request.stationContext?.stationId ||
        (request.headers["x-branch-id"] as string) ||
        DEFAULT_OPERATOR_ACTOR.branchId,
      departmentId: DEFAULT_OPERATOR_ACTOR.departmentId,
      teamIds: DEFAULT_OPERATOR_ACTOR.teamIds,
      roles,
    };
  }

  if (process.env.NODE_ENV === "test") {
    const headers = request.headers;
    const orgId =
      (headers["x-org-id"] as string) ||
      (headers["x-organization-id"] as string) ||
      DEFAULT_OPERATOR_ACTOR.organizationId;
    const branchId =
      (headers["x-branch-id"] as string) || DEFAULT_OPERATOR_ACTOR.branchId;
    const userId =
      (headers["x-user-id"] as string) || DEFAULT_OPERATOR_ACTOR.userId;
    const rolesHeader = headers["x-roles"] as string | undefined;
    const roles = rolesHeader
      ? rolesHeader.split(",").map((r) => r.trim())
      : DEFAULT_OPERATOR_ACTOR.roles;

    return {
      userId,
      organizationId: orgId,
      legalEntityId: DEFAULT_OPERATOR_ACTOR.legalEntityId,
      branchId,
      departmentId: DEFAULT_OPERATOR_ACTOR.departmentId,
      teamIds: DEFAULT_OPERATOR_ACTOR.teamIds,
      roles,
    };
  }

  throw new AuthorizationAbacError(
    "Authentication required: verified user session is missing.",
  );
}

function handleDomainError(error: unknown, reply: FastifyReply) {
  if (error instanceof DomainInvariantError) {
    return reply.code(422).send({
      error: "DOMAIN_INVARIANT_VIOLATION",
      boundedContext: error.boundedContext,
      code: error.code,
      message: error.message,
    });
  }
  if (error instanceof AuthorizationAbacError) {
    return reply.code(403).send({
      error: "ABAC_AUTHORIZATION_DENIED",
      message: error.message,
    });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return reply.code(500).send({
    error: "INTERNAL_ERROR",
    message,
  });
}

const scmV1Routes: FastifyPluginAsync = async (fastify) => {
  registerShipment360Projectors();

  // ==========================================================================
  // 06. ORDERS BOUNDED CONTEXT ENDPOINTS
  // ==========================================================================
  fastify.post("/orders", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Create a new SCM customer order aggregate",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body =
        (request.body as Parameters<typeof createCustomerOrder>[0]) || {};
      const order = await createCustomerOrder(body, actor);
      return reply.code(201).send(order);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/orders/:id/confirm", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Confirm a customer order and emit confirmation outbox event",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const order = await confirmCustomerOrder(id, actor);
      return reply.send(order);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/orders/:id/cancel", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Cancel a customer order with reason",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as { reason?: string }) || {};
      const order = await cancelCustomerOrder(
        id,
        body.reason || "Cancelled by operator",
        actor,
      );
      return reply.send(order);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/orders/:id", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Load a customer order aggregate by identifier",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const order = await loadOrderAggregate(id, actor);
      return reply.send(order);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 07. SHIPMENT EXECUTION BOUNDED CONTEXT ENDPOINTS
  // ==========================================================================
  fastify.post("/shipments", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Create an SCM shipment execution aggregate",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body =
        (request.body as Parameters<typeof createShipmentExecution>[0]) || {};
      const shipment = await createShipmentExecution(body, actor);
      return reply.code(201).send(shipment);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/shipments/:id", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Load an SCM shipment execution aggregate by identifier",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const shipment = await loadShipmentAggregate(id, actor);
      return reply.send(shipment);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/close", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Mark an SCM shipment as delivered and close execution",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const shipment = await markShipmentDeliveredAndClose(id, actor);
      return reply.send(shipment);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/reopen", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Reopen a closed SCM shipment with justification",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as { reason?: string }) || {};
      const shipment = await reopenClosedShipment(id, body.reason || "", actor);
      return reply.send(shipment);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 08. TRANSPORT PLANNING BOUNDED CONTEXT ENDPOINTS
  // ==========================================================================
  fastify.post("/shipments/:id/route-plan", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Publish a multimodal route plan for an SCM shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as {
          changeReason?: string;
          stops?: Parameters<typeof publishShipmentRoutePlan>[0]["stops"];
          legs?: Parameters<typeof publishShipmentRoutePlan>[0]["legs"];
        }) || {};
      const routePlan = await publishShipmentRoutePlan(
        {
          shipmentId: id,
          changeReason: body.changeReason,
          stops: body.stops || [],
          legs: body.legs || [],
        },
        actor,
      );
      return reply.send(routePlan);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 10. CARGO & EQUIPMENT BOUNDED CONTEXT ENDPOINTS
  // ==========================================================================
  fastify.post("/shipments/:id/cargo", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Declare cargo line items for an SCM shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as {
          packages?: Parameters<typeof declareShipmentCargo>[0]["packages"];
        }) || {};
      const cargo = await declareShipmentCargo(
        {
          shipmentId: id,
          packages: body.packages || [],
        },
        actor,
      );
      return reply.code(201).send(cargo);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/equipment", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Assign ISO container or transport equipment to a shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as Omit<
          Parameters<typeof assignShipmentEquipment>[0],
          "shipmentId"
        >) || {};
      const equipment = await assignShipmentEquipment(
        {
          ...body,
          shipmentId: id,
        },
        actor,
      );
      return reply.code(201).send(equipment);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 11, 13, 18, 19. SLICE 2 & SLICE 3 ENDPOINTS
  // Tracking Events, SLA Stop-Clock, Contextual Data Quality & Macro Incidents
  // ==========================================================================
  fastify.post("/shipments/:id/events", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Ingest an operational tracking milestone event for a shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as Omit<
          Parameters<typeof ingestOperationalTrackingEvent>[0],
          "shipmentId"
        >) || {};
      const result = await ingestOperationalTrackingEvent(
        {
          ...body,
          shipmentId: id,
        },
        actor,
      );
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/sla-stop-clock", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Toggle SLA stop-clock suspension for a shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as {
          slaCode?: string;
          action?: "PAUSE" | "RESUME";
          reason?: string;
          simulatedPauseMinutes?: number;
        }) || {};
      const result = await toggleSlaStopClock(
        {
          shipmentId: id,
          slaCode: body.slaCode || "SLA_CUSTOMS_RELEASE",
          action: body.action || "PAUSE",
          reason: body.reason || "External Stop-Clock",
          simulatedPauseMinutes: body.simulatedPauseMinutes,
        },
        actor,
      );
      await ensureScmFoundationTables();
      return reply.send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/shipments/:id/data-quality/evaluate",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Evaluate shipment data quality gate rules",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { id } = request.params as { id: string };
        const body =
          (request.body as {
            stage?: Parameters<typeof evaluateShipmentDataQuality>[1];
          }) || {};
        const result = await evaluateShipmentDataQuality(id, body.stage, actor);
        return reply.send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.post("/incidents", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Promote operational exceptions into a macro control incident",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body =
        (request.body as Parameters<
          typeof promoteExceptionsToMacroIncident
        >[0]) || {};
      const result = await promoteExceptionsToMacroIncident(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 20 & 21. SLICE 4 ENDPOINTS — WORKFLOW RUNTIME & DECISION TABLES
  // ==========================================================================
  fastify.get("/decisions", {
      schema: {
        tags: [...SCM_TAG],
        summary: "List automated DMN workflow decision table definitions",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (_request, reply) => {
    try {
      const list = await listDecisionDefinitions();
      return reply.send(list);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/decisions", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Publish a new version of a workflow decision table",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body =
        (request.body as Parameters<typeof publishDecisionTableVersion>[0]) ||
        {};
      const result = await publishDecisionTableVersion(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/decisions/:decisionKey/evaluate", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Evaluate a workflow decision table against shipment facts",
        params: buildParamSchema("decisionKey", "Decision table key."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { decisionKey } = request.params as { decisionKey: string };
      const body =
        (request.body as {
          shipmentId?: string;
          inputs?: Record<string, unknown>;
          callerContext?: string;
        }) || {};
      const record = await evaluateDecisionTable(
        {
          decisionKey,
          shipmentId: body.shipmentId || "shp_ad_hoc",
          inputs: body.inputs || {},
          callerContext: body.callerContext || "api.DirectDecisionEvaluation",
        },
        actor,
      );
      await outboxBus.relayPendingEvents();
      return reply.send(record);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/shipments/:id/workflow", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Retrieve shipment workflow state and decision explainability",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [workflowState, decisionExplainability] = await Promise.all([
        getWorkflowStateForShipment(id),
        getDecisionEvaluationsForShipment(id),
      ]);
      return reply.send({ workflowState, decisionExplainability });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/workflow/advance", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Advance the BPMN workflow token for a shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as {
          triggerReason?: string;
          strictGateAssertion?: boolean;
        }) || {};
      const result = await advanceWorkflowTokenForShipment(
        {
          shipmentId: id,
          triggerReason:
            body.triggerReason || "api.ManualOperatorWorkflowAdvance",
          strictGateAssertion: body.strictGateAssertion ?? true,
        },
        actor,
      );
      await outboxBus.relayPendingEvents();
      return reply.send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/workflow/state", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Toggle shipment workflow instance active/suspended state",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as {
          action?: Parameters<typeof toggleWorkflowInstanceState>[0]["action"];
          reason?: string;
        }) || {};
      const result = await toggleWorkflowInstanceState(
        {
          shipmentId: id,
          action: body.action || "SUSPEND",
          reason: body.reason,
        },
        actor,
      );
      return reply.send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 09, 14 & 15. SLICE 5 ENDPOINTS — CONSOLIDATION, DOCUMENTS & CUSTOMS
  // ==========================================================================
  fastify.get("/consolidations", {
      schema: {
        tags: [...SCM_TAG],
        summary: "List LCL/FCL shipment consolidations",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (_request, reply) => {
    try {
      const list = await listConsolidations();
      return reply.send(list);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/consolidations", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Create a new freight consolidation group",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body =
        (request.body as Parameters<typeof createConsolidation>[0]) || {};
      const cns = await createConsolidation(body, actor);
      return reply.code(201).send(cns);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/consolidations/:id/members", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Add a house shipment to a freight consolidation",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as Omit<
          Parameters<typeof addShipmentToConsolidation>[0],
          "consolidationId"
        >) || {};
      const cns = await addShipmentToConsolidation(
        {
          ...body,
          consolidationId: id,
        },
        actor,
      );
      return reply.send(cns);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/consolidations/:id/lock", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Lock or close a freight consolidation manifest",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as {
          targetStatus?: "LOCKED_MANIFEST" | "CLOSED";
        }) || {};
      const cns = await lockOrCloseConsolidation(
        {
          consolidationId: id,
          targetStatus: body.targetStatus || "LOCKED_MANIFEST",
        },
        actor,
      );
      return reply.send(cns);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/shipments/:id/documents", {
      schema: {
        tags: [...SCM_TAG],
        summary: "List SCM trade documents attached to a shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const docs = await getDocumentsForShipment(id);
      return reply.send(docs);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/documents", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Generate or upload a new shipment trade document version",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as Omit<
          Parameters<typeof generateOrUploadDocumentVersion>[0],
          "shipmentId"
        >) || {};
      const doc = await generateOrUploadDocumentVersion(
        {
          ...body,
          shipmentId: id,
        },
        actor,
      );
      return reply.code(201).send(doc);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/documents/:documentId/approve", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Review and approve an SCM shipment document",
        params: buildParamSchema("documentId", "SCM document identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { documentId } = request.params as { documentId: string };
      const body =
        (request.body as {
          decision?: "APPROVED" | "REJECTED";
          comments?: string;
        }) || {};
      const doc = await reviewAndApproveDocument(
        {
          documentId,
          decision: body.decision || "APPROVED",
          comments: body.comments,
        },
        actor,
      );
      return reply.send(doc);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/documents/:documentId/issue", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Officially issue an approved SCM shipment document",
        params: buildParamSchema("documentId", "SCM document identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { documentId } = request.params as { documentId: string };
      const doc = await issueDocument(documentId, actor);
      return reply.send(doc);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/shipments/:id/customs", {
      schema: {
        tags: [...SCM_TAG],
        summary: "List customs clearance cases for an SCM shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const cases = await getCustomsCasesForShipment(id);
      return reply.send(cases);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/customs", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Create and submit a customs clearance case for a shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as Omit<
          Parameters<typeof createAndSubmitCustomsCase>[0],
          "shipmentId"
        >) || {};
      const ccase = await createAndSubmitCustomsCase(
        {
          ...body,
          shipmentId: id,
        },
        actor,
      );
      return reply.code(201).send(ccase);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/customs/:customsCaseId/hold", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Place an official customs inspection hold on a case",
        params: buildParamSchema("customsCaseId", "Customs case identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { customsCaseId } = request.params as { customsCaseId: string };
      const body =
        (request.body as {
          channel?: Parameters<typeof placeCustomsInspectionHold>[0]["channel"];
          reasonCode?: string;
          authorityNotes?: string;
        }) || {};
      const ccase = await placeCustomsInspectionHold(
        {
          customsCaseId,
          channel: body.channel || "ORANGE",
          reasonCode: body.reasonCode || "DOC_INSPECTION",
          authorityNotes:
            body.authorityNotes ||
            "Documentary requirement for certificate of origin and commercial invoice",
        },
        actor,
      );
      return reply.send(ccase);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/customs/:customsCaseId/release", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Clear customs hold and authorize cargo release",
        params: buildParamSchema("customsCaseId", "Customs case identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { customsCaseId } = request.params as { customsCaseId: string };
      const body =
        (request.body as {
          clearOpenHolds?: boolean;
          resolutionNotes?: string;
        }) || {};
      const ccase = await clearCustomsHoldAndRelease(
        {
          customsCaseId,
          clearOpenHolds: body.clearOpenHolds ?? true,
          resolutionNotes: body.resolutionNotes,
        },
        actor,
      );
      return reply.send(ccase);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 16 & 17. SLICE 6 ENDPOINTS — OPERATIONAL FINANCE & BILLING 3-WAY MATCH
  // ==========================================================================
  fastify.get("/shipments/:id/finance", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Retrieve shipment financial read model with cost and revenue lines",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const fin = await getShipmentFinanceReadModel(id, actor);
      return reply.send(fin);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/finance/lines", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Add or update a financial charge line on a shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as Omit<
          Parameters<typeof addOrUpdateFinancialLine>[0],
          "shipmentId"
        >) || {};
      const fin = await addOrUpdateFinancialLine(
        {
          ...body,
          shipmentId: id,
        },
        actor,
      );
      return reply.code(201).send(fin);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/sales-invoices", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Issue an Accounts Receivable sales invoice for a shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as Omit<
          Parameters<typeof issueSalesInvoice>[0],
          "shipmentId"
        >) || {};
      const inv = await issueSalesInvoice(
        {
          ...body,
          shipmentId: id,
        },
        actor,
      );
      return reply.code(201).send(inv);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.patch("/sales-invoices/:invoiceId", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Attempt controlled amendment on an issued sales invoice",
        params: buildParamSchema("invoiceId", "Sales invoice identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const { invoiceId } = request.params as { invoiceId: string };
      const body = (request.body as { netAmountEur?: number }) || {};
      await attemptModifyIssuedSalesInvoice({
        invoiceId,
        newNetAmountEur: body.netAmountEur ?? 0,
      });
      return reply.send({ updated: true });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/sales-invoices/:invoiceId/credit-note",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Issue a compensating sales credit note against an invoice",
        params: buildParamSchema("invoiceId", "Sales invoice identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { invoiceId } = request.params as { invoiceId: string };
        const body = (request.body as { creditReason?: string }) || {};
        const inv = await issueSalesCreditNote(
          {
            invoiceId,
            creditReason: body.creditReason || "Commercial adjustment",
          },
          actor,
        );
        return reply.send(inv);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.post("/shipments/:id/purchase-invoices", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Register and three-way match a vendor purchase invoice",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body =
        (request.body as Omit<
          Parameters<typeof registerAndMatchPurchaseInvoice>[0],
          "shipmentId"
        >) || {};
      const pinv = await registerAndMatchPurchaseInvoice(
        {
          ...body,
          shipmentId: id,
        },
        actor,
      );
      return reply.code(201).send(pinv);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/purchase-invoices/:purchaseInvoiceId/approve",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Approve a matched purchase invoice for AP payment",
        params: buildParamSchema("purchaseInvoiceId", "Purchase invoice identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { purchaseInvoiceId } = request.params as {
          purchaseInvoiceId: string;
        };
        const body =
          (request.body as {
            approveVarianceOverride?: boolean;
            approvalNotes?: string;
          }) || {};
        const pinv = await approvePurchaseInvoicePayment(
          {
            purchaseInvoiceId,
            approveVarianceOverride: body.approveVarianceOverride,
            approvalNotes: body.approvalNotes,
          },
          actor,
        );
        return reply.send(pinv);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  // ==========================================================================
  // 24. OPERATIONAL INTELLIGENCE — SHIPMENT 360 & SMART WORK QUEUE (CQRS BFF)
  // ==========================================================================
  fastify.get("/shipments-360", {
      schema: {
        tags: [...SCM_TAG],
        summary: "List Shipment 360 CQRS projected read models",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const list = await listShipment360ReadModels(actor);
      return reply.send(list);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/shipments/:id/360", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Retrieve a single Shipment 360 CQRS read model",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const readModel = await getShipment360ReadModel(id, actor);
      return reply.send(readModel);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/cockpit", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Query Operations Cockpit smart work queue and summary metrics",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const query =
        (request.query as {
          status?: NonNullable<
            Parameters<typeof listOperationsCockpitItems>[0]
          >["status"];
          urgencyBucket?: string;
          search?: string;
        }) || {};
      const result = await listOperationsCockpitItems(
        {
          status: query.status,
          urgencyBucket: query.urgencyBucket,
          search: query.search,
        },
        actor,
      );
      return reply.send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/cockpit/:workItemId/execute", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Execute an action on a Cockpit smart work item",
        params: buildParamSchema("workItemId", "Cockpit work item identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { workItemId } = request.params as { workItemId: string };
      const body = (request.body as Record<string, unknown>) || {};
      const result = await executeCockpitWorkItem(workItemId, body, actor);
      return reply.send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 25. PLATFORM GOVERNANCE — TRANSACTIONAL OUTBOX & INBOX TELEMETRY
  // ==========================================================================
  fastify.get("/outbox", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Inspect transactional outbox and inbox governance telemetry",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (_request, reply) => {
    try {
      await ensureScmFoundationTables();
      const outbox = await db
        .select()
        .from(scmOutboxMessages)
        .orderBy(desc(scmOutboxMessages.occurredAt))
        .limit(50);

      const inbox = await db
        .select()
        .from(scmInboxProcessedMessages)
        .orderBy(desc(scmInboxProcessedMessages.processedAt))
        .limit(50);

      return reply.send({
        outboxCount: outbox.length,
        inboxProcessedCount: inbox.length,
        outboxMessages: outbox,
        inboxDeliveries: inbox,
      });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 26. SCM LOGICAL MODEL v1 — OPERATIONAL CORE & WORK MANAGEMENT (SLICES 1, 2 & 3)
  // ==========================================================================
  fastify.post("/operational/shipments", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Create an operational core shipment via CQRS command",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body =
        (request.body as Parameters<typeof createOperationalShipment>[0]) || {};
      const idempotencyKey =
        (request.headers["x-idempotency-key"] as string) || body.idempotencyKey;
      const result = await createOperationalShipment(
        { ...body, idempotencyKey },
        actor,
      );
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.put("/operational/shipments/:shipmentId", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Update operational core shipment attributes",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { shipmentId } = request.params as { shipmentId: string };
      const body =
        (request.body as Partial<
          Parameters<typeof updateOperationalShipment>[0]
        >) || {};
      const result = await updateOperationalShipment(
        {
          shipmentId,
          expectedVersion: body.expectedVersion ?? 1,
          ...body,
        },
        actor,
      );
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/operational/shipments/:shipmentId/route-plan",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Create initial multimodal route plan for an operational shipment",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { shipmentId } = request.params as { shipmentId: string };
        const body =
          (request.body as Partial<
            Parameters<typeof createInitialRoutePlan>[0]
          >) || {};
        const idempotencyKey =
          (request.headers["x-idempotency-key"] as string) ||
          body.idempotencyKey;
        const result = await createInitialRoutePlan(
          {
            shipmentId,
            stops: body.stops || [],
            legs: body.legs || [],
            ...body,
            idempotencyKey,
          },
          actor,
        );
        return reply.code(201).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/operational/shipments/:shipmentId/360",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Retrieve operational BFF Shipment 360 composite view",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const result = await getShipment360View(shipmentId);
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get("/operational/shipments-360", {
      schema: {
        tags: [...SCM_TAG],
        summary: "List paginated operational BFF Shipment 360 views",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const query = (request.query as Record<string, unknown>) || {};
      const result = await listShipment360Views(query);
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/operational/cockpit", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Query station-scoped operational BFF cockpit work items",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const query =
        (request.query as {
          branchId?: string;
          departmentId?: string;
          [key: string]: unknown;
        }) || {};
      const branchId =
        query.branchId || request.stationContext?.stationId || undefined;
      const departmentId = query.departmentId || undefined;
      const result = await listOperationalCockpitItems({
        ...query,
        branchId,
        departmentId,
      });
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/operational/my-work", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Query operational work items assigned to current operator context",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const query =
        (request.query as {
          branchId?: string;
          departmentId?: string;
          [key: string]: unknown;
        }) || {};
      const branchId =
        query.branchId || request.stationContext?.stationId || undefined;
      const departmentId = query.departmentId || undefined;
      const result = await listOperationalCockpitItems({
        ...query,
        branchId,
        departmentId,
      });
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/operational/cockpit/summary", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Retrieve operational BFF cockpit KPI summary counters",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const query =
        (request.query as {
          branchId?: string;
          departmentId?: string;
          [key: string]: unknown;
        }) || {};
      const branchId =
        query.branchId || request.stationContext?.stationId || undefined;
      const departmentId = query.departmentId || undefined;
      const result = await getOperationalCockpitSummary({
        branchId,
        departmentId,
      });
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/operational/cockpit/:workItemId/execute",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Execute a station-authorized operational cockpit work item",
        params: buildParamSchema("workItemId", "Operational cockpit work item identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { workItemId } = request.params as { workItemId: string };
        const body = (request.body as Record<string, unknown>) || {};

        // Look up target work item to enforce station write authorization
        const itemRows = await db
          .select({ itemJson: scmOperationalCockpitWorkItemsV2.itemJson })
          .from(scmOperationalCockpitWorkItemsV2)
          .where(eq(scmOperationalCockpitWorkItemsV2.workItemId, workItemId))
          .limit(1);

        if (itemRows.length > 0) {
          try {
            const itemData = JSON.parse(itemRows[0].itemJson);
            const targetStationId = itemData.branchId;

            if (targetStationId) {
              const writeAccess = await validateStationWriteAccess(
                request,
                targetStationId,
              );
              if (!writeAccess.allowed) {
                return reply.code(403).send({
                  success: false,
                  error: writeAccess.error || "FORBIDDEN",
                  message: writeAccess.message,
                });
              }
            }
          } catch {
            // Ignore parse error on itemJson
          }
        }

        const result = await executeOperationalCockpitWorkItem(
          workItemId,
          body,
          actor,
        );

        // Propagate real-time event to connected UI clients
        try {
          broadcastEvent({
            type: result.resolvedException
              ? "OPERATIONAL_EXCEPTION_RESOLVED"
              : "OPERATIONAL_TASK_COMPLETED",
            workItemId,
            shipmentId: result.shipment360?.shipmentId,
            unlockedWorkItems: result.unlockedWorkItems,
            message: result.resolvedException
              ? `Operational exception ${workItemId} resolved.`
              : `Task ${result.completedTask?.title || workItemId} completed successfully.`,
          });
        } catch (_ignored) {}

        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/operational/shipments/:shipmentId/bol",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Generate and stream House Bill of Lading PDF for operational shipment",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const view = await getShipment360View(shipmentId);

        const shipperRole = view.shipment?.partyRoles?.find(
          (p) => p.role.toUpperCase() === "SHIPPER",
        );
        const consigneeRole = view.shipment?.partyRoles?.find(
          (p) => p.role.toUpperCase() === "CONSIGNEE",
        );
        const notifyRole = view.shipment?.partyRoles?.find(
          (p) => p.role.toUpperCase() === "NOTIFY_PARTY",
        );

        const stops = view.routePlan?.stops || [];
        const portOfLoading = stops[0]?.locationId || "ESVLC (Valencia Port)";
        const portOfDischarge =
          stops[stops.length - 1]?.locationId || "USNYC (New York Harbor)";

        const hblData: HBLData = {
          shipmentId: view.shipmentReference || shipmentId,
          shipper:
            shipperRole?.partyId ||
            "Global Freight Solutions S.A. - Valencia Logistic Hub",
          consignee:
            consigneeRole?.partyId ||
            "Atlantic Logistics Distribution LLC - New York",
          notifyParty:
            notifyRole?.partyId || "Atlantic Logistics Customs Brokerage Inc.",
          portOfLoading,
          portOfDischarge,
          vessel: "MSC OSCAR",
          voyage: "V.2409W",
          containers: [
            {
              containerNumber: "MSCU9284710",
              type: "40' High Cube",
              sealNumber: "SL-994821",
              grossWeightKg: 24500,
              tareWeightKg: 3900,
              netWeightKg: 20600,
              cbm: 68.2,
              packages: 480,
            },
          ],
          commodities: [
            {
              description:
                "Industrial Components & Assembly Machinery (Harmonized Code 8479.89)",
              hsCode: "8479.89.97",
              packageType: "Pallets / Wooden Crates",
              pieces: 480,
              grossWeightKg: 20600,
              volumeCbm: 68.2,
            },
          ],
          issueDate: new Date().toISOString().split("T")[0],
        };

        const pdfBuffer = await PDFService.generateHBL(hblData);
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="HBL-${view.shipmentReference || shipmentId}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/operational/shipments/:shipmentId/green-compliance",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Compute GLEC v3, EU ETS, and CBAM green compliance telemetry",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const result = await computeShipmentGreenCompliance(shipmentId);
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/operational/shipments/:shipmentId/carbon-certificate",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Stream Scope 3 Carbon Emissions Certificate PDF for a shipment",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const pdfBuffer =
          await generateShipmentCarbonCertificatePdf(shipmentId);
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="Scope3_Carbon_Certificate_${shipmentId}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/operational/shipments/:shipmentId/cbam-report",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Stream EU CBAM embedded emissions compliance report PDF",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const pdfBuffer = await generateShipmentCbamReportPdf(shipmentId);
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="CBAM_Declaration_Report_${shipmentId}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/operational/shipments/:shipmentId/cbam-xml",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Export EU CBAM Quarterly Transitional Registry XML report",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const xml = await generateShipmentCbamXml(shipmentId);
        reply.header("Content-Type", "application/xml");
        reply.header(
          "Content-Disposition",
          `attachment; filename="CBAM_Registry_${shipmentId}.xml"`,
        );
        return reply.send(xml);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/operational/shipments/:shipmentId/dua-pdf",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Stream Spanish AEAT DUA customs declaration PDF",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const pdfBuffer = await generateShipmentDuaPdf(shipmentId);
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="DUA_Customs_Declaration_${shipmentId}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/operational/shipments/:shipmentId/dua-xml",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Export Spanish AEAT DUA customs declaration XML",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const xml = await generateShipmentDuaXml(shipmentId);
        reply.header("Content-Type", "application/xml");
        reply.header(
          "Content-Disposition",
          `attachment; filename="DUA_AEAT_${shipmentId}.xml"`,
        );
        return reply.send(xml);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get("/shipments/:shipmentId/bol", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Generate and stream Bill of Lading PDF for an SCM shipment",
        params: buildParamSchema("shipmentId", "Shipment identifier."),
        response: {
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const { shipmentId } = request.params as { shipmentId: string };
      const view = await getShipment360View(shipmentId);

      const shipperRole = view.shipment?.partyRoles?.find(
        (p) => p.role.toUpperCase() === "SHIPPER",
      );
      const consigneeRole = view.shipment?.partyRoles?.find(
        (p) => p.role.toUpperCase() === "CONSIGNEE",
      );
      const notifyRole = view.shipment?.partyRoles?.find(
        (p) => p.role.toUpperCase() === "NOTIFY_PARTY",
      );

      const stops = view.routePlan?.stops || [];
      const portOfLoading = stops[0]?.locationId || "ESVLC (Valencia Port)";
      const portOfDischarge =
        stops[stops.length - 1]?.locationId || "USNYC (New York Harbor)";

      const hblData: HBLData = {
        shipmentId: view.shipmentReference || shipmentId,
        shipper:
          shipperRole?.partyId ||
          "Global Freight Solutions S.A. - Valencia Logistic Hub",
        consignee:
          consigneeRole?.partyId ||
          "Atlantic Logistics Distribution LLC - New York",
        notifyParty:
          notifyRole?.partyId || "Atlantic Logistics Customs Brokerage Inc.",
        portOfLoading,
        portOfDischarge,
        vessel: "MSC OSCAR",
        voyage: "V.2409W",
        containers: [
          {
            containerNumber: "MSCU9284710",
            type: "40' High Cube",
            sealNumber: "SL-994821",
            grossWeightKg: 24500,
            tareWeightKg: 3900,
            netWeightKg: 20600,
            cbm: 68.2,
            packages: 480,
          },
        ],
        commodities: [
          {
            description:
              "Industrial Components & Assembly Machinery (Harmonized Code 8479.89)",
            hsCode: "8479.89.97",
            packageType: "Pallets / Wooden Crates",
            pieces: 480,
            grossWeightKg: 20600,
            volumeCbm: 68.2,
          },
        ],
        issueDate: new Date().toISOString().split("T")[0],
      };

      const pdfBuffer = await PDFService.generateHBL(hblData);
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="HBL-${view.shipmentReference || shipmentId}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get(
    "/operational/shipments/:shipmentId/audit-trail",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Retrieve immutable outbox audit trail for an operational shipment",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const result = await getOperationalAuditTrail(shipmentId);
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/operational/shipments/:shipmentId/timeline",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Retrieve chronological operational timeline events for a shipment",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const result = await getShipmentOperationalTimeline(shipmentId);
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get("/operational/projections/health", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Check CQRS operational projection and outbox health metrics",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (_request, reply) => {
    try {
      const result = await getProjectionsHealth();
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/operational/projections/rebuild", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Trigger full authoritative rebuild of CQRS operational projections",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      if (
        !actor.roles.some((r) =>
          ["ADMIN", "SYSTEM_ADMIN"].includes(r.toUpperCase()),
        )
      ) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "ADMIN role required to rebuild operational projections.",
        });
      }
      const result = await rebuildAllOperationalProjections();
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // Operational Exceptions Engine
  fastify.post("/operational/exceptions", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Raise a new operational exception record on a shipment",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body =
        (request.body as Parameters<typeof raiseOperationalException>[0]) || {};
      const result = await raiseOperationalException(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.put(
    "/operational/exceptions/:exceptionId/assign",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Assign an operational exception to an operator or team",
        params: buildParamSchema("exceptionId", "Operational exception identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { exceptionId } = request.params as { exceptionId: string };
        const body =
          (request.body as Parameters<typeof assignOperationalException>[1]) ||
          {};
        const result = await assignOperationalException(
          exceptionId,
          body,
          actor,
        );
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.post(
    "/operational/exceptions/:exceptionId/resolve",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Resolve an open operational exception with audit note",
        params: buildParamSchema("exceptionId", "Operational exception identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { exceptionId } = request.params as { exceptionId: string };
        const body =
          (request.body as Parameters<typeof resolveOperationalException>[1]) ||
          {};
        const result = await resolveOperationalException(
          exceptionId,
          body,
          actor,
        );
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get("/operational/exceptions", {
      schema: {
        tags: [...SCM_TAG],
        summary: "List operational exceptions with status, severity, and team filters",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const query =
        (request.query as Parameters<typeof listAllOperationalExceptions>[0]) ||
        {};
      const result = await listAllOperationalExceptions(query);
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get(
    "/operational/shipments/:shipmentId/exceptions",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "List operational exceptions linked to a specific shipment",
        params: buildParamSchema("shipmentId", "Operational shipment identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const result = await listOperationalExceptionsForShipment(shipmentId);
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get("/operational/outbox/dlq", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Inspect dead-letter queue (DLQ) failed outbox events",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (_request, reply) => {
    try {
      const dlq = await outboxBus.getDeadLetterQueue();
      return reply.code(200).send({
        dlqCount: dlq.length,
        messages: dlq,
      });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/operational/outbox/dlq/:eventId/replay",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Replay a failed dead-letter queue outbox event",
        params: buildParamSchema("eventId", "Dead-letter outbox event identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        if (
          !actor.roles.some((r) =>
            ["ADMIN", "SYSTEM_ADMIN"].includes(r.toUpperCase()),
          )
        ) {
          return reply.code(403).send({
            error: "FORBIDDEN",
            message: "ADMIN role required to replay DLQ outbox events.",
          });
        }
        const { eventId } = request.params as { eventId: string };
        const success = await outboxBus.replayDeadLetterMessage(eventId);
        return reply.code(200).send({
          eventId,
          replayed: success,
        });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.post("/operational/tasks", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Create a work-management task bound to an operational subject",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body = (request.body as Parameters<typeof createTask>[0]) || {};
      const result = await createTask(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/operational/tasks/dependencies", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Register a directed prerequisite dependency between tasks",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body =
        (request.body as Parameters<typeof addTaskDependency>[0]) || {};
      const result = await addTaskDependency(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/operational/tasks/:taskId/complete",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Complete an operational work-management task and unlock dependents",
        params: buildParamSchema("taskId", "Operational task identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { taskId } = request.params as { taskId: string };
        const body =
          (request.body as {
            idempotencyKey?: string;
            result?: Record<string, unknown>;
          }) || {};
        const idempotencyKey =
          (request.headers["x-idempotency-key"] as string) ||
          body.idempotencyKey;
        const result = await completeTask(taskId, body.result, actor, {
          idempotencyKey,
        });
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get("/operational/tasks", {
      schema: {
        tags: [...SCM_TAG],
        summary: "List work-management tasks and DAG dependencies for a subject",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const query =
        (request.query as {
          subjectType?: Parameters<typeof getTasksForSubject>[0];
          subjectId?: string;
        }) || {};
      const result = await getTasksForSubject(
        query.subjectType || "SHIPMENT",
        query.subjectId || "",
      );
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 27. SCM LOGICAL MODEL v1 — WORKFLOW ENGINE (SLICE 4)
  // ==========================================================================
  fastify.post("/workflow-engine/definitions", {
      schema: {
        tags: [...SCM_TAG],
        summary: "Create a reusable DAG workflow definition",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body =
        (request.body as Parameters<typeof createWorkflowDefinition>[0]) || {};
      const result = await createWorkflowDefinition(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/workflow-engine/definitions", {
      schema: {
        tags: [...SCM_TAG],
        summary: "List all registered DAG workflow definitions",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (_request, reply) => {
    try {
      await seedStandardWorkflowDefinitions();
      const result = await listWorkflowDefinitions();
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/workflow-engine/definitions/:defId/versions",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Create a draft version under a workflow definition",
        params: buildParamSchema("defId", "Workflow definition identifier."),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { defId } = request.params as { defId: string };
        const body =
          (request.body as Partial<
            Parameters<typeof createWorkflowDefinitionVersion>[0]
          >) || {};
        const result = await createWorkflowDefinitionVersion(
          { workflowDefinitionId: defId, ...body },
          actor,
        );
        return reply.code(201).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.post(
    "/workflow-engine/versions/:versionId/tasks",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Add a task node specification to a workflow version",
        params: buildParamSchema("versionId", "Workflow version identifier."),
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { versionId } = request.params as { versionId: string };
        const body =
          (request.body as Partial<
            Parameters<typeof addTaskDefinitionToVersion>[0]
          >) || {};
        const result = await addTaskDefinitionToVersion(
          {
            workflowVersionId: versionId,
            taskTypeCode: body.taskTypeCode || "TASK",
            title: body.title || "Untitled Task",
            ...body,
          },
          actor,
        );
        return reply.code(201).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.post(
    "/workflow-engine/versions/:versionId/dependencies",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Add a DAG dependency edge to a workflow version",
        params: buildParamSchema("versionId", "Workflow version identifier."),
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { versionId } = request.params as { versionId: string };
        const body =
          (request.body as Partial<
            Parameters<typeof addDependencyDefinitionToVersion>[0]
          >) || {};
        const result = await addDependencyDefinitionToVersion(
          {
            workflowVersionId: versionId,
            predecessorTaskTypeCode: body.predecessorTaskTypeCode || "",
            successorTaskTypeCode: body.successorTaskTypeCode || "",
            ...body,
          },
          actor,
        );
        return reply.code(201).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.post(
    "/workflow-engine/versions/:versionId/publish",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Publish an immutable workflow definition version",
        params: buildParamSchema("versionId", "Workflow version identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { versionId } = request.params as { versionId: string };
        const result = await publishWorkflowDefinitionVersion(versionId, actor);
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/workflow-engine/versions/:versionId",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Retrieve a workflow version along with its full task DAG",
        params: buildParamSchema("versionId", "Workflow version identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { versionId } = request.params as { versionId: string };
        const result = await getWorkflowVersionWithDAG(versionId);
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.post(
    "/workflow-engine/instances/instantiate",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Instantiate a published workflow version for a subject",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const body =
          (request.body as Parameters<typeof instantiateWorkflow>[0]) || {};
        const result = await instantiateWorkflow(body, actor);
        return reply.code(201).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/workflow-engine/instances/:instanceId",
    {
      schema: {
        tags: [...SCM_TAG],
        summary: "Retrieve a live workflow execution instance and task statuses",
        params: buildParamSchema("instanceId", "Workflow instance identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...SCM_ERROR_RESPONSES,
        },
      },
    },
    async (request, reply) => {
      try {
        const { instanceId } = request.params as { instanceId: string };
        const result = await getWorkflowInstanceById(instanceId);
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
};

export { scmV1Routes };
export default scmV1Routes;
