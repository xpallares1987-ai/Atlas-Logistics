import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { desc } from "drizzle-orm";
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
} from "../scm/contexts/operational-intelligence/operations-cockpit-bff.context.js";
import {
  createOperationalShipment,
  updateOperationalShipment,
  createInitialRoutePlan,
  getShipment360OperationalModel,
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

function extractActorFromRequest(
  request: FastifyRequest,
): SecurityActorContext {
  const headers = request.headers;
  const orgId =
    (headers["x-org-id"] as string) || DEFAULT_OPERATOR_ACTOR.organizationId;
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

function handleDomainError(error: any, reply: FastifyReply) {
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
  return reply.code(500).send({
    error: "INTERNAL_ERROR",
    message: error?.message || "Unexpected error",
  });
}

const scmV1Routes: FastifyPluginAsync = async (fastify) => {
  registerShipment360Projectors();

  // ==========================================================================
  // 06. ORDERS BOUNDED CONTEXT ENDPOINTS
  // ==========================================================================
  fastify.post("/orders", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body = (request.body as any) || {};
      const order = await createCustomerOrder(body, actor);
      return reply.code(201).send(order);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/orders/:id/confirm", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const order = await confirmCustomerOrder(id, actor);
      return reply.send(order);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/orders/:id/cancel", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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

  fastify.get("/orders/:id", async (request, reply) => {
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
  fastify.post("/shipments", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body = (request.body as any) || {};
      const shipment = await createShipmentExecution(body, actor);
      return reply.code(201).send(shipment);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/shipments/:id", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const shipment = await loadShipmentAggregate(id, actor);
      return reply.send(shipment);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/close", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const shipment = await markShipmentDeliveredAndClose(id, actor);
      return reply.send(shipment);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/reopen", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const shipment = await reopenClosedShipment(id, body.reason || "", actor);
      return reply.send(shipment);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 08. TRANSPORT PLANNING BOUNDED CONTEXT ENDPOINTS
  // ==========================================================================
  fastify.post("/shipments/:id/route-plan", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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
  fastify.post("/shipments/:id/cargo", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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

  fastify.post("/shipments/:id/equipment", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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
  fastify.post("/shipments/:id/events", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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

  fastify.post("/shipments/:id/sla-stop-clock", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { id } = request.params as { id: string };
        const body = (request.body as any) || {};
        const result = await evaluateShipmentDataQuality(
          id,
          body.stage || "PRE_DEPARTURE_EXPORT",
          actor,
        );
        return reply.send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.post("/incidents", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body = (request.body as any) || {};
      const result = await promoteExceptionsToMacroIncident(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 20 & 21. SLICE 4 ENDPOINTS — WORKFLOW RUNTIME & DECISION TABLES
  // ==========================================================================
  fastify.get("/decisions", async (_request, reply) => {
    try {
      const list = await listDecisionDefinitions();
      return reply.send(list);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/decisions", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body = (request.body as any) || {};
      const result = await publishDecisionTableVersion(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/decisions/:decisionKey/evaluate", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { decisionKey } = request.params as { decisionKey: string };
      const body = (request.body as any) || {};
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

  fastify.get("/shipments/:id/workflow", async (request, reply) => {
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

  fastify.post("/shipments/:id/workflow/advance", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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

  fastify.post("/shipments/:id/workflow/state", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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
  fastify.get("/consolidations", async (_request, reply) => {
    try {
      const list = await listConsolidations();
      return reply.send(list);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/consolidations", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body = (request.body as any) || {};
      const cns = await createConsolidation(body, actor);
      return reply.code(201).send(cns);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/consolidations/:id/members", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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

  fastify.post("/consolidations/:id/lock", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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

  fastify.get("/shipments/:id/documents", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const docs = await getDocumentsForShipment(id);
      return reply.send(docs);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/documents", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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

  fastify.post("/documents/:documentId/approve", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { documentId } = request.params as { documentId: string };
      const body = (request.body as any) || {};
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

  fastify.post("/documents/:documentId/issue", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { documentId } = request.params as { documentId: string };
      const doc = await issueDocument(documentId, actor);
      return reply.send(doc);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/shipments/:id/customs", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const cases = await getCustomsCasesForShipment(id);
      return reply.send(cases);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/customs", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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

  fastify.post("/customs/:customsCaseId/hold", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { customsCaseId } = request.params as { customsCaseId: string };
      const body = (request.body as any) || {};
      const ccase = await placeCustomsInspectionHold(
        {
          customsCaseId,
          channel: body.channel || "ORANGE",
          reasonCode: body.reasonCode || "DOC_INSPECTION",
          authorityNotes:
            body.authorityNotes ||
            "Requerimiento documental de origen y factura comercial",
        },
        actor,
      );
      return reply.send(ccase);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/customs/:customsCaseId/release", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { customsCaseId } = request.params as { customsCaseId: string };
      const body = (request.body as any) || {};
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
  fastify.get("/shipments/:id/finance", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const fin = await getShipmentFinanceReadModel(id, actor);
      return reply.send(fin);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/shipments/:id/finance/lines", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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

  fastify.post("/shipments/:id/sales-invoices", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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

  fastify.patch("/sales-invoices/:invoiceId", async (request, reply) => {
    try {
      const { invoiceId } = request.params as { invoiceId: string };
      const body = (request.body as any) || {};
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
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { invoiceId } = request.params as { invoiceId: string };
        const body = (request.body as any) || {};
        const inv = await issueSalesCreditNote(
          {
            invoiceId,
            creditReason: body.creditReason,
          },
          actor,
        );
        return reply.send(inv);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.post("/shipments/:id/purchase-invoices", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
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
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { purchaseInvoiceId } = request.params as {
          purchaseInvoiceId: string;
        };
        const body = (request.body as any) || {};
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
  fastify.get("/shipments-360", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const list = await listShipment360ReadModels(actor);
      return reply.send(list);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/shipments/:id/360", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { id } = request.params as { id: string };
      const readModel = await getShipment360ReadModel(id, actor);
      return reply.send(readModel);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/cockpit", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const query = (request.query as any) || {};
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

  fastify.post("/cockpit/:workItemId/execute", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { workItemId } = request.params as { workItemId: string };
      const body = (request.body as any) || {};
      const result = await executeCockpitWorkItem(workItemId, body, actor);
      return reply.send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 25. PLATFORM GOVERNANCE — TRANSACTIONAL OUTBOX & INBOX TELEMETRY
  // ==========================================================================
  fastify.get("/outbox", async (_request, reply) => {
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
  fastify.post("/operational/shipments", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body = (request.body as any) || {};
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

  fastify.put("/operational/shipments/:shipmentId", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const { shipmentId } = request.params as { shipmentId: string };
      const body = request.body as any;
      const result = await updateOperationalShipment(
        { shipmentId, ...body },
        actor,
      );
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/operational/shipments/:shipmentId/route-plan",
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { shipmentId } = request.params as { shipmentId: string };
        const body = (request.body as any) || {};
        const idempotencyKey =
          (request.headers["x-idempotency-key"] as string) ||
          body.idempotencyKey;
        const result = await createInitialRoutePlan(
          { shipmentId, ...body, idempotencyKey },
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

  fastify.get("/operational/shipments-360", async (request, reply) => {
    try {
      const query = (request.query as any) || {};
      const result = await listShipment360Views(query);
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/operational/cockpit", async (request, reply) => {
    try {
      const query = (request.query as any) || {};
      const result = await listOperationalCockpitItems(query);
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/operational/my-work", async (request, reply) => {
    try {
      const query = (request.query as any) || {};
      const result = await listOperationalCockpitItems(query);
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/operational/cockpit/summary", async (_request, reply) => {
    try {
      const result = await getOperationalCockpitSummary();
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/operational/cockpit/:workItemId/execute",
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { workItemId } = request.params as { workItemId: string };
        const body = (request.body as any) || {};
        const result = await executeOperationalCockpitWorkItem(
          workItemId,
          body,
          actor,
        );
        return reply.code(200).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/operational/shipments/:shipmentId/audit-trail",
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

  fastify.get("/operational/outbox/dlq", async (_request, reply) => {
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
    async (request, reply) => {
      try {
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

  fastify.post("/operational/tasks", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body = request.body as any;
      const result = await createTask(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post("/operational/tasks/dependencies", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body = request.body as any;
      const result = await addTaskDependency(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.post(
    "/operational/tasks/:taskId/complete",
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { taskId } = request.params as { taskId: string };
        const body = (request.body as any) || {};
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

  fastify.get("/operational/tasks", async (request, reply) => {
    try {
      const query = (request.query as any) || {};
      const result = await getTasksForSubject(
        query.subjectType || "SHIPMENT",
        query.subjectId,
      );
      return reply.code(200).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ==========================================================================
  // 27. SCM LOGICAL MODEL v1 — WORKFLOW ENGINE (SLICE 4)
  // ==========================================================================
  fastify.post("/workflow-engine/definitions", async (request, reply) => {
    try {
      const actor = extractActorFromRequest(request);
      const body = request.body as any;
      const result = await createWorkflowDefinition(body, actor);
      return reply.code(201).send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  fastify.get("/workflow-engine/definitions", async (_request, reply) => {
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
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { defId } = request.params as { defId: string };
        const body = (request.body as any) || {};
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
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { versionId } = request.params as { versionId: string };
        const body = request.body as any;
        const result = await addTaskDefinitionToVersion(
          { workflowVersionId: versionId, ...body },
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
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const { versionId } = request.params as { versionId: string };
        const body = request.body as any;
        const result = await addDependencyDefinitionToVersion(
          { workflowVersionId: versionId, ...body },
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
    async (request, reply) => {
      try {
        const actor = extractActorFromRequest(request);
        const body = request.body as any;
        const result = await instantiateWorkflow(body, actor);
        return reply.code(201).send(result);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  fastify.get(
    "/workflow-engine/instances/:instanceId",
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

export default scmV1Routes;
