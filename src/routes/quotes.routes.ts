import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db } from "../db/db.config.js";
import { rates, quotes } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { CreateQuoteSchema } from "@atlas/shared/src/logistics-schemas.js";
import { zbc } from "../bpm/client.js";
import { redis } from "../config/redis.js";

const quotesRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/", { config: { rateLimit: { max: 100, timeWindow: "1 minute" } } }, async (request, reply) => {
    try {
      if (request.url.includes("/api/rates")) {
        // Cache-Aside pattern para las tarifas (alta lectura, baja mutabilidad)
        const CACHE_KEY = "atlas:rates:all";
        const cachedRates = await redis.get(CACHE_KEY).catch(() => null);
        
        if (cachedRates) {
          return JSON.parse(cachedRates);
        }

        const allRates = await db.select().from(rates);
        // Cachear por 1 hora (3600 segundos)
        await redis.setex(CACHE_KEY, 3600, JSON.stringify(allRates)).catch(() => {});
        return allRates;
      }
      
      const allQuotes = await db.select().from(quotes);
      return allQuotes;
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/compare", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    try {
      const { origin, destination, containerType } = request.body as any;

      const result = await zbc.createProcessInstanceWithResult({
        bpmnProcessId: "rate-comparer-process",
        requestTimeout: 30000,
        variables: { origin, destination, containerType },
      });

      return {
        success: true,
        processInstanceKey: result.processInstanceKey,
        variables: result.variables,
      };
    } catch (error: any) {
      fastify.log.error("Error starting process:", error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/", { preHandler: [validate(CreateQuoteSchema)], config: { rateLimit: { max: 50, timeWindow: "1 minute" } } }, async (request, reply) => {
    try {
      const newQuote = await db.insert(quotes).values(request.body as any).returning();
      return newQuote[0];
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.put("/:id", { config: { rateLimit: { max: 50, timeWindow: "1 minute" } } }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const updatedQuote = await db
        .update(quotes)
        .set(request.body as any)
        .where(eq(quotes.id, id))
        .returning();
      return updatedQuote[0];
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default quotesRoutes;
