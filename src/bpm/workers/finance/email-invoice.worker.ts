import { AtlasWorker } from "../../utils/worker-base.js";

interface EmailInvoiceInput {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
}

interface EmailInvoiceOutput {
  emailSentAt: string;
  status: string;
}

/**
 * Mocks the process of sending an invoice to a customer via email.
 */
class EmailInvoiceWorker extends AtlasWorker<
  EmailInvoiceInput,
  EmailInvoiceOutput
> {
  readonly taskType = "atlas.invoice.email";

  async execute(job: any): Promise<EmailInvoiceOutput> {
    const { invoiceId, invoiceNumber, totalAmount, currency } = job.variables;

    console.log(
      `[EmailInvoiceWorker] Sending invoice ${invoiceNumber} ($${totalAmount} ${currency}) to customer...`,
    );

    // Simulamos el tiempo de envío de correo
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(
      `[EmailInvoiceWorker] ✓ Email sent successfully for invoice ${invoiceNumber}.`,
    );

    return {
      emailSentAt: new Date().toISOString(),
      status: "SENT",
    };
  }
}

export const emailInvoiceWorker = new EmailInvoiceWorker();
