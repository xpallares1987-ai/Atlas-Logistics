import { Router } from "express";
import { AIService } from "../services/ai.service.js";
import {
  geminiInvoiceSchema,
  invoiceDataSchema,
} from "../services/invoiceParser.schema.js";
import { db } from "../db/db.config.js";
import { pendingAiReviews, shipments } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/parse-invoice", async (req, res) => {
  try {
    const { documentBase64, mimeType } = req.body;

    if (!documentBase64) {
      return res
        .status(400)
        .json({ success: false, error: "documentBase64 is required" });
    }

    const prompt = `Extract the invoice details from this document. Ensure you capture the invoice number, supplier name, total amount, currency, and list of line items.`;

    const parsedData = await AIService.parseDocument(
      documentBase64,
      mimeType || "application/pdf",
      prompt,
      geminiInvoiceSchema,
    );

    // Validate structured output via Zod
    const validatedData = invoiceDataSchema.parse(parsedData);

    res.json({ success: true, data: validatedData });
  } catch (error: any) {
    console.error("Invoice Parser Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/reviews/:id/approve", async (req, res) => {
  try {
    const reviewId = req.params.id;
    // La UI puede mandar los datos corregidos si el operador modificó algo.
    const approvedData = req.body.approvedData;

    const [review] = await db
      .select()
      .from(pendingAiReviews)
      .where(eq(pendingAiReviews.id, reviewId));
    if (!review || review.status !== "PENDING") {
      return res
        .status(400)
        .json({
          success: false,
          error: "Review not found or already processed",
        });
    }

    const dataToApply = approvedData || review.extractedData;

    // Actualizamos el embarque con los datos extraídos (ejemplo básico)
    // En producción habría un mapeo más complejo.
    await db
      .update(shipments)
      .set({
        status: "DOCUMENTATION", // Avanzamos el estado
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, review.shipmentId));

    // Marcamos la revisión como aprobada
    await db
      .update(pendingAiReviews)
      .set({
        status: "APPROVED",
      })
      .where(eq(pendingAiReviews.id, reviewId));

    res.json({
      success: true,
      message: "Review approved and shipment updated.",
    });
  } catch (error: any) {
    console.error("Approve Review Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
