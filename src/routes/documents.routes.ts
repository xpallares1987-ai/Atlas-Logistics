import { Router } from 'express';
import { PDFService, HBLData } from '../services/pdf.service.js';

const router = Router();

router.post('/hbl', async (req, res) => {
  try {
    const data: HBLData = req.body;

    if (!data.shipmentId || !data.shipper || !data.consignee) {
      return res.status(400).json({ error: 'Missing required HBL fields' });
    }

    const pdfBuffer = await PDFService.generateHBL(data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=HBL-${data.shipmentId}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
