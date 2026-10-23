import crypto from "node:crypto";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  OperationalAnomalyType,
  AnomalyPayloadContext,
  WebhookAuditLog,
  TelegramDriverMessage,
  TelegramDispatchOrder,
  generateAdaptiveCardPayload,
  getSampleAnomalyContext,
  generateHmacSignature,
  createDriverReport,
  createDispatchOrder,
} from "@atlas/shared";

// In-memory state for audit history and driver messages
const auditHistory: WebhookAuditLog[] = [
  {
    id: "wh-init-001",
    anomalyType: "COLD_CHAIN_TEMP_BREACH",
    gsid: "GS-2026-ROT-33290",
    dispatchedAt: new Date(Date.now() - 3600000).toISOString(),
    targetUrl: "https://outlook.office.com/webhook/v2/atlas-control-tower...",
    status: "DELIVERED",
    httpStatus: 200,
    hmacSignature: "hmac_8a91b2c3d4e5f67890123456789abcdef",
    payloadPreview: generateAdaptiveCardPayload(
      "COLD_CHAIN_TEMP_BREACH",
      getSampleAnomalyContext("COLD_CHAIN_TEMP_BREACH"),
    ),
  },
  {
    id: "wh-init-002",
    anomalyType: "CUSTOMS_CANAL_ROJO",
    gsid: "GS-2026-VLC-11402",
    dispatchedAt: new Date(Date.now() - 7200000).toISOString(),
    targetUrl: "https://outlook.office.com/webhook/v2/atlas-control-tower...",
    status: "DELIVERED",
    httpStatus: 200,
    hmacSignature: "hmac_7b82a1c4d5e6f7890123456789abcdef",
    payloadPreview: generateAdaptiveCardPayload(
      "CUSTOMS_CANAL_ROJO",
      getSampleAnomalyContext("CUSTOMS_CANAL_ROJO"),
    ),
  },
];

const driverMessages: TelegramDriverMessage[] = [
  {
    messageId: "TG-MSG-101",
    driverName: "Juan Carlos Mendoza",
    telegramChatId: "@driver_juan_scm",
    truckId: "TRK-4821-LXZ",
    reportType: "GATE_OUT_TIMESTAMP",
    details:
      "Salida de terminal Can Tunis / Morrot confirmada con precinto verificado.",
    location: "Can Tunis (BCN)",
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    status: "PROCESSED_SCM",
  },
  {
    messageId: "TG-MSG-102",
    driverName: "Marc Valls",
    telegramChatId: "@driver_marc_vlc",
    truckId: "TRK-9012-KZX",
    reportType: "YARD_DELAY",
    details:
      "Espera de 35 minutos en muelle 4 por mantenimiento de grúa reach stacker.",
    amountOrMinutes: 35,
    location: "Noatum Terminal Valencia",
    timestamp: new Date(Date.now() - 2700000).toISOString(),
    status: "PROCESSED_SCM",
  },
  {
    messageId: "TG-MSG-103",
    driverName: "Alejandro Gómez",
    telegramChatId: "@driver_alex_bio",
    truckId: "TRK-3341-MMP",
    reportType: "FUEL_RECEIPT",
    details:
      "Repostaje en estación de servicio AP-7 Sant Celoni (420 L Diésel B7).",
    amountOrMinutes: 685.5,
    location: "AP-7 Sant Celoni",
    timestamp: new Date(Date.now() - 900000).toISOString(),
    status: "PROCESSED_SCM",
  },
];

const dispatchOrders: TelegramDispatchOrder[] = [
  {
    orderId: "DSP-ORD-8801",
    driverName: "Juan Carlos Mendoza",
    telegramChatId: "@driver_juan_scm",
    truckId: "TRK-4821-LXZ",
    pickupLocation: "Can Tunis Logistainer (Barcelona)",
    deliveryLocation: "Customer01 Paper El Prat (TLSA)",
    cargoDescription: "1x 40ft HC Bobinas Papel Kraft (24,800 kg)",
    containerNumber: "MSKU7729104",
    scheduledPickupTime: new Date(Date.now() + 3600000).toISOString(),
    dispatchedAt: new Date(Date.now() - 7200000).toISOString(),
    status: "ACKNOWLEDGED",
  },
];

// Zod validation schemas
const DispatchWebhookSchema = z.object({
  anomalyType: z.enum([
    "SPAIN_FWD_REF_DUPLICATE",
    "CUSTOMS_CANAL_ROJO",
    "COLD_CHAIN_TEMP_BREACH",
    "HAZMAT_VIOLATION",
    "GROSS_PROFIT_LEAKAGE",
    "BL_RELEASE_BLOCKED",
    "ETA_P1_CRITICAL_DELAY",
    "DEMURRAGE_DETENTION_SPIKE",
  ] as [OperationalAnomalyType, ...OperationalAnomalyType[]]),
  context: z.object({
    gsid: z.string().min(3),
    forwardingRef: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
    operator: z.string().optional(),
    detectedAt: z.string().optional(),
    location: z.string().optional(),
    transportMode: z.string().optional(),
    metadata: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
  }) as z.ZodType<AnomalyPayloadContext>,
  targetWebhookUrl: z.string().optional(),
});

const DriverReportSchema = z.object({
  driverName: z.string().min(2),
  telegramChatId: z.string().min(2),
  truckId: z.string().min(2),
  reportType: z.enum([
    "GATE_OUT_TIMESTAMP",
    "YARD_DELAY",
    "FUEL_RECEIPT",
    "POD_SUBMISSION",
  ]),
  details: z.string().min(3),
  amountOrMinutes: z.number().optional(),
  location: z.string().optional(),
});

const DispatchOrderSchema = z.object({
  driverName: z.string().min(2),
  telegramChatId: z.string().min(2),
  truckId: z.string().min(2),
  pickupLocation: z.string().min(2),
  deliveryLocation: z.string().min(2),
  cargoDescription: z.string().min(2),
  containerNumber: z.string().optional(),
  scheduledPickupTime: z.string().optional(),
});

const isExampleWebhookUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
    return hostname === "example.com" || hostname.endsWith(".example.com");
  } catch {
    return url.toLowerCase() === "example.com";
  }
};

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/notifications/teams/templates
  fastify.get("/teams/templates", async () => {
    const anomalyTypes: OperationalAnomalyType[] = [
      "SPAIN_FWD_REF_DUPLICATE",
      "CUSTOMS_CANAL_ROJO",
      "COLD_CHAIN_TEMP_BREACH",
      "HAZMAT_VIOLATION",
      "GROSS_PROFIT_LEAKAGE",
      "BL_RELEASE_BLOCKED",
      "ETA_P1_CRITICAL_DELAY",
      "DEMURRAGE_DETENTION_SPIKE",
    ];

    const templates = anomalyTypes.map((type) => {
      const sampleCtx = getSampleAnomalyContext(type);
      const cardPayload = generateAdaptiveCardPayload(type, sampleCtx);
      return {
        anomalyType: type,
        sampleContext: sampleCtx,
        cardPayload,
      };
    });

    return {
      success: true,
      templates,
    };
  });

  // POST /api/notifications/teams/dispatch
  fastify.post("/teams/dispatch", async (request, reply) => {
    try {
      const { anomalyType, context, targetWebhookUrl } =
        DispatchWebhookSchema.parse(request.body);
      const cardPayload = generateAdaptiveCardPayload(anomalyType, context);
      const jsonString = JSON.stringify(cardPayload);
      const signature = generateHmacSignature(jsonString);

      const targetUrl = targetWebhookUrl?.trim() || "";
      const isSimulated = !targetUrl || isExampleWebhookUrl(targetUrl) || targetUrl.toLowerCase() === "simulated";

      const logEntry: WebhookAuditLog = {
        id: `wh-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        anomalyType,
        gsid: context.gsid,
        dispatchedAt: new Date().toISOString(),
        targetUrl: targetUrl
          ? targetUrl.length > 35
            ? `${targetUrl.substring(0, 32)}...`
            : targetUrl
          : "SIMULATED_LOCAL",
        status: isSimulated ? "SIMULATED" : "DELIVERED",
        httpStatus: 200,
        payloadPreview: cardPayload,
        hmacSignature: `sha256=${signature}`,
      };

      if (!isSimulated && typeof fetch !== "undefined") {
        try {
          const res = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Hub-Signature-256": `sha256=${signature}`,
              "X-Atlas-Anomaly-Type": anomalyType,
              "X-Atlas-GSID": context.gsid,
            },
            body: jsonString,
          });
          logEntry.httpStatus = res.status;
          logEntry.status = res.ok ? "DELIVERED" : "FAILED";
          if (!res.ok) {
            logEntry.errorMessage = `HTTP ${res.status}: ${await res.text().catch(() => "")}`;
          }
        } catch (err: any) {
          logEntry.status = "FAILED";
          logEntry.errorMessage =
            err.message || "Network error dispatching webhook";
        }
      }

      auditHistory.unshift(logEntry);
      if (auditHistory.length > 100) auditHistory.pop();

      return reply.send({
        success: true,
        data: {
          log: logEntry,
          cardPayload,
        },
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // GET /api/notifications/teams/audit-log
  fastify.get("/teams/audit-log", async () => {
    return {
      success: true,
      logs: auditHistory,
    };
  });

  // POST /api/notifications/telegram/driver-report
  fastify.post("/telegram/driver-report", async (request, reply) => {
    try {
      const parsed = DriverReportSchema.parse(request.body);
      const newReport = createDriverReport(
        parsed.driverName,
        parsed.telegramChatId,
        parsed.truckId,
        parsed.reportType,
        parsed.details,
        parsed.amountOrMinutes,
        parsed.location,
      );

      driverMessages.unshift(newReport);
      if (driverMessages.length > 150) driverMessages.pop();

      return reply.send({
        success: true,
        data: newReport,
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // GET /api/notifications/telegram/messages
  fastify.get("/telegram/messages", async () => {
    return {
      success: true,
      messages: driverMessages,
    };
  });

  // POST /api/notifications/telegram/dispatch-order
  fastify.post("/telegram/dispatch-order", async (request, reply) => {
    try {
      const parsed = DispatchOrderSchema.parse(request.body);
      const order = createDispatchOrder(parsed);

      dispatchOrders.unshift(order);
      if (dispatchOrders.length > 100) dispatchOrders.pop();

      // Also append an automated event to driver messages
      const autoMsg = createDriverReport(
        parsed.driverName,
        parsed.telegramChatId,
        parsed.truckId,
        "GATE_OUT_TIMESTAMP",
        `Orden de transporte ${order.orderId} despachada hacia ${parsed.deliveryLocation}.`,
        undefined,
        parsed.pickupLocation,
      );
      driverMessages.unshift(autoMsg);

      return reply.send({
        success: true,
        data: order,
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // GET /api/notifications/telegram/orders
  fastify.get("/telegram/orders", async () => {
    return {
      success: true,
      orders: dispatchOrders,
    };
  });
};

export default notificationsRoutes;
