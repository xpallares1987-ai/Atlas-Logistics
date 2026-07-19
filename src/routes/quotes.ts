import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../db/client.js";
import { quotes, quote_options } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  quoteSchema,
  createQuoteSchema,
  updateQuoteSchema,
} from "../schemas/quoting.schema.js";

const quoteRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/api/quotes",
    {
      schema: {
        tags: ["Quotes"],
        summary: "List Quotes",
        querystring: z.object({
          customer_id: z.coerce.number().optional(),
        }),
        response: {
          200: z.array(quoteSchema),
        },
      },
    },
    async (request, reply) => {
      const { customer_id } = request.query as { customer_id?: number };
      let query = db.select().from(quotes);

      if (customer_id) {
        query = query.where(eq(quotes.customer_id, customer_id)) as any;
      }

      const allQuotes = await query;
      return allQuotes.map((q) => ({
        ...q,
        created_at: q.created_at.toISOString(),
        updated_at: q.updated_at.toISOString(),
      }));
    },
  );

  server.post(
    "/api/quotes",
    {
      schema: {
        tags: ["Quotes"],
        summary: "Create Quote with Options",
        body: createQuoteSchema,
        response: {
          201: quoteSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof createQuoteSchema>;
      const { options, ...quoteData } = body;

      const newQuote = await db.transaction(async (tx) => {
        const [quote] = await tx
          .insert(quotes)
          .values({
            ...quoteData,
            status: "Draft",
          })
          .returning();

        let createdOptions: any[] = [];
        if (options && options.length > 0) {
          const optionsToInsert = options.map((opt) => ({
            ...opt,
            quote_id: quote.id,
            total_price: String(opt.total_price),
            margin_percentage: opt.margin_percentage
              ? String(opt.margin_percentage)
              : null,
          }));
          createdOptions = await tx
            .insert(quote_options)
            .values(optionsToInsert)
            .returning();
        }

        return {
          ...quote,
          options: createdOptions.map((o) => ({
            ...o,
            margin_percentage: o.margin_percentage
              ? Number(o.margin_percentage)
              : null,
            total_price: Number(o.total_price),
          })),
        };
      });

      reply.status(201);
      return {
        ...newQuote,
        created_at: newQuote.created_at.toISOString(),
        updated_at: newQuote.updated_at.toISOString(),
      };
    },
  );

  server.get(
    "/api/quotes/:id",
    {
      schema: {
        tags: ["Quotes"],
        summary: "Get Quote by ID",
        params: z.object({ id: z.coerce.number() }),
        response: {
          200: quoteSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };

      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, id),
        with: {
          options: true,
        },
      });

      if (!quote) return reply.status(404).send({ error: "Quote not found" });

      return {
        ...quote,
        created_at: quote.created_at.toISOString(),
        updated_at: quote.updated_at.toISOString(),
        options: quote.options.map((o) => ({
          ...o,
          margin_percentage: o.margin_percentage
            ? Number(o.margin_percentage)
            : null,
          total_price: Number(o.total_price),
        })),
      };
    },
  );

  server.patch(
    "/api/quotes/:id",
    {
      schema: {
        tags: ["Quotes"],
        summary: "Update Quote Status",
        params: z.object({ id: z.coerce.number() }),
        body: updateQuoteSchema,
        response: {
          200: quoteSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = request.body as z.infer<typeof updateQuoteSchema>;

      const [updatedQuote] = await db
        .update(quotes)
        .set({ ...body, updated_at: new Date() })
        .where(eq(quotes.id, id))
        .returning();

      if (!updatedQuote)
        return reply.status(404).send({ error: "Quote not found" });

      return {
        ...updatedQuote,
        created_at: updatedQuote.created_at.toISOString(),
        updated_at: updatedQuote.updated_at.toISOString(),
      };
    },
  );
};

export default quoteRoutes;
