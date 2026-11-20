/**
 * @file treasury.routes.ts
 * @description Fastify routes for Freight Treasury, Carrier Invoice 3-Way Match Reconciliation, Multi-Currency FX Exposure & Cash-Flow Forecasting, Dispute Letters, and Settlement Statement PDFs.
 * @module @atlas/api/modules/treasury/routes
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import {
  carrierInvoices,
  carrierInvoiceLines,
  treasuryFxPositions,
  fxRates,
} from "../../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import {
  CarrierReconciliationService,
  LineMatchInput,
} from "./carrier-reconciliation.service.js";
import { TreasuryFxService } from "./treasury-fx.service.js";
import { PDFService } from "../../services/pdf.service.js";
import { domainEventBus } from "../../lib/events/index.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const TREASURY_TAG = ["Treasury & Carrier Reconciliation"] as const;

export const treasuryRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication hook (parent app.ts authMiddleware already enforces authentication)
  fastify.addHook("onRequest", async (req) => {
    try {
      if (req.headers.authorization) {
        await req.jwtVerify();
      }
    } catch {
      // Allow gracefully if parent authMiddleware validated or for dev/test
    }
  });

  // 1. GET /api/treasury/invoices
  fastify.get(
    "/invoices",
    {
      schema: {
        tags: [...TREASURY_TAG],
        summary:
          "List carrier invoices with transport mode, reconciliation status, and search filters",
        querystring: openApiObject({
          mode: { type: "string" },
          status: { type: "string" },
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
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
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 2. GET /api/treasury/invoices/:id
  fastify.get(
    "/invoices/:id",
    {
      schema: {
        tags: [...TREASURY_TAG],
        summary:
          "Retrieve carrier invoice details with reconciliation line items",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
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
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 3. POST /api/treasury/reconcile
  fastify.post(
    "/reconcile",
    {
      schema: {
        tags: [...TREASURY_TAG],
        summary:
          "Evaluate 3-way match reconciliation across carrier invoice lines",
        body: openApiObject({
          lines: { type: "array", items: OPENAPI_FLEXIBLE_OBJECT_SCHEMA },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const { lines } = (req.body ?? {}) as { lines?: LineMatchInput[] };

      if (!lines || !Array.isArray(lines)) {
        return reply.status(400).send({ error: "Lines array is required" });
      }

      const summary = CarrierReconciliationService.reconcileInvoice(lines);

      let discrepancyStatus:
        "EXACT_MATCH" | "UNDER_BILLED" | "OVER_BILLED" | "TOLERANCE_ACCEPTED" =
        "EXACT_MATCH";
      if (summary.totalVarianceAmount > 0) {
        discrepancyStatus = "OVER_BILLED";
      } else if (summary.totalVarianceAmount < 0) {
        discrepancyStatus = "UNDER_BILLED";
      } else if (summary.reconciliationStatus === "DISCREPANCY_FLAGGED") {
        discrepancyStatus = "TOLERANCE_ACCEPTED";
      }

      domainEventBus.publish("treasury:invoice-reconciled", "recon_batch", {
        invoiceId: "recon_batch",
        carrierId: "carrier_unknown",
        discrepancyStatus,
        amountEur: summary.totalBilledAmount,
      });

      return reply.send({
        success: true,
        summary,
      });
    },
  );

  // 4. POST /api/treasury/invoices/:id/dispute
  fastify.post(
    "/invoices/:id/dispute",
    {
      schema: {
        tags: [...TREASURY_TAG],
        summary: "Flag a carrier invoice as disputed with variance reason",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          disputeReason: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { disputeReason } = (req.body ?? {}) as { disputeReason?: string };

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
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 5. POST /api/treasury/invoices/:id/approve
  fastify.post(
    "/invoices/:id/approve",
    {
      schema: {
        tags: [...TREASURY_TAG],
        summary: "Approve reconciled carrier invoice for payment settlement",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
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
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 6. GET /api/treasury/fx-exposure
  fastify.get(
    "/fx-exposure",
    {
      schema: {
        tags: [...TREASURY_TAG],
        summary:
          "Evaluate multi-currency FX net exposure and mark-to-market positions",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
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
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 7. GET /api/treasury/cash-flow-forecast
  fastify.get(
    "/cash-flow-forecast",
    {
      schema: {
        tags: [...TREASURY_TAG],
        summary:
          "Project 30/60/90-day multi-currency freight treasury cash-flow forecast",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
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
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 8. GET /api/treasury/invoices/:id/dispute-pdf
  fastify.get(
    "/invoices/:id/dispute-pdf",
    {
      schema: {
        tags: [...TREASURY_TAG],
        summary: "Generate and stream Carrier Invoice Dispute Letter PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
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
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "PDF Generation Error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 9. GET /api/treasury/invoices/:id/settlement-pdf
  fastify.get(
    "/invoices/:id/settlement-pdf",
    {
      schema: {
        tags: [...TREASURY_TAG],
        summary: "Generate and stream Carrier Settlement Statement PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
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
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "PDF Generation Error",
          message: getErrorMessage(err),
        });
      }
    },
  );
};
