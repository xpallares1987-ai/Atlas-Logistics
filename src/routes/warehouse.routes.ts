/**
 * @file warehouse.routes.ts
 * @description Operational route handlers for warehouse fulfillment tasks, dock traffic, and inventory management.
 * @module @atlas/routes/warehouse
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import { db } from "../db/index.js";
import { fulfillmentTasks, orders } from "../db/schema/warehouse.js";
import { warehouseTraffic } from "../db/schema/operations.js";
import { warehouseInventory } from "../db/schema/support.js";
import { eq } from "drizzle-orm";
import EventEmitter from "events";
import { redis } from "../config/redis.js";
import { validate } from "../middleware/validate.js";
import {
  TaskIdParamsSchema,
  UpdateTaskStatusSchema,
  CreateTaskSchema,
  TrafficIdParamsSchema,
  UpdateTrafficSchema,
  CreateTrafficSchema,
} from "./warehouse.schemas.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_SUCCESS_FLAG_SCHEMA,
  buildErrorResponses,
} from "./openapi.schemas.js";

const WAREHOUSE_TAG = ["Warehouse Management"] as const;

// ============================================================================
// TYPE DEFINITIONS & SCHEMAS
// ============================================================================

export interface WarehouseEvent {
  type: string;
  payload?: unknown;
  task?: { id: string; status: string };
  [key: string]: unknown;
}

interface TaskIdParams {
  id: string;
}

interface CreateTaskBody {
  orderId: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
}

interface UpdateTaskStatusBody {
  status: string;
}

interface CreateTrafficBody {
  deviceNumber: string;
  driverName?: string;
  deviceType?: string;
  status?: string;
  eta?: string;
  assignedDock?: string;
  cargoDescription?: string;
  totalWeightExpected?: number;
  expectedQuantity?: number;
  type?: string;
}

interface UpdateTrafficBody {
  status?: string;
  assignedDock?: string;
  eta?: string;
}

interface TrafficIdParams {
  id: string;
}

interface WebSocketConnection {
  socket?: {
    send: (data: string) => void;
    on: (event: string, cb: () => void) => void;
  };
  send?: (data: string) => void;
  on?: (event: string, cb: () => void) => void;
}

// ============================================================================
// EVENT EMITTER & EVENT BUS
// ============================================================================

const warehouseEmitter = new EventEmitter();
warehouseEmitter.setMaxListeners(100);

const REDIS_CHANNEL = "warehouse:events";

// Setup Redis subscriber if not in standalone mock mode
try {
  if (redis && typeof redis.duplicate === "function") {
    const sub = redis.duplicate();
    sub.subscribe(REDIS_CHANNEL, (err) => {
      if (err) {
        // Silently continue with in-memory EventEmitter
      }
    });
    sub.on("message", (channel, message) => {
      if (channel === REDIS_CHANNEL) {
        try {
          const parsed = JSON.parse(message);
          warehouseEmitter.emit("warehouseEvent", parsed);
        } catch {}
      }
    });
  }
} catch {
  // Standalone fallback
}

export function broadcastWarehouseEvent(event: WarehouseEvent) {
  warehouseEmitter.emit("warehouseEvent", event);
  try {
    if (redis && typeof redis.publish === "function") {
      redis.publish(REDIS_CHANNEL, JSON.stringify(event)).catch(() => {});
    }
  } catch {}
}

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

const warehouseRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  // WebSocket live feed for tasks, traffic, and inventory
  fastify.get(
    "/ws",
    {
      websocket: true,
      schema: {
        tags: [...WAREHOUSE_TAG],
        summary:
          "WebSocket live feed for warehouse fulfillment tasks and dock traffic",
        response: {
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    (connection: unknown, req) => {
      req.log.info("Warehouse WebSocket connected");
      const rawConn = connection as WebSocketConnection;
      const ws = rawConn.socket || rawConn;

      const onWarehouseEvent = (data: unknown) => {
        try {
          ws.send?.(JSON.stringify(data));
        } catch {}
      };

      warehouseEmitter.on("warehouseEvent", onWarehouseEvent);

      ws.on?.("close", () => {
        req.log.info("Warehouse WebSocket disconnected");
        warehouseEmitter.off("warehouseEvent", onWarehouseEvent);
      });
    },
  );

  // --- TASKS ENDPOINTS ---

  // Get all active fulfillment tasks
  fastify.get(
    "/tasks",
    {
      schema: {
        tags: [...WAREHOUSE_TAG],
        summary: "List active warehouse fulfillment pick/pack/ship tasks",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        const records = await db
          .select({
            task: fulfillmentTasks,
            order: orders,
          })
          .from(fulfillmentTasks)
          .leftJoin(orders, eq(fulfillmentTasks.orderId, orders.id))
          .limit(100);

        const formatted = records.map((r) => ({
          ...r.task,
          customerName: r.order?.customerName,
          orderStatus: r.order?.status,
          totalAmount: r.order?.totalAmount,
        }));

        return reply.send(formatted);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Get task by ID
  fastify.get<{ Params: TaskIdParams }>(
    "/tasks/:id",
    {
      preHandler: [validate(TaskIdParamsSchema)],
      schema: {
        tags: [...WAREHOUSE_TAG],
        summary: "Retrieve a warehouse fulfillment task with order context",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const records = await db
          .select({
            task: fulfillmentTasks,
            order: orders,
          })
          .from(fulfillmentTasks)
          .leftJoin(orders, eq(fulfillmentTasks.orderId, orders.id))
          .where(eq(fulfillmentTasks.id, id))
          .limit(1);

        if (records.length === 0) {
          return reply.code(404).send({ error: "Task not found" });
        }

        const r = records[0];
        return reply.send({
          ...r.task,
          customerName: r.order?.customerName,
          orderStatus: r.order?.status,
          totalAmount: r.order?.totalAmount,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Create new task
  fastify.post<{ Body: CreateTaskBody }>(
    "/tasks",
    {
      preHandler: [validate(CreateTaskSchema)],
      schema: {
        tags: [...WAREHOUSE_TAG],
        summary: "Create a new warehouse fulfillment task",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body;
        const taskId = `task_${crypto.randomUUID().substring(0, 8)}`;

        await db.insert(fulfillmentTasks).values({
          id: taskId,
          orderId: body.orderId,
          status: body.status || "PICK",
          priority: body.priority || "NORMAL",
          assignedTo: body.assignedTo || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        broadcastWarehouseEvent({
          type: "TASK_CREATED",
          payload: { id: taskId, ...body },
        });

        return reply.code(201).send({ success: true, id: taskId });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Update task status (for Kanban drag & drop)
  fastify.put<{ Params: TaskIdParams; Body: UpdateTaskStatusBody }>(
    "/tasks/:id/status",
    {
      preHandler: [
        validate(TaskIdParamsSchema),
        validate(UpdateTaskStatusSchema),
      ],
      schema: {
        tags: [...WAREHOUSE_TAG],
        summary: "Update warehouse fulfillment task status on the Kanban board",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status } = request.body;

        await db
          .update(fulfillmentTasks)
          .set({ status, updatedAt: new Date() })
          .where(eq(fulfillmentTasks.id, id));

        broadcastWarehouseEvent({
          type: "TASK_UPDATED",
          task: { id, status },
          payload: { task: { id, status } },
        });

        return reply.send({ success: true, id, status });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // --- TRAFFIC ENDPOINTS ---

  // Get warehouse traffic
  fastify.get(
    "/traffic",
    {
      schema: {
        tags: [...WAREHOUSE_TAG],
        summary:
          "List warehouse dock traffic and inbound/outbound yard entries",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        const traffic = await db.select().from(warehouseTraffic);
        return reply.send({ success: true, data: traffic });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );

  // Create traffic record
  fastify.post<{ Body: CreateTrafficBody }>(
    "/traffic",
    {
      preHandler: [validate(CreateTrafficSchema)],
      schema: {
        tags: [...WAREHOUSE_TAG],
        summary:
          "Register a new inbound or outbound warehouse truck/yard arrival",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body;
        const id = `TRK-${crypto.randomUUID().substring(0, 8)}`;

        await db.insert(warehouseTraffic).values({
          id,
          deviceNumber: body.deviceNumber,
          driverName: body.driverName || "Unknown Driver",
          deviceType: body.deviceType || "TRUCK",
          status: body.status || "WAITING",
          eta: body.eta || null,
          assignedDock: body.assignedDock || null,
          cargoDescription: body.cargoDescription || "",
          totalWeightExpected: body.totalWeightExpected || 0,
          expectedQuantity: body.expectedQuantity || 1,
          type: body.type || "INBOUND",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        broadcastWarehouseEvent({
          type: "TRAFFIC_CREATED",
          payload: { id, ...body },
        });

        return reply.code(201).send({ success: true, id });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );

  // Update warehouse traffic status & dock assignment
  fastify.put<{ Params: TrafficIdParams; Body: UpdateTrafficBody }>(
    "/traffic/:id",
    {
      preHandler: [
        validate(TrafficIdParamsSchema),
        validate(UpdateTrafficSchema),
      ],
      schema: {
        tags: [...WAREHOUSE_TAG],
        summary: "Update warehouse traffic status, dock assignment, or ETA",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const body = request.body;

        const updateData: {
          updatedAt: Date;
          status?: string;
          assignedDock?: string;
          eta?: string;
        } = { updatedAt: new Date() };
        if (body.status !== undefined) updateData.status = body.status;
        if (body.assignedDock !== undefined)
          updateData.assignedDock = body.assignedDock;
        if (body.eta !== undefined) updateData.eta = body.eta;

        const updated = await db
          .update(warehouseTraffic)
          .set(updateData)
          .where(eq(warehouseTraffic.id, id))
          .returning();

        if (updated.length === 0) {
          return reply
            .code(404)
            .send({ success: false, error: "Traffic record not found" });
        }

        broadcastWarehouseEvent({
          type: "TRAFFIC_UPDATED",
          payload: updated[0],
        });

        return reply.send({ success: true, data: updated[0] });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );

  // --- INVENTORY ENDPOINTS ---

  // Get warehouse inventory
  fastify.get(
    "/inventory",
    {
      schema: {
        tags: [...WAREHOUSE_TAG],
        summary:
          "List warehouse inventory items with 3D spatial bay coordinates",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        const inventory = await db.select().from(warehouseInventory);
        const formatted = inventory.map((item, index) => {
          const row = Math.floor(index / 2) - 1;
          const col = index % 2 === 0 ? -1 : 1;
          const z = 0;

          return {
            id: item.id,
            sku: item.productCode || item.id,
            customer: item.customer || "General Cargo",
            description: item.itemDescription || "Cargo item",
            quantity: item.quantity || 0,
            zone: item.zone || "GEN-Z1",
            status: item.status || "AVAILABLE",
            locationId: item.locationId || "WH-BCN-01",
            uom: "Pallets",
            weight: (item.quantity || 1) * 250,
            position: [col * 3, 0.5, row * 4 + z] as [number, number, number],
          };
        });

        return reply.send({ success: true, data: formatted });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );
};

export default warehouseRoutes;
