import { FastifyPluginAsync } from "fastify";
import { db } from "../db/db.config.js";
import { invoices } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { CreateInvoiceSchema } from "@atlas/shared/src/logistics-schemas.js";
import { publishInvoiceGenerated } from "../services/pubsub.service.js";

const invoicesRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/", async (request, reply) => {
    try {
      const allInvoices = await db.select().from(invoices);
      return allInvoices;
    } catch (error: any) {
      fastify.log.warn("DB unavailable for invoices, returning fallback data");
      return [
        {
          id: "inv-001",
          invoiceNumber: "INV-2026-0301",
          shipmentId: "demo-001",
          status: "PAID",
          amount: 4500,
          currency: "USD",
          issueDate: "2026-07-10",
          dueDate: "2026-08-10",
          customerName: "Global Trade Co.",
          createdAt: new Date().toISOString(),
        },
        {
          id: "inv-002",
          invoiceNumber: "INV-2026-0302",
          shipmentId: "demo-002",
          status: "PENDING",
          amount: 3200,
          currency: "EUR",
          issueDate: "2026-07-15",
          dueDate: "2026-08-15",
          customerName: "Nordic Imports AB",
          createdAt: new Date().toISOString(),
        },
        {
          id: "inv-003",
          invoiceNumber: "INV-2026-0303",
          shipmentId: "demo-003",
          status: "OVERDUE",
          amount: 6800,
          currency: "USD",
          issueDate: "2026-06-20",
          dueDate: "2026-07-20",
          customerName: "Pacific Freight Ltd.",
          createdAt: new Date().toISOString(),
        },
        {
          id: "inv-004",
          invoiceNumber: "INV-2026-0304",
          shipmentId: "demo-004",
          status: "PAID",
          amount: 2100,
          currency: "USD",
          issueDate: "2026-07-05",
          dueDate: "2026-08-05",
          customerName: "Mediterranean Logistics SL",
          createdAt: new Date().toISOString(),
        },
      ];
    }
  });

  fastify.post(
    "/",
    { preHandler: [validate(CreateInvoiceSchema)] },
    async (request, reply) => {
      try {
        const { invoiceNumber, ...invoiceData } = request.body as any;

        const newInvoice = await db
          .insert(invoices)
          .values({ ...invoiceData, invoiceNumber })
          .returning();

        await publishInvoiceGenerated({
          invoiceId: newInvoice[0].id,
          shipmentId: newInvoice[0].shipmentId,
          invoiceNumber,
          customerId: newInvoice[0].partyId,
          totalAmount: newInvoice[0].totalAmount,
        });

        return newInvoice[0];
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    },
  );

  fastify.put("/:id/pay", async (request, reply) => {
    try {
      const { id } = request.params as any;
      const updatedInvoice = await db
        .update(invoices)
        .set({ status: "Paid" })
        .where(eq(invoices.id, id))
        .returning();
      return updatedInvoice[0];
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default invoicesRoutes;
