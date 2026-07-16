import { PubSub } from '@google-cloud/pubsub';
import { Storage } from '@google-cloud/storage';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { db } from '../db/db.config.js';
import { shipments, companies } from '../db/schema.js';
import { eq, ilike } from 'drizzle-orm';
import { EventEmitter } from 'events';

const pubsub = new PubSub();
const storage = new Storage();
const DOCUMENT_UPLOAD_TOPIC = 'document-uploaded-topic';
const SUBSCRIPTION_NAME = 'ai-parser-sub';

// Importamos el eventEmitter del servidor (debería exportarse de index.ts, pero como es un refactor, lo pasaremos o lo re-exportaremos)
import { eventEmitter } from '../index.js';

export const startAiParserWorker = async () => {
  try {
    const [topicExists] = await pubsub.topic(DOCUMENT_UPLOAD_TOPIC).exists();
    if (!topicExists) {
      await pubsub.createTopic(DOCUMENT_UPLOAD_TOPIC);
    }

    const [subExists] = await pubsub.subscription(SUBSCRIPTION_NAME).exists();
    if (!subExists) {
      await pubsub.topic(DOCUMENT_UPLOAD_TOPIC).createSubscription(SUBSCRIPTION_NAME);
    }

    const subscription = pubsub.subscription(SUBSCRIPTION_NAME);
    console.log(`Worker listening on subscription ${SUBSCRIPTION_NAME}`);

    subscription.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.data.toString());
        console.log(`[AI-Parser Worker] Processing document for shipment ${payload.shipmentId}`);
        
        await processDocument(payload.shipmentId, payload.gcsUrl, payload.mimeType);
        
        message.ack();
      } catch (error) {
        console.error('[AI-Parser Worker] Error processing message:', error);
        message.nack();
      }
    });

  } catch (error) {
    console.warn('[AI-Parser Worker] Failed to start (ignoring if local without emulator):', error);
  }
};

async function processDocument(shipmentId: string, gcsUrl: string, mimeType: string) {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured.');
  }

  // Descargar archivo de GCS a memoria
  const bucketName = gcsUrl.split('/')[2];
  const filePath = gcsUrl.split('/').slice(3).join('/');
  
  const [fileBuffer] = await storage.bucket(bucketName).file(filePath).download();
  const fileBase64 = fileBuffer.toString('base64');

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  const prompt = `Extract shipping instruction details from this document. Focus on Shipper, Consignee, Ports, Containers, Commodities, and Marks.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      shipperText: { type: Type.STRING },
      consigneeText: { type: Type.STRING },
      portOfLoading: { type: Type.STRING },
      portOfDischarge: { type: Type.STRING }
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [
      { role: 'user', parts: [
        { text: prompt },
        { inlineData: { data: fileBase64, mimeType: mimeType || 'application/pdf' } }
      ]}
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
    }
  });

  const extractedData = JSON.parse(response.text || "{}");

  let supplierId = null;
  let billingPartyId = null;

  if (extractedData.shipperText) {
    const firstWord = extractedData.shipperText.split(/[\s,]+/)[0];
    const match = await db.select().from(companies).where(ilike(companies.name, `%${firstWord}%`)).limit(1);
    if (match.length > 0) supplierId = match[0].id;
  }
  if (extractedData.consigneeText) {
    const firstWord = extractedData.consigneeText.split(/[\s,]+/)[0];
    const match = await db.select().from(companies).where(ilike(companies.name, `%${firstWord}%`)).limit(1);
    if (match.length > 0) billingPartyId = match[0].id;
  }

  // Update shipment
  await db.update(shipments).set({
    originLocationId: null, // Podría ser buscar la locación
    destinationLocationId: null,
    supplierId: supplierId,
    billingPartyId: billingPartyId,
    status: 'DRAFT',
    updatedAt: new Date()
  }).where(eq(shipments.id, shipmentId));

  // Notificar al Frontend
  eventEmitter.emit('notification', {
    id: Date.now().toString(),
    title: 'Análisis IA Completado',
    message: \`El documento del embarque \${shipmentId} ha sido procesado exitosamente.\`,
    type: 'success',
    timestamp: new Date().toISOString(),
    shipmentId: shipmentId,
    extractedData: extractedData
  });
}
