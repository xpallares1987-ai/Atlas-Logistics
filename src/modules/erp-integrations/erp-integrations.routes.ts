import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createHash } from "node:crypto";
import { eq, desc } from "drizzle-orm";
import { ERP_DEMO_PRESETS } from "@atlas/shared";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { erpIntegrationService } from "./erp-integrations.service.js";

// Validation Schemas
const SyncSapPoSchema = z.object({
  poNumber: z.string().min(1),
});

const PostSapDeliverySchema = z.object({
  poNumber: z.string().min(1),
  billOfLading: z.string().min(1),
  carrierName: z.string().min(1),
  containerId: z.string().min(1),
  items: z
    .array(
      z.object({
        material: z.string(),
        quantity: z.number().positive(),
      }),
    )
    .default([]),
});

const PostSapFreightAccrualSchema = z.object({
  poNumber: z.string().min(1),
  freightAmount: z.number().positive(),
  currency: z.string().default("EUR"),
  costCenter: z.string().optional(),
});

const SyncNetSuiteOrderSchema = z.object({
  orderNumber: z.string().min(1),
});

const PostNetSuiteReceiptSchema = z.object({
  orderNumber: z.string().min(1),
  bolNumber: z.string().min(1),
  totalFreight: z.number().positive(),
  method: z.enum(["VALUE", "WEIGHT", "VOLUME"]).default("VALUE"),
  items: z.array(
    z.object({
      line: z.number(),
      itemRefName: z.string(),
      quantity: z.number(),
      unitValue: z.number(),
      weightKg: z.number(),
      volumeCbm: z.number(),
    }),
  ),
});

const BatchQueueSchema = z.object({
  mutations: z.array(
    z.object({
      id: z.string(),
      erpSystem: z.string(),
      operation: z.string(),
      payloadJson: z.string(),
    }),
  ),
});

const DirectSyncSchema = z.object({
  poNumber: z.string().min(1),
  erpSystem: z.enum(["SAP_S4HANA", "ORACLE_NETSUITE"]).optional(),
});

export const erpIntegrationsRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Telemetry and Connector Health Status
  fastify.get("/status", async (_request, reply) => {
    const statuses = erpIntegrationService.getConnectorStatuses();
    return reply.status(200).send({
      success: true,
      connectors: statuses,
    });
  });

  // 2. Demo Presets
  fastify.get("/presets", async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      presets: ERP_DEMO_PRESETS,
    });
  });

  // 2.1 Get ERP Orders from SQLite (optionally filtered by shipmentId)
  fastify.get("/orders", async (request, reply) => {
    const { shipmentId } = request.query as { shipmentId?: string };

    let orders;
    if (shipmentId) {
      orders = await db
        .select()
        .from(schema.erpPurchaseOrders)
        .where(eq(schema.erpPurchaseOrders.shipmentId, shipmentId))
        .orderBy(desc(schema.erpPurchaseOrders.createdAt));
    } else {
      orders = await db
        .select()
        .from(schema.erpPurchaseOrders)
        .orderBy(desc(schema.erpPurchaseOrders.createdAt));
    }

    const formattedOrders = orders.map((o) => {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(o.lineItemsJson);
      } catch {
        parsedItems = [];
      }
      return {
        ...o,
        items: parsedItems,
      };
    });

    return reply.status(200).send({
      success: true,
      orders: formattedOrders,
    });
  });

  // 2.2 Direct Operational Sync against SQLite
  fastify.post("/sync", async (request, reply) => {
    const parse = DirectSyncSchema.safeParse(request.body);
    if (!parse.success) {
      return reply
        .status(400)
        .send({ error: "Invalid sync payload", issues: parse.error.issues });
    }

    const { poNumber } = parse.data;

    const [existingOrder] = await db
      .select()
      .from(schema.erpPurchaseOrders)
      .where(eq(schema.erpPurchaseOrders.poNumber, poNumber))
      .limit(1);

    if (existingOrder) {
      const now = Date.now();
      await db
        .update(schema.erpPurchaseOrders)
        .set({
          status: "RELEASED",
          updatedAt: now,
        })
        .where(eq(schema.erpPurchaseOrders.id, existingOrder.id));

      const logId = `log_${now}_${Math.random().toString(36).slice(2, 7)}`;
      const logRecord = {
        id: logId,
        poId: existingOrder.id,
        erpSystem: existingOrder.erpSystem,
        operation:
          existingOrder.erpSystem === "SAP_S4HANA"
            ? "API_PURCHASEORDER_PROCESS_SRV"
            : "record/v1/purchaseOrder",
        status: "SUCCESS" as const,
        requestPayloadJson: JSON.stringify({
          poNumber: existingOrder.poNumber,
        }),
        responsePayloadJson: JSON.stringify({
          status: "SYNCED",
          totalAmount: existingOrder.totalAmount,
          currency: existingOrder.currency,
        }),
        latencyMs: Math.floor(90 + Math.random() * 50),
        createdAt: now,
      };

      await db.insert(schema.erpSyncLogs).values(logRecord);

      return reply.status(200).send({
        success: true,
        order: {
          ...existingOrder,
          syncStatus: "SYNCED",
          status: "RELEASED",
          updatedAt: now,
        },
        syncLog: {
          ...logRecord,
          referenceDocument: existingOrder.poNumber,
        },
      });
    }

    // Fallback to mock service if not in database
    const result = await erpIntegrationService.syncSapPurchaseOrder(poNumber);
    return reply.status(200).send(result);
  });

  // 3. SAP S/4HANA PO Sync
  fastify.post("/sap/sync-po", async (request, reply) => {
    const parse = SyncSapPoSchema.safeParse(request.body);
    if (!parse.success) {
      return reply
        .status(400)
        .send({ error: "Invalid SAP PO payload", issues: parse.error.issues });
    }

    const [dbOrder] = await db
      .select()
      .from(schema.erpPurchaseOrders)
      .where(eq(schema.erpPurchaseOrders.poNumber, parse.data.poNumber))
      .limit(1);

    if (dbOrder) {
      const now = Date.now();
      await db
        .update(schema.erpPurchaseOrders)
        .set({
          status: "RELEASED",
          updatedAt: now,
        })
        .where(eq(schema.erpPurchaseOrders.id, dbOrder.id));

      await db.insert(schema.erpSyncLogs).values({
        id: `log_sap_${now}_${Math.random().toString(36).slice(2, 6)}`,
        poId: dbOrder.id,
        erpSystem: "SAP_S4HANA",
        operation: "API_PURCHASEORDER_PROCESS_SRV",
        status: "SUCCESS",
        requestPayloadJson: JSON.stringify({ poNumber: parse.data.poNumber }),
        responsePayloadJson: JSON.stringify({ sapStatus: "RELEASED" }),
        latencyMs: 110,
        createdAt: now,
      });
    }

    const result = await erpIntegrationService.syncSapPurchaseOrder(
      parse.data.poNumber,
    );
    return reply.status(200).send(result);
  });

  // 4. SAP S/4HANA Inbound Delivery (ASN)
  fastify.post("/sap/post-delivery", async (request, reply) => {
    const parse = PostSapDeliverySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid Inbound Delivery payload",
        issues: parse.error.issues,
      });
    }

    const result = await erpIntegrationService.postSapInboundDelivery(
      parse.data,
    );

    const [dbOrder] = await db
      .select()
      .from(schema.erpPurchaseOrders)
      .where(eq(schema.erpPurchaseOrders.poNumber, parse.data.poNumber))
      .limit(1);

    if (dbOrder) {
      const now = Date.now();
      await db
        .update(schema.erpPurchaseOrders)
        .set({
          status: "IN_TRANSIT",
          grnNumber: result.deliveryDocument,
          updatedAt: now,
        })
        .where(eq(schema.erpPurchaseOrders.id, dbOrder.id));

      await db.insert(schema.erpSyncLogs).values({
        id: `log_asn_${now}_${Math.random().toString(36).slice(2, 6)}`,
        poId: dbOrder.id,
        erpSystem: "SAP_S4HANA",
        operation: "POST API_INBOUND_DELIVERY_SRV",
        status: "SUCCESS",
        requestPayloadJson: JSON.stringify(parse.data),
        responsePayloadJson: JSON.stringify(result.data),
        latencyMs: 95,
        createdAt: now,
      });
    }

    return reply.status(201).send(result);
  });

  // 5. SAP S/4HANA Service Entry Sheet (Freight Accrual)
  fastify.post("/sap/post-freight-accrual", async (request, reply) => {
    const parse = PostSapFreightAccrualSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid Freight Accrual payload",
        issues: parse.error.issues,
      });
    }

    const result = await erpIntegrationService.postSapFreightAccrual(
      parse.data,
    );

    const [dbOrder] = await db
      .select()
      .from(schema.erpPurchaseOrders)
      .where(eq(schema.erpPurchaseOrders.poNumber, parse.data.poNumber))
      .limit(1);

    if (dbOrder) {
      const now = Date.now();
      await db
        .update(schema.erpPurchaseOrders)
        .set({
          freightAccrualDocNumber: result.serviceEntrySheet,
          updatedAt: now,
        })
        .where(eq(schema.erpPurchaseOrders.id, dbOrder.id));

      await db.insert(schema.erpSyncLogs).values({
        id: `log_ses_${now}_${Math.random().toString(36).slice(2, 6)}`,
        poId: dbOrder.id,
        erpSystem: "SAP_S4HANA",
        operation: "POST API_SERVICE_ENTRY_SHEET_SRV",
        status: "SUCCESS",
        requestPayloadJson: JSON.stringify(parse.data),
        responsePayloadJson: JSON.stringify(result),
        latencyMs: 80,
        createdAt: now,
      });
    }

    return reply.status(201).send(result);
  });

  // 6. NetSuite Order Sync
  fastify.post("/netsuite/sync-order", async (request, reply) => {
    const parse = SyncNetSuiteOrderSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid NetSuite order payload",
        issues: parse.error.issues,
      });
    }

    const [dbOrder] = await db
      .select()
      .from(schema.erpPurchaseOrders)
      .where(eq(schema.erpPurchaseOrders.poNumber, parse.data.orderNumber))
      .limit(1);

    if (dbOrder) {
      const now = Date.now();
      await db
        .update(schema.erpPurchaseOrders)
        .set({
          status: "RELEASED",
          updatedAt: now,
        })
        .where(eq(schema.erpPurchaseOrders.id, dbOrder.id));

      await db.insert(schema.erpSyncLogs).values({
        id: `log_ns_${now}_${Math.random().toString(36).slice(2, 6)}`,
        poId: dbOrder.id,
        erpSystem: "ORACLE_NETSUITE",
        operation: "GET record/v1/purchaseOrder",
        status: "SUCCESS",
        requestPayloadJson: JSON.stringify({
          orderNumber: parse.data.orderNumber,
        }),
        responsePayloadJson: JSON.stringify({ status: "RELEASED" }),
        latencyMs: 140,
        createdAt: now,
      });
    }

    const result = await erpIntegrationService.syncNetSuiteOrder(
      parse.data.orderNumber,
    );
    return reply.status(200).send(result);
  });

  // 7. NetSuite Item Receipt with Landed Cost
  fastify.post("/netsuite/post-receipt", async (request, reply) => {
    const parse = PostNetSuiteReceiptSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid NetSuite receipt payload",
        issues: parse.error.issues,
      });
    }

    const result = await erpIntegrationService.postNetSuiteItemReceipt(
      parse.data,
    );

    const [dbOrder] = await db
      .select()
      .from(schema.erpPurchaseOrders)
      .where(eq(schema.erpPurchaseOrders.poNumber, parse.data.orderNumber))
      .limit(1);

    if (dbOrder) {
      const now = Date.now();
      await db
        .update(schema.erpPurchaseOrders)
        .set({
          status: "GOODS_RECEIPT_POSTED",
          grnNumber: result.receiptId,
          updatedAt: now,
        })
        .where(eq(schema.erpPurchaseOrders.id, dbOrder.id));

      await db.insert(schema.erpSyncLogs).values({
        id: `log_nsrec_${now}_${Math.random().toString(36).slice(2, 6)}`,
        poId: dbOrder.id,
        erpSystem: "ORACLE_NETSUITE",
        operation: "POST record/v1/itemReceipt",
        status: "SUCCESS",
        requestPayloadJson: JSON.stringify(parse.data),
        responsePayloadJson: JSON.stringify(result),
        latencyMs: 165,
        createdAt: now,
      });
    }

    return reply.status(201).send(result);
  });

  // 8. Dexie Offline Queue Batch Sync
  fastify.post("/queue/batch", async (request, reply) => {
    const parse = BatchQueueSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid batch queue payload",
        issues: parse.error.issues,
      });
    }
    const result = await erpIntegrationService.processBatchQueue(
      parse.data.mutations,
    );
    return reply.status(200).send(result);
  });

  // 9. Audit Logs (Combines database persisted sync logs with service logs)
  fastify.get("/audit-logs", async (_request, reply) => {
    const dbLogs = await db
      .select()
      .from(schema.erpSyncLogs)
      .orderBy(desc(schema.erpSyncLogs.createdAt))
      .limit(50);

    if (dbLogs.length > 0) {
      const formattedDbLogs = dbLogs.map((l) => ({
        id: l.id,
        timestamp: new Date(l.createdAt).toISOString(),
        erpSystem: l.erpSystem,
        operation: l.operation,
        referenceDocument: l.poId,
        status: l.status,
        statusCode: 200,
        latencyMs: l.latencyMs,
        payloadDigest: createHash("sha256")
          .update(l.id + l.createdAt)
          .digest("hex")
          .slice(0, 32),
      }));

      return reply.status(200).send({
        success: true,
        logs: formattedDbLogs,
      });
    }

    const serviceLogs = erpIntegrationService.getAuditLogs();
    return reply.status(200).send({
      success: true,
      logs: serviceLogs,
    });
  });
};

export default erpIntegrationsRoutes;
