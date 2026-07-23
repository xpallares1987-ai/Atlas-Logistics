import { AtlasWorker } from "../../utils/worker-base.js";

interface PaymentReminderInput {
  invoiceId: string;
  invoiceNumber: string;
}

interface PaymentReminderOutput {
  reminderSent: boolean;
}

class PaymentReminderWorker extends AtlasWorker<PaymentReminderInput, PaymentReminderOutput> {
  readonly taskType = "atlas.invoice.payment-reminder";

  async execute(job: any): Promise<PaymentReminderOutput> {
    const { invoiceNumber } = job.variables;
    console.log(`[PaymentReminderWorker] Sending payment reminder for invoice ${invoiceNumber}`);
    return { reminderSent: true };
  }
}

export const paymentReminderWorker = new PaymentReminderWorker();
