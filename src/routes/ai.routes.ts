import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Queue } from 'bullmq';
import { db } from '../db/index.js';
import { pendingAiReviews } from '../db/schema.js';
import { generateId } from 'lucia';

import { redis } from '../config/redis.js';

// Si usamos ioredis-mock, BullMQ dará problemas. En ese caso simulamos la Queue localmente o le pasamos el mock (aunque puede fallar).
// Para un entorno $0 costo, si no hay redis real, no rompemos.
const isMock = process.env.NODE_ENV !== "production" && process.env.USE_REDIS_MOCK !== "false";
const aiQueue = isMock ? null : new Queue('ai-tasks', { connection: redis });

const taskSchema = z.object({
  prompt: z.string().min(1),
  shipmentId: z.string(),
  documentUrl: z.string(),
});

export default async function aiRoutes(fastify: FastifyInstance) {
  fastify.post('/trigger-task', async (request, reply) => {
    try {
      const { prompt, shipmentId, documentUrl } = taskSchema.parse(request.body);
      const reviewId = generateId(15);
      
      // Save pending status to DB
      await db.insert(pendingAiReviews).values({
        id: reviewId,
        shipmentId,
        documentUrl,
        status: 'PENDING',
      });

      // Enqueue Job for BullMQ aiWorker
      let jobId = 'mock-job-' + Date.now();
      if (aiQueue) {
        const job = await aiQueue.add('ai-job', { reviewId, prompt });
        jobId = job.id!;
      } else {
        // Ejecutar en segundo plano de manera simulada sin BullMQ si no hay Redis real
        setTimeout(async () => {
          await db.update(pendingAiReviews)
            .set({ status: 'COMPLETED', result: 'Simulated AI Response' })
            .where((t) => t.id === reviewId);
        }, 2000);
      }

      return { success: true, reviewId, jobId };
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: 'Invalid request body' });
    }
  });

  fastify.get('/status/:reviewId', async (request, reply) => {
    const { reviewId } = request.params as { reviewId: string };
    const [review] = await db.select().from(pendingAiReviews).where((table) => table.id === reviewId);
    
    if (!review) {
      return reply.code(404).send({ error: 'Not found' });
    }

    return review;
  });

  fastify.post('/chat', async (request, reply) => {
    try {
      const { message } = request.body as { message: string };
      
      // En una implementación real, aquí se llamaría a Google Gemini / OpenAI 
      // y se le pasaría contexto de SQLite a través de una cadena de LangChain o Drizzle.
      // Por ahora simularemos la respuesta analizando la intención.
      const lower = message.toLowerCase();
      let replyText = "Entendido. Procesando tu solicitud con los datos del ERP logístico...";
      
      if (lower.includes('demurrage')) {
        replyText = "He analizado los contenedores. Tienes 2 contenedores en ESBCN acercándose al límite de días libres. Te sugiero despacharlos antes del viernes para evitar $400 en demurrage.";
      } else if (lower.includes('warehouse') || lower.includes('almacen') || lower.includes('almacén')) {
        replyText = "La ocupación actual del almacén de tránsito es del 82%. Tenemos capacidad para el próximo envío de 15 pallets procedente de Shanghai.";
      } else if (lower.includes('route') || lower.includes('ruta')) {
        replyText = "La ruta CNSHA -> ESBCN actualmente tiene un tránsito promedio de 32 días. La alternativa por aire tomaría 4 días pero incrementaría el costo en un 450%.";
      }

      // Simulamos latencia de red/procesamiento IA
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return { reply: replyText };
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: 'AI processing failed' });
    }
  });
}
