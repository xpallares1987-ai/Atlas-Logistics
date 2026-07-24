import { logger } from "../../config/logger.js";
import { AtlasWorker } from "../utils/worker-base.js";

class SlackWorker extends AtlasWorker {
  readonly taskType = "slack-connector";

  async execute(job: any): Promise<any> {
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

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      logger.info(`[SlackWorker] Successfully sent message to ${channel}`);
      return { slackDeliveryStatus: "success", messageTimestamp: data.ts };
    } catch (err: any) {
      logger.error(`[SlackWorker] Failed to send message: ${err.message}`);
      throw err;
    }
  }
}

export const slackWorker = new SlackWorker();
