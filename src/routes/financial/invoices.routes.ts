/**
 * @file invoices.routes.ts
 * @description Operational route handlers for financial invoices, PDF invoice generation, status transitions, and profit-share settlements.
 * @module @atlas/routes/financial/invoices
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import {
  invoices,
  invoiceItems,
  agentSettlements,
} from "../../db/schema/finance.js";
import { companies } from "../../db/schema/core.js";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { pubsub } from "../../services/pubsub.service.js";
import { PDFService, InvoiceData } from "../../services/pdf.service.js";
import { ensureFinancialSeedData } from "./seed-data.js";
import { GlSyncService } from "../../services/accounting/gl-sync.service.js";
import {
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_SUCCESS_FLAG_SCHEMA,
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "../openapi.schemas.js";

const INVOICE_RECORD_PROPERTIES = {
  id: { type: "string" },
  invoiceNumber: { type: "string" },
  type: { type: "string" },
  party: { type: ["string", "null"] },
  partyId: { type: ["string", "null"] },
  amount: { type: "number" },
  currency: { type: "string" },
  status: { type: "string" },
  shipmentId: { type: ["string", "null"] },
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface InvoiceLineInput {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
}

interface CreateInvoiceBody {
  partyId?: string;
  invoiceNumber: string;
  type?: string;
  shipmentId?: string;
  totalAmount?: number;
  taxAmount?: number;
  currency?: string;
  dueDate?: string | Date;
  lines?: InvoiceLineInput[];
}

interface InvoiceIdParams {
  id: string;
}

interface UpdateInvoiceStatusBody {
  status: string;
}

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

export const invoicesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/invoices",
    {
      schema: {
        tags: ["Invoices"],
        summary: "List AR/AP invoices with counterparty summary",
        response: {
          200: openApiArray(INVOICE_RECORD_PROPERTIES, "Invoice list"),
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        const allInvoices = await db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            type: invoices.type,
            party: companies.name,
            partyId: invoices.companyId,
            amount: invoices.amount,
            currency: invoices.currency,
            status: invoices.status,
            dueDate: invoices.dueDate,
            shipmentId: invoices.shipmentId,
          })
          .from(invoices)
          .leftJoin(companies, eq(invoices.companyId, companies.id));

        return reply.send(allInvoices);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.get<{ Params: InvoiceIdParams }>(
    "/invoices/:id",
    {
      schema: {
        tags: ["Invoices"],
        summary: "Get invoice detail with itemized line items",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: openApiObject(
            {
              ...INVOICE_RECORD_PROPERTIES,
              lines: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
            },
            "Invoice detail with line items",
          ),
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const invoiceRecords = await db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            type: invoices.type,
            party: companies.name,
            partyId: invoices.companyId,
            amount: invoices.amount,
            currency: invoices.currency,
            status: invoices.status,
            dueDate: invoices.dueDate,
            shipmentId: invoices.shipmentId,
          })
          .from(invoices)
          .leftJoin(companies, eq(invoices.companyId, companies.id))
          .where(eq(invoices.id, id))
          .limit(1);

        if (invoiceRecords.length === 0) {
          return reply.code(404).send({ error: "Invoice not found" });
        }

        const items = await db
          .select()
          .from(invoiceItems)
          .where(eq(invoiceItems.invoiceId, id));

        return reply.send({
          ...invoiceRecords[0],
          lines: items,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.get<{ Params: InvoiceIdParams }>(
    "/invoices/:id/pdf",
    {
      schema: {
        tags: ["Invoices"],
        summary: "Render and stream an official commercial invoice PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const invoiceRecords = await db
          .select({
            invoiceNumber: invoices.invoiceNumber,
            type: invoices.type,
            party: companies.name,
            dueDate: invoices.dueDate,
            currency: invoices.currency,
            amount: invoices.amount,
          })
          .from(invoices)
          .leftJoin(companies, eq(invoices.companyId, companies.id))
          .where(eq(invoices.id, id))
          .limit(1);

        if (invoiceRecords.length === 0) {
          return reply.code(404).send({ error: "Invoice not found" });
        }

        const items = await db
          .select()
          .from(invoiceItems)
          .where(eq(invoiceItems.invoiceId, id));

        const invoiceData: InvoiceData = {
          ...invoiceRecords[0],
          party: invoiceRecords[0].party || "Unknown Client",
          dueDate: invoiceRecords[0].dueDate
            ? new Date(invoiceRecords[0].dueDate).toISOString()
            : new Date().toISOString(),
          items: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
        };

        const pdfBuffer = await PDFService.generateInvoice(invoiceData);

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `inline; filename="Invoice-${invoiceData.invoiceNumber}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Body: CreateInvoiceBody }>(
    "/invoices",
    {
      schema: {
        tags: ["Invoices"],
        summary: "Create a draft AR/AP invoice and enqueue accounting sync",
        body: openApiObject({
          partyId: { type: "string" },
          invoiceNumber: { type: "string" },
          type: { type: "string" },
          shipmentId: { type: "string" },
          totalAmount: { type: "number" },
          taxAmount: { type: "number" },
          currency: { type: "string" },
          dueDate: { type: "string" },
          lines: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
        }),
        response: {
          201: openApiObject({ id: { type: "string" } }, "Created invoice ID"),
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        await ensureFinancialSeedData();
        const data = request.body;
        const invoiceId = uuidv4();
        const companyId = data.partyId || "comp-2";

        await db.transaction(async (tx) => {
          await tx.insert(invoices).values({
            id: invoiceId,
            invoiceNumber: data.invoiceNumber,
            type: data.type || "AR",
            companyId,
            shipmentId: data.shipmentId || null,
            amount: data.totalAmount || 0,
            taxAmount: data.taxAmount || 0,
            currency: data.currency || "USD",
            status: "Draft",
            dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
            createdAt: new Date(),
          });

          if (data.lines && data.lines.length > 0) {
            const itemsToInsert = data.lines.map((l) => ({
              id: uuidv4(),
              invoiceId,
              description: l.description,
              quantity: l.quantity || 1,
              unitPrice: l.unitPrice || 0,
              total: l.amount || 0,
              createdAt: new Date(),
            }));
            await tx.insert(invoiceItems).values(itemsToInsert);
          }
        });

        pubsub.emit("accounting.sync.requested", {
          invoiceId,
          invoiceNumber: data.invoiceNumber,
          status: "Draft",
          timestamp: new Date().toISOString(),
        });

        return reply.code(201).send({ id: invoiceId });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.put<{ Params: InvoiceIdParams; Body: UpdateInvoiceStatusBody }>(
    "/invoices/:id/status",
    {
      schema: {
        tags: ["Invoices"],
        summary:
          "Transition invoice status and trigger GL sync / agent profit-share settlement",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          status: {
            type: "string",
            description:
              "Target invoice lifecycle state (Draft, Issued, Paid).",
          },
        }),
        response: {
          200: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status } = request.body;

        await db
          .update(invoices)
          .set({ status, updatedAt: new Date() })
          .where(eq(invoices.id, id));

        if (status === "Issued" || status === "Paid") {
          // Asynchronously trigger GL ERP synchronization outbox event
          await GlSyncService.enqueueInvoiceGlSync({ invoiceId: id }).catch(
            (err) => {
              fastify.log.warn({ err }, "GL Sync enqueue notice");
            },
          );
        }

        if (status === "Paid") {
          pubsub.emit("accounting.sync.requested", {
            invoiceId: id,
            status: "Paid",
            timestamp: new Date().toISOString(),
          });

          const paidInvoice = await db
            .select()
            .from(invoices)
            .where(eq(invoices.id, id))
            .limit(1);

          if (
            paidInvoice.length > 0 &&
            paidInvoice[0].type === "AR" &&
            paidInvoice[0].shipmentId
          ) {
            const profitShareAmount = paidInvoice[0].amount * 0.15;
            const agentId = "comp-2";
            const apInvoiceId = `inv_ap_${uuidv4().substring(0, 8)}`;

            await db.transaction(async (tx) => {
              await tx.insert(invoices).values({
                id: apInvoiceId,
                invoiceNumber: `AP-${paidInvoice[0].shipmentId}`,
                type: "AP",
                shipmentId: paidInvoice[0].shipmentId,
                companyId: agentId,
                amount: profitShareAmount,
                currency: paidInvoice[0].currency,
                status: "Draft",
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              await tx.insert(invoiceItems).values({
                id: `item_ap_${uuidv4().substring(0, 8)}`,
                invoiceId: apInvoiceId,
                description: `Destination Agent Profit Share (15%) - Ref: ${paidInvoice[0].shipmentId}`,
                quantity: 1,
                unitPrice: profitShareAmount,
                total: profitShareAmount,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              await tx.insert(agentSettlements).values({
                id: `settlement_${uuidv4().substring(0, 8)}`,
                statementNumber: `STMT-${paidInvoice[0].shipmentId}`,
                agentId: agentId,
                periodStart: new Date(),
                periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                netBalance: profitShareAmount,
                currency: paidInvoice[0].currency,
                status: "Pending",
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            });
          }
        }

        return reply.send({ success: true });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Params: InvoiceIdParams }>(
    "/invoices/:id/sync-gl",
    {
      schema: {
        tags: ["Invoices"],
        summary: "Enqueue asynchronous General Ledger ERP synchronization",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: openApiObject(
            {
              success: { type: "boolean" },
              message: { type: "string" },
              syncResult: { type: "object", additionalProperties: true },
            },
            "GL synchronization enqueue confirmation",
          ),
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const syncResult = await GlSyncService.enqueueInvoiceGlSync({
          invoiceId: id,
        });
        return reply.code(200).send({
          success: true,
          message:
            "Invoice enqueued for asynchronous General Ledger synchronization",
          syncResult,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        const statusCode =
          error instanceof Error && error.message.includes("not found")
            ? 404
            : 500;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );
};
