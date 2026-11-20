import { logger } from "../../config/logger.js";
import { AtlasWorker, AtlasWorkerJob } from "../utils/worker-base.js";

interface SlackWorkerVariables {
  slackMessage?: string;
  message?: string;
  slackChannel?: string;
}

interface SlackWorkerOutput {
  slackDeliveryStatus: "mocked" | "success";
  messageTimestamp?: string;
}

class SlackWorker extends AtlasWorker<SlackWorkerVariables, SlackWorkerOutput> {
  readonly taskType = "slack-connector";

  async execute(
    job: AtlasWorkerJob<SlackWorkerVariables>,
  ): Promise<SlackWorkerOutput> {
    logger.info(
      `[SlackWorker] Handling job ${job.key} for workflow ${job.processInstanceKey}`,
    );

    const message =
      job.variables.slackMessage ||
      job.variables.message ||
      "Notificación de Atlas Logistics";
    const channel = job.variables.slackChannel || "#general";

    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
      logger.warn(
        `[SlackWorker] SLACK_BOT_TOKEN not configured. Mocking Slack message to ${channel}: "${message}"`,
      );
      return { slackDeliveryStatus: "mocked" };
    }

    try {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${slackToken}`,
        },
        body: JSON.stringify({
          channel: channel,
          text: message,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Slack API returned ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        ts?: string;
      };
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      logger.info(`[SlackWorker] Successfully sent message to ${channel}`);
      return { slackDeliveryStatus: "success", messageTimestamp: data.ts };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[SlackWorker] Failed to send message: ${msg}`);
      throw err;
    }
  }
}

export const slackWorker = new SlackWorker();
