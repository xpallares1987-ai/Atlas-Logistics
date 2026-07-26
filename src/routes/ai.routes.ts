import { FastifyPluginAsync } from "fastify";
import { AIService } from "../services/ai.service.js";
import {
  geminiInvoiceSchema,
  invoiceDataSchema,
} from "../services/invoiceParser.schema.js";
import { db } from "../db/db.config.js";
import { pendingAiReviews, shipments } from "../db/schema.js";
import { eq } from "drizzle-orm";

const aiRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.post("/parse-invoice", async (request, reply) => {
    try {
      const { documentBase64, mimeType } = request.body as any;

      if (!documentBase64) {
        reply
          .code(400)
          .send({ success: false, error: "documentBase64 is required" });
        return;
      }

      const prompt = `Extract the invoice details from this document. Ensure you capture the invoice number, supplier name, total amount, currency, list of line items, AND container weights, HS codes, and BL numbers if present.`;

      const parsedData = await AIService.parseDocument(
        documentBase64,
        mimeType || "application/pdf",
        prompt,
        geminiInvoiceSchema,
      );

      const validatedData = invoiceDataSchema.parse(parsedData);
      return { success: true, data: validatedData };
    } catch (error: any) {
      fastify.log.error("Invoice Parser Error:", error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/reviews/:id/approve", async (request, reply) => {
    try {
      const { id: reviewId } = request.params as any;
      const { approvedData } = request.body as any;

      const [review] = await db
        .select()
        .from(pendingAiReviews)
        .where(eq(pendingAiReviews.id, reviewId));

      if (!review || review.status !== "PENDING") {
        reply.code(400).send({
          success: false,
          error: "Review not found or already processed",
        });
        return;
      }

      const dataToApply = approvedData || review.extractedData;

      await db
        .update(shipments)
        .set({ status: "DOCUMENTATION", updatedAt: new Date() })
        .where(eq(shipments.id, review.shipmentId));

      await db
        .update(pendingAiReviews)
        .set({ status: "APPROVED" })
        .where(eq(pendingAiReviews.id, reviewId));

      return {
        success: true,
        message: "Review approved and shipment updated.",
      };
    } catch (error: any) {
      fastify.log.error("Approve Review Error:", error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  // AI Chat endpoint for the logistics copilot
  fastify.post("/chat", async (request, reply) => {
    try {
      const { message, history } = request.body as {
        message: string;
        history?: Array<{ role: string; content: string }>;
      };

      if (!message) {
        return reply
          .code(400)
          .send({ success: false, error: "message is required" });
      }

      const systemPrompt = `You are Atlas AI, an expert logistics copilot for freight forwarders. 
You help with shipment tracking, rate calculations, customs documentation, and operational queries.
Be concise, professional, and provide actionable answers. Use industry terminology when appropriate.
If asked about specific shipments, acknowledge you'd need to look up the data and provide general guidance.`;

      const response = await AIService.chat(
        systemPrompt,
        message,
        history || [],
      );

      return { success: true, response };
    } catch (error: any) {
      fastify.log.error("AI Chat Error:", error);
      // Graceful fallback when Gemini API is unavailable
      return reply.code(200).send({
        success: true,
        response:
          "I'm currently unable to connect to the AI service. Please try again in a moment, or contact support if the issue persists.",
      });
    }
  });
};

export default aiRoutes;
