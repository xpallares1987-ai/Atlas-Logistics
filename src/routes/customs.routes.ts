import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  customsDeclarations,
  hsCodes,
  shipments,
} from "../db/schema/operations.js";
import { eq, desc } from "drizzle-orm";
import { PDFService, CustomsData } from "../services/pdf.service.js";
import { TariffService } from "../services/customs/tariff.service.js";
import { ComplianceService } from "../services/customs/compliance.service.js";
import {
  DuaXmlService,
  DuaXmlPayload,
} from "../services/customs/dua-xml.service.js";

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

const customsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  // 1. List all customs declarations
  fastify.get("/customs-declarations", async (request, reply) => {
    try {
      const records = await db
        .select({
          decl: customsDeclarations,
          hs: hsCodes,
        })
        .from(customsDeclarations)
        .leftJoin(hsCodes, eq(customsDeclarations.hsCodeId, hsCodes.id))
        .orderBy(desc(customsDeclarations.createdAt));

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
            .send({ error: "Validation error", details: error.errors });
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
            .send({ error: "Validation error", details: error.errors });
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
        })
        .from(customsDeclarations)
        .leftJoin(hsCodes, eq(customsDeclarations.hsCodeId, hsCodes.id))
        .where(eq(customsDeclarations.id, id))
        .limit(1);

      if (records.length === 0) {
        return reply.code(404).send({ error: "Declaration not found" });
      }

      const { decl, hs } = records[0];
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
      reply.code(500).send({ error: error.message });
    }
  });

  // 6. Create a new customs declaration with deterministic tax calculations & DUA setup
  fastify.post("/customs-declarations", async (request, reply) => {
    try {
      const body = CreateDeclarationSchema.parse(request.body);
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

      return reply.code(201).send({
        success: true,
        id: declId,
        duaNumber,
        status: audit.channel,
        tariff,
        audit,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply
          .code(400)
          .send({ error: "Validation error", details: error.errors });
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
        })
        .from(customsDeclarations)
        .leftJoin(hsCodes, eq(customsDeclarations.hsCodeId, hsCodes.id))
        .where(eq(customsDeclarations.id, id))
        .limit(1);

      if (records.length === 0) {
        return reply.code(404).send({ error: "Declaration not found" });
      }

      const { decl, hs } = records[0];
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
        })
        .from(customsDeclarations)
        .leftJoin(hsCodes, eq(customsDeclarations.hsCodeId, hsCodes.id))
        .where(eq(customsDeclarations.id, id))
        .limit(1);

      if (records.length === 0) {
        return reply.code(404).send({ error: "Declaration not found" });
      }

      const { decl, hs } = records[0];
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
      fastify.log.error("XML Generation Error:", error);
      reply.code(500).send({ error: "Failed to generate DUA XML" });
    }
  });
};

export default customsRoutes;
