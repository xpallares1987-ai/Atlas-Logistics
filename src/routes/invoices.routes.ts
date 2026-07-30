import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { invoices } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { CreateInvoiceSchema } from "@atlas/shared/src/logistics-schemas.js";

const invoicesRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/", async (request, reply) => {
    try {
      const allInvoices = await db.select().from(invoices);
      return allInvoices;
    } catch (error: any) {
      fastify.log.warn("DB unavailable for invoices, returning fallback data");
      return [];
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
          .values({ 
            id: "i-" + Date.now(),
            invoiceNumber,
            amount: invoiceData.amount || 0,
            currency: invoiceData.currency || 'USD',
            status: 'PENDING'
          })
          .returning();

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
