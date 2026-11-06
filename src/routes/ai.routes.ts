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
  executeGeminiStructuredOnDemand,
  computeSemanticSimilarityOnDemand,
  getGeminiServiceStatus,
  setRuntimeGeminiApiKey,
  SemanticSearchCandidate,
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
  context: z
    .object({
      shipmentId: z.string().optional(),
    })
    .optional(),
  model: z.enum(["gemini-2.5-flash", "gemini-2.5-flash-lite"]).optional(),
  bypassCache: z.boolean().optional(),
});

const fmcDisputeDraftSchema = z.object({
  invoiceId: z.string().optional(),
  shipmentId: z.string().default("sh_demo_01"),
  disputeReason: z.string().optional(),
  bypassCache: z.boolean().optional(),
});

const stowageAuditSchema = z.object({
  containerId: z.string().default("cnt_msku_9284712"),
  shipmentId: z.string().default("sh_demo_01"),
  bypassCache: z.boolean().optional(),
});

const dcsaCustomsCheckSchema = z.object({
  bookingId: z.string().optional(),
  shipmentId: z.string().default("sh_demo_01"),
  commodityDescription: z.string().optional(),
  bypassCache: z.boolean().optional(),
});

const ucp600AuditSchema = z.object({
  instrumentId: z.string().optional(),
  shipmentId: z.string().default("sh_demo_01"),
  bypassCache: z.boolean().optional(),
});

const extractDocumentSchema = z.object({
  rawText: z.string().optional(),
  mimeType: z.string().optional(),
  base64Data: z.string().optional(),
  bypassCache: z.boolean().optional(),
});

const executiveBriefingSchema = z.object({
  bypassCache: z.boolean().optional(),
});

const semanticSearchSchema = z.object({
  query: z.string().min(2),
  candidates: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        category: z.string().optional(),
        text: z.string(),
      }),
    )
    .optional(),
  topK: z.number().min(1).max(20).default(5),
});

function parseMetadataObj(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object") return { ...(raw as Record<string, any>) };
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function aiRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/ai/config-status
   * Returns current Google AI Studio Free Tier status, per-model quota counters, and cache stats.
   */
  fastify.get("/config-status", async () => {
    return {
      success: true,
      ...getGeminiServiceStatus(),
    };
  });

  /**
   * POST /api/ai/configure-key
   * Links the user's Google AI Studio API Key at runtime and optionally persists to local .env.local.
   */
  fastify.post("/configure-key", async (request, reply) => {
    try {
      const { apiKey, persistToEnvLocal } = configureKeySchema.parse(
        request.body,
      );
      setRuntimeGeminiApiKey(apiKey);

      if (persistToEnvLocal) {
        const envLocalPath = path.resolve(process.cwd(), ".env.local");
        let existing = "";
        if (fs.existsSync(envLocalPath)) {
          existing = fs.readFileSync(envLocalPath, "utf8");
        }
        const lines = existing
          .split(/\r?\n/)
          .filter((l) => !l.startsWith("GEMINI_API_KEY="));
        lines.push(`GEMINI_API_KEY=${apiKey.trim()}`);
        fs.writeFileSync(
          envLocalPath,
          lines.filter(Boolean).join("\n") + "\n",
          "utf8",
        );
      }

      return {
        success: true,
        message:
          "API Key de Google AI Studio vinculada correctamente (Modo Free-Tier On-Demand activo).",
        status: getGeminiServiceStatus(),
      };
    } catch (error: any) {
      return reply.code(400).send({
        error: error.message || "Invalid API key configuration payload",
      });
    }
  });

  /**
   * POST /api/ai/analyze-document (Legacy Queue/Review Endpoint)
   */
  fastify.post("/analyze-document", async (request, reply) => {
    try {
      const { prompt, shipmentId, documentUrl } = taskSchema.parse(
        request.body,
      );
      const reviewId = generateId(15);

      await db.insert(pendingAiReviews).values({
        id: reviewId,
        shipmentId,
        documentUrl,
        result: JSON.stringify({ status: "PROCESSING" }),
        status: "PENDING",
        createdAt: new Date(),
      });

      if (aiQueue) {
        const job = await aiQueue.add("analyze-document", {
          reviewId,
          prompt,
          shipmentId,
          documentUrl,
        });
        return {
          message: "Task queued successfully",
          jobId: job.id,
          reviewId,
        };
      }

      const aiRes = await executeGeminiOnDemand(prompt);
      await db
        .update(pendingAiReviews)
        .set({
          result: JSON.stringify({
            summary: aiRes.text,
            source: aiRes.source,
            model: aiRes.model,
          }),
        })
        .where(eq(pendingAiReviews.id, reviewId));

      return {
        message: "Document analyzed on-demand",
        reviewId,
        source: aiRes.source,
      };
    } catch (error) {
      return reply.code(400).send({ error: "Invalid input data" });
    }
  });

  /**
   * POST /api/ai/chat
   * On-Demand Copilot query enriched with real SQLite context for the active shipment.
   */
  fastify.post("/chat", async (request, reply) => {
    try {
      const parsed = chatSchema.parse(request.body);
      const { message, model, bypassCache } = parsed;
      const targetShipmentId =
        parsed.shipmentId || parsed.context?.shipmentId || "sh_demo_01";

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
        model: model || "gemini-2.5-flash",
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
   * On-Demand Legal Dispute Statement generator under FMC 46 CFR Part 541 using live SQLite invoice data
   * and L2 SQLite metadata persistence.
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
        l2CacheReader: async () => {
          if (!invoice) return null;
          const meta = parseMetadataObj(invoice.metadata);
          return typeof meta.aiFmcDisputeDraft === "string"
            ? meta.aiFmcDisputeDraft
            : null;
        },
        l2CacheWriter: async (draftText) => {
          if (!invoice) return;
          const meta = parseMetadataObj(invoice.metadata);
          meta.aiFmcDisputeDraft = draftText;
          meta.aiFmcDisputeUpdatedAt = new Date().toISOString();
          await db
            .update(schema.demurrageInvoices)
            .set({ metadata: meta })
            .where(eq(schema.demurrageInvoices.id, invoice.id));
        },
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
      return reply.code(400).send({
        error: error.message || "Error generating FMC dispute draft",
      });
    }
  });

  /**
   * POST /api/ai/stowage-safety-audit (Phase 2 — Flash-Lite Structured JSON + L2 SQLite Cache)
   * Audits 3D container stowage plan under IMO/ILO/UNECE CTU Code & IMDG segregation rules.
   */
  fastify.post("/stowage-safety-audit", async (request, reply) => {
    try {
      const { containerId, shipmentId, bypassCache } = stowageAuditSchema.parse(
        request.body || {},
      );

      let [plan] = await db
        .select()
        .from(schema.containerStowagePlans)
        .where(eq(schema.containerStowagePlans.containerId, containerId))
        .limit(1);

      if (!plan) {
        [plan] = await db
          .select()
          .from(schema.containerStowagePlans)
          .where(eq(schema.containerStowagePlans.shipmentId, shipmentId))
          .limit(1);
      }

      const cargoKg = plan?.totalCargoWeightKg ?? 24180;
      const maxPayloadKg = plan?.maxPayloadKg ?? 28200;
      const volPct = plan?.volumeUtilizationPercent ?? 82.4;
      const cogRaw =
        plan?.centerOfGravityJson || '{"x":5.92,"y":1.12,"z":1.08}';
      const axleRaw =
        plan?.axleLoadDistributionJson ||
        '{"frontAxlePercent":48.5,"rearAxlePercent":51.5}';

      const fallbackData = {
        ctuCompliant: true,
        safetyScore: 94,
        imdgCompatibilityStatus:
          "COMPATIBLE — Sin conflictos de segregación IMDG detectados en contenedor MSKU9284712",
        centerOfGravityStatus:
          "ÓPTIMO — Desviación longitudinal < ±5% conforme a IMO/ILO/UNECE CTU Code Anexo 7",
        axleBalanceAssessment:
          "EQUILIBRADO (48.5% / 51.5%) — Cumple límites de peso por eje en carretera (EU 96/53/EC & US Bridge Formula)",
        recommendations: [
          "Instalar trincaje transversal de 2.500 daN en la última fila junto a puertas para evitar desplazamiento longitudinal.",
          "Verificar precinto electrónico ISO 17712 antes de emitir el certificado VGM SOLAS.",
          "Mantener estiba de carga más densa en el nivel inferior (z < 1.15m) para preservar la estabilidad dinámica.",
        ],
      };

      const prompt = `Audita este plan de estiba 3D según el Código CTU de la OMI/OIT/CEPE y reglas IMDG.
Contenedor: ${containerId} (Expedición: ${shipmentId})
Peso carga: ${cargoKg} kg / Máx: ${maxPayloadKg} kg (${volPct}% volumen)
Centro de gravedad: ${cogRaw}
Distribución por ejes: ${axleRaw}
Devuelve JSON con: ctuCompliant (boolean), safetyScore (0-100), imdgCompatibilityStatus (string), centerOfGravityStatus (string), axleBalanceAssessment (string), recommendations (array de 3 strings).`;

      const result = await executeGeminiStructuredOnDemand(prompt, {
        model: "gemini-2.5-flash-lite",
        bypassCache,
        fallbackData,
        l2CacheReader: async () => {
          if (!plan) return null;
          const meta = parseMetadataObj(plan.metadata);
          return meta.aiStowageAudit || null;
        },
        l2CacheWriter: async (auditData) => {
          if (!plan) return;
          const meta = parseMetadataObj(plan.metadata);
          meta.aiStowageAudit = auditData;
          meta.aiStowageAuditUpdatedAt = new Date().toISOString();
          await db
            .update(schema.containerStowagePlans)
            .set({ metadata: meta })
            .where(eq(schema.containerStowagePlans.id, plan.id));
        },
      });

      return {
        success: true,
        containerId,
        audit: result.data,
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
      return reply.code(400).send({
        error: error.message || "Error running 3D stowage safety audit",
      });
    }
  });

  /**
   * POST /api/ai/dcsa-customs-check (Phase 2 — Flash-Lite Structured JSON + L2 SQLite Cache)
   * Pre-validates DCSA v3.0 Shipping Instructions, classifies HS/TARIC code, and checks EU CBAM / USMCA rules.
   */
  fastify.post("/dcsa-customs-check", async (request, reply) => {
    try {
      const { bookingId, shipmentId, commodityDescription, bypassCache } =
        dcsaCustomsCheckSchema.parse(request.body || {});

      let [oceanBooking] = bookingId
        ? await db
            .select()
            .from(schema.oceanBookingDetails)
            .where(eq(schema.oceanBookingDetails.bookingId, bookingId))
            .limit(1)
        : [];

      if (!oceanBooking) {
        [oceanBooking] = await db
          .select()
          .from(schema.oceanBookingDetails)
          .where(eq(schema.oceanBookingDetails.shipmentId, shipmentId))
          .limit(1);
      }

      const [shipment] = await db
        .select()
        .from(schema.shipments)
        .where(eq(schema.shipments.id, shipmentId))
        .limit(1);

      const descText =
        commodityDescription ||
        oceanBooking?.specialInstructions ||
        "Componentes industriales electromecánicos de precisión y estructuras de aluminio anodizado en pallets fumigados ISPM-15";

      const fallbackData = {
        suggestedHsCode: "8481.80.99",
        hsDescription:
          "Aparatos y válvulas industriales de control automático y accesorios metálicos de precisión",
        cbamApplicable: true,
        cbamCategory:
          "Aluminio / Manufacturas Metálicas (Anexo I Reglamento UE 2023/956 — Requiere reporte trimestral de emisiones implícitas)",
        usmcaEligible: true,
        dcsaValidationStatus: "READY_FOR_DRAFT_BL",
        missingFields: [] as string[],
        complianceRecommendations: [
          "Incluir código HS de 6 dígitos (848180) en el campo DCSA cargoItem.HSCode antes del SI Cut-Off.",
          "Adjuntar certificado de emisiones de proveedor para cumplimiento CBAM e inspección aduanera.",
          "Declaración VGM SOLAS verificada por Método 1 (Pesaje de contenedor consolidado).",
        ],
      };

      const prompt = `Analiza esta instrucción de embarque DCSA v3.0 y clasifica la mercancía para aduanas:
Expedición: ${shipmentId} (${shipment?.origin || "ESBCN"} -> ${shipment?.destination || "USNYC"})
Naviera SCAC: ${oceanBooking?.carrierScac || "MAEU"} | Estado SI: ${oceanBooking?.siStatus || "SUBMITTED"}
Descripción de mercancía: ${descText}
Devuelve JSON con: suggestedHsCode (string), hsDescription (string), cbamApplicable (boolean), cbamCategory (string), usmcaEligible (boolean), dcsaValidationStatus (string), missingFields (array de strings), complianceRecommendations (array de 3 strings).`;

      const result = await executeGeminiStructuredOnDemand(prompt, {
        model: "gemini-2.5-flash-lite",
        bypassCache,
        fallbackData,
        l2CacheReader: async () => {
          if (!oceanBooking) return null;
          const meta = parseMetadataObj(oceanBooking.metadata);
          return meta.aiDcsaCustomsAudit || null;
        },
        l2CacheWriter: async (auditData) => {
          if (!oceanBooking) return;
          const meta = parseMetadataObj(oceanBooking.metadata);
          meta.aiDcsaCustomsAudit = auditData;
          meta.aiDcsaCustomsAuditUpdatedAt = new Date().toISOString();
          await db
            .update(schema.oceanBookingDetails)
            .set({ metadata: meta })
            .where(eq(schema.oceanBookingDetails.id, oceanBooking.id));
        },
      });

      return {
        success: true,
        shipmentId,
        audit: result.data,
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
      return reply.code(400).send({
        error: error.message || "Error running DCSA & Customs AI check",
      });
    }
  });

  /**
   * POST /api/ai/ucp600-lc-audit (Phase 2 — Flash Structured JSON)
   * Audits Letter of Credit terms against shipment & Bill of Lading data under ICC UCP 600 rules.
   */
  fastify.post("/ucp600-lc-audit", async (request, reply) => {
    try {
      const { instrumentId, shipmentId, bypassCache } = ucp600AuditSchema.parse(
        request.body || {},
      );

      let [lc] = instrumentId
        ? await db
            .select()
            .from(schema.tradeCreditInstruments)
            .where(eq(schema.tradeCreditInstruments.id, instrumentId))
            .limit(1)
        : [];

      if (!lc) {
        [lc] = await db.select().from(schema.tradeCreditInstruments).limit(1);
      }

      const [shipment] = await db
        .select()
        .from(schema.shipments)
        .where(eq(schema.shipments.id, shipmentId))
        .limit(1);

      const lcRef = lc?.instrumentReference || "LC-2026-BCN-0089";

      const fallbackData = {
        instrumentReference: lcRef,
        compliantWithUcp600: true,
        presentationRiskLevel: "LOW",
        discrepanciesFound: [
          {
            article: "UCP 600 Art. 20(a)(ii)",
            field: "On Board Notation",
            status: "VERIFIED",
            detail:
              "La fecha de puesta a bordo en el B/L (BK-2026-67116) se encuentra dentro del Latest Shipment Date estipulado en el campo SWIFT 44C.",
          },
          {
            article: "UCP 600 Art. 18(c)",
            field: "Commercial Invoice Description",
            status: "ADVISORY",
            detail:
              "Asegurar que la descripción comercial en factura refleje literalmente el campo 45A de la Carta de Crédito sin abreviaturas no estándar.",
          },
        ],
        recommendedActions: [
          "Presentar juego completo de e-BL (3/3 originales o DCSA eBL) dentro del plazo de 21 días tras el embarque (UCP 600 Art. 14c).",
          "Verificar que la póliza de seguro cubra al menos el 110% del valor CIF en la misma divisa del crédito (UCP 600 Art. 28f).",
        ],
      };

      const prompt = `Realiza una pre-auditoría bancaria bajo las reglas ICC UCP 600 para la Carta de Crédito ${lcRef}:
Importe: ${lc?.creditAmount ?? 245000} ${lc?.currency || "USD"} | Tolerancia: ±${lc?.tolerancePercentage ?? 5}%
Puerto Carga: ${lc?.portOfLoading || "Barcelona (ESBCN)"} -> Descarga: ${lc?.portOfDischarge || "New York (USNYC)"}
Mercancía según L/C: ${lc?.goodsDescriptionSummary || "Industrial Supply Chain Equipment"}
Expedición vinculada: ${shipment?.trackingNumber || "BK-2026-67116"} (Buque: ${shipment?.vesselName || "MSC ISABELLA"})
Devuelve JSON con: instrumentReference, compliantWithUcp600 (boolean), presentationRiskLevel ("LOW"|"MEDIUM"|"HIGH"), discrepanciesFound (array de objetos con article, field, status, detail) y recommendedActions (array de strings).`;

      const result = await executeGeminiStructuredOnDemand(prompt, {
        model: "gemini-2.5-flash",
        bypassCache,
        fallbackData,
      });

      return {
        success: true,
        instrumentReference: lcRef,
        audit: result.data,
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
      return reply.code(400).send({
        error: error.message || "Error running UCP 600 L/C audit",
      });
    }
  });

  /**
   * POST /api/ai/extract-document (Phase 3 — Multimodal Document/Manifest Extractor)
   * Extracts structured shipping & billing fields from raw document text or base64 PDF/Image.
   */
  fastify.post("/extract-document", async (request, reply) => {
    try {
      const { rawText, mimeType, base64Data, bypassCache } =
        extractDocumentSchema.parse(request.body || {});

      const fallbackData = {
        documentType: "COMMERCIAL_PACKING_LIST_AND_BL_DRAFT",
        bookingReference: "BK-2026-67116",
        containerNumber: "MSKU9284712",
        vesselVoyage: "MSC ISABELLA / 2604W",
        grossWeightKg: 24180,
        packageCount: 18,
        suggestedHsCode: "8481.80.99",
        invoiceAmountUsd: 148500,
        currency: "USD",
        incoterm: "CIF USNYC",
        extractedNotes:
          "18 Pallets europeos tratados térmicamente (ISPM-15). Precinto naviero de alta seguridad ISO 17712 verificado.",
      };

      const prompt = `Extrae los campos logísticos y aduaneros del documento comercial adjunto en formato JSON estructurado.
Texto del documento: ${rawText || "Packing List / Bill of Lading Draft para contenedor MSKU9284712 (Booking BK-2026-67116, Buque MSC ISABELLA)."}
Devuelve JSON con: documentType, bookingReference, containerNumber, vesselVoyage, grossWeightKg (number), packageCount (number), suggestedHsCode, invoiceAmountUsd (number), currency, incoterm, extractedNotes.`;

      const result = await executeGeminiStructuredOnDemand(prompt, {
        model: "gemini-2.5-flash",
        bypassCache,
        fallbackData,
        inlineData:
          mimeType && base64Data ? { mimeType, data: base64Data } : undefined,
      });

      return {
        success: true,
        extracted: result.data,
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
      return reply.code(400).send({
        error: error.message || "Error extracting multimodal document",
      });
    }
  });

  /**
   * POST /api/ai/executive-briefing (Phase 3 — 1-Click Control Tower Shift Briefing)
   * Consolidates live SQLite metrics across all 5 phases into a single executive briefing (cached 60 min).
   */
  fastify.post("/executive-briefing", async (request, reply) => {
    try {
      const { bypassCache } = executiveBriefingSchema.parse(request.body || {});

      const shipmentsList = await db.select().from(schema.shipments).limit(20);
      const demInvoices = await db
        .select()
        .from(schema.demurrageInvoices)
        .limit(20);
      const oceanBookings = await db
        .select()
        .from(schema.oceanBookingDetails)
        .limit(20);
      const stowagePlans = await db
        .select()
        .from(schema.containerStowagePlans)
        .limit(20);

      const totalDemurrageUsd = demInvoices.reduce(
        (acc, inv) => acc + (inv.totalInvoicedUsd || 0),
        0,
      );

      const fallbackData = {
        shiftHeadline: `Torre de Control Operativa: ${shipmentsList.length} expediciones activas y $${totalDemurrageUsd.toLocaleString()} USD en auditoría FMC D&D`,
        overallRiskLevel: "MODERATE",
        estimatedProtectedValueUsd: Math.round(totalDemurrageUsd * 0.45) || 750,
        topPriorities: [
          `Expedición canónica sh_demo_01 (BK-2026-67116 • MSC ISABELLA): Factura D&D por $${totalDemurrageUsd.toLocaleString()} USD con exención aplicable bajo 46 CFR § 541.6.`,
          `Bookings DCSA v3.0 (${oceanBookings.length} registros): Verificar cierre documental de Shipping Instructions y pesaje VGM antes del Cut-Off portuario.`,
          `Planes de Estiba 3D (${stowagePlans.length} contenedores): Certificación de estabilidad IMO/CTU completada para MSKU9284712.`,
        ],
        immediateActions: [
          "Presentar dossier de disputa FMC sobre contenedor MSKU9284712 para recuperar cargos durante inspección CBP.",
          "Confirmar emisión de Draft B/L en BookingManagementModule tras validación arancelaria HS/CBAM.",
          "Sincronizar órdenes de compra ERP y sellos de auditoría e-Firma antes del cierre de turno.",
        ],
      };

      const prompt = `Genera un Informe Ejecutivo de Turno (Executive Briefing) para el Director de Operaciones de Atlas Logistics basado en estos datos reales de SQLite:
- Expediciones activas: ${shipmentsList.length} (incluyendo sh_demo_01 / BK-2026-67116 en buque MSC ISABELLA)
- Facturas Demurrage & Detention: ${demInvoices.length} (Total facturado: $${totalDemurrageUsd} USD)
- Bookings Marítimos DCSA: ${oceanBookings.length}
- Planes de Estiba 3D: ${stowagePlans.length}
Devuelve JSON con: shiftHeadline (string), overallRiskLevel ("LOW"|"MODERATE"|"HIGH"), estimatedProtectedValueUsd (number), topPriorities (array de 3 strings), immediateActions (array de 3 strings).`;

      const result = await executeGeminiStructuredOnDemand(prompt, {
        model: "gemini-2.5-flash",
        cacheTtlSeconds: 3600,
        bypassCache,
        fallbackData,
      });

      return {
        success: true,
        briefing: result.data,
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
      return reply.code(400).send({
        error: error.message || "Error generating executive briefing",
      });
    }
  });

  /**
   * POST /api/ai/semantic-protocol-search (Phase 4 — Free `text-embedding-004` Semantic Search)
   * Ranks resolution protocols & regulatory clauses using `text-embedding-004` without consuming Flash RPM!
   */
  fastify.post("/semantic-protocol-search", async (request, reply) => {
    try {
      const { query, candidates, topK } = semanticSearchSchema.parse(
        request.body || {},
      );

      const defaultProtocols: SemanticSearchCandidate[] = [
        {
          id: "proto-fmc-541",
          title:
            "Exención de Demoras por Inspección Aduanera (FMC 46 CFR § 541.6)",
          category: "CUSTOMS",
          text: "Suspensión formal del reloj de Free Time (Clock-Stop) cuando el contenedor MSKU9284712 permanece retenido por inspección física CBP/Aduana o cierre de puertas de terminal ajeno al consignatario.",
        },
        {
          id: "proto-cold-chain",
          title: "Protocolo de Excursión Térmica Reefer (ATP / GDP Pharma)",
          category: "SLA_RISK",
          text: "Ante desviación de temperatura > ±2.0°C en telemetría IoT Reefer, activar pre-enfriamiento de emergencia, descargar registro termográfico datalogger y notificar a aseguradora de carga.",
        },
        {
          id: "proto-dcsa-vgm",
          title:
            "Rectificación de Discrepancia VGM SOLAS y Draft B/L (DCSA v3.0)",
          category: "DOCUMENTATION",
          text: "Cuando el peso bruto verificado (VGM) difiere en más de ±500 kg respecto al booking marítimo, emitir enmienda de Shipping Instructions antes del VGM Cut-Off para evitar rolado de buque.",
        },
        {
          id: "proto-drayage-port",
          title:
            "Reasignación de Ventana Gate-In / Acarreo Portuario (Drayage)",
          category: "DELAY",
          text: "Congestión severa en acceso a terminal portuaria. Reprogramar cita de transportista en sistema de citas de terminal y documentar captura de pantalla para defensa ante cargos de detención.",
        },
        {
          id: "proto-ucp600-bl",
          title:
            "Subsanación de Discrepancias en Carta de Crédito (ICC UCP 600 Art. 20)",
          category: "DOCUMENTATION",
          text: "Verificación de mención 'Clean On Board', nombre exacto del buque MSC ISABELLA y endoso bancario en el conocimiento de embarque antes de presentación documental.",
        },
      ];

      const pool =
        candidates && candidates.length > 0 ? candidates : defaultProtocols;

      const searchRes = await computeSemanticSimilarityOnDemand(
        query,
        pool,
        topK,
      );

      return {
        success: true,
        query,
        results: searchRes.results,
        source: searchRes.source,
        model: searchRes.model,
        latencyMs: searchRes.latencyMs,
        quotaRemainingRpm: Math.max(
          0,
          searchRes.quota.rpmLimit - searchRes.quota.rpmUsed,
        ),
        quota: searchRes.quota,
      };
    } catch (error: any) {
      return reply.code(400).send({
        error: error.message || "Error executing semantic protocol search",
      });
    }
  });
}
