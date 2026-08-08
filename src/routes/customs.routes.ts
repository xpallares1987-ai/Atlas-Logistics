import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { customsDeclarations } from "../db/schema/operations.js";
import { eq } from "drizzle-orm";
import { PDFService, CustomsData } from "../services/pdf.service.js";

const customsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/customs-declarations", async (request, reply) => {
    try {
      const allDeclarations = await db.select().from(customsDeclarations);
      
      // Map DB enum statuses to UI-friendly statuses
      const mapped = allDeclarations.map(d => {
        let uiStatus = d.status;
        if (d.status === "PENDING") uiStatus = "Pending";
        if (d.status === "CLEARED") uiStatus = "Cleared";
        if (d.status === "HELD") uiStatus = "Hold";
        
        return {
          ...d,
          status: uiStatus,
          blNumber: d.blNumber || `BL-${d.id.substring(0, 8).toUpperCase()}`
        };
      });

      return reply.send(mapped);
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

  fastify.get("/customs-declarations/:id/pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const declRes = await db
        .select()
        .from(customsDeclarations)
        .where(eq(customsDeclarations.id, id))
        .limit(1);

      if (declRes.length === 0) {
        return reply.code(404).send({ error: "Declaration not found" });
      }

      const d = declRes[0];
      const pdfData: CustomsData = {
        declarationId: d.id,
        shipmentId: d.shipmentId,
        type: d.type || "Import",
        status: d.status || "Pending",
        aiRiskScore: d.aiRiskScore || undefined,
        aiRiskFlag: d.aiRiskFlag || undefined,
      };

      const pdfBuffer = await PDFService.generateCustomsDeclaration(pdfData);

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename=Customs-${d.id}.pdf`,
      );
      return reply.send(pdfBuffer);
    } catch (error: any) {
      fastify.log.error("PDF Generation Error:", error);
      reply.code(500).send({ error: "Failed to generate PDF" });
    }
  });
};

export default customsRoutes;
