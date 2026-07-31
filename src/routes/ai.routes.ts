import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Queue } from 'bullmq';
import { db } from '../db/index.js';
import { pendingAiReviews } from '../db/schema.js';
import { generateId } from 'lucia';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const aiQueue = new Queue('ai-tasks', { connection });

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
      const job = await aiQueue.add('ai-job', { reviewId, prompt });

      return { success: true, reviewId, jobId: job.id };
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
}
