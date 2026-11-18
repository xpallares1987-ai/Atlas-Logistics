import { FastifyPluginAsync } from "fastify";
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
import { eq, desc, and, inArray } from "drizzle-orm";
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
  invoice: z.any(),
  packingList: z.any(),
  declaration: z.any(),
  transport: z.any().optional(),
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

const customsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  // 1. List all customs declarations (tenant-scoped & bounded pagination)
  fastify.get("/customs-declarations", async (request, reply) => {
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
      const conditions: any[] = [];
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
        .leftJoin(shipments, eq(customsDeclarations.shipmentId, shipments.id));

      const records = await (
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery
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

      const efirmaMap: Record<string, any> = {};
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
            riskFlagsParsed = JSON.parse(decl.riskFlags);
          }
        } catch {
          if (decl.aiRiskFlag) riskFlagsParsed = [decl.aiRiskFlag];
        }

        let duaDataParsed: any = null;
        try {
          if (decl.duaData) duaDataParsed = JSON.parse(decl.duaData);
        } catch {}

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
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // 2. Search TARIC / HS Codes catalog
  fastify.get("/customs-declarations/hs-codes", async (request, reply) => {
    try {
      const { q } = request.query as { q?: string };
      const list = await TariffService.searchHsCodes(q || "");
      return reply.send(list);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // 3. Deterministic Tariff & Duty Calculator Endpoint
  fastify.post(
    "/customs-declarations/calculate-tariff",
    async (request, reply) => {
      try {
        const body = CalculateTariffSchema.parse(request.body);
        const result = await TariffService.calculateCustomsDuties(body);
        return reply.send(result);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply
            .code(400)
            .send({ error: "Validation error", details: error.issues });
        }
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // 4. Deterministic Compliance Audit & Channel Evaluation
  fastify.post(
    "/customs-declarations/compliance-audit",
    async (request, reply) => {
      try {
        const body = ComplianceAuditSchema.parse(request.body);
        const result = await ComplianceService.auditDeclaration(body);
        return reply.send(result);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply
            .code(400)
            .send({ error: "Validation error", details: error.issues });
        }
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // 5. Analyze and evaluate single declaration (Backward compatible + deterministic engine)
  fastify.post("/customs-declarations/:id/analyze", async (request, reply) => {
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

      // Update declaration with deterministic audit outcomes
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
    } catch (error: any) {
      if (error instanceof TenantAccessDeniedError) {
        return reply.code(403).send({ error: error.message });
      }
      reply.code(500).send({ error: error.message });
    }
  });

  // 5.5. Dispatch Customs Clearance / Levante Concedido (e-Firma & Disbursement Sub-Ledger)
  fastify.post(
    "/customs-declarations/:id/clearance",
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

        const { decl, hs, shipment } = records[0];
        assertTenantAccess(shipment?.companyId);

        const isGreenChannel =
          body.channel === "Green Channel" || body.channel === "Cleared";

        let efirmaStamp: any = null;
        let milestoneRecord: any = null;
        let disbursementInfo: any = null;

        const now = new Date();
        const csvRef =
          body.releaseReference ||
          `AEAT-CSV-${(decl.duaNumber || decl.id)
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(-8)
            .toUpperCase()}`;

        if (isGreenChannel) {
          // 1. Cryptographic e-Firma SAT/AEAT Audit Stamp
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

          // 2. Strict Financial Segregation: Disbursements (Suplidos) Zero-Markup Rule (atlas-customs-brokerage Rule 1)
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

          // 3. Operational Milestone in shipmentEventLogs
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

          // 4. Update shipment status to CUSTOMS_CLEARED
          if (shipment) {
            await db
              .update(shipments)
              .set({
                status: "CUSTOMS_CLEARED",
                updatedAt: now,
              })
              .where(eq(shipments.id, decl.shipmentId));
          }

          // 5. Publish domain event
          await domainEventBus.publish("customs:cleared", decl.id, {
            declarationId: decl.id,
            channel: "GREEN",
            duaReference: decl.duaNumber || decl.id,
            totalDutyPayable: totalDisbursement,
          });

          // 6. Asynchronous Outbox Enqueue (Rule 3 of atlas-b2b-edi-gateway)
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

        // Update declaration DUA JSON box 54
        let existingDuaData: any = {};
        try {
          if (decl.duaData) existingDuaData = JSON.parse(decl.duaData);
        } catch {}

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
      } catch (error: any) {
        if (error instanceof TenantAccessDeniedError) {
          return reply.code(403).send({ error: error.message });
        }
        if (error instanceof z.ZodError) {
          return reply
            .code(400)
            .send({ error: "Validation error", details: error.issues });
        }
        reply.code(500).send({ error: error.message });
      }
    },
  );

  // 6. Create a new customs declaration with deterministic tax calculations & DUA setup
  fastify.post("/customs-declarations", async (request, reply) => {
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

      // Calculate taxes
      const tariff = await TariffService.calculateCustomsDuties({
        hsCode: body.hsCode,
        fobValue: body.customsValue,
        originCountry: body.originCountry,
        destinationCountry: body.destinationCountry,
        grossWeightKg: body.grossWeightKg,
        hasPreferentialOriginCert: body.hasPreferentialOriginCert,
      });

      // Audit compliance
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
        box44_documents: body.attachedDocumentTypes || ["N935", "N705", "N714"],
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
    } catch (error: any) {
      if (error instanceof TenantAccessDeniedError) {
        return reply.code(403).send({ error: error.message });
      }
      if (error instanceof z.ZodError) {
        return reply
          .code(400)
          .send({ error: "Validation error", details: error.issues });
      }
      reply.code(500).send({ error: error.message });
    }
  });

  // 7. Get Official DUA (Single Administrative Document) PDF
  fastify.get("/customs-declarations/:id/pdf", async (request, reply) => {
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
    } catch (error: any) {
      if (error instanceof TenantAccessDeniedError) {
        return reply.code(403).send({ error: error.message });
      }
      fastify.log.error("PDF Generation Error:", error);
      reply.code(500).send({ error: "Failed to generate PDF" });
    }
  });

  // 8. Get AEAT / EU Compliant DUA XML Export
  fastify.get("/customs-declarations/:id/xml", async (request, reply) => {
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
    } catch (error: any) {
      if (error instanceof TenantAccessDeniedError) {
        return reply.code(403).send({ error: error.message });
      }
      fastify.log.error("XML Generation Error:", error);
      reply.code(500).send({ error: "Failed to generate DUA XML" });
    }
  });

  // 7. OCR Extraction Endpoint
  const handleOcrExtract = async (request: any, reply: any) => {
    try {
      const { documentType, text } = OcrExtractSchema.parse(request.body);
      let result;
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
    } catch (error: any) {
      return reply.code(400).send({ success: false, error: error.message });
    }
  };

  fastify.post("/ocr/extract", handleOcrExtract);
  fastify.post("/customs/ocr/extract", handleOcrExtract);

  // 8. Tripartite Cross-Check Endpoint
  const handleOcrCrossCheck = async (request: any, reply: any) => {
    try {
      const { invoice, packingList, declaration, transport } =
        OcrCrossCheckSchema.parse(request.body);
      const result = performTripartiteCrossCheck(
        invoice,
        packingList,
        declaration,
        transport,
      );
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.code(400).send({ success: false, error: error.message });
    }
  };

  fastify.post("/ocr/cross-check", handleOcrCrossCheck);
  fastify.post("/customs/ocr/cross-check", handleOcrCrossCheck);
};

export default customsRoutes;
