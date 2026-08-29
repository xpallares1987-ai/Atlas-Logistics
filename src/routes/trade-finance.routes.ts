import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { eq, desc, and, or, like } from "drizzle-orm";
import { UcpDiscrepancyValidatorService } from "../services/trade-finance/ucp-discrepancy-validator.service.js";
import { TradeFinanceFeeService } from "../services/trade-finance/trade-finance-fee.service.js";
import { SwiftMessageService } from "../services/trade-finance/swift-message.service.js";
import { PDFService } from "../services/pdf.service.js";

export const tradeFinanceRoutes: FastifyPluginAsync = async (
  app: FastifyInstance,
) => {
  // Hook authentication
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });

  /**
   * GET /api/trade-finance/instruments
   * List trade credit instruments with optional search and type filtering
   */
  app.get("/instruments", async (request, reply) => {
    const { type, status, q } = request.query as {
      type?: string;
      status?: string;
      q?: string;
    };

    const conditions: any[] = [];
    if (type && type !== "ALL") {
      conditions.push(
        eq(schema.tradeCreditInstruments.instrumentType, type as any),
      );
    }
    if (status && status !== "ALL") {
      conditions.push(eq(schema.tradeCreditInstruments.status, status as any));
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const instruments = await db
      .select()
      .from(schema.tradeCreditInstruments)
      .where(whereClause)
      .orderBy(desc(schema.tradeCreditInstruments.createdAt));

    return reply.send(instruments);
  });

  /**
   * GET /api/trade-finance/instruments/:id
   * Detail of a trade credit instrument with presented documents, discrepancies and fee schedules
   */
  app.get("/instruments/:id", async (request, reply) => {
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
  });

  /**
   * POST /api/trade-finance/instruments
   * Creates a new trade credit instrument
   */
  app.post("/instruments", async (request, reply) => {
    const body = request.body as any;
    const id = `lc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const instrumentData = {
      id,
      instrumentReference:
        body.instrumentReference ||
        `LC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      instrumentType: body.instrumentType || "COMMERCIAL_LC_IRREVOCABLE",
      applicableRules: body.applicableRules || "UCP600",
      applicantCompanyId: body.applicantCompanyId || null,
      applicantName: body.applicantName,
      beneficiaryName: body.beneficiaryName,
      beneficiaryCountry: body.beneficiaryCountry || "ES",
      issuingBankBic: body.issuingBankBic,
      issuingBankName: body.issuingBankName,
      confirmingBankBic: body.confirmingBankBic || null,
      confirmingBankName: body.confirmingBankName || null,
      currency: body.currency || "EUR",
      creditAmount: Number(body.creditAmount),
      tolerancePercentage: Number(body.tolerancePercentage ?? 5.0),
      issueDate: body.issueDate,
      latestShipmentDate: body.latestShipmentDate,
      expiryDate: body.expiryDate,
      expiryPlace: body.expiryPlace || "Counters of Beneficiary Bank",
      portOfLoading: body.portOfLoading,
      portOfDischarge: body.portOfDischarge,
      goodsDescriptionSummary: body.goodsDescriptionSummary,
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

    return reply.code(201).send(instrumentData);
  });

  /**
   * POST /api/trade-finance/instruments/:id/validate-ucp
   * Audits presented documents against UCP 600 & ISBP 745
   */
  app.post("/instruments/:id/validate-ucp", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { presentationDate } = request.body as { presentationDate?: string };

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
      documents as any[],
    );

    // Update instrument status
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
  });

  /**
   * POST /api/trade-finance/calculate-fees
   * Calculates bank charges, opening fees and confirmation spreads
   */
  app.post("/calculate-fees", async (request, reply) => {
    const body = request.body as any;
    const result = TradeFinanceFeeService.calculateFees({
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
      amendmentsCount: body.amendmentsCount ? Number(body.amendmentsCount) : 0,
      amendmentFeeAmount: body.amendmentFeeAmount
        ? Number(body.amendmentFeeAmount)
        : undefined,
      paymentSettlementFeeAmount: body.paymentSettlementFeeAmount
        ? Number(body.paymentSettlementFeeAmount)
        : undefined,
    });

    return reply.send({
      success: true,
      feeCalculation: result,
    });
  });

  /**
   * GET /api/trade-finance/instruments/:id/swift-mt700
   * Exports raw SWIFT MT700 text
   */
  app.get("/instruments/:id/swift-mt700", async (request, reply) => {
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
      confirmationInstructions: instrument.confirmationInstructions as any,
      paymentTerms: instrument.paymentTerms as any,
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
  });

  /**
   * GET /api/trade-finance/instruments/:id/swift-mt734
   * Exports raw SWIFT MT734 Refusal notice text
   */
  app.get("/instruments/:id/swift-mt734", async (request, reply) => {
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
  });

  /**
   * GET /api/trade-finance/instruments/:id/presentation-dossier-pdf
   * Streams Presentation Dossier PDF
   */
  app.get(
    "/instruments/:id/presentation-dossier-pdf",
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

  /**
   * GET /api/trade-finance/instruments/:id/discrepancy-report-pdf
   * Streams Discrepancy Audit Report PDF
   */
  app.get("/instruments/:id/discrepancy-report-pdf", async (request, reply) => {
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
  });

  /**
   * GET /api/trade-finance/instruments/:id/guarantee-certificate-pdf
   * Streams Demand Guarantee Certificate PDF (URDG 758 / ISP98)
   */
  app.get(
    "/instruments/:id/guarantee-certificate-pdf",
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
