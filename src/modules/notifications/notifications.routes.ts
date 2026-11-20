/**
 * @file notifications.routes.ts
 * @description Fastify routes for Microsoft Teams Adaptive Card anomaly webhook dispatch with HMAC-SHA256 signing and Telegram driver report / transport dispatch messaging.
 * @module @atlas/api/modules/notifications/routes
 */

import crypto from "node:crypto";
import net from "node:net";
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
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. IN-MEMORY AUDIT LEDGER & ZOD VALIDATION SCHEMAS
// ============================================================================

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
      "Salida de terminal intermodal confirmada con precinto verificado.",
    location: "Barcelona Intermodal Hub (BCN)",
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
    pickupLocation: "Barcelona Intermodal Hub (Barcelona)",
    deliveryLocation: "Customer01 Paper El Prat (ZAL Hub)",
    cargoDescription: "1x 40ft HC Bobinas Papel Kraft (24,800 kg)",
    containerNumber: "MSKU7729104",
    scheduledPickupTime: new Date(Date.now() + 3600000).toISOString(),
    dispatchedAt: new Date(Date.now() - 7200000).toISOString(),
    status: "ACKNOWLEDGED",
  },
];

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

const ALLOWED_TEAMS_EXACT_HOSTS = new Set<string>([
  "outlook.office.com",
  "outlook.office365.com",
]);

const ALLOWED_TEAMS_HOST_SUFFIXES = [
  ".webhook.office.com",
  ".logic.azure.com",
] as const;

function resolveValidatedTeamsWebhookUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(
      "Teams webhook URL must use HTTPS without embedded credentials",
    );
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    net.isIP(hostname) !== 0 ||
    !/^[a-z0-9.-]+$/.test(hostname)
  ) {
    throw new Error("Teams webhook host must be an allowlisted public FQDN");
  }

  const matchedExact = Array.from(ALLOWED_TEAMS_EXACT_HOSTS).find(
    (allowed) => allowed === hostname,
  );
  const isAllowedSuffix = ALLOWED_TEAMS_HOST_SUFFIXES.some(
    (suffix) => hostname.endsWith(suffix) && hostname.length > suffix.length,
  );

  if (!matchedExact && !isAllowedSuffix) {
    throw new Error(
      `Disallowed webhook host '${hostname}'; only official Microsoft Teams / Logic Apps HTTPS endpoints are permitted`,
    );
  }

  // SSRF guard (CodeQL js/request-forgery): never forward the user-provided URL.
  // Only dispatch to an operator-registered webhook from TEAMS_WEBHOOK_ALLOWLIST,
  // returning the server-side configured string (not the request value).
  const normalizedCandidate = parsed.href;
  const registered = getRegisteredTeamsWebhooks().find(
    (configured) => configured.href === normalizedCandidate,
  );
  if (!registered) {
    throw new Error(
      "Webhook URL is not registered in TEAMS_WEBHOOK_ALLOWLIST; outbound dispatch refused",
    );
  }
  return registered.configured;
}

/**
 * Parses the operator-managed TEAMS_WEBHOOK_ALLOWLIST environment variable.
 * @returns Registered webhook entries with their raw configured value and normalized href.
 */
function getRegisteredTeamsWebhooks(): Array<{
  configured: string;
  href: string;
}> {
  const raw = process.env.TEAMS_WEBHOOK_ALLOWLIST || "";
  const entries: Array<{ configured: string; href: string }> = [];
  for (const item of raw.split(",")) {
    const configured = item.trim();
    if (!configured) continue;
    try {
      const url = new URL(configured);
      if (url.protocol === "https:") {
        entries.push({ configured, href: url.href });
      }
    } catch {
      // Ignore malformed operator entries
    }
  }
  return entries;
}

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const NOTIFICATIONS_TAG = ["Notifications & Alerting"] as const;

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/notifications/teams/templates
  fastify.get(
    "/teams/templates",
    {
      schema: {
        tags: [...NOTIFICATIONS_TAG],
        summary:
          "List Microsoft Teams Adaptive Card templates for operational anomalies",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async () => {
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
    },
  );

  // 2. POST /api/notifications/teams/dispatch
  fastify.post(
    "/teams/dispatch",
    {
      schema: {
        tags: [...NOTIFICATIONS_TAG],
        summary:
          "Dispatch an HMAC-signed Microsoft Teams Adaptive Card anomaly alert",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { anomalyType, context, targetWebhookUrl } =
          DispatchWebhookSchema.parse(request.body);
        const cardPayload = generateAdaptiveCardPayload(anomalyType, context);
        const jsonString = JSON.stringify(cardPayload);
        const signature = generateHmacSignature(jsonString);

        const targetUrl = targetWebhookUrl?.trim() || "";
        const isSimulated =
          !targetUrl ||
          isExampleWebhookUrl(targetUrl) ||
          targetUrl.toLowerCase() === "simulated";

        const validatedWebhookUrl = isSimulated
          ? null
          : resolveValidatedTeamsWebhookUrl(targetUrl);

        const logEntry: WebhookAuditLog = {
          id: `wh-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
          anomalyType,
          gsid: context.gsid,
          dispatchedAt: new Date().toISOString(),
          targetUrl: validatedWebhookUrl
            ? validatedWebhookUrl.length > 35
              ? `${validatedWebhookUrl.substring(0, 32)}...`
              : validatedWebhookUrl
            : targetUrl
              ? targetUrl.length > 35
                ? `${targetUrl.substring(0, 32)}...`
                : targetUrl
              : "SIMULATED_LOCAL",
          status: isSimulated ? "SIMULATED" : "DELIVERED",
          httpStatus: 200,
          payloadPreview: cardPayload,
          hmacSignature: `sha256=${signature}`,
        };

        if (validatedWebhookUrl && typeof fetch !== "undefined") {
          try {
            const res = await fetch(validatedWebhookUrl, {
              method: "POST",
              redirect: "error",
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
          } catch (err: unknown) {
            logEntry.status = "FAILED";
            logEntry.errorMessage = getErrorMessage(
              err,
              "Network error dispatching webhook",
            );
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
      } catch (err: unknown) {
        return reply
          .code(400)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 3. GET /api/notifications/teams/audit-log
  fastify.get(
    "/teams/audit-log",
    {
      schema: {
        tags: [...NOTIFICATIONS_TAG],
        summary: "Retrieve recent Microsoft Teams webhook dispatch audit logs",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async () => {
      return {
        success: true,
        logs: auditHistory,
      };
    },
  );

  // 4. POST /api/notifications/telegram/driver-report
  fastify.post(
    "/telegram/driver-report",
    {
      schema: {
        tags: [...NOTIFICATIONS_TAG],
        summary: "Ingest field driver operational report from Telegram bot",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        return reply
          .code(400)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 5. GET /api/notifications/telegram/messages
  fastify.get(
    "/telegram/messages",
    {
      schema: {
        tags: [...NOTIFICATIONS_TAG],
        summary: "List ingested Telegram field driver messages",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async () => {
      return {
        success: true,
        messages: driverMessages,
      };
    },
  );

  // 6. POST /api/notifications/telegram/dispatch-order
  fastify.post(
    "/telegram/dispatch-order",
    {
      schema: {
        tags: [...NOTIFICATIONS_TAG],
        summary:
          "Dispatch transport pickup and delivery order to a driver via Telegram",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = DispatchOrderSchema.parse(request.body);
        const order = createDispatchOrder(parsed);

        dispatchOrders.unshift(order);
        if (dispatchOrders.length > 100) dispatchOrders.pop();

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
      } catch (err: unknown) {
        return reply
          .code(400)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 7. GET /api/notifications/telegram/orders
  fastify.get(
    "/telegram/orders",
    {
      schema: {
        tags: [...NOTIFICATIONS_TAG],
        summary: "List active Telegram transport dispatch orders",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async () => {
      return {
        success: true,
        orders: dispatchOrders,
      };
    },
  );
};

export default notificationsRoutes;
