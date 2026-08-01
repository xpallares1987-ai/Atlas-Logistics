import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { customsDeclarations } from "../db/schema/operations.js";
import { eq } from "drizzle-orm";

const customsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/customs-declarations", async (request, reply) => {
    try {
      const allDeclarations = await db.select().from(customsDeclarations);
      return reply.send(allDeclarations);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/customs-declarations/:id/analyze", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Simulate AI Risk Scoring
      const risks = [
        {
          riskScore: 12,
          channelPrediction: "Green Channel",
          flag: "Low risk. Historical compliance is 98%.",
        },
        {
          riskScore: 78,
          channelPrediction: "Red Channel",
          flag: "High risk. HS Code mismatch probability.",
        },
        {
          riskScore: 45,
          channelPrediction: "Orange Channel",
          flag: "Medium risk. New consignee detected.",
        },
        {
          riskScore: 5,
          channelPrediction: "Green Channel",
          flag: "Low risk. Fast-track eligible.",
        },
      ];
      const randomRisk = risks[Math.floor(Math.random() * risks.length)];

      await db
        .update(customsDeclarations)
        .set({
          aiRiskScore: randomRisk.riskScore,
          aiRiskFlag: randomRisk.flag,
          status: randomRisk.channelPrediction,
          updatedAt: new Date(),
        })
        .where(eq(customsDeclarations.id, id));

      return reply.send(randomRisk);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default customsRoutes;
