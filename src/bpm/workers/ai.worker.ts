import { logger } from "../../config/logger.js";
import { AtlasWorker } from "../utils/worker-base.js";
import { AIService } from "../../services/ai.service.js";

class AIWorker extends AtlasWorker<any, any> {
  readonly taskType = "ai-automation";

  async execute(job: any): Promise<any> {
    logger.info(
      `[AIWorker] Handling AI automation job ${job.key} for workflow ${job.processInstanceKey}`,
    );

    const prompt = job.variables.aiPrompt || job.variables.prompt;
    if (!prompt) {
      logger.warn(
        `[AIWorker] No 'aiPrompt' or 'prompt' variable provided for job ${job.key}. Using default fallback.`,
      );
    }

    const actualPrompt =
      prompt ||
      "Analyze this task and provide a summary of automated actions to take.";

    try {
      // Use the Gemini service to generate a response
      const result = await AIService.generateText(actualPrompt);
      logger.info(`[AIWorker] AI generated response successfully.`);

      return {
        aiDecision: result,
        aiConfidence: 0.95, // mock confidence
        automated: true,
      };
    } catch (error: any) {
      logger.error(
        `[AIWorker] Failed to process AI automation task: ${error.message}`,
      );
      throw error;
    }
  }
}

export const aiWorker = new AIWorker();
