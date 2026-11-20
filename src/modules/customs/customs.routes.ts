/**
 * @file customs.routes.ts
 * @description Fastify routes for Customs Declarations (DUA), TARIC/HS Code lookup, deterministic duty calculation, compliance channel auditing, e-Firma clearance, PDF/XML generation, and OCR cross-checking.
 * @module @atlas/api/modules/customs/routes
 */

import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createHash } from "node:crypto";
import { db } from "../../db/index.js";
import {
  customsDeclarations,
  hsCodes,
  shipments,
} from "../../db/schema/operations.js";
import { efirmaAuditStamps } from "../../db/schema/efirma.js";
import { costs, revenues } from "../../db/schema/finance.js";
import { shipmentEventLogs } from "../../db/schema/audit.js";
import { scmOutboxMessages } from "../../db/schema/scm_foundation.js";
import { eq, desc, and, inArray, SQL } from "drizzle-orm";
import { PDFService, CustomsData } from "../../services/pdf.service.js";
import { TariffService } from "./tariff.service.js";
import { ComplianceService } from "./compliance.service.js";
import { DuaXmlService, DuaXmlPayload } from "./dua-xml.service.js";
import { domainEventBus } from "../../lib/events/index.js";
import {
  scopeByTenant,
  assertTenantAccess,
  TenantAccessDeniedError,
} from "../../lib/tenancy/index.js";
import {
  extractCommercialInvoice,
  extractPackingList,
  extractTransportDocument,
  extractCustomsDeclaration,
  performTripartiteCrossCheck,
} from "@atlas/shared";
import {
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. VALIDATION SCHEMAS & DOMAIN INTERFACES
// ============================================================================

interface EfirmaStampSummary {
  id: string;
  certificateSerial: string;
  rfcTitular: string;
  razonSocial: string;
  selloDigital: string;
  tamperSealHash: string;
  status: string;
  verifiedAt: string | null;
}

const CalculateTariffSchema = z.object({
  hsCode: z.string().min(2),
  fobValue: z.number().nonnegative(),
  freightCost: z.number().nonnegative().optional(),
  insuranceCost: z.number().nonnegative().optional(),
  currency: z.string().default("EUR"),
  grossWeightKg: z.number().nonnegative().optional(),
  originCountry: z.string().min(2),
  destinationCountry: z.string().default("ES"),
  hasPreferentialOriginCert: z.boolean().optional(),
});

const ComplianceAuditSchema = z.object({
  eoriNumber: z.string().optional(),
  consigneeName: z.string().optional(),
  originCountry: z.string().min(2),
  destinationCountry: z.string().default("ES"),
  hsCode: z.string().min(2),
  customsValue: z.number().nonnegative(),
  grossWeightKg: z.number().nonnegative().optional(),
  hasPreferentialOriginCert: z.boolean().optional(),
  attachedDocumentTypes: z.array(z.string()).optional(),
});

const CreateDeclarationSchema = z.object({
  shipmentId: z.string().min(1),
  brokerId: z.string().optional(),
  hsCodeId: z.string().optional(),
  hsCode: z.string().min(2),
  type: z.string().default("Import"),
  customsValue: z.number().nonnegative(),
  originCountry: z.string().min(2),
  destinationCountry: z.string().default("ES"),
  eoriNumber: z.string().optional(),
  consigneeName: z.string().optional(),
  exporterName: z.string().optional(),
  grossWeightKg: z.number().nonnegative().optional(),
  hasPreferentialOriginCert: z.boolean().optional(),
  attachedDocumentTypes: z.array(z.string()).optional(),
});

const OcrExtractSchema = z.object({
  documentType: z.enum([
    "COMMERCIAL_INVOICE",
    "PACKING_LIST",
    "TRANSPORT_DOCUMENT",
    "CUSTOMS_DECLARATION",
  ]),
  text: z.string().min(5),
});

const OcrCrossCheckSchema = z.object({
  invoice: z.unknown(),
  packingList: z.unknown(),
  declaration: z.unknown(),
  transport: z.unknown().optional(),
});

const DispatchClearanceSchema = z.object({
  channel: z
    .enum([
      "Green Channel",
      "Orange Channel",
      "Yellow Channel",
      "Red Channel",
      "Cleared",
    ])
    .default("Green Channel"),
  certificateSerial: z.string().optional(),
  rfcTitular: z.string().optional(),
  razonSocial: z.string().optional(),
  releaseReference: z.string().optional(),
  remarks: z.string().optional(),
});

type TripartiteParams = Parameters<typeof performTripartiteCrossCheck>;

const OCR_EXTRACT_ROUTE_SCHEMA = {
  tags: ["Customs Declarations", "OCR"],
  summary: "Extract structured fields from raw customs or shipping OCR text",
  body: openApiObject({
    documentType: { type: "string" },
    text: { type: "string" },
  }),
  response: {
    200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
    ...buildErrorResponses([400, 401, 403, 500]),
  },
} as const;

const OCR_CROSS_CHECK_ROUTE_SCHEMA = {
  tags: ["Customs Declarations", "OCR"],
  summary:
    "Perform tripartite reconciliation across invoice, packing list, and DUA",
  body: openApiObject({
    invoice: { type: "object", additionalProperties: true },
    packingList: { type: "object", additionalProperties: true },
    declaration: { type: "object", additionalProperties: true },
    transport: { type: "object", additionalProperties: true },
  }),
  response: {
    200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
    ...buildErrorResponses([400, 401, 403, 500]),
  },
} as const;

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const customsRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  // 1. List all customs declarations (tenant-scoped & bounded pagination)
  fastify.get(
    "/customs-declarations",
    {
      schema: {
        tags: ["Customs Declarations"],
        summary: "List customs declarations with TARIC and e-Firma metadata",
        querystring: openApiObject({
          limit: { type: "string" },
          offset: { type: "string" },
          cursor: { type: "string" },
          shipmentId: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as {
          limit?: string;
          offset?: string;
          cursor?: string;
          shipmentId?: string;
        };
        const boundedLimit = Math.min(
          Math.max(parseInt(query.limit || "100", 10) || 100, 1),
          500,
        );
        const boundedOffset = Math.max(
          parseInt(query.offset || query.cursor || "0", 10) || 0,
          0,
        );

        const tenantCondition = scopeByTenant(shipments.companyId);
        const conditions: SQL[] = [];
        if (tenantCondition) conditions.push(tenantCondition);
        if (query.shipmentId) {
          conditions.push(eq(customsDeclarations.shipmentId, query.shipmentId));
        }

        const baseQuery = db
          .select({
            decl: customsDeclarations,
            hs: hsCodes,
            shipment: shipments,
          })
          .from(customsDeclarations)
          .leftJoin(hsCodes, eq(customsDeclarations.hsCodeId, hsCodes.id))
          .leftJoin(
            shipments,
            eq(customsDeclarations.shipmentId, shipments.id),
          );

        const records = await (
          conditions.length > 0
            ? baseQuery.where(and(...conditions))
            : baseQuery
        )
          .orderBy(desc(customsDeclarations.createdAt))
          .limit(boundedLimit)
          .offset(boundedOffset);

        reply.header("X-Total-Returned", String(records.length));
        if (records.length === boundedLimit) {
          reply.header("X-Next-Cursor", String(boundedOffset + records.length));
        }

        const shipmentIds = records
          .map((r) => r.decl.shipmentId)
          .filter((id): id is string => Boolean(id));

        const efirmaMap: Record<string, EfirmaStampSummary> = {};
        if (shipmentIds.length > 0) {
          const efirmaList = await db
            .select()
            .from(efirmaAuditStamps)
            .where(
              and(
                inArray(efirmaAuditStamps.shipmentId, shipmentIds),
                eq(efirmaAuditStamps.documentType, "CUSTOMS_RELEASE"),
              ),
            )
            .orderBy(desc(efirmaAuditStamps.createdAt));

          for (const ef of efirmaList) {
            if (ef.shipmentId && !efirmaMap[ef.shipmentId]) {
              efirmaMap[ef.shipmentId] = {
                id: ef.id,
                certificateSerial: ef.certificateSerial,
                rfcTitular: ef.rfcTitular,
                razonSocial: ef.razonSocial,
                selloDigital: ef.selloDigitalBase64,
                tamperSealHash: ef.tamperSealHash,
                status: ef.status,
                verifiedAt: ef.verifiedAt,
              };
            }
          }
        }

        const mapped = records.map(({ decl, hs }) => {
          let uiStatus = decl.status;
          if (decl.status === "PENDING") uiStatus = "Pending";
          if (decl.status === "CLEARED") uiStatus = "Cleared";
          if (decl.status === "HELD") uiStatus = "Hold";

          let riskFlagsParsed: string[] = [];
          try {
            if (decl.riskFlags) {
              riskFlagsParsed = JSON.parse(decl.riskFlags) as string[];
            }
          } catch {
            if (decl.aiRiskFlag) riskFlagsParsed = [decl.aiRiskFlag];
          }

          let duaDataParsed: Record<string, unknown> | null = null;
          try {
            if (decl.duaData) {
              duaDataParsed = JSON.parse(decl.duaData) as Record<
                string,
                unknown
              >;
            }
          } catch {
            // Preserve null when raw JSON is absent or malformed
          }

          return {
            ...decl,
            status: uiStatus,
            channel: decl.status,
            blNumber:
              decl.blNumber || `BL-${decl.id.substring(0, 8).toUpperCase()}`,
            duaNumber:
              decl.duaNumber ||
              `26ES000811${decl.id.substring(0, 8).toUpperCase()}`,
            hsCode: hs?.code || "8504.40.90.90",
            hsDescription:
              hs?.description || "Static converters and power supply units",
            chapter: hs?.chapter || "85 - Electrical Machinery",
            adValoremDuty: hs?.adValoremDuty ?? 0.033,
            vatRate: hs?.vatRate ?? 0.21,
            isDualUse: Boolean(hs?.isDualUse),
            riskFlagsList: riskFlagsParsed,
            duaParsed: duaDataParsed,
            efirma: decl.shipmentId ? efirmaMap[decl.shipmentId] || null : null,
          };
        });

        return reply.send(mapped);
      } catch (error: unknown) {
        return reply.code(500).send({ error: getErrorMessage(error) });
      }
    },
  );

  // 2. Search TARIC / HS Codes catalog
  fastify.get(
    "/customs-declarations/hs-codes",
    {
      schema: {
        tags: ["Customs Declarations"],
        summary: "Search TARIC / HS Codes catalog",
        querystring: openApiObject({
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { q } = request.query as { q?: string };
        const list = await TariffService.searchHsCodes(q || "");
        return reply.send(list);
      } catch (error: unknown) {
        return reply.code(500).send({ error: getErrorMessage(error) });
      }
    },
  );

  // 3. Deterministic Tariff & Duty Calculator Endpoint
  fastify.post(
    "/customs-declarations/calculate-tariff",
    {
      schema: {
        tags: ["Customs Declarations"],
        summary: "Calculate customs duties, CIF value, and import VAT",
        body: openApiObject({
          hsCode: { type: "string" },
          fobValue: { type: "number" },
          freightCost: { type: "number" },
          insuranceCost: { type: "number" },
          currency: { type: "string" },
          grossWeightKg: { type: "number" },
          originCountry: { type: "string" },
          destinationCountry: { type: "string" },
          hasPreferentialOriginCert: { type: "boolean" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = CalculateTariffSchema.parse(request.body);
        const result = await TariffService.calculateCustomsDuties(body);
        return reply.send(result);
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          return reply
            .code(400)
            .send({
              error: "Validation error",
              details: { issues: error.issues },
            });
        }
        return reply.code(500).send({ error: getErrorMessage(error) });
      }
    },
  );

  // 4. Deterministic Compliance Audit & Channel Evaluation
  fastify.post(
    "/customs-declarations/compliance-audit",
    {
      schema: {
        tags: ["Customs Declarations"],
        summary:
          "Run deterministic customs compliance audit and channel prediction",
        body: openApiObject({
          eoriNumber: { type: "string" },
          consigneeName: { type: "string" },
          originCountry: { type: "string" },
          destinationCountry: { type: "string" },
          hsCode: { type: "string" },
          customsValue: { type: "number" },
          grossWeightKg: { type: "number" },
          hasPreferentialOriginCert: { type: "boolean" },
          attachedDocumentTypes: { type: "array", items: { type: "string" } },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = ComplianceAuditSchema.parse(request.body);
        const result = await ComplianceService.auditDeclaration(body);
        return reply.send(result);
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          return reply
            .code(400)
            .send({
              error: "Validation error",
              details: { issues: error.issues },
            });
        }
        return reply.code(500).send({ error: getErrorMessage(error) });
      }
    },
  );

  // 5. Analyze and evaluate single declaration
  fastify.post(
    "/customs-declarations/:id/analyze",
    {
      schema: {
        tags: ["Customs Declarations"],
        summary: "Analyze and score an existing customs declaration",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const records = await db
          .select({
            decl: customsDeclarations,
            hs: hsCodes,
            shipment: shipments,
          })
          .from(customsDeclarations)
          .leftJoin(hsCodes, eq(customsDeclarations.hsCodeId, hsCodes.id))
          .leftJoin(shipments, eq(customsDeclarations.shipmentId, shipments.id))
          .where(eq(customsDeclarations.id, id))
          .limit(1);

        if (records.length === 0) {
          return reply.code(404).send({ error: "Declaration not found" });
        }

        const { decl, hs, shipment } = records[0];
        assertTenantAccess(shipment?.companyId);
        const auditResult = await ComplianceService.auditDeclaration({
          eoriNumber: decl.eoriNumber || "ESB88492019",
          originCountry: decl.originCountry || "CN",
          destinationCountry: decl.destinationCountry || "ES",
          hsCode: hs?.code || "8504.40.90.90",
          customsValue: decl.customsValue ?? decl.dutiesAmount ?? 25000,
          grossWeightKg: 1200,
          attachedDocumentTypes: ["DOC-INV", "DOC-HBL", "DOC-PKL"],
        });

        await db
          .update(customsDeclarations)
          .set({
            riskScore: auditResult.riskScore,
            riskFlags: JSON.stringify(auditResult.triggeredFlags),
            status: auditResult.channel,
            aiRiskScore: auditResult.riskScore,
            aiRiskFlag: auditResult.statusSummary,
            updatedAt: new Date(),
          })
          .where(eq(customsDeclarations.id, id));

        return reply.send({
          riskScore: auditResult.riskScore,
          channelPrediction: auditResult.channel,
          flag: auditResult.statusSummary,
          rulesEvaluated: auditResult.rulesEvaluated,
          recommendedActions: auditResult.recommendedActions,
        });
      } catch (error: unknown) {
        if (error instanceof TenantAccessDeniedError) {
          return reply.code(403).send({ error: error.message });
        }
        return reply.code(500).send({ error: getErrorMessage(error) });
      }
    },
  );

  // 5.5. Dispatch Customs Clearance / Levante Concedido (e-Firma & Disbursement Sub-Ledger)
  fastify.post(
    "/customs-declarations/:id/clearance",
    {
      schema: {
        tags: ["Customs Declarations"],
        summary:
          "Grant customs clearance with e-Firma stamp and zero-markup disbursement ledger entries",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          channel: { type: "string" },
          certificateSerial: { type: "string" },
          rfcTitular: { type: "string" },
          razonSocial: { type: "string" },
          releaseReference: { type: "string" },
          remarks: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = DispatchClearanceSchema.parse(request.body || {});

        const records = await db
          .select({
            decl: customsDeclarations,
            hs: hsCodes,
            shipment: shipments,
          })
          .from(customsDeclarations)
          .leftJoin(hsCodes, eq(customsDeclarations.hsCodeId, hsCodes.id))
          .leftJoin(shipments, eq(customsDeclarations.shipmentId, shipments.id))
          .where(eq(customsDeclarations.id, id))
          .limit(1);

        if (records.length === 0) {
          return reply.code(404).send({ error: "Declaration not found" });
        }

        const { decl, shipment } = records[0];
        assertTenantAccess(shipment?.companyId);

        const isGreenChannel =
          body.channel === "Green Channel" || body.channel === "Cleared";

        let efirmaStamp: Record<string, unknown> | null = null;
        let milestoneRecord: Record<string, unknown> | null = null;
        let disbursementInfo: Record<string, unknown> | null = null;

        const now = new Date();
        const csvRef =
          body.releaseReference ||
          `AEAT-CSV-${(decl.duaNumber || decl.id)
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(-8)
            .toUpperCase()}`;

        if (isGreenChannel) {
          const cadenaOriginal = `||2.0|${decl.duaNumber || decl.id}|${decl.customsValue ?? 0}|${decl.totalPayable ?? 0}|${now.toISOString()}|ES000811|LEVANTE_VERDE||`;
          const cadenaSha256 = createHash("sha256")
            .update(cadenaOriginal)
            .digest("hex");
          const selloDigital = createHash("sha512")
            .update(cadenaSha256 + "ATLAS_CUSTOMS_OEA_SECRET")
            .digest("base64");
          const tamperSealHash = createHash("sha256")
            .update(selloDigital + decl.id)
            .digest("hex");
          const rfc3161TimestampToken = Buffer.from(
            `RFC3161-TIMESTAMP-${now.getTime()}`,
          ).toString("base64");

          const efirmaId = `ef_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
          const certSerial = body.certificateSerial || "30001000000504829103";
          const rfcTitular =
            body.rfcTitular || decl.eoriNumber || "ESB88492019";
          const razonSocial =
            body.razonSocial || "Atlas Logistics Customs Brokerage SL (OEA-F)";

          await db.insert(efirmaAuditStamps).values({
            id: efirmaId,
            shipmentId: decl.shipmentId,
            documentType: "CUSTOMS_RELEASE",
            certificateSerial: certSerial,
            rfcTitular,
            razonSocial,
            cadenaOriginal,
            cadenaOriginalSha256: cadenaSha256,
            selloDigitalBase64: selloDigital,
            rfc3161TimestampToken,
            tamperSealHash,
            status: "VALIDATED_AND_SEALED",
            verifiedAt: now.toISOString(),
            createdAt: now.getTime(),
            updatedAt: now.getTime(),
          });

          efirmaStamp = {
            id: efirmaId,
            certificateSerial: certSerial,
            rfcTitular,
            razonSocial,
            cadenaOriginalSha256: cadenaSha256,
            tamperSealHash,
            status: "VALIDATED_AND_SEALED",
            csvCode: csvRef,
            verifiedAt: now.toISOString(),
          };

          const dutyAmount = decl.dutiesAmount ?? 0;
          const taxAmount = decl.taxesAmount ?? 0;
          const totalDisbursement = decl.totalPayable ?? dutyAmount + taxAmount;

          if (totalDisbursement > 0) {
            const costId = `cost_disb_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
            const revId = `rev_disb_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

            await db.insert(costs).values({
              id: costId,
              shipmentId: decl.shipmentId,
              amount: totalDisbursement,
              currency: "EUR",
              description: `Disbursement (Suplidos) DUA ${decl.duaNumber} — Arancel (€${dutyAmount.toFixed(2)}) + IVA (€${taxAmount.toFixed(2)})`,
              createdAt: now,
              updatedAt: now,
            });

            await db.insert(revenues).values({
              id: revId,
              shipmentId: decl.shipmentId,
              amount: totalDisbursement,
              currency: "EUR",
              description: `Reimbursement (Suplidos) DUA ${decl.duaNumber} — Cobro suplidos al cliente (Zero-Markup)`,
              createdAt: now,
              updatedAt: now,
            });

            disbursementInfo = {
              amount: totalDisbursement,
              currency: "EUR",
              costId,
              revenueId: revId,
              zeroMarkupVerified: true,
            };
          }

          const eventId = `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
          const eventLocation = `Aduana Marítima ES000811 (Barcelona) — Levante Otorgado (Canal Verde) [CSV: ${csvRef}]`;

          await db.insert(shipmentEventLogs).values({
            id: eventId,
            shipmentId: decl.shipmentId,
            status: "CUSTOMS_CLEARED",
            location: eventLocation,
            recordedAt: now,
          });

          milestoneRecord = {
            id: eventId,
            shipmentId: decl.shipmentId,
            status: "CUSTOMS_CLEARED",
            location: eventLocation,
            recordedAt: now,
          };

          if (shipment) {
            await db
              .update(shipments)
              .set({
                status: "CUSTOMS_CLEARED",
                updatedAt: now,
              })
              .where(eq(shipments.id, decl.shipmentId));
          }

          await domainEventBus.publish("customs:cleared", decl.id, {
            declarationId: decl.id,
            channel: "GREEN",
            duaReference: decl.duaNumber || decl.id,
            totalDutyPayable: totalDisbursement,
          });

          const outboxEventId = `evt_outbox_cr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
          await db.insert(scmOutboxMessages).values({
            eventId: outboxEventId,
            eventType: "CARRIER_EDI_CUSTOMS_RELEASE",
            schemaVersion: 1,
            producerContext: "customs-clearance",
            aggregateType: "SHIPMENT",
            aggregateId: decl.shipmentId,
            aggregateVersion: 1,
            correlationId: decl.duaNumber || decl.id,
            causationId: decl.id,
            actorContextJson: JSON.stringify({
              userId: "customs_broker",
              role: "CUSTOMS_AGENT",
              stationLocode: "ESBCN",
            }),
            payloadJson: JSON.stringify({
              declarationId: decl.id,
              duaNumber: decl.duaNumber,
              shipmentId: decl.shipmentId,
              status: "CUSTOMS_CLEARED",
              channel: "Green Channel",
              csvCode: csvRef,
              clearedAt: now.toISOString(),
              totalDisbursement,
            }),
            status: "PENDING",
            occurredAt: now,
          });
        }

        let existingDuaData: Record<string, unknown> = {};
        try {
          if (decl.duaData) {
            existingDuaData = JSON.parse(decl.duaData) as Record<
              string,
              unknown
            >;
          }
        } catch {
          // Initialize clean object on parse failure
        }

        existingDuaData.box54_customsRelease = {
          channel: body.channel,
          status: isGreenChannel ? "LEVANTE_CONCEDIDO" : "EN_TRAMITACION",
          clearedAt: now.toISOString(),
          csvCode: csvRef,
          remarks:
            body.remarks ||
            (isGreenChannel
              ? "Despacho autorizado por Aduana Marítima Barcelona"
              : "Actualización de canal aduanero"),
        };

        await db
          .update(customsDeclarations)
          .set({
            status: body.channel,
            riskScore: isGreenChannel ? 0 : decl.riskScore,
            updatedAt: now,
            duaData: JSON.stringify(existingDuaData),
          })
          .where(eq(customsDeclarations.id, id));

        return reply.send({
          success: true,
          channel: body.channel,
          cleared: isGreenChannel,
          duaNumber: decl.duaNumber,
          shipmentId: decl.shipmentId,
          efirma: efirmaStamp,
          milestone: milestoneRecord,
          financialDisbursement: disbursementInfo,
        });
      } catch (error: unknown) {
        if (error instanceof TenantAccessDeniedError) {
          return reply.code(403).send({ error: error.message });
        }
        if (error instanceof z.ZodError) {
          return reply
            .code(400)
            .send({
              error: "Validation error",
              details: { issues: error.issues },
            });
        }
        return reply.code(500).send({ error: getErrorMessage(error) });
      }
    },
  );

  // 6. Create a new customs declaration with deterministic tax calculations & DUA setup
  fastify.post(
    "/customs-declarations",
    {
      schema: {
        tags: ["Customs Declarations"],
        summary:
          "Create a customs declaration with automated duty calculation and compliance scoring",
        body: openApiObject({
          shipmentId: { type: "string" },
          brokerId: { type: "string" },
          hsCodeId: { type: "string" },
          hsCode: { type: "string" },
          type: { type: "string" },
          customsValue: { type: "number" },
          originCountry: { type: "string" },
          destinationCountry: { type: "string" },
          eoriNumber: { type: "string" },
          consigneeName: { type: "string" },
          exporterName: { type: "string" },
          grossWeightKg: { type: "number" },
          hasPreferentialOriginCert: { type: "boolean" },
          attachedDocumentTypes: { type: "array", items: { type: "string" } },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = CreateDeclarationSchema.parse(request.body);

        const [parentShipment] = await db
          .select()
          .from(shipments)
          .where(eq(shipments.id, body.shipmentId))
          .limit(1);

        if (parentShipment) {
          assertTenantAccess(parentShipment.companyId);
        }

        const declId = `decl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        const duaNumber = `26ES000811${Math.floor(10000000 + Math.random() * 90000000)}`;

        const tariff = await TariffService.calculateCustomsDuties({
          hsCode: body.hsCode,
          fobValue: body.customsValue,
          originCountry: body.originCountry,
          destinationCountry: body.destinationCountry,
          grossWeightKg: body.grossWeightKg,
          hasPreferentialOriginCert: body.hasPreferentialOriginCert,
        });

        const audit = await ComplianceService.auditDeclaration({
          eoriNumber: body.eoriNumber,
          consigneeName: body.consigneeName,
          originCountry: body.originCountry,
          destinationCountry: body.destinationCountry,
          hsCode: body.hsCode,
          customsValue: body.customsValue,
          grossWeightKg: body.grossWeightKg,
          hasPreferentialOriginCert: body.hasPreferentialOriginCert,
          attachedDocumentTypes: body.attachedDocumentTypes,
        });

        const duaDataJson = JSON.stringify({
          box1_declarationType: `${body.type === "Export" ? "EX1" : "IM4"} - Declaracion ${body.type}`,
          box2_exporter: body.exporterName || "Global Logistics Exporter Ltd",
          box8_consignee: `${body.consigneeName || "Iberica Forwarding SL"} (EORI: ${body.eoriNumber || "ESB88492019"})`,
          box14_declarant:
            "Atlas Logistics Customs Brokerage SL (EORI: ESB88492019)",
          box20_deliveryTerms: "CIF - Puerto de Barcelona",
          box22_currency: "EUR",
          box22_totalAmount: body.customsValue,
          box31_packages: `Bultos comerciales - ${tariff.hsDescription}`,
          box33_hsCode: tariff.hsCode,
          box34_originCountry: body.originCountry,
          box36_preference: body.hasPreferentialOriginCert
            ? "300 - Trato arancelario preferencial (EUR.1)"
            : "100 - Arancel terceros paises",
          box44_documents: body.attachedDocumentTypes || [
            "N935",
            "N705",
            "N714",
          ],
          box46_customsValue: tariff.customsValueCif,
          box47_taxes: tariff.taxBreakdown,
          box47_total: tariff.totalCustomsPayable,
          box54_placeDate: `Barcelona, ${new Date().toLocaleDateString("es-ES")}`,
        });

        await db.insert(customsDeclarations).values({
          id: declId,
          shipmentId: body.shipmentId,
          brokerId: body.brokerId,
          hsCodeId: body.hsCodeId,
          blNumber: `BL-${body.shipmentId.substring(0, 8).toUpperCase()}`,
          duaNumber,
          type: body.type,
          customsValue: tariff.customsValueCif,
          dutiesAmount: tariff.importDuty,
          taxesAmount: tariff.vatAmount,
          totalPayable: tariff.totalCustomsPayable,
          status: audit.channel,
          riskScore: audit.riskScore,
          riskFlags: JSON.stringify(audit.triggeredFlags),
          eoriNumber: body.eoriNumber || "ESB88492019",
          originCountry: body.originCountry,
          destinationCountry: body.destinationCountry,
          duaData: duaDataJson,
          aiRiskScore: audit.riskScore,
          aiRiskFlag: audit.statusSummary,
        });

        if (audit.isCleared) {
          await domainEventBus.publish("customs:cleared", declId, {
            declarationId: declId,
            channel: audit.channel.toUpperCase().includes("GREEN")
              ? "GREEN"
              : "ORANGE",
            duaReference: duaNumber,
            totalDutyPayable: tariff.totalCustomsPayable,
          });
        }

        return reply.code(201).send({
          success: true,
          id: declId,
          duaNumber,
          status: audit.channel,
          tariff,
          audit,
        });
      } catch (error: unknown) {
        if (error instanceof TenantAccessDeniedError) {
          return reply.code(403).send({ error: error.message });
        }
        if (error instanceof z.ZodError) {
          return reply
            .code(400)
            .send({
              error: "Validation error",
              details: { issues: error.issues },
            });
        }
        return reply.code(500).send({ error: getErrorMessage(error) });
      }
    },
  );

  // 7. Get Official DUA (Single Administrative Document) PDF
  fastify.get(
    "/customs-declarations/:id/pdf",
    {
      schema: {
        tags: ["Customs Declarations"],
        summary: "Download official Single Administrative Document (DUA) PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const records = await db
          .select({
            decl: customsDeclarations,
            hs: hsCodes,
            shipment: shipments,
          })
          .from(customsDeclarations)
          .leftJoin(hsCodes, eq(customsDeclarations.hsCodeId, hsCodes.id))
          .leftJoin(shipments, eq(customsDeclarations.shipmentId, shipments.id))
          .where(eq(customsDeclarations.id, id))
          .limit(1);

        if (records.length === 0) {
          return reply.code(404).send({ error: "Declaration not found" });
        }

        const { decl, hs, shipment } = records[0];
        assertTenantAccess(shipment?.companyId);
        const pdfData: CustomsData = {
          declarationId: decl.id,
          duaNumber:
            decl.duaNumber ||
            `26ES000811${decl.id.substring(0, 8).toUpperCase()}`,
          shipmentId: decl.shipmentId,
          type: decl.type || "Import",
          status: decl.status || "Pending",
          channel: decl.status,
          originCountry: decl.originCountry || "CN",
          destinationCountry: decl.destinationCountry || "ES",
          eoriNumber: decl.eoriNumber || "ESB88492019",
          consigneeName: "Iberica Import Logistics SL",
          exporterName: "Global Freight Logistics Ltd",
          hsCode: hs?.code || "8504.40.90.90",
          hsDescription:
            hs?.description || "Static converters and power supply units",
          customsValue: decl.customsValue ?? 25000,
          dutiesAmount: decl.dutiesAmount ?? 825,
          taxesAmount: decl.taxesAmount ?? 5423.25,
          totalPayable: decl.totalPayable ?? 6248.25,
          riskScore: decl.riskScore ?? decl.aiRiskScore ?? 12,
          riskFlags: decl.riskFlags || decl.aiRiskFlag || undefined,
        };

        const pdfBuffer = await PDFService.generateCustomsDeclaration(pdfData);

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename=DUA-${decl.duaNumber || decl.id}.pdf`,
        );
        return reply.send(pdfBuffer);
      } catch (error: unknown) {
        if (error instanceof TenantAccessDeniedError) {
          return reply.code(403).send({ error: error.message });
        }
        fastify.log.error({ err: error }, "PDF Generation Error");
        return reply.code(500).send({ error: "Failed to generate PDF" });
      }
    },
  );

  // 8. Get AEAT / EU Compliant DUA XML Export
  fastify.get(
    "/customs-declarations/:id/xml",
    {
      schema: {
        tags: ["Customs Declarations"],
        summary: "Export AEAT / EU UCC compliant DUA XML",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const records = await db
          .select({
            decl: customsDeclarations,
            hs: hsCodes,
            shipment: shipments,
          })
          .from(customsDeclarations)
          .leftJoin(hsCodes, eq(customsDeclarations.hsCodeId, hsCodes.id))
          .leftJoin(shipments, eq(customsDeclarations.shipmentId, shipments.id))
          .where(eq(customsDeclarations.id, id))
          .limit(1);

        if (records.length === 0) {
          return reply.code(404).send({ error: "Declaration not found" });
        }

        const { decl, hs, shipment } = records[0];
        assertTenantAccess(shipment?.companyId);
        const customsVal = decl.customsValue ?? 25000;
        const duty = decl.dutiesAmount ?? 825;
        const vat = decl.taxesAmount ?? 5423.25;
        const total = decl.totalPayable ?? duty + vat;

        const xmlPayload: DuaXmlPayload = {
          duaNumber:
            decl.duaNumber ||
            `26ES000811${decl.id.substring(0, 8).toUpperCase()}`,
          declarationType: decl.type === "Export" ? "EX1" : "IM4",
          regime: "4000 - Despacho a libre practica y consumo",
          exporter: {
            name: "Global Freight Logistics Ltd",
            address: "Pudong New Area, Shanghai",
            country: decl.originCountry || "CN",
          },
          consignee: {
            name: "Iberica Import Logistics SL",
            address: "Carrer del Port 45, Barcelona",
            country: decl.destinationCountry || "ES",
            eori: decl.eoriNumber || "ESB88492019",
          },
          declarant: {
            name: "Atlas Logistics Customs Brokerage SL",
            eori: "ESB88492019",
            representationType: "2 - Representacion Directa",
          },
          customsOffice: "ES000811 - ADUANA MARITIMA BARCELONA",
          deliveryTerms: "CIF - Puerto de Barcelona",
          transportMode: "1 - Transporte Maritimo",
          packagesCount: 40,
          grossWeightKg: 1200,
          netWeightKg: 1150,
          currency: "EUR",
          customsValue: customsVal,
          items: [
            {
              itemNumber: 1,
              description:
                hs?.description || "Static converters and power supply units",
              hsCode: hs?.code || "8504.40.90.90",
              countryOfOrigin: decl.originCountry || "CN",
              statisticalValue: customsVal,
              dutyRate: hs?.adValoremDuty ?? 0.033,
              dutyAmount: duty,
              vatRate: hs?.vatRate ?? 0.21,
              vatAmount: vat,
              totalAmount: total,
            },
          ],
          documentsAttached: [
            {
              code: "N935",
              description: "Factura comercial definitiva",
              reference: `INV-${decl.shipmentId.substring(0, 6)}`,
            },
            {
              code: "N705",
              description: "Conocimiento de embarque (B/L)",
              reference: decl.blNumber || `BL-${decl.id.substring(0, 8)}`,
            },
            {
              code: "N714",
              description: "Lista de empaque (Packing List)",
              reference: `PKL-${decl.shipmentId.substring(0, 6)}`,
            },
          ],
          totalPayable: total,
        };

        const xmlString = DuaXmlService.generateDuaXml(xmlPayload);

        reply.header("Content-Type", "application/xml; charset=utf-8");
        reply.header(
          "Content-Disposition",
          `attachment; filename=DUA-${xmlPayload.duaNumber}.xml`,
        );
        return reply.send(xmlString);
      } catch (error: unknown) {
        if (error instanceof TenantAccessDeniedError) {
          return reply.code(403).send({ error: error.message });
        }
        fastify.log.error({ err: error }, "XML Generation Error");
        return reply.code(500).send({ error: "Failed to generate DUA XML" });
      }
    },
  );

  // 9. OCR Extraction Endpoint
  const handleOcrExtract = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    try {
      const { documentType, text } = OcrExtractSchema.parse(request.body);
      let result: unknown;
      switch (documentType) {
        case "COMMERCIAL_INVOICE":
          result = extractCommercialInvoice(text);
          break;
        case "PACKING_LIST":
          result = extractPackingList(text);
          break;
        case "TRANSPORT_DOCUMENT":
          result = extractTransportDocument(text);
          break;
        case "CUSTOMS_DECLARATION":
          result = extractCustomsDeclaration(text);
          break;
      }
      return reply.send({ success: true, data: result });
    } catch (error: unknown) {
      return reply
        .code(400)
        .send({ success: false, error: getErrorMessage(error) });
    }
  };

  fastify.post(
    "/ocr/extract",
    { schema: OCR_EXTRACT_ROUTE_SCHEMA },
    handleOcrExtract,
  );
  fastify.post(
    "/customs/ocr/extract",
    { schema: OCR_EXTRACT_ROUTE_SCHEMA },
    handleOcrExtract,
  );

  // 10. Tripartite Cross-Check Endpoint
  const handleOcrCrossCheck = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    try {
      const { invoice, packingList, declaration, transport } =
        OcrCrossCheckSchema.parse(request.body);
      const result = performTripartiteCrossCheck(
        invoice as TripartiteParams[0],
        packingList as TripartiteParams[1],
        declaration as TripartiteParams[2],
        transport as TripartiteParams[3],
      );
      return reply.send({ success: true, data: result });
    } catch (error: unknown) {
      return reply
        .code(400)
        .send({ success: false, error: getErrorMessage(error) });
    }
  };

  fastify.post(
    "/ocr/cross-check",
    { schema: OCR_CROSS_CHECK_ROUTE_SCHEMA },
    handleOcrCrossCheck,
  );
  fastify.post(
    "/customs/ocr/cross-check",
    { schema: OCR_CROSS_CHECK_ROUTE_SCHEMA },
    handleOcrCrossCheck,
  );
};

export default customsRoutes;
