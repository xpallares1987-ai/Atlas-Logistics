import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ERP_DEMO_PRESETS } from "@atlas/shared";
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
  items: z.array(
    z.object({
      material: z.string(),
      quantity: z.number().positive(),
    })
  ).default([]),
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
    })
  ),
});

const BatchQueueSchema = z.object({
  mutations: z.array(
    z.object({
      id: z.string(),
      erpSystem: z.string(),
      operation: z.string(),
      payloadJson: z.string(),
    })
  ),
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

  // 3. SAP S/4HANA PO Sync
  fastify.post("/sap/sync-po", async (request, reply) => {
    const parse = SyncSapPoSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid SAP PO payload", issues: parse.error.issues });
    }
    const result = await erpIntegrationService.syncSapPurchaseOrder(parse.data.poNumber);
    return reply.status(200).send(result);
  });

  // 4. SAP S/4HANA Inbound Delivery (ASN)
  fastify.post("/sap/post-delivery", async (request, reply) => {
    const parse = PostSapDeliverySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid Inbound Delivery payload", issues: parse.error.issues });
    }
    const result = await erpIntegrationService.postSapInboundDelivery(parse.data);
    return reply.status(201).send(result);
  });

  // 5. SAP S/4HANA Service Entry Sheet (Freight Accrual)
  fastify.post("/sap/post-freight-accrual", async (request, reply) => {
    const parse = PostSapFreightAccrualSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid Freight Accrual payload", issues: parse.error.issues });
    }
    const result = await erpIntegrationService.postSapFreightAccrual(parse.data);
    return reply.status(201).send(result);
  });

  // 6. NetSuite Order Sync
  fastify.post("/netsuite/sync-order", async (request, reply) => {
    const parse = SyncNetSuiteOrderSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid NetSuite order payload", issues: parse.error.issues });
    }
    const result = await erpIntegrationService.syncNetSuiteOrder(parse.data.orderNumber);
    return reply.status(200).send(result);
  });

  // 7. NetSuite Item Receipt with Landed Cost
  fastify.post("/netsuite/post-receipt", async (request, reply) => {
    const parse = PostNetSuiteReceiptSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid NetSuite receipt payload", issues: parse.error.issues });
    }
    const result = await erpIntegrationService.postNetSuiteItemReceipt(parse.data);
    return reply.status(201).send(result);
  });

  // 8. Dexie Offline Queue Batch Sync
  fastify.post("/queue/batch", async (request, reply) => {
    const parse = BatchQueueSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid batch queue payload", issues: parse.error.issues });
    }
    const result = await erpIntegrationService.processBatchQueue(parse.data.mutations);
    return reply.status(200).send(result);
  });

  // 9. Audit Logs
  fastify.get("/audit-logs", async (_request, reply) => {
    const logs = erpIntegrationService.getAuditLogs();
    return reply.status(200).send({
      success: true,
      logs,
    });
  });
};

export default erpIntegrationsRoutes;
