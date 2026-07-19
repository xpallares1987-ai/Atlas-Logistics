import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { db } from "../db/client.js";
import {
  customers,
  contacts,
  rate_agreements,
  rate_agreement_items,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  customerSchema,
  createCustomerSchema,
  updateCustomerSchema,
  contactSchema,
  createContactSchema,
  rateAgreementSchema,
  createRateAgreementSchema,
} from "../schemas/crm.schema.js";

const crmRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Customers
  fastify.get(
    "/api/crm/customers",
    {
      schema: {
        tags: ["CRM"],
        summary: "List Customers",
        response: {
          200: z.array(customerSchema),
        },
      },
    },
    async (_request, _reply) => {
      const allCustomers = await db.select().from(customers);
      return allCustomers.map((c) => ({
        ...c,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
      }));
    },
  );

  fastify.post(
    "/api/crm/customers",
    {
      schema: {
        tags: ["CRM"],
        summary: "Create Customer",
        body: createCustomerSchema,
        response: {
          201: customerSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof createCustomerSchema>;
      const [newCustomer] = await db.insert(customers).values(body).returning();
      reply.status(201);
      return {
        ...newCustomer,
        created_at: newCustomer.created_at.toISOString(),
        updated_at: newCustomer.updated_at.toISOString(),
      };
    },
  );

  fastify.get(
    "/api/crm/customers/:id",
    {
      schema: {
        tags: ["CRM"],
        summary: "Get Customer by ID",
        params: z.object({ id: z.coerce.number() }),
        response: {
          200: customerSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, id));
      if (!customer)
        return reply.status(404).send({ error: "Customer not found" });
      return {
        ...customer,
        created_at: customer.created_at.toISOString(),
        updated_at: customer.updated_at.toISOString(),
      };
    },
  );

  fastify.patch(
    "/api/crm/customers/:id",
    {
      schema: {
        tags: ["CRM"],
        summary: "Update Customer",
        params: z.object({ id: z.coerce.number() }),
        body: updateCustomerSchema,
        response: {
          200: customerSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = request.body as z.infer<typeof updateCustomerSchema>;
      const [updatedCustomer] = await db
        .update(customers)
        .set({ ...body, updated_at: new Date() })
        .where(eq(customers.id, id))
        .returning();

      if (!updatedCustomer)
        return reply.status(404).send({ error: "Customer not found" });
      return {
        ...updatedCustomer,
        created_at: updatedCustomer.created_at.toISOString(),
        updated_at: updatedCustomer.updated_at.toISOString(),
      };
    },
  );

  fastify.delete(
    "/api/crm/customers/:id",
    {
      schema: {
        tags: ["CRM"],
        summary: "Delete Customer",
        params: z.object({ id: z.coerce.number() }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const [deletedCustomer] = await db
        .delete(customers)
        .where(eq(customers.id, id))
        .returning();

      if (!deletedCustomer)
        return reply.status(404).send({ error: "Customer not found" });
      return { success: true };
    },
  );

  // Contacts
  fastify.get(
    "/api/crm/customers/:id/contacts",
    {
      schema: {
        tags: ["CRM"],
        summary: "List Contacts for Customer",
        params: z.object({ id: z.coerce.number() }),
        response: {
          200: z.array(contactSchema),
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: number };
      const customerContacts = await db
        .select()
        .from(contacts)
        .where(eq(contacts.customer_id, id));
      return customerContacts.map((c) => ({
        ...c,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
      }));
    },
  );

  fastify.post(
    "/api/crm/customers/:id/contacts",
    {
      schema: {
        tags: ["CRM"],
        summary: "Create Contact for Customer",
        params: z.object({ id: z.coerce.number() }),
        body: createContactSchema,
        response: {
          201: contactSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = request.body as z.infer<typeof createContactSchema>;
      const [newContact] = await db
        .insert(contacts)
        .values({ ...body, customer_id: id })
        .returning();
      reply.status(201);
      return {
        ...newContact,
        created_at: newContact.created_at.toISOString(),
        updated_at: newContact.updated_at.toISOString(),
      };
    },
  );

  // Rate Agreements
  fastify.get(
    "/api/crm/customers/:id/agreements",
    {
      schema: {
        tags: ["CRM"],
        summary: "List Rate Agreements for Customer",
        params: z.object({ id: z.coerce.number() }),
        response: {
          200: z.array(rateAgreementSchema),
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: number };
      const agreements = await db
        .select()
        .from(rate_agreements)
        .where(eq(rate_agreements.customer_id, id));
      return agreements.map((a) => ({
        ...a,
        valid_from: a.valid_from,
        valid_to: a.valid_to,
        created_at: a.created_at.toISOString(),
        updated_at: a.updated_at.toISOString(),
      }));
    },
  );

  fastify.post(
    "/api/crm/customers/:id/agreements",
    {
      schema: {
        tags: ["CRM"],
        summary: "Create Rate Agreement for Customer",
        params: z.object({ id: z.coerce.number() }),
        body: createRateAgreementSchema,
        response: {
          201: rateAgreementSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = request.body as z.infer<typeof createRateAgreementSchema>;
      const { freight_rate_ids, ...agreementData } = body;

      // Use transaction for creating agreement + linking rates
      const newAgreement = await db.transaction(async (tx) => {
        const [agreement] = await tx
          .insert(rate_agreements)
          .values({
            ...agreementData,
            customer_id: id,
            valid_from: agreementData.valid_from,
            valid_to: agreementData.valid_to,
          })
          .returning();

        if (freight_rate_ids && freight_rate_ids.length > 0) {
          const itemsToInsert = freight_rate_ids.map((fr_id: number) => ({
            rate_agreement_id: agreement.id,
            freight_rate_id: fr_id,
          }));
          await tx.insert(rate_agreement_items).values(itemsToInsert);
        }

        return agreement;
      });

      reply.status(201);
      return {
        ...newAgreement,
        valid_from: newAgreement.valid_from,
        valid_to: newAgreement.valid_to,
        created_at: newAgreement.created_at.toISOString(),
        updated_at: newAgreement.updated_at.toISOString(),
      };
    },
  );
};

export default crmRoutes;
