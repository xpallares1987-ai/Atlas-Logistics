import { logger } from "../../config/logger.js";
import { AtlasWorker } from "../utils/worker-base.js";

class EmailWorker extends AtlasWorker {
  readonly taskType = "sendgrid-email";

  async execute(job: any): Promise<any> {
    logger.info(
      `[EmailWorker] Handling job ${job.key} for workflow ${job.processInstanceKey}`,
    );

    const to = job.variables.emailTo || job.variables.to;
    const subject =
      job.variables.emailSubject ||
      job.variables.subject ||
      "Notificación de Atlas Logistics";
    const body =
      job.variables.emailBody || job.variables.body || "Mensaje del sistema.";

    if (!to) {
      logger.warn(
        `[EmailWorker] No 'to' address provided for email. Aborting email send.`,
      );
      return { emailDeliveryStatus: "failed", emailError: "missing_recipient" };
    }

    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      logger.warn(
        `[EmailWorker] SENDGRID_API_KEY not configured. Mocking email to ${to} with subject "${subject}"`,
      );
      return { emailDeliveryStatus: "mocked" };
    }

    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sendgridApiKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: {
            email:
              process.env.SENDGRID_FROM_EMAIL || "no-reply@atlaslogistics.com",
          },
          subject: subject,
          content: [{ type: "text/plain", value: body }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `SendGrid API returned ${response.status}: ${errorText}`,
        );
      }

      logger.info(`[EmailWorker] Successfully sent email to ${to}`);
      return { emailDeliveryStatus: "success" };
    } catch (err: any) {
      logger.error(`[EmailWorker] Failed to send email: ${err.message}`);
      throw err;
    }
  }
}

export const emailWorker = new EmailWorker();
