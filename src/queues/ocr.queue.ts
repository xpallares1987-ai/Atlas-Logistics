import { Queue, Worker, Job } from "bullmq";
import { redis, isRedisAvailable } from "../config/redis.js";
import { logger } from "../config/logger.js";

const QUEUE_NAME = "ocr-parsing";

export const ocrQueue = new Queue(QUEUE_NAME, {
  connection: redis,
});

export async function addOcrJob(jobName: string, data: any) {
  if (isRedisAvailable) {
    return await ocrQueue.add(jobName, data);
  } else {
    logger.warn(`Redis is down. Using in-memory synchronous execution for OCR job: ${jobName}`);
    // Simulate async processing
    setTimeout(() => {
      processOcrJob(data).catch(err => logger.error(err, "In-memory OCR processing failed"));
    }, 100);
    return { id: `mem-${Date.now()}` };
  }
}

async function processOcrJob(data: any) {
  logger.info(`Processing OCR for document: ${data.documentUrl || 'Unknown'}`);
  // Simulate OCR processing time
  await new Promise(resolve => setTimeout(resolve, 3000));
  logger.info(`OCR Processing complete for: ${data.documentUrl || 'Unknown'}`);
  return { success: true, parsedText: "Extracted mock data", confidence: 0.95 };
}

export function startOcrWorker() {
  if (!isRedisAvailable) {
    logger.warn("Skipping BullMQ OCR Worker start because Redis is unavailable.");
    return null;
  }

  const worker = new Worker(QUEUE_NAME, async (job: Job) => {
    return await processOcrJob(job.data);
  }, { connection: redis });

  worker.on("completed", (job) => {
    logger.info(`Job ${job.id} has completed!`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} has failed with ${err.message}`);
  });

  return worker;
}
