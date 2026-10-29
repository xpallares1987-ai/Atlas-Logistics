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
import { ensureScmFoundationTables } from "../scm/kernel/outbox-bus.js";
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
import {
  getShipment360ReadModel,
  registerShipment360Projectors,
} from "../scm/contexts/operational-intelligence/shipment360.projector.js";
import {
  listOperationsCockpitItems,
  executeCockpitWorkItem,
  listShipment360ReadModels,
} from "../scm/contexts/operational-intelligence/operations-cockpit.projector.js";

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
};

export default scmV1Routes;
