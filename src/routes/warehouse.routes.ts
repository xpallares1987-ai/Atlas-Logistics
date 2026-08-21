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

export function broadcastWarehouseEvent(event: {
  type: string;
  payload?: any;
  [key: string]: any;
}) {
  warehouseEmitter.emit("warehouseEvent", event);
  try {
    if (redis && typeof redis.publish === "function") {
      redis.publish(REDIS_CHANNEL, JSON.stringify(event)).catch(() => {});
    }
  } catch {}
}

const warehouseRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  // WebSocket live feed for tasks, traffic, and inventory
  fastify.get("/ws", { websocket: true }, (connection, req) => {
    req.log.info("Warehouse WebSocket connected");

    const onWarehouseEvent = (data: any) => {
      try {
        connection.socket.send(JSON.stringify(data));
      } catch {}
    };

    warehouseEmitter.on("warehouseEvent", onWarehouseEvent);

    connection.socket.on("close", () => {
      req.log.info("Warehouse WebSocket disconnected");
      warehouseEmitter.off("warehouseEvent", onWarehouseEvent);
    });
  });

  // --- TASKS ENDPOINTS ---

  // Get all active fulfillment tasks
  fastify.get("/tasks", async (_request, reply) => {
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
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Get task by ID
  fastify.get(
    "/tasks/:id",
    { preHandler: [validate(TaskIdParamsSchema)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
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
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Create new task
  fastify.post(
    "/tasks",
    { preHandler: [validate(CreateTaskSchema)] },
    async (request, reply) => {
      try {
        const body = request.body as any;
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
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // Update task status (for Kanban drag & drop)
  fastify.put(
    "/tasks/:id/status",
    {
      preHandler: [
        validate(TaskIdParamsSchema),
        validate(UpdateTaskStatusSchema),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { status } = request.body as { status: string };

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
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // --- TRAFFIC ENDPOINTS ---

  // Get warehouse traffic
  fastify.get("/traffic", async (_request, reply) => {
    try {
      const traffic = await db.select().from(warehouseTraffic);
      return reply.send({ success: true, data: traffic });
    } catch (error: any) {
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  // Create traffic record
  fastify.post(
    "/traffic",
    { preHandler: [validate(CreateTrafficSchema)] },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const id = `TRK-${Math.floor(100 + Math.random() * 900)}`;

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
      } catch (error: any) {
        reply.code(500).send({ success: false, error: error.message });
      }
    },
  );

  // Update warehouse traffic status & dock assignment
  fastify.put(
    "/traffic/:id",
    {
      preHandler: [
        validate(TrafficIdParamsSchema),
        validate(UpdateTrafficSchema),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as any;

        const updateData: any = { updatedAt: new Date() };
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
      } catch (error: any) {
        reply.code(500).send({ success: false, error: error.message });
      }
    },
  );

  // --- INVENTORY ENDPOINTS ---

  // Get warehouse inventory
  fastify.get("/inventory", async (_request, reply) => {
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
    } catch (error: any) {
      reply.code(500).send({ success: false, error: error.message });
    }
  });
};

export default warehouseRoutes;
