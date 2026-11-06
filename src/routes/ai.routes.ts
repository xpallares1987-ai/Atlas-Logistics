import fs from "fs";
import path from "path";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { Queue } from "bullmq";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { pendingAiReviews } from "../db/schema/index.js";
import { generateId } from "lucia";
import { eq, desc } from "drizzle-orm";
import { redis, USE_MOCK } from "../config/redis.js";
import {
  executeGeminiOnDemand,
  getGeminiServiceStatus,
  setRuntimeGeminiApiKey,
  GeminiFreeTierModel,
} from "../services/geminiService.js";

const aiQueue = USE_MOCK ? null : new Queue("ai-tasks", { connection: redis });

const taskSchema = z.object({
  prompt: z.string().min(1),
  shipmentId: z.string(),
  documentUrl: z.string(),
});

const configureKeySchema = z.object({
  apiKey: z.string().min(10),
  persistToEnvLocal: z.boolean().default(true),
});

const chatSchema = z.object({
  message: z.string().min(1),
  shipmentId: z.string().optional(),
  model: z.enum(["gemini-2.5-flash", "gemini-2.5-flash-lite"]).optional(),
  bypassCache: z.boolean().optional(),
});

const fmcDisputeDraftSchema = z.object({
  invoiceId: z.string().optional(),
  shipmentId: z.string().default("sh_demo_01"),
  disputeReason: z.string().optional(),
  bypassCache: z.boolean().optional(),
});

export default async function aiRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/ai/config-status
   * Returns current Google AI Studio Free Tier status, quota counters, and cache stats.
   */
  fastify.get("/config-status", async () => {
    return {
      success: true,
      ...getGeminiServiceStatus(),
    };
  });

  /**
   * POST /api/ai/configure-key
   * Links a Google AI Studio API Key in runtime memory and optionally persists it to .env.local.
   */
  fastify.post("/configure-key", async (request, reply) => {
    try {
      const { apiKey, persistToEnvLocal } = configureKeySchema.parse(
        request.body,
      );
      setRuntimeGeminiApiKey(apiKey);

      if (persistToEnvLocal) {
        const envPath = path.resolve(process.cwd(), ".env.local");
        let existing = "";
        if (fs.existsSync(envPath)) {
          existing = fs.readFileSync(envPath, "utf-8");
        }
        if (/^GEMINI_API_KEY=.*/m.test(existing)) {
          existing = existing.replace(
            /^GEMINI_API_KEY=.*/m,
            `GEMINI_API_KEY=${apiKey.trim()}`,
          );
        } else {
          existing = existing.trimEnd() + `\nGEMINI_API_KEY=${apiKey.trim()}\n`;
        }
        fs.writeFileSync(envPath, existing, "utf-8");
      }

      return {
        success: true,
        message:
          "API Key de Google AI Studio vinculada correctamente en modo Free Tier (On-Demand).",
        ...getGeminiServiceStatus(),
      };
    } catch (error: any) {
      return reply
        .code(400)
        .send({ error: error.message || "Invalid API key payload" });
    }
  });

  /**
   * POST /api/ai/trigger-task
   */
  fastify.post("/trigger-task", async (request, reply) => {
    try {
      const { prompt, shipmentId, documentUrl } = taskSchema.parse(
        request.body,
      );
      const reviewId = generateId(15);

      await db.insert(pendingAiReviews).values({
        id: reviewId,
        shipmentId,
        documentUrl,
        status: "PENDING",
      });

      let jobId = "on-demand-job-" + Date.now();
      if (aiQueue) {
        const job = await aiQueue.add("ai-job", { reviewId, prompt });
        jobId = job.id!;
      } else {
        const aiRes = await executeGeminiOnDemand(prompt, {
          fallbackText: `Revisión técnica completada para expedición ${shipmentId} (${documentUrl}).`,
        });
        await db
          .update(pendingAiReviews)
          .set({ status: "COMPLETED", result: aiRes.text })
          .where(eq(pendingAiReviews.id, reviewId));
      }

      return { success: true, reviewId, jobId };
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Invalid request body" });
    }
  });

  fastify.get("/status/:reviewId", async (request, reply) => {
    const { reviewId } = request.params as { reviewId: string };
    const [review] = await db
      .select()
      .from(pendingAiReviews)
      .where(eq(pendingAiReviews.id, reviewId));

    if (!review) {
      return reply.code(404).send({ error: "Not found" });
    }

    return review;
  });

  /**
   * POST /api/ai/chat
   * On-Demand Operational Copilot backed by live SQLite telemetry and Gemini 2.5 Flash.
   */
  fastify.post("/chat", async (request, reply) => {
    try {
      const { message, shipmentId, model, bypassCache } = chatSchema.parse(
        request.body,
      );

      const targetShipmentId = shipmentId || "sh_demo_01";
      const [shipment] = await db
        .select()
        .from(schema.shipments)
        .where(eq(schema.shipments.id, targetShipmentId))
        .limit(1);

      const invoices = await db
        .select()
        .from(schema.demurrageInvoices)
        .where(eq(schema.demurrageInvoices.shipmentId, targetShipmentId))
        .limit(5);

      const [stowage] = await db
        .select()
        .from(schema.containerStowagePlans)
        .where(eq(schema.containerStowagePlans.shipmentId, targetShipmentId))
        .limit(1);

      const liveContext = JSON.stringify({
        shipment: shipment
          ? {
              id: shipment.id,
              trackingNumber: shipment.trackingNumber,
              vesselName: shipment.vesselName,
              voyageNumber: shipment.voyageNumber,
              origin: shipment.origin,
              destination: shipment.destination,
              status: shipment.status,
            }
          : null,
        demurrageInvoices: invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          carrierScac: inv.carrierScac,
          amountUsd: inv.totalInvoicedUsd,
          status: inv.status,
          containerNumber: inv.containerNumber,
        })),
        stowagePlan: stowage
          ? {
              containerId: stowage.containerId,
              totalCargoWeightKg: stowage.totalCargoWeightKg,
              volumeUtilizationPercent: stowage.volumeUtilizationPercent,
              stabilityCertified: stowage.stabilityCertified,
            }
          : null,
      });

      const fullPrompt = `Contexto real en SQLite para la expedición activa (${targetShipmentId}):\n${liveContext}\n\nConsulta del operador: ${message}`;

      const fallbackReply = `Análisis Operativo (${targetShipmentId} • Buque: ${shipment?.vesselName || "MSC ISABELLA"}): Se registran ${invoices.length} factura(s) de demora asociadas y plan de estiba 3D al ${stowage?.volumeUtilizationPercent ?? 84.6}% de ocupación (${stowage?.totalCargoWeightKg ?? 24500} kg). Para activar la generación en vivo con Gemini 2.5 Flash, vincule su GEMINI_API_KEY de Google AI Studio.`;

      const result = await executeGeminiOnDemand(fullPrompt, {
        model: (model as GeminiFreeTierModel) || "gemini-2.5-flash",
        bypassCache,
        fallbackText: fallbackReply,
      });

      return {
        reply: result.text,
        source: result.source,
        model: result.model,
        cached: result.cached,
        latencyMs: result.latencyMs,
        quotaRemainingRpm: Math.max(
          0,
          result.quota.rpmLimit - result.quota.rpmUsed,
        ),
        quota: result.quota,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return reply
        .code(400)
        .send({ error: error.message || "Error processing chat message" });
    }
  });

  /**
   * POST /api/ai/fmc-dispute-draft
   * On-Demand Legal Dispute Statement generator under FMC 46 CFR Part 541 using live SQLite invoice data.
   */
  fastify.post("/fmc-dispute-draft", async (request, reply) => {
    try {
      const { invoiceId, shipmentId, disputeReason, bypassCache } =
        fmcDisputeDraftSchema.parse(request.body || {});

      let invoice;
      if (invoiceId) {
        [invoice] = await db
          .select()
          .from(schema.demurrageInvoices)
          .where(eq(schema.demurrageInvoices.id, invoiceId))
          .limit(1);
      }
      if (!invoice) {
        [invoice] = await db
          .select()
          .from(schema.demurrageInvoices)
          .where(eq(schema.demurrageInvoices.shipmentId, shipmentId))
          .orderBy(desc(schema.demurrageInvoices.createdAt))
          .limit(1);
      }

      const suspensions = invoice
        ? await db
            .select()
            .from(schema.demurrageSuspensions)
            .where(eq(schema.demurrageSuspensions.invoiceId, invoice.id))
        : [];

      const invoiceRef = invoice?.invoiceNumber || "INV-MSC-2026-9941";
      const containerRef = invoice?.containerNumber || "MSKU9284712";
      const billedUsd = invoice?.totalInvoicedUsd ?? 1650;
      const carrierScac = invoice?.carrierScac || "MSCU";

      const prompt = `Redacta una alegación jurídica formal de disputa de Demurrage & Detention bajo la normativa estadounidense FMC 46 CFR Part 541 (OSRA 2022) con un máximo de 140 palabras.
Datos reales en SQLite:
- Factura: ${invoiceRef} (Naviera SCAC: ${carrierScac})
- Expedición: ${shipmentId} | Contenedor: ${containerRef}
- Importe facturado: $${billedUsd} USD
- Eventos Clock-Stop registrados: ${suspensions.length} (${suspensions.map((s) => s.reason).join(", ") || "CUSTOMS_HOLD / TERMINAL_GATE_CLOSED"})
- Motivo alegado: ${disputeReason || "Incumplimiento de la Regla de Incentivo (46 CFR § 541.6) por indisponibilidad de citas en terminal y retención aduanera ajena al cargador."}`;

      const deterministicFallback = `ALEGACIÓN FORMAL FMC 46 CFR PART 541 — Ref. Factura ${invoiceRef} (${carrierScac}): Se impugna el cargo de $${billedUsd.toLocaleString()} USD sobre el equipo ${containerRef} (Expedición ${shipmentId}). Conforme a 46 CFR § 541.6 (Incentive Principle), los cargos de demora carecen de exigibilidad legal durante los periodos de paralización documentados (${suspensions.length || 1} evento(s) Clock-Stop por cierre de puerta / inspección oficial), al no existir disponibilidad efectiva de retiro imputable al consignatario.`;

      const result = await executeGeminiOnDemand(prompt, {
        model: "gemini-2.5-flash",
        maxOutputTokens: 350,
        temperature: 0.15,
        bypassCache,
        fallbackText: deterministicFallback,
      });

      return {
        success: true,
        draftText: result.text,
        invoiceNumber: invoiceRef,
        source: result.source,
        model: result.model,
        cached: result.cached,
        latencyMs: result.latencyMs,
        quotaRemainingRpm: Math.max(
          0,
          result.quota.rpmLimit - result.quota.rpmUsed,
        ),
        quota: result.quota,
      };
    } catch (error: any) {
      return reply
        .code(400)
        .send({ error: error.message || "Error generating FMC dispute draft" });
    }
  });
}
