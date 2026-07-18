import { Router } from 'express';
import { AIService } from '../services/ai.service.js';
import { geminiInvoiceSchema, invoiceDataSchema } from '../services/invoiceParser.schema.js';

const router = Router();

router.post('/parse-invoice', async (req, res) => {
  try {
    const { documentBase64, mimeType } = req.body;
    
    if (!documentBase64) {
      return res.status(400).json({ success: false, error: 'documentBase64 is required' });
    }

    const prompt = `Extract the invoice details from this document. Ensure you capture the invoice number, supplier name, total amount, currency, and list of line items.`;
    
    const parsedData = await AIService.parseDocument(
      documentBase64, 
      mimeType || 'application/pdf', 
      prompt, 
      geminiInvoiceSchema
    );

    // Validate structured output via Zod
    const validatedData = invoiceDataSchema.parse(parsedData);

    res.json({ success: true, data: validatedData });
  } catch (error: any) {
    console.error('Invoice Parser Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
