import { AtlasWorker } from '../../utils/worker-base.js';
import { invoices } from '../../../db/schema.js';

interface GenerateInvoiceInput {
  shipmentId: string;
  referenceNumber: string;
  customer: string;
  invoiceType: 'AR' | 'AP';
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
 * Generates AR (Accounts Receivable) or AP (Accounts Payable) invoices
 * and stores them in the database.
 */
class GenerateInvoiceWorker extends AtlasWorker<GenerateInvoiceInput, GenerateInvoiceOutput> {
  readonly taskType = 'atlas.invoice.generate';

  async execute(job: any): Promise<GenerateInvoiceOutput> {
    const { shipmentId, referenceNumber, customer, invoiceType = 'AR', lineItems = [] } = job.variables;

    // Calculate total
    const totalAmount = lineItems.length > 0
      ? lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
      : Math.round((500 + Math.random() * 3000) * 100) / 100; // Mock if no line items

    const currency = lineItems[0]?.currency || 'USD';
    const prefix = invoiceType === 'AR' ? 'INV' : 'VND';
    const invoiceNumber = `${prefix}-${Date.now().toString(36).toUpperCase()}`;

    // Due date: 30 days for AR, 45 days for AP
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (invoiceType === 'AR' ? 30 : 45));
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Store in database
    const [newInvoice] = await this.db
      .insert(invoices)
      .values({
        invoiceNumber,
        type: invoiceType,
        party: customer,
        amount: totalAmount,
        currency,
        status: 'Pending',
        dueDate: dueDateStr,
        shipmentId,
      })
      .returning();

    console.log(`[GenerateInvoice] ${invoiceType} ${invoiceNumber}: $${totalAmount} ${currency} due ${dueDateStr} for ${referenceNumber}`);

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

export const generateInvoiceWorker = new GenerateInvoiceWorker();
