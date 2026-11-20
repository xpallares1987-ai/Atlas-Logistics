/**
 * @file warehouse-traffic.routes.ts
 * @description Operational route handlers for warehouse dock traffic and 3D visual inventory synchronization.
 * @module @atlas/routes/operations/warehouse-traffic
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import { warehouseTraffic } from "../../db/schema/operations.js";
import { warehouseInventory } from "../../db/schema/support.js";
import { eq } from "drizzle-orm";
import { logger } from "../../config/logger.js";
import { ensureOperationsSeedData } from "./seed-data.js";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_SUCCESS_FLAG_SCHEMA,
  buildErrorResponses,
} from "../openapi.schemas.js";

const WAREHOUSE_TRAFFIC_TAG = ["Warehouse Operations"] as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TrafficParams {
  id: string;
}

interface UpdateTrafficBody {
  status?: string;
  assignedDock?: string;
  eta?: string;
}

interface InventoryItemPayload {
  id: string;
  warehouseId?: string;
  ownership?: string;
  customer?: string;
  buyer?: string;
  productCode?: string;
  description?: string;
  quantity?: number;
  zone?: string;
  metadata?: Record<string, unknown>;
  status?: string;
}

interface SyncInventoryBody {
  items: InventoryItemPayload[];
}

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

export const warehouseTrafficOperationsRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  fastify.get(
    "/warehouse/traffic",
    {
      schema: {
        tags: [...WAREHOUSE_TRAFFIC_TAG],
        summary: "List live warehouse dock traffic and yard arrivals",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        await ensureOperationsSeedData();
        const traffic = await db.select().from(warehouseTraffic);
        return { success: true, data: traffic };
      } catch (error: unknown) {
        logger.error(error, "Failed to fetch warehouse traffic");
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );

  fastify.put<{ Params: TrafficParams; Body: UpdateTrafficBody }>(
    "/warehouse/traffic/:id",
    {
      schema: {
        tags: [...WAREHOUSE_TRAFFIC_TAG],
        summary:
          "Update dock assignment, status, or ETA for a warehouse traffic record",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { status, assignedDock, eta } = request.body || {};
      try {
        const updated = await db
          .update(warehouseTraffic)
          .set({ status, assignedDock, eta, updatedAt: new Date() })
          .where(eq(warehouseTraffic.id, id))
          .returning();

        if (updated.length === 0) {
          return reply
            .code(404)
            .send({ success: false, error: "Traffic record not found" });
        }
        return { success: true, data: updated[0] };
      } catch (error: unknown) {
        logger.error(error, "Failed to update warehouse traffic");
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );

  fastify.get(
    "/warehouse/inventory",
    {
      schema: {
        tags: [...WAREHOUSE_TRAFFIC_TAG],
        summary:
          "List 3D warehouse visual inventory items with bay coordinates",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        await ensureOperationsSeedData();
        const inventory = await db.select().from(warehouseInventory);
        const formatted = inventory.map((item, index) => {
          const row = Math.floor(index / 2) - 1;
          const col = index % 2 === 0 ? -1 : 1;
          const z = 0;

          return {
            id: item.id,
            warehouseId: item.locationId,
            ownership: item.ownership,
            customer: item.customer,
            buyer: item.buyer,
            productCode: item.productCode,
            description: item.itemDescription,
            quantity: item.quantity,
            zone: item.zone,
            metadata: item.metadata ? JSON.parse(item.metadata as string) : {},
            status: item.status,
            pos: [col, row * 2 + 0.7, z],
            color:
              item.status === "AVAILABLE"
                ? "#10b981"
                : item.status === "RESERVED"
                  ? "#f59e0b"
                  : "#3b82f6",
            sku: item.productCode,
            weight: item.quantity ? item.quantity * 100 : 500,
            destination: item.customer || "Unknown",
          };
        });
        return { success: true, data: formatted };
      } catch (error: unknown) {
        logger.error(error, "Failed to fetch warehouse inventory");
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );

  fastify.post<{ Body: SyncInventoryBody }>(
    "/warehouse/inventory",
    {
      schema: {
        tags: [...WAREHOUSE_TRAFFIC_TAG],
        summary: "Batch upsert 3D warehouse visual inventory items",
        response: {
          200: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const items = request.body?.items || [];
      try {
        for (const item of items) {
          await db
            .insert(warehouseInventory)
            .values({
              id: item.id,
              locationId: item.warehouseId || "loc-default",
              ownership: item.ownership || "INTERNAL",
              customer: item.customer,
              buyer: item.buyer,
              productCode: item.productCode,
              itemDescription: item.description || "General Cargo",
              quantity: item.quantity ?? 0,
              zone: item.zone || "DRY",
              metadata: JSON.stringify(item.metadata || {}),
              status: item.status || "IN_STOCK",
            })
            .onConflictDoUpdate({
              target: warehouseInventory.id,
              set: {
                quantity: item.quantity ?? 0,
                status: item.status || "IN_STOCK",
                zone: item.zone || "DRY",
                updatedAt: new Date(),
              },
            });
        }
        return { success: true };
      } catch (error: unknown) {
        logger.error(error, "Failed to sync warehouse inventory");
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );
};
