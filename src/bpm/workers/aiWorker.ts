import { Worker, Job } from "bullmq";
import { processAiTask } from "../../services/geminiService.js";
import { db } from "../../db/index.js";
import { pendingAiReviews } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import { redis } from "../../config/redis.js";

const isMock =
  process.env.NODE_ENV !== "production" &&
  process.env.USE_REDIS_MOCK !== "false";

export const aiWorker = isMock
  ? null
  : new Worker(
      "ai-tasks",
      async (job: Job) => {
        const { reviewId, prompt } = job.data;
        console.log(`Processing AI Task for review ${reviewId}...`);

        try {
          const result = await processAiTask(prompt);

          // Actualizar en DB
          await db
            .update(pendingAiReviews)
            .set({ status: "COMPLETED", result })
            .where(eq(pendingAiReviews.id, reviewId));

          console.log(`AI Task ${reviewId} completed successfully.`);
          return { success: true, result };
        } catch (error) {
          console.error(`AI Task ${reviewId} failed:`, error);

          await db
            .update(pendingAiReviews)
            .set({ status: "FAILED" })
            .where(eq(pendingAiReviews.id, reviewId));

          throw error;
        }
      },
      { connection: redis },
    );

if (aiWorker) {
  aiWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed with error`, err);
  });
}
