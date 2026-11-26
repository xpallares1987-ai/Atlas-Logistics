/**
 * @file trade-finance.routes.ts
 * @description Fastify routes for Documentary Letters of Credit (UCP 600 / ISBP 745), bank guarantees (URDG 758 / ISP98), discrepancy auditing, SWIFT MT700/MT734 export, fee calculations, and trade credit dossier PDFs.
 * @module @atlas/api/modules/trade-finance/routes
 */

import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq, desc, and, or, like, SQL } from "drizzle-orm";
import { UcpDiscrepancyValidatorService } from "./ucp-discrepancy-validator.service.js";
import { TradeFinanceFeeService } from "./trade-finance-fee.service.js";
import { SwiftMessageService } from "./swift-message.service.js";
import { PDFService } from "../../services/pdf.service.js";
import { swiftIso20022Service } from "../../services/swift-iso20022.service.js";
import { domainEventBus } from "../../lib/events/index.js";
import { authMiddleware, requireRole } from "../../middleware/auth.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. DOMAIN PAYLOAD INTERFACES
// ============================================================================

type TradeInstrumentInsert = typeof schema.tradeCreditInstruments.$inferInsert;
type TradeInstrumentType = TradeInstrumentInsert["instrumentType"];
type TradeInstrumentStatus = NonNullable<TradeInstrumentInsert["status"]>;
type UcpAuditDocumentList = Parameters<
  typeof UcpDiscrepancyValidatorService.auditPresentation
>[1];
type Mt700Input = Parameters<typeof SwiftMessageService.generateMt700>[0];
type TradeFinanceFeeInput = Parameters<
  typeof TradeFinanceFeeService.calculateFees
>[0];

interface CreateTradeInstrumentBody extends Partial<
  Omit<
    TradeInstrumentInsert,
    | "creditAmount"
    | "tolerancePercentage"
    | "presentationPeriodDays"
    | "tenorDays"
    | "partialShipmentsAllowed"
    | "transhipmentAllowed"
  >
> {
  applicantName: string;
  beneficiaryName: string;
  issuingBankBic: string;
  issuingBankName: string;
  creditAmount: number | string;
  tolerancePercentage?: number | string;
  issueDate: string;
  latestShipmentDate: string;
  expiryDate: string;
  portOfLoading: string;
  portOfDischarge: string;
  goodsDescriptionSummary: string;
  partialShipmentsAllowed?: boolean;
  transhipmentAllowed?: boolean;
  presentationPeriodDays?: number | string;
  tenorDays?: number | string;
}

interface CalculateFeesBody {
  creditAmount: number | string;
  currency?: string;
  tenorDays?: number | string;
  validityMonths?: number | string;
  openingFeeRatePct?: number | string;
  confirmationFeeRatePct?: number | string;
  discrepanciesCount?: number | string;
  discrepancyFeeAmount?: number | string;
  amendmentsCount?: number | string;
  amendmentFeeAmount?: number | string;
  paymentSettlementFeeAmount?: number | string;
}

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const TRADE_FINANCE_TAG = ["Trade Finance & Letters of Credit"] as const;

export const tradeFinanceRoutes: FastifyPluginAsync = async (
  app: FastifyInstance,
) => {
  // Hook authentication (parent app.ts authMiddleware already enforces authentication)
  app.addHook("onRequest", async (request) => {
    try {
      if (request.headers.authorization) {
        await request.jwtVerify();
      }
    } catch {
      // Allow gracefully if parent authMiddleware validated or for dev/test
    }
  });

  // 1. GET /api/trade-finance/instruments
  app.get(
    "/instruments",
    {
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary:
          "List documentary trade credit instruments with type, status, and text filters",
        querystring: openApiObject({
          type: { type: "string" },
          status: { type: "string" },
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const { type, status, q } = request.query as {
        type?: string;
        status?: string;
        q?: string;
      };

      const conditions: Array<SQL | undefined> = [];
      if (type && type !== "ALL") {
        conditions.push(
          eq(
            schema.tradeCreditInstruments.instrumentType,
            type as TradeInstrumentType,
          ),
        );
      }
      if (status && status !== "ALL") {
        conditions.push(
          eq(
            schema.tradeCreditInstruments.status,
            status as TradeInstrumentStatus,
          ),
        );
      }
      if (q) {
        conditions.push(
          or(
            like(schema.tradeCreditInstruments.instrumentReference, `%${q}%`),
            like(schema.tradeCreditInstruments.applicantName, `%${q}%`),
            like(schema.tradeCreditInstruments.beneficiaryName, `%${q}%`),
            like(schema.tradeCreditInstruments.issuingBankName, `%${q}%`),
          ),
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;
      const instruments = await db
        .select()
        .from(schema.tradeCreditInstruments)
        .where(whereClause)
        .orderBy(desc(schema.tradeCreditInstruments.createdAt));

      return reply.send(instruments);
    },
  );

  // 2. GET /api/trade-finance/instruments/:id
  app.get(
    "/instruments/:id",
    {
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary:
          "Retrieve trade credit instrument detail with presented documents, discrepancies, fee schedule, and SWIFT messages",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const instrument = await db
        .select()
        .from(schema.tradeCreditInstruments)
        .where(eq(schema.tradeCreditInstruments.id, id))
        .get();

      if (!instrument) {
        return reply
          .code(404)
          .send({ error: "Trade credit instrument not found" });
      }

      const documents = await db
        .select()
        .from(schema.tradeCreditDocuments)
        .where(eq(schema.tradeCreditDocuments.instrumentId, id));

      const discrepancies = await db
        .select()
        .from(schema.tradeDiscrepancies)
        .where(eq(schema.tradeDiscrepancies.instrumentId, id));

      const feeSchedule = await db
        .select()
        .from(schema.tradeFeeSchedules)
        .where(eq(schema.tradeFeeSchedules.instrumentId, id))
        .get();

      const swiftMessages = await db
        .select()
        .from(schema.tradeSwiftMessages)
        .where(eq(schema.tradeSwiftMessages.instrumentId, id));

      return reply.send({
        ...instrument,
        documents,
        discrepancies,
        feeSchedule,
        swiftMessages,
      });
    },
  );

  // 3. POST /api/trade-finance/instruments
  app.post(
    "/instruments",
    {
      preHandler: [authMiddleware, requireRole(["ACCOUNTING", "CONTROLLING"])],
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary: "Create and issue a new documentary trade credit instrument",
        body: openApiObject({
          instrumentReference: { type: "string" },
          instrumentType: { type: "string" },
          applicantName: { type: "string" },
          beneficiaryName: { type: "string" },
          issuingBankBic: { type: "string" },
          issuingBankName: { type: "string" },
          currency: { type: "string" },
          creditAmount: { type: "number" },
          issueDate: { type: "string" },
          latestShipmentDate: { type: "string" },
          expiryDate: { type: "string" },
          portOfLoading: { type: "string" },
          portOfDischarge: { type: "string" },
          goodsDescriptionSummary: { type: "string" },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Partial<CreateTradeInstrumentBody>;
      const creditAmount = Number(body?.creditAmount);
      const missingFields = (
        [
          "applicantName",
          "beneficiaryName",
          "issuingBankBic",
          "issuingBankName",
          "issueDate",
          "latestShipmentDate",
          "expiryDate",
          "portOfLoading",
          "portOfDischarge",
          "goodsDescriptionSummary",
        ] as const
      ).filter(
        (field) =>
          typeof body?.[field] !== "string" || body[field].trim().length === 0,
      );

      if (
        missingFields.length > 0 ||
        !Number.isFinite(creditAmount) ||
        creditAmount <= 0
      ) {
        return reply.code(400).send({
          error: "INVALID_TRADE_INSTRUMENT_PAYLOAD",
          message:
            "Missing required trade credit instrument fields or invalid creditAmount",
          details:
            missingFields.length > 0
              ? { missingFields }
              : { creditAmount: "Must be a finite positive number" },
        });
      }

      const id = `lc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const instrumentData: TradeInstrumentInsert = {
        id,
        instrumentReference:
          body.instrumentReference ||
          `LC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        instrumentType: body.instrumentType || "COMMERCIAL_LC_IRREVOCABLE",
        applicableRules: body.applicableRules || "UCP600",
        applicantCompanyId: body.applicantCompanyId || null,
        applicantName: body.applicantName as string,
        beneficiaryName: body.beneficiaryName as string,
        beneficiaryCountry: body.beneficiaryCountry || "ES",
        issuingBankBic: body.issuingBankBic as string,
        issuingBankName: body.issuingBankName as string,
        confirmingBankBic: body.confirmingBankBic || null,
        confirmingBankName: body.confirmingBankName || null,
        currency: body.currency || "EUR",
        creditAmount,
        tolerancePercentage: Number(body.tolerancePercentage ?? 5.0),
        issueDate: body.issueDate as string,
        latestShipmentDate: body.latestShipmentDate as string,
        expiryDate: body.expiryDate as string,
        expiryPlace: body.expiryPlace || "Counters of Beneficiary Bank",
        portOfLoading: body.portOfLoading as string,
        portOfDischarge: body.portOfDischarge as string,
        goodsDescriptionSummary: body.goodsDescriptionSummary as string,
        partialShipmentsAllowed: Boolean(body.partialShipmentsAllowed),
        transhipmentAllowed: Boolean(body.transhipmentAllowed),
        presentationPeriodDays: Number(body.presentationPeriodDays ?? 21),
        confirmationInstructions: body.confirmationInstructions || "CONFIRM",
        paymentTerms: body.paymentTerms || "SIGHT",
        tenorDays: Number(body.tenorDays ?? 0),
        status: body.status || "ISSUED",
        remarks: body.remarks || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.insert(schema.tradeCreditInstruments).values(instrumentData);

      domainEventBus.publish("trade-finance:instrument-issued", id, {
        instrumentId: id,
        instrumentType: "LETTER_OF_CREDIT",
        amount: Number(instrumentData.creditAmount),
        currency: instrumentData.currency ?? "EUR",
        applicantCompanyId:
          instrumentData.applicantCompanyId || "applicant_unknown",
        beneficiaryCompanyId: "beneficiary_unknown",
      });

      return reply.code(201).send(instrumentData);
    },
  );

  // 4. POST /api/trade-finance/instruments/:id/validate-ucp
  app.post(
    "/instruments/:id/validate-ucp",
    {
      preHandler: [authMiddleware, requireRole(["ACCOUNTING", "CONTROLLING"])],
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary:
          "Audit presented trade documents against ICC UCP 600 and ISBP 745 rules",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          presentationDate: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { presentationDate } = (request.body ?? {}) as {
        presentationDate?: string;
      };

      const instrument = await db
        .select()
        .from(schema.tradeCreditInstruments)
        .where(eq(schema.tradeCreditInstruments.id, id))
        .get();

      if (!instrument) {
        return reply
          .code(404)
          .send({ error: "Trade credit instrument not found" });
      }

      const documents = await db
        .select()
        .from(schema.tradeCreditDocuments)
        .where(eq(schema.tradeCreditDocuments.instrumentId, id));

      const auditResult = UcpDiscrepancyValidatorService.auditPresentation(
        {
          instrumentReference: instrument.instrumentReference,
          currency: instrument.currency,
          creditAmount: instrument.creditAmount,
          tolerancePercentage: instrument.tolerancePercentage,
          issueDate: instrument.issueDate,
          latestShipmentDate: instrument.latestShipmentDate,
          expiryDate: instrument.expiryDate,
          presentationPeriodDays: instrument.presentationPeriodDays,
          portOfLoading: instrument.portOfLoading,
          portOfDischarge: instrument.portOfDischarge,
          goodsDescriptionSummary: instrument.goodsDescriptionSummary,
          presentationDate:
            presentationDate || new Date().toISOString().split("T")[0],
        },
        documents as unknown as UcpAuditDocumentList,
      );

      const newStatus = auditResult.isCompliant
        ? "ACCEPTED"
        : "DISCREPANCIES_FOUND";
      await db
        .update(schema.tradeCreditInstruments)
        .set({
          status: newStatus,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.tradeCreditInstruments.id, id));

      return reply.send({
        success: true,
        auditResult,
      });
    },
  );

  // 4.5 POST /api/trade-finance/instruments/:id/honour-settlement
  app.post(
    "/instruments/:id/honour-settlement",
    {
      preHandler: [
        authMiddleware,
        requireRole(["ACCOUNTING", "CONTROLLING", "ADMIN"]),
      ],
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary:
          "Honour and settle a verified trade credit instrument via ISO 20022 pacs.008 payment transfer",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          debtorIban: { type: "string" },
          debtorBic: { type: "string" },
          creditorIban: { type: "string" },
          creditorBic: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as {
        debtorIban?: string;
        debtorBic?: string;
        creditorIban?: string;
        creditorBic?: string;
      };

      try {
        const transmission =
          await swiftIso20022Service.generateTradeCreditSettlementPayment({
            instrumentId: id,
            debtorIban: body.debtorIban,
            debtorBic: body.debtorBic,
            creditorIban: body.creditorIban,
            creditorBic: body.creditorBic,
          });

        domainEventBus.publish("trade-finance:instrument-honoured", id, {
          instrumentId: id,
          transmissionId: transmission.id,
          transmissionNumber: transmission.transmissionNumber,
          totalAmount: transmission.totalAmount,
          currency: transmission.currency,
          settledAt: new Date().toISOString(),
        });

        return reply.code(200).send({
          success: true,
          instrumentId: id,
          transmissionId: transmission.id,
          transmissionNumber: transmission.transmissionNumber,
          totalAmount: transmission.totalAmount,
          currency: transmission.currency,
          messageType: transmission.messageType,
          status: transmission.status,
          payloadHashSha256: transmission.payloadHashSha256,
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Error settling trade credit";
        const isNotFound = errorMessage.includes("not found");
        const statusCode = isNotFound ? 404 : 400;

        return reply.code(statusCode).send({
          error: isNotFound ? "Not Found" : "Settlement Error",
          message: errorMessage,
        });
      }
    },
  );

  // 5. POST /api/trade-finance/calculate-fees
  app.post(
    "/calculate-fees",
    {
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary:
          "Calculate bank LC opening fees, confirmation spreads, discrepancy charges, and settlement costs",
        body: openApiObject({
          creditAmount: { type: "number" },
          currency: { type: "string" },
          tenorDays: { type: "number" },
          validityMonths: { type: "number" },
          openingFeeRatePct: { type: "number" },
          confirmationFeeRatePct: { type: "number" },
          discrepanciesCount: { type: "number" },
          amendmentsCount: { type: "number" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as CalculateFeesBody;
      const feeInput: TradeFinanceFeeInput = {
        creditAmount: Number(body.creditAmount),
        currency: body.currency || "EUR",
        tenorDays: Number(body.tenorDays ?? 0),
        validityMonths: body.validityMonths
          ? Number(body.validityMonths)
          : undefined,
        openingFeeRatePct: body.openingFeeRatePct
          ? Number(body.openingFeeRatePct)
          : undefined,
        confirmationFeeRatePct: body.confirmationFeeRatePct
          ? Number(body.confirmationFeeRatePct)
          : undefined,
        discrepanciesCount: body.discrepanciesCount
          ? Number(body.discrepanciesCount)
          : 0,
        discrepancyFeeAmount: body.discrepancyFeeAmount
          ? Number(body.discrepancyFeeAmount)
          : undefined,
        amendmentsCount: body.amendmentsCount
          ? Number(body.amendmentsCount)
          : 0,
        amendmentFeeAmount: body.amendmentFeeAmount
          ? Number(body.amendmentFeeAmount)
          : undefined,
        paymentSettlementFeeAmount: body.paymentSettlementFeeAmount
          ? Number(body.paymentSettlementFeeAmount)
          : undefined,
      };
      const result = TradeFinanceFeeService.calculateFees(feeInput);

      return reply.send({
        success: true,
        feeCalculation: result,
      });
    },
  );

  // 6. GET /api/trade-finance/instruments/:id/swift-mt700
  app.get(
    "/instruments/:id/swift-mt700",
    {
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary: "Export raw SWIFT FIN MT700 documentary credit message text",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const instrument = await db
        .select()
        .from(schema.tradeCreditInstruments)
        .where(eq(schema.tradeCreditInstruments.id, id))
        .get();

      if (!instrument) {
        return reply
          .code(404)
          .send({ error: "Trade credit instrument not found" });
      }

      const swiftText = SwiftMessageService.generateMt700({
        instrumentReference: instrument.instrumentReference,
        senderBic: instrument.issuingBankBic,
        receiverBic: instrument.confirmingBankBic || "BSCHESMMXXX",
        issueDate: instrument.issueDate,
        expiryDate: instrument.expiryDate,
        expiryPlace: instrument.expiryPlace,
        applicantName: instrument.applicantName,
        beneficiaryName: instrument.beneficiaryName,
        currency: instrument.currency,
        creditAmount: instrument.creditAmount,
        tolerancePercentage: instrument.tolerancePercentage,
        confirmationInstructions:
          instrument.confirmationInstructions as Mt700Input["confirmationInstructions"],
        paymentTerms: instrument.paymentTerms as Mt700Input["paymentTerms"],
        tenorDays: instrument.tenorDays,
        portOfLoading: instrument.portOfLoading,
        portOfDischarge: instrument.portOfDischarge,
        latestShipmentDate: instrument.latestShipmentDate,
        goodsDescription: instrument.goodsDescriptionSummary,
        presentationPeriodDays: instrument.presentationPeriodDays,
      });

      reply.header("Content-Type", "text/plain; charset=utf-8");
      reply.header(
        "Content-Disposition",
        `attachment; filename="SWIFT_MT700_${instrument.instrumentReference}.txt"`,
      );
      return reply.send(swiftText);
    },
  );

  // 7. GET /api/trade-finance/instruments/:id/swift-mt734
  app.get(
    "/instruments/:id/swift-mt734",
    {
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary: "Export raw SWIFT FIN MT734 Advice of Refusal message text",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const instrument = await db
        .select()
        .from(schema.tradeCreditInstruments)
        .where(eq(schema.tradeCreditInstruments.id, id))
        .get();

      if (!instrument) {
        return reply
          .code(404)
          .send({ error: "Trade credit instrument not found" });
      }

      const discrepancies = await db
        .select()
        .from(schema.tradeDiscrepancies)
        .where(eq(schema.tradeDiscrepancies.instrumentId, id));

      const swiftText = SwiftMessageService.generateMt734({
        instrumentReference: instrument.instrumentReference,
        senderBic: instrument.confirmingBankBic || "BSCHESMMXXX",
        receiverBic: instrument.issuingBankBic,
        currency: instrument.currency,
        creditAmount: instrument.creditAmount,
        presentationDate: new Date().toISOString().split("T")[0],
        discrepancies: discrepancies.map((d) => ({
          discrepancyRuleCode: d.discrepancyRuleCode,
          articleReference: d.articleReference,
          description: d.description,
        })),
      });

      reply.header("Content-Type", "text/plain; charset=utf-8");
      reply.header(
        "Content-Disposition",
        `attachment; filename="SWIFT_MT734_REFUSAL_${instrument.instrumentReference}.txt"`,
      );
      return reply.send(swiftText);
    },
  );

  // 8. GET /api/trade-finance/instruments/:id/presentation-dossier-pdf
  app.get(
    "/instruments/:id/presentation-dossier-pdf",
    {
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary: "Generate and stream Trade Credit Presentation Dossier PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const instrument = await db
        .select()
        .from(schema.tradeCreditInstruments)
        .where(eq(schema.tradeCreditInstruments.id, id))
        .get();

      if (!instrument) {
        return reply
          .code(404)
          .send({ error: "Trade credit instrument not found" });
      }

      const documents = await db
        .select()
        .from(schema.tradeCreditDocuments)
        .where(eq(schema.tradeCreditDocuments.instrumentId, id));

      const discrepancies = await db
        .select()
        .from(schema.tradeDiscrepancies)
        .where(eq(schema.tradeDiscrepancies.instrumentId, id));

      const pdfBuffer =
        await PDFService.generateTradeCreditPresentationDossierPdf({
          instrument,
          documents,
          discrepancies,
        });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `inline; filename="Trade_Credit_Dossier_${instrument.instrumentReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    },
  );

  // 9. GET /api/trade-finance/instruments/:id/discrepancy-report-pdf
  app.get(
    "/instruments/:id/discrepancy-report-pdf",
    {
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary: "Generate and stream UCP 600 Discrepancy Audit Report PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const instrument = await db
        .select()
        .from(schema.tradeCreditInstruments)
        .where(eq(schema.tradeCreditInstruments.id, id))
        .get();

      if (!instrument) {
        return reply
          .code(404)
          .send({ error: "Trade credit instrument not found" });
      }

      const discrepancies = await db
        .select()
        .from(schema.tradeDiscrepancies)
        .where(eq(schema.tradeDiscrepancies.instrumentId, id));

      const pdfBuffer = await PDFService.generateUcpDiscrepancyAuditReportPdf({
        instrument,
        discrepancies,
      });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `inline; filename="UCP600_Discrepancy_Audit_${instrument.instrumentReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    },
  );

  // 10. GET /api/trade-finance/instruments/:id/guarantee-certificate-pdf
  app.get(
    "/instruments/:id/guarantee-certificate-pdf",
    {
      schema: {
        tags: [...TRADE_FINANCE_TAG],
        summary:
          "Generate and stream Demand Guarantee Certificate PDF (URDG 758 / ISP98)",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const instrument = await db
        .select()
        .from(schema.tradeCreditInstruments)
        .where(eq(schema.tradeCreditInstruments.id, id))
        .get();

      if (!instrument) {
        return reply
          .code(404)
          .send({ error: "Trade credit instrument not found" });
      }

      const pdfBuffer = await PDFService.generateDemandGuaranteeCertificatePdf({
        instrument,
      });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `inline; filename="Demand_Guarantee_URDG758_${instrument.instrumentReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    },
  );
};
