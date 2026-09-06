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

export const invoicesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/invoices", async (request, reply) => {
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
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/invoices/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
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
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/invoices/:id/pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

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
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/invoices", async (request, reply) => {
    try {
      await ensureFinancialSeedData();
      const data: any = request.body;
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
          const itemsToInsert = data.lines.map((l: any) => ({
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
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.put("/invoices/:id/status", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };

      await db
        .update(invoices)
        .set({ status, updatedAt: new Date() })
        .where(eq(invoices.id, id));

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
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
};
