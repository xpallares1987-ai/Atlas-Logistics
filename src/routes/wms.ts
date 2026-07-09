import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../db/client.js";
import { warehouses, stock_items, inventory_movements } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import {
  warehouseSchema,
  stockItemSchema,
  inventoryMovementSchema,
  receiveStockSchema,
  dispatchStockSchema,
} from "../schemas/wms.schema.js";

const wmsRoutes: FastifyPluginAsyncZod = async (server) => {
  // Warehouses

  server.get(
    "/api/wms/warehouses",
    {
      schema: {
        tags: ["WMS"],
        summary: "List Warehouses",
        response: {
          200: z.array(warehouseSchema),
        },
      },
    },
    async () => {
      const results = await db.select().from(warehouses);
      return results;
    },
  );

  server.post(
    "/api/wms/warehouses",
    {
      schema: {
        tags: ["WMS"],
        summary: "Create Warehouse",
        body: warehouseSchema.omit({ id: true }),
        response: {
          201: warehouseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Omit<z.infer<typeof warehouseSchema>, "id">;
      const [warehouse] = await db.insert(warehouses).values(body).returning();
      reply.status(201);
      return warehouse;
    },
  );

  // Stock Items

  server.get(
    "/api/wms/stock",
    {
      schema: {
        tags: ["WMS"],
        summary: "List Stock Levels",
        querystring: z.object({
          shipment_id: z.coerce.number().optional(),
          warehouse_id: z.coerce.number().optional(),
        }),
        response: {
          200: z.array(
            stockItemSchema.extend({
              movements: z.array(inventoryMovementSchema).optional(),
            }),
          ),
        },
      },
    },
    async (request) => {
      const { shipment_id, warehouse_id } = request.query as {
        shipment_id?: number;
        warehouse_id?: number;
      };

      const results = await db.query.stock_items.findMany({
        where: (stock_items, { eq, and }) => {
          const conditions = [];
          if (shipment_id)
            conditions.push(eq(stock_items.shipment_id, shipment_id));
          if (warehouse_id)
            conditions.push(eq(stock_items.warehouse_id, warehouse_id));
          return conditions.length > 0 ? and(...conditions) : undefined;
        },
        with: {
          movements: true,
        },
      });

      return results.map((item) => ({
        ...item,
        weight_kg: item.weight_kg ? Number(item.weight_kg) : null,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
        movements: item.movements.map((m) => ({
          ...m,
          created_at: m.created_at.toISOString(),
        })),
      }));
    },
  );

  // Movements (Receiving / Dispatch)

  server.post(
    "/api/wms/movements/receive",
    {
      schema: {
        tags: ["WMS"],
        summary: "Receive Cargo",
        body: receiveStockSchema,
        response: {
          200: z.object({
            stock_item: stockItemSchema,
            movement: inventoryMovementSchema,
          }),
        },
      },
    },
    async (request) => {
      const body = request.body as z.infer<typeof receiveStockSchema>;

      const result = await db.transaction(async (tx) => {
        // Look for existing stock item for this SKU in this warehouse (and shipment if provided)
        let stockItem;
        const conditions = [
          eq(stock_items.warehouse_id, body.warehouse_id),
          eq(stock_items.sku, body.sku),
        ];
        if (body.shipment_id) {
          conditions.push(eq(stock_items.shipment_id, body.shipment_id));
        }

        const [existingItem] = await tx
          .select()
          .from(stock_items)
          .where(and(...conditions))
          .limit(1);

        if (existingItem) {
          const [updatedItem] = await tx
            .update(stock_items)
            .set({
              quantity_on_hand: existingItem.quantity_on_hand + body.quantity,
              updated_at: new Date(),
            })
            .where(eq(stock_items.id, existingItem.id))
            .returning();
          stockItem = updatedItem;
        } else {
          const [newItem] = await tx
            .insert(stock_items)
            .values({
              warehouse_id: body.warehouse_id,
              shipment_id: body.shipment_id || null,
              sku: body.sku,
              description: body.description,
              quantity_on_hand: body.quantity,
              weight_kg: body.weight_kg ? String(body.weight_kg) : null,
            })
            .returning();
          stockItem = newItem;
        }

        // Record movement
        const [movement] = await tx
          .insert(inventory_movements)
          .values({
            stock_item_id: stockItem.id,
            movement_type: "Receiving",
            quantity_change: body.quantity,
            reference_note: body.reference_note || "Initial receipt",
          })
          .returning();

        return { stockItem, movement };
      });

      return {
        stock_item: {
          ...result.stockItem,
          weight_kg: result.stockItem.weight_kg
            ? Number(result.stockItem.weight_kg)
            : null,
          created_at: result.stockItem.created_at.toISOString(),
          updated_at: result.stockItem.updated_at.toISOString(),
        },
        movement: {
          ...result.movement,
          created_at: result.movement.created_at.toISOString(),
        },
      };
    },
  );

  server.post(
    "/api/wms/movements/dispatch",
    {
      schema: {
        tags: ["WMS"],
        summary: "Dispatch Cargo",
        body: dispatchStockSchema,
        response: {
          200: z.object({
            stock_item: stockItemSchema,
            movement: inventoryMovementSchema,
          }),
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof dispatchStockSchema>;

      try {
        const result = await db.transaction(async (tx) => {
          const [existingItem] = await tx
            .select()
            .from(stock_items)
            .where(eq(stock_items.id, body.stock_item_id))
            .limit(1);

          if (!existingItem) {
            throw new Error("Stock item not found");
          }

          if (existingItem.quantity_on_hand < body.quantity) {
            throw new Error(
              `Insufficient quantity. Available: ${existingItem.quantity_on_hand}`,
            );
          }

          const [updatedItem] = await tx
            .update(stock_items)
            .set({
              quantity_on_hand: existingItem.quantity_on_hand - body.quantity,
              updated_at: new Date(),
            })
            .where(eq(stock_items.id, existingItem.id))
            .returning();

          const [movement] = await tx
            .insert(inventory_movements)
            .values({
              stock_item_id: updatedItem.id,
              movement_type: "Dispatch",
              quantity_change: -body.quantity,
              reference_note: body.reference_note || "Dispatch order",
            })
            .returning();

          return { stockItem: updatedItem, movement };
        });

        return {
          stock_item: {
            ...result.stockItem,
            weight_kg: result.stockItem.weight_kg
              ? Number(result.stockItem.weight_kg)
              : null,
            created_at: result.stockItem.created_at.toISOString(),
            updated_at: result.stockItem.updated_at.toISOString(),
          },
          movement: {
            ...result.movement,
            created_at: result.movement.created_at.toISOString(),
          },
        };
      } catch (e: any) {
        return reply.status(400).send({ error: e.message });
      }
    },
  );
};

export default wmsRoutes;
