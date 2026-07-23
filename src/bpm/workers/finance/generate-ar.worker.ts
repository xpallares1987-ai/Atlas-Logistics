import { AtlasWorker } from "../../utils/worker-base.js";
import { invoices } from "../../../db/schema.js";

interface GenerateInvoiceInput {
  shipmentId: string;
  referenceNumber: string;
  customerId: string; // Updated from 'customer' to 'customerId' to map to partyId
  invoiceType: "AR" | "AP";
  lineItems: Array<{
    description: string;
    amount: number;
    currency: string;
  }>;
}

interface GenerateInvoiceOutput {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
  generatedAt: string;
}

/**
 * Generates AR (Accounts Receivable) invoices
 * and stores them in the database.
 */
class GenerateARWorker extends AtlasWorker<
  GenerateInvoiceInput,
  GenerateInvoiceOutput
> {
  readonly taskType = "atlas.invoice.generate-ar";

  async execute(job: any): Promise<GenerateInvoiceOutput> {
    const {
      shipmentId,
      referenceNumber,
      customerId,
      invoiceType = "AR",
      lineItems = [],
    } = job.variables;

    // Calculate subtotal
    const subtotal =
      lineItems.length > 0
        ? lineItems.reduce(
            (sum: number, item: any) => sum + (item.amount || 0),
            0,
          )
        : Math.round((500 + Math.random() * 3000) * 100) / 100;

    const taxAmount = Math.round(subtotal * 0.16 * 100) / 100; // 16% IVA as example
    const totalAmount = subtotal + taxAmount;

    const currency = lineItems[0]?.currency || "USD";
    const prefix = invoiceType === "AR" ? "INV" : "VND";
    const invoiceNumber = `${prefix}-${Date.now().toString(36).toUpperCase()}`;

    // Due date: 30 days for AR, 45 days for AP
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (invoiceType === "AR" ? 30 : 45));
    const dueDateStr = dueDate.toISOString().split("T")[0];

    // Store in database
    const [newInvoice] = await this.db
      .insert(invoices)
      .values({
        invoiceNumber,
        type: invoiceType,
        partyId: customerId, // Using partyId from new schema
        subtotal,
        taxAmount,
        totalAmount, // amount changed to totalAmount
        currency,
        status: "Pending",
        dueDate: dueDateStr,
        shipmentId,
      })
      .returning();

    console.log(
      `[GenerateInvoice] ${invoiceType} ${invoiceNumber}: $${totalAmount} ${currency} due ${dueDateStr} for ${referenceNumber}`,
    );

    return {
      invoiceId: newInvoice.id,
      invoiceNumber,
      totalAmount,
      currency,
      dueDate: dueDateStr,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const generateARWorker = new GenerateARWorker();
