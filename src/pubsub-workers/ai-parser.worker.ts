import { PubSub } from "@google-cloud/pubsub";
import { Storage } from "@google-cloud/storage";
import { Type, Schema } from "@google/genai";
import { AIService } from "../services/ai.service.js";
import { db } from "../db/db.config.js";
import {
  shipments,
  companies,
  shipmentDocuments,
  pendingAiReviews,
} from "../db/schema.js";
import { eq, ilike } from "drizzle-orm";
import { geminiInvoiceSchema } from "../services/invoiceParser.schema.js";

const useGCP = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.PUBSUB_EMULATOR_HOST || process.env.NODE_ENV === 'production');
const pubsub = useGCP ? new PubSub() : null;
const storage = useGCP ? new Storage() : null;
const DOCUMENT_UPLOAD_TOPIC = "document-uploaded-topic";
const SUBSCRIPTION_NAME = "ai-parser-sub";
const DLQ_TOPIC = "ai-parser-dlq-topic";

// Emitir eventos desde un Worker requeriría Redis PubSub o similar,
// por ahora comentamos el eventEmitter en memoria.
// import { eventEmitter } from "../index.js";

export const startAiParserWorker = async () => {
  if (!pubsub) {
    console.warn("[AI-Parser Worker] Disabled in local dev due to missing GOOGLE_APPLICATION_CREDENTIALS.");
    return;
  }
  try {
    const [topicExists] = await pubsub.topic(DOCUMENT_UPLOAD_TOPIC).exists();
    if (!topicExists) {
      await pubsub.createTopic(DOCUMENT_UPLOAD_TOPIC);
    }

    const [dlqExists] = await pubsub.topic(DLQ_TOPIC).exists();
    if (!dlqExists) {
      await pubsub.createTopic(DLQ_TOPIC);
      console.log(`DLQ Topic ${DLQ_TOPIC} created.`);
    }

    const [subExists] = await pubsub.subscription(SUBSCRIPTION_NAME).exists();
    if (!subExists) {
      const topic = pubsub.topic(DOCUMENT_UPLOAD_TOPIC);
      const dlqTopic = pubsub.topic(DLQ_TOPIC);

      // Necesitamos permisos del Service Agent para que PubSub publique en el DLQ,
      // pero para emuladores locales / setups simplificados, la política basta.
      await topic.createSubscription(SUBSCRIPTION_NAME, {
        deadLetterPolicy: {
          deadLetterTopic: dlqTopic.name,
          maxDeliveryAttempts: 5,
        },
      });
      console.log(`Subscription ${SUBSCRIPTION_NAME} created with DLQ.`);
    }

    const subscription = pubsub.subscription(SUBSCRIPTION_NAME);
    console.log(`Worker listening on subscription ${SUBSCRIPTION_NAME}`);

    subscription.on("message", async (message) => {
      try {
        const payload = JSON.parse(message.data.toString());
        console.log(
          `[AI-Parser Worker] Processing document for shipment ${payload.shipmentId}`,
        );

        await processDocument(
          payload.shipmentId,
          payload.gcsUrl,
          payload.mimeType,
          payload.documentType || "SHIPPING_INSTRUCTION"
        );

        message.ack();
      } catch (error) {
        console.error("[AI-Parser Worker] Error processing message:", error);
        message.nack();
      }
    });
  } catch (error) {
    console.warn(
      "[AI-Parser Worker] Failed to start (ignoring if local without emulator):",
      error,
    );
  }
};

async function processDocument(
  shipmentId: string,
  gcsUrl: string,
  mimeType: string,
  documentType: string
) {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY not configured.");
  }

  // Descargar archivo de GCS a memoria
  const bucketName = gcsUrl.split("/")[2];
  const filePath = gcsUrl.split("/").slice(3).join("/");

  if (!storage) throw new Error("Storage not initialized");

  const [fileBuffer] = await storage
    .bucket(bucketName)
    .file(filePath)
    .download();
  const fileBase64 = fileBuffer.toString("base64");

  let prompt = "";
  let responseSchema: Schema;

  if (documentType === "INVOICE") {
    prompt = `Extract vendor invoice details from this document. Ensure you capture the total amount, currency, and line items.`;
    responseSchema = geminiInvoiceSchema;
  } else {
    prompt = `Extract shipping instruction details from this document. Focus on Shipper, Consignee, Ports, Containers, Commodities, and Marks.`;
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        shipperText: { type: Type.STRING },
        consigneeText: { type: Type.STRING },
        portOfLoading: { type: Type.STRING },
        portOfDischarge: { type: Type.STRING },
      },
    };
  }

  const extractedData = await AIService.parseDocument(
    fileBase64,
    mimeType,
    prompt,
    responseSchema,
  );

  let supplierId = null;
  let billingPartyId = null;

  // Try to match companies if it's a shipping instruction
  if (documentType !== "INVOICE") {
    if (extractedData.shipperText) {
      const firstWord = extractedData.shipperText.split(/[\s,]+/)[0];
      const match = await db
        .select()
        .from(companies)
        .where(ilike(companies.name, `%${firstWord}%`))
        .limit(1);
      if (match.length > 0) supplierId = match[0].id;
    }
    if (extractedData.consigneeText) {
      const firstWord = extractedData.consigneeText.split(/[\s,]+/)[0];
      const match = await db
        .select()
        .from(companies)
        .where(ilike(companies.name, `%${firstWord}%`))
        .limit(1);
      if (match.length > 0) billingPartyId = match[0].id;
    }
  } else {
    // If it's an invoice, try to match the supplierName to a company
    if (extractedData.supplierName) {
      const firstWord = extractedData.supplierName.split(/[\s,]+/)[0];
      const match = await db
        .select()
        .from(companies)
        .where(ilike(companies.name, `%${firstWord}%`))
        .limit(1);
      if (match.length > 0) supplierId = match[0].id;
    }
  }

  // Guardar en pendingAiReviews en lugar de actualizar shipments directamente (HITL)
  await db.insert(pendingAiReviews).values({
    shipmentId: shipmentId,
    documentUrl: gcsUrl,
    extractedData: extractedData,
    confidenceScore: 0.85, // Simulado, Gemini no da score nativo fácilmente
    status: "PENDING",
  });

  // Save parsed data to document metadata securely
  await db
    .update(shipmentDocuments)
    .set({
      parsedData: extractedData,
    })
    .where(eq(shipmentDocuments.gcsUrl, gcsUrl));

  // Notificar al Frontend (Requiere refactor a Redis Pub/Sub o tRPC subscriptions distribuidas)
  /*
  eventEmitter.emit("notification", {
    id: Date.now().toString(),
    title: "Revisión Manual Requerida (IA)",
    message: `El documento del embarque ${shipmentId} ha sido procesado por IA y espera revisión.`,
    type: "warning",
    timestamp: new Date().toISOString(),
    shipmentId: shipmentId,
    extractedData: extractedData,
  });
  */
}
