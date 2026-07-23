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
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/", { preHandler: [validate(CreateInvoiceSchema)] }, async (request, reply) => {
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
  });

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
