/**
 * @file purchase-orders.routes.ts
 * @description Fastify REST routes for Supply Chain Purchase Orders (PO), manufacturing milestones,
 * and freight booking allocation engine (ADR 0032).
 * @module @atlas/api/routes/purchase-orders
 * @see {@link docs/adr/0032-supply-chain-purchase-order-and-booking-allocation-engine.md}
 */

import { FastifyPluginAsync } from "fastify";
import {
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  recordProductionMilestone,
  allocatePoItemsToBooking,
  CreatePurchaseOrderInput,
  RecordMilestoneInput,
  AllocatePoBookingInput,
} from "../services/purchase-orders.service.js";
import { getCurrentTenant } from "../lib/tenancy/index.js";
import {
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "./openapi.schemas.js";

const PO_RECORD_PROPERTIES = {
  id: { type: "string" },
  tenantId: { type: "string" },
  buyerId: { type: "string" },
  supplierId: { type: "string" },
  buyerName: { type: "string" },
  supplierName: { type: "string" },
  poNumber: { type: "string" },
  incoterm: { type: "string" },
  expectedCargoReadyDate: { type: "string" },
  status: { type: "string" },
  notes: { type: ["string", "null"] },
  totalItemsCount: { type: "number" },
  totalQuantity: { type: "string" },
  totalAllocatedQuantity: { type: "string" },
  remainingQuantity: { type: "string" },
  createdAt: { anyOf: [{ type: "string" }, { type: "number" }] },
  updatedAt: {
    anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
  },
} as const;

interface ListPoQuery {
  status?: string;
  buyerId?: string;
  supplierId?: string;
  limit?: string;
}

export const purchaseOrdersRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. List Purchase Orders
  fastify.get<{
    Querystring: ListPoQuery;
  }>(
    "/",
    {
      schema: {
        tags: ["SCM Purchase Orders"],
        summary: "List supply chain purchase orders with item aggregation",
        querystring: openApiObject({
          status: { type: "string", description: "Filter by PO status" },
          buyerId: {
            type: "string",
            description: "Filter by buyer company ID",
          },
          supplierId: {
            type: "string",
            description: "Filter by supplier company ID",
          },
          limit: { type: "string", description: "Limit number of results" },
        }),
        response: {
          200: openApiArray(PO_RECORD_PROPERTIES, "List of Purchase Orders"),
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const tenant = getCurrentTenant();
        const tenantId = tenant?.organizationId || "tenant_default";
        const query = request.query || {};

        const results = await listPurchaseOrders({
          tenantId,
          status: query.status,
          buyerId: query.buyerId,
          supplierId: query.supplierId,
          limit: query.limit ? Number(query.limit) : 50,
        });

        return reply.send(results);
      } catch (err: unknown) {
        fastify.log.error(err, "Error listing purchase orders");
        const message =
          err instanceof Error ? err.message : "Failed to list purchase orders";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // 2. Get Purchase Order by ID
  fastify.get<{
    Params: { id: string };
  }>(
    "/:id",
    {
      schema: {
        tags: ["SCM Purchase Orders"],
        summary:
          "Get relational Purchase Order detail with line items and milestones",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: openApiObject(
            {
              ...PO_RECORD_PROPERTIES,
              lineItems: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              milestones: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
            },
            "Detailed Purchase Order payload",
          ),
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const tenant = getCurrentTenant();
        const tenantId = tenant?.organizationId || "tenant_default";
        const { id } = request.params;

        const po = await getPurchaseOrderById(id, tenantId);
        if (!po) {
          return reply
            .code(404)
            .send({ error: `Purchase Order ${id} not found` });
        }

        return reply.send(po);
      } catch (err: unknown) {
        fastify.log.error(err, "Error fetching purchase order detail");
        const message =
          err instanceof Error ? err.message : "Failed to fetch purchase order";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // 3. Create Purchase Order
  fastify.post<{
    Body: CreatePurchaseOrderInput;
  }>(
    "/",
    {
      schema: {
        tags: ["SCM Purchase Orders"],
        summary:
          "Create a new supply chain Purchase Order with initial line items",
        body: openApiObject({
          buyerId: { type: "string" },
          supplierId: { type: "string" },
          poNumber: { type: "string" },
          incoterm: { type: "string" },
          expectedCargoReadyDate: { type: "string" },
          notes: { type: "string" },
          lineItems: {
            type: "array",
            items: {
              type: "object",
              required: ["skuCode", "description", "quantity"],
              properties: {
                skuCode: { type: "string" },
                description: { type: "string" },
                quantity: { anyOf: [{ type: "string" }, { type: "number" }] },
                uom: { type: "string" },
                hsCode: { type: "string" },
                packageCount: { type: "number" },
                grossWeightKg: {
                  anyOf: [{ type: "string" }, { type: "number" }],
                },
                volumeCbm: { anyOf: [{ type: "string" }, { type: "number" }] },
                originalUnitPrice: {
                  anyOf: [{ type: "string" }, { type: "number" }],
                },
                originalCurrency: { type: "string" },
              },
            },
          },
        }),
        response: {
          201: openApiObject(PO_RECORD_PROPERTIES, "Created Purchase Order"),
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const tenant = getCurrentTenant();
        const tenantId = tenant?.organizationId || "tenant_default";
        const body = request.body;

        if (
          !body.poNumber ||
          !body.buyerId ||
          !body.supplierId ||
          !body.expectedCargoReadyDate
        ) {
          return reply.code(400).send({
            error:
              "poNumber, buyerId, supplierId, and expectedCargoReadyDate are required.",
          });
        }

        const po = await createPurchaseOrder(body, tenantId);
        return reply.code(201).send(po);
      } catch (err: unknown) {
        fastify.log.error(err, "Error creating purchase order");
        const message =
          err instanceof Error
            ? err.message
            : "Failed to create purchase order";
        return reply.code(400).send({ error: message });
      }
    },
  );

  // 4. Record Supplier Production Milestone
  fastify.post<{
    Params: { id: string };
    Body: RecordMilestoneInput;
  }>(
    "/:id/milestones",
    {
      schema: {
        tags: ["SCM Purchase Orders"],
        summary: "Record factory manufacturing milestone for a Purchase Order",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          milestoneCode: { type: "string" },
          plannedDate: { type: "string" },
          actualDate: { type: "string" },
          notes: { type: "string" },
        }),
        response: {
          200: openApiObject(
            PO_RECORD_PROPERTIES,
            "Updated Purchase Order with Milestone",
          ),
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const tenant = getCurrentTenant();
        const tenantId = tenant?.organizationId || "tenant_default";
        const { id } = request.params;
        const body = request.body;

        if (!body.milestoneCode) {
          return reply.code(400).send({ error: "milestoneCode is required." });
        }

        const updatedPo = await recordProductionMilestone(id, body, tenantId);
        return reply.send(updatedPo);
      } catch (err: unknown) {
        fastify.log.error(err, "Error recording production milestone");
        const message =
          err instanceof Error ? err.message : "Failed to record milestone";
        return reply.code(400).send({ error: message });
      }
    },
  );

  // 5. Allocate SKUs to a Freight Booking
  fastify.post<{
    Body: AllocatePoBookingInput;
  }>(
    "/allocate-booking",
    {
      schema: {
        tags: ["SCM Purchase Orders"],
        summary: "Allocate SKU line items to a downstream freight booking",
        body: openApiObject({
          poId: { type: "string" },
          bookingId: { type: "string" },
          allocations: {
            type: "array",
            items: {
              type: "object",
              required: ["lineItemId", "quantityToAllocate"],
              properties: {
                lineItemId: { type: "string" },
                quantityToAllocate: { type: "number" },
              },
            },
          },
        }),
        response: {
          200: openApiObject(
            PO_RECORD_PROPERTIES,
            "Updated Purchase Order after Allocation",
          ),
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const tenant = getCurrentTenant();
        const tenantId = tenant?.organizationId || "tenant_default";
        const body = request.body;

        if (
          !body.poId ||
          !body.bookingId ||
          !body.allocations ||
          body.allocations.length === 0
        ) {
          return reply.code(400).send({
            error:
              "poId, bookingId, and non-empty allocations array are required.",
          });
        }

        const updatedPo = await allocatePoItemsToBooking(
          body,
          undefined,
          tenantId,
        );
        return reply.send(updatedPo);
      } catch (err: unknown) {
        fastify.log.error(err, "Error allocating items to booking");
        const message =
          err instanceof Error
            ? err.message
            : "Failed to allocate items to booking";
        return reply.code(400).send({ error: message });
      }
    },
  );
};

export default purchaseOrdersRoutes;
