import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import {
  carrierInvoices,
  carrierInvoiceLines,
  treasuryFxPositions,
  fxRates,
} from "../db/schema/index.js";
import { eq, desc, and } from "drizzle-orm";
import {
  CarrierReconciliationService,
  LineMatchInput,
} from "../services/treasury/carrier-reconciliation.service.js";
import {
  TreasuryFxService,
  FxPositionInput,
} from "../services/treasury/treasury-fx.service.js";
import { PDFService } from "../services/pdf.service.js";

export const treasuryRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication hook
  fastify.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply
        .status(401)
        .send({ error: "Unauthorized", message: "Invalid or missing token" });
    }
  });

  // GET /api/treasury/invoices
  fastify.get("/invoices", async (req, reply) => {
    const { mode, status, q } = req.query as {
      mode?: string;
      status?: string;
      q?: string;
    };

    try {
      const invoices = await db
        .select()
        .from(carrierInvoices)
        .orderBy(desc(carrierInvoices.createdAt));

      let filtered = invoices;
      if (mode && mode !== "ALL") {
        filtered = filtered.filter((i) => i.mode === mode);
      }
      if (status && status !== "ALL") {
        filtered = filtered.filter((i) => i.reconciliationStatus === status);
      }
      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.invoiceNumber.toLowerCase().includes(query) ||
            i.carrierName.toLowerCase().includes(query) ||
            (i.cassStatementNumber &&
              i.cassStatementNumber.toLowerCase().includes(query)),
        );
      }

      return reply.send(filtered);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/treasury/invoices/:id
  fastify.get("/invoices/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const invoice = await db
        .select()
        .from(carrierInvoices)
        .where(eq(carrierInvoices.id, id))
        .get();

      if (!invoice) {
        return reply.status(404).send({ error: "Invoice not found" });
      }

      const lines = await db
        .select()
        .from(carrierInvoiceLines)
        .where(eq(carrierInvoiceLines.carrierInvoiceId, id));

      return reply.send({
        ...invoice,
        lines,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // POST /api/treasury/reconcile (Evaluates 3-Way Match)
  fastify.post("/reconcile", async (req, reply) => {
    const { lines } = req.body as { lines: LineMatchInput[] };

    if (!lines || !Array.isArray(lines)) {
      return reply.status(400).send({ error: "Lines array is required" });
    }

    const summary = CarrierReconciliationService.reconcileInvoice(lines);
    return reply.send({
      success: true,
      summary,
    });
  });

  // POST /api/treasury/invoices/:id/dispute (Flags an invoice or lines for dispute)
  fastify.post("/invoices/:id/dispute", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { disputeReason } = req.body as { disputeReason?: string };

    try {
      const invoice = await db
        .select()
        .from(carrierInvoices)
        .where(eq(carrierInvoices.id, id))
        .get();

      if (!invoice) {
        return reply.status(404).send({ error: "Invoice not found" });
      }

      await db
        .update(carrierInvoices)
        .set({
          reconciliationStatus: "DISPUTED",
          notes: disputeReason || invoice.notes,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(carrierInvoices.id, id));

      return reply.send({
        success: true,
        message: "Invoice successfully marked as DISPUTED.",
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // POST /api/treasury/invoices/:id/approve (Approves invoice for payment)
  fastify.post("/invoices/:id/approve", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const invoice = await db
        .select()
        .from(carrierInvoices)
        .where(eq(carrierInvoices.id, id))
        .get();

      if (!invoice) {
        return reply.status(404).send({ error: "Invoice not found" });
      }

      await db
        .update(carrierInvoices)
        .set({
          reconciliationStatus: "APPROVED_FOR_PAYMENT",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(carrierInvoices.id, id));

      return reply.send({
        success: true,
        message: "Invoice approved for payment settlement.",
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/treasury/fx-exposure
  fastify.get("/fx-exposure", async (req, reply) => {
    try {
      const positions = await db.select().from(treasuryFxPositions);
      const rates = await db.select().from(fxRates);

      const evaluations = positions.map((p) => {
        const rate = rates.find((r) => r.toCurrency === p.currency);
        const spot = rate?.spotRate ?? p.currentSpotRate;
        return TreasuryFxService.evaluatePosition(
          {
            currency: p.currency,
            receivablesAmount: p.receivablesAmount,
            payablesAmount: p.payablesAmount,
            averageBookRate: p.averageExchangeRate,
            hedgedAmount: p.hedgedAmount,
          },
          spot,
        );
      });

      return reply.send({
        success: true,
        rates,
        evaluations,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/treasury/cash-flow-forecast
  fastify.get("/cash-flow-forecast", async (req, reply) => {
    try {
      const positions = await db.select().from(treasuryFxPositions);
      const rates = await db.select().from(fxRates);

      const projection = TreasuryFxService.projectCashFlow(
        positions.map((p) => ({
          currency: p.currency,
          receivablesAmount: p.receivablesAmount,
          payablesAmount: p.payablesAmount,
          averageBookRate: p.averageExchangeRate,
        })),
        rates.map((r) => ({
          fromCurrency: r.fromCurrency,
          toCurrency: r.toCurrency,
          spotRate: r.spotRate,
          forward30Rate: r.forward30Rate,
          forward60Rate: r.forward60Rate,
          forward90Rate: r.forward90Rate,
        })),
      );

      return reply.send({
        success: true,
        ...projection,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/treasury/invoices/:id/dispute-pdf
  fastify.get("/invoices/:id/dispute-pdf", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const invoice = await db
        .select()
        .from(carrierInvoices)
        .where(eq(carrierInvoices.id, id))
        .get();

      if (!invoice) {
        return reply.status(404).send({ error: "Invoice not found" });
      }

      const lines = await db
        .select()
        .from(carrierInvoiceLines)
        .where(eq(carrierInvoiceLines.carrierInvoiceId, id));

      const disputedLines = lines.filter(
        (l) => !l.isWithinTolerance || l.disputeStatus === "DISPUTED",
      );

      const pdfBuffer = await PDFService.generateCarrierDisputeLetter(
        invoice,
        disputedLines.length > 0 ? disputedLines : lines,
      );

      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `inline; filename="Carrier_Dispute_${invoice.invoiceNumber}.pdf"`,
        )
        .send(pdfBuffer);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "PDF Generation Error", message: err.message });
    }
  });

  // GET /api/treasury/invoices/:id/settlement-pdf
  fastify.get("/invoices/:id/settlement-pdf", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const invoice = await db
        .select()
        .from(carrierInvoices)
        .where(eq(carrierInvoices.id, id))
        .get();

      if (!invoice) {
        return reply.status(404).send({ error: "Invoice not found" });
      }

      const lines = await db
        .select()
        .from(carrierInvoiceLines)
        .where(eq(carrierInvoiceLines.carrierInvoiceId, id));

      const pdfBuffer = await PDFService.generateCarrierSettlementStatement(
        invoice,
        lines,
      );

      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `inline; filename="Carrier_Settlement_${invoice.invoiceNumber}.pdf"`,
        )
        .send(pdfBuffer);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "PDF Generation Error", message: err.message });
    }
  });
};
