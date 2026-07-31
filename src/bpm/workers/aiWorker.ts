import { Worker, Job } from 'bullmq';
import { processAiTask } from '../../services/geminiService.js';
import { db } from '../../db/index.js';
import { pendingAiReviews } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const aiWorker = new Worker(
  'ai-tasks',
  async (job: Job) => {
    const { reviewId, prompt } = job.data;
    console.log(`Processing AI Task for review ${reviewId}...`);

    try {
      const result = await processAiTask(prompt);
      
      // Actualizar en DB
      await db.update(pendingAiReviews)
        .set({ status: 'COMPLETED', extractedData: result })
        .where(eq(pendingAiReviews.id, reviewId));
        
      console.log(`AI Task ${reviewId} completed successfully.`);
      return { success: true, result };
    } catch (error) {
      console.error(`AI Task ${reviewId} failed:`, error);
      
      await db.update(pendingAiReviews)
        .set({ status: 'FAILED' })
        .where(eq(pendingAiReviews.id, reviewId));
        
      throw error;
    }
  },
  { connection }
);

aiWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error`, err);
});
