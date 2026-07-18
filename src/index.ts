import dotenv from 'dotenv';
// En producción (Cloud Run), las variables de entorno vienen de Secret Manager.
// En desarrollo local, se cargan desde .env.local si existe.
dotenv.config({ path: '.env.local', override: false });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { db } from './db/db.config.js';
import { startRateComparerWorker } from './bpm/workers/rate-comparer.worker.js';
import { zbc } from './bpm/client.js';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de Seguridad y Registro
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite por IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

import { authMiddleware } from './middleware/auth.js';
// Proteger todas las rutas API excepto SSE, Demo, y Tracking Público
app.use('/api', (req, res, next) => {
  if (
    req.path === '/events' || 
    req.path === '/demo/trigger-alert' || 
    req.path.startsWith('/tracking/')
  ) {
    return next();
  }
  return authMiddleware(req, res, next);
});

// API Endpoint para iniciar el proceso de Camunda y esperar resultado
app.post('/api/rates/compare', async (req, res) => {
  try {
    const { origin, destination, containerType } = req.body;
    
    // Inicia el proceso y espera a que termine (o al timeout)
    const result = await zbc.createProcessInstanceWithResult({
      bpmnProcessId: 'rate-comparer-process',
      requestTimeout: 30000,
      variables: {
        origin,
        destination,
        containerType
      }
    });

    res.json({
      success: true,
      processInstanceKey: result.processInstanceKey,
      variables: result.variables
    });
  } catch (error: any) {
    console.error('Error starting process:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

import { shipments } from './db/schema.js';
import { eq } from 'drizzle-orm';

// SHIPMENTS CRUD API
app.get('/api/shipments', async (req, res) => {
  try {
    const allShipments = await db.select().from(shipments);
    res.json(allShipments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { Storage } from '@google-cloud/storage';
import { shipmentDocuments } from './db/schema.js';
import { publishDocumentUploaded } from './services/pubsub.service.js';

const storage = new Storage();
const BUCKET_NAME = 'atlas-logistics-docs-100198375762';

app.post('/api/shipments', async (req, res) => {
  try {
    const { documentBase64, documentMimeType, documentName, ...shipmentData } = req.body;
    
    // Asignar el usuario actual si IAP está configurado
    if (req.user?.id) {
      // Ignorar el assignment de UUID si falla el casting, asumiendo db schema default
    }

    // 1. Insert shipment
    const newShipment = await db.insert(shipments).values(shipmentData).returning();
    const shipment = newShipment[0];

    // 2. Upload document to GCS if provided
    if (documentBase64 && documentName) {
      const bucket = storage.bucket(BUCKET_NAME);
      const uniqueFileName = `bookings/${shipment.id}-${documentName}`;
      const file = bucket.file(uniqueFileName);
      
      const buffer = Buffer.from(documentBase64, 'base64');
      await file.save(buffer, {
        contentType: documentMimeType || 'application/pdf',
      });
      
      const gcsUrl = `gs://${BUCKET_NAME}/${uniqueFileName}`;
      
      // 3. Insert into shipment_documents
      await db.insert(shipmentDocuments).values({
        shipmentId: shipment.id,
        documentType: 'BOOKING_INSTRUCTION',
        fileName: documentName,
        mimeType: documentMimeType || 'application/pdf',
        gcsUrl: gcsUrl,
        // uploadedBy: req.user?.id // Requeriría que req.user.id sea un UUID válido en Users
      });

      // 4. Publish Event to parse document asynchronously
      await publishDocumentUploaded({
        shipmentId: shipment.id,
        gcsUrl: gcsUrl,
        mimeType: documentMimeType || 'application/pdf'
      });
    }

    res.json(shipment);
  } catch (error: any) {
    console.error('Error creating shipment:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC TRACKING API
app.get('/api/tracking/:referenceNumber', async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    const shipmentRecords = await db.select().from(shipments).where(eq(shipments.referenceNumber, referenceNumber));
    if (shipmentRecords.length === 0) return res.status(404).json({ error: 'Shipment not found' });
    
    const shipment = shipmentRecords[0];
    // Asumiendo que la tabla milestones existe y fue importada, o si no se simulan los eventos
    // Si no está importada, usaré eventos simulados o consultaré
    
    res.json({
      referenceNumber: shipment.referenceNumber,
      status: shipment.status,
      originId: shipment.originLocationId,
      destinationId: shipment.destinationLocationId,
      createdAt: shipment.createdAt,
      events: [
        {
          id: 'mock-1',
          shipmentId: shipment.id,
          milestoneType: 'CREATED',
          milestoneDate: shipment.createdAt || new Date(),
          description: 'Shipment created and awaiting processing.',
        }
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/shipments/:id', async (req, res) => {
  try {
    const updatedShipment = await db.update(shipments)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(shipments.id, req.params.id))
      .returning();
    res.json(updatedShipment[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/shipments/:id', async (req, res) => {
  try {
    await db.delete(shipments).where(eq(shipments.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { rates, quotes } from './db/schema.js';

// RATES API
app.get('/api/rates', async (req, res) => {
  try {
    const allRates = await db.select().from(rates);
    res.json(allRates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// QUOTES API
app.get('/api/quotes', async (req, res) => {
  try {
    const allQuotes = await db.select().from(quotes);
    res.json(allQuotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const newQuote = await db.insert(quotes).values(req.body).returning();
    res.json(newQuote[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/quotes/:id', async (req, res) => {
  try {
    const updatedQuote = await db.update(quotes)
      .set(req.body)
      .where(eq(quotes.id, req.params.id))
      .returning();
    res.json(updatedQuote[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { invoices, invoiceLines, agentSettlements, companies } from './db/schema.js';
import { sql } from 'drizzle-orm';

// INVOICES API
app.get('/api/invoices', async (req, res) => {
  try {
    const allInvoices = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      type: invoices.type,
      amount: invoices.totalAmount,
      currency: invoices.currency,
      status: invoices.status,
      dueDate: invoices.dueDate,
      shipmentId: invoices.shipmentId,
      partyId: invoices.partyId,
      party: companies.name
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.partyId, companies.id))
    .orderBy(invoices.issuedAt);
    res.json(allInvoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const { lines, ...invoiceData } = req.body;
    const newInvoice = await db.insert(invoices).values(invoiceData).returning();
    
    if (lines && lines.length > 0) {
      const linesData = lines.map((l: any) => ({ ...l, invoiceId: newInvoice[0].id }));
      await db.insert(invoiceLines).values(linesData);
    }
    
    res.json(newInvoice[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import PDFDocument from 'pdfkit';

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const updatedInvoice = await db.update(invoices)
      .set(req.body)
      .where(eq(invoices.id, req.params.id))
      .returning();
    res.json(updatedInvoice[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices/:id/pdf', async (req, res) => {
  try {
    const invoice = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      type: invoices.type,
      totalAmount: invoices.totalAmount,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      party: companies.name
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.partyId, companies.id))
    .where(eq(invoices.id, req.params.id))
    .limit(1);

    if (!invoice || invoice.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, req.params.id));

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice[0].invoiceNumber}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Atlas Logistics', { align: 'right' });
    doc.fontSize(10).text('123 Global Way, Logistics City, LC 12345', { align: 'right' });
    doc.moveDown();

    // Invoice Info
    doc.fontSize(20).text('INVOICE', { align: 'left' });
    doc.fontSize(12).text(`Invoice Number: ${invoice[0].invoiceNumber}`);
    doc.text(`Type: ${invoice[0].type}`);
    doc.text(`Party: ${invoice[0].party || 'Unknown'}`);
    doc.text(`Due Date: ${new Date(invoice[0].dueDate).toLocaleDateString()}`);
    doc.moveDown(2);

    // Lines
    const currentY = doc.y;
    doc.fontSize(12).text('Description', 50, currentY);
    doc.text('Qty', 300, currentY);
    doc.text('Unit Price', 380, currentY);
    doc.text('Amount', 480, currentY);
    
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    lines.forEach(line => {
      const y = doc.y;
      doc.fontSize(10).text(line.description || 'Item', 50, y);
      doc.text(line.quantity.toString(), 300, y);
      doc.text(line.unitPrice.toString(), 380, y);
      doc.text(line.amount.toString(), 480, y);
      doc.moveDown(0.5);
    });

    doc.moveDown(2);
    doc.fontSize(14).text(`Total: ${invoice[0].totalAmount} ${invoice[0].currency}`, { align: 'right' });

    doc.end();

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// FINANCIAL STATS API (For Dashboard)
app.get('/api/financial-stats', async (req, res) => {
  try {
    const stats = await db.select({
      type: invoices.type,
      total: sql<number>`sum(${invoices.totalAmount})`
    }).from(invoices).groupBy(invoices.type);
    
    let totalAR = 0;
    let totalAP = 0;
    
    stats.forEach(s => {
      if (s.type === 'AR' || s.type === 'DN') totalAR += Number(s.total || 0);
      if (s.type === 'AP' || s.type === 'CN') totalAP += Number(s.total || 0);
    });

    const netProfit = totalAR - totalAP;

    res.json({
      totalAR,
      totalAP,
      netProfit,
      profitShareOwed: totalAP * 0.1
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { inArray } from 'drizzle-orm';

// AGENT SETTLEMENTS API
app.get('/api/agent-settlements', async (req, res) => {
  try {
    const settlements = await db.select({
      id: agentSettlements.id,
      statementNumber: agentSettlements.statementNumber,
      agentId: agentSettlements.agentId,
      agentName: companies.name,
      periodStart: agentSettlements.periodStart,
      periodEnd: agentSettlements.periodEnd,
      netBalance: agentSettlements.netBalance,
      currency: agentSettlements.currency,
      status: agentSettlements.status
    })
    .from(agentSettlements)
    .leftJoin(companies, eq(agentSettlements.agentId, companies.id))
    .orderBy(agentSettlements.createdAt);
    res.json(settlements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agent-settlements', async (req, res) => {
  try {
    const { agentId, periodStart, periodEnd, invoiceIds } = req.body;
    
    let agentShare = 0;
    
    if (invoiceIds && invoiceIds.length > 0) {
      const relatedInvoices = await db.select().from(invoices).where(inArray(invoices.id, invoiceIds));
      let totalAR = 0;
      let totalAP = 0;
      relatedInvoices.forEach(inv => {
        if (inv.type === 'AR' || inv.type === 'DN') totalAR += inv.totalAmount;
        if (inv.type === 'AP' || inv.type === 'CN') totalAP += inv.totalAmount;
      });
      const netProfit = totalAR - totalAP;
      agentShare = netProfit * 0.5; // 50% Profit share
    }

    const statementNumber = `SET-${Date.now()}`;
    const newSettlement = await db.insert(agentSettlements).values({
      statementNumber,
      agentId,
      periodStart: new Date(periodStart).toISOString().split('T')[0],
      periodEnd: new Date(periodEnd).toISOString().split('T')[0],
      netBalance: agentShare,
      currency: 'USD',
      status: 'PENDING'
    }).returning();

    if (invoiceIds && invoiceIds.length > 0) {
      const bridgeData = invoiceIds.map((id: string) => ({
        settlementId: newSettlement[0].id,
        invoiceId: id
      }));
      await db.insert(settlementInvoices).values(bridgeData);
    }

    res.json(newSettlement[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { EventEmitter } from 'events';
export const eventEmitter = new EventEmitter();

// SSE ENDPOINT (Real-time notifications)
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  res.write('data: {"type": "connected"}\n\n'); // Send initial ping
  
  const listener = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  eventEmitter.on('notification', listener);
  
  req.on('close', () => {
    eventEmitter.off('notification', listener);
  });
});

// Demo trigger endpoint
app.post('/api/demo/trigger-alert', (req, res) => {
  const { title, message, type = 'warning' } = req.body;
  eventEmitter.emit('notification', { 
    id: Date.now().toString(),
    title: title || 'System Alert', 
    message: message || 'Demo notification triggered', 
    type,
    timestamp: new Date().toISOString(),
    read: false
  });
  res.json({ success: true });
});

import { GoogleGenAI, Type, Schema } from '@google/genai';
import { ilike } from 'drizzle-orm';
import { companies } from './db/schema.js';

// AI Parser Endpoint
app.post('/api/ai/parse-shipping-instructions', async (req, res) => {
  try {
    const { fileBase64, mimeType } = req.body;
    
    if (!process.env.GOOGLE_API_KEY) {
      return res.status(500).json({ success: false, error: 'GOOGLE_API_KEY not configured in backend.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    
    const prompt = `Extract shipping instruction details from this document.
    Focus on extracting the Shipper, Consignee, Notify Party, Ports of Loading and Discharge, Containers, Commodities, Incoterm, and Marks and Numbers.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        shipperText: { type: Type.STRING },
        consigneeText: { type: Type.STRING },
        notifyText: { type: Type.STRING },
        portOfLoading: { type: Type.STRING },
        portOfDischarge: { type: Type.STRING },
        containers: { 
          type: Type.ARRAY, 
          items: {
            type: Type.OBJECT,
            properties: {
              isoCode: { type: Type.STRING },
              count: { type: Type.INTEGER },
              weight: { type: Type.NUMBER }
            }
          }
        },
        commodities: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              hsCode: { type: Type.STRING },
              description: { type: Type.STRING },
              weight: { type: Type.NUMBER },
              volume: { type: Type.NUMBER }
            }
          }
        },
        incoterm: { type: Type.STRING },
        marksAndNumbers: { type: Type.STRING }
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        { role: 'user', parts: [
          { text: prompt },
          { inlineData: { data: fileBase64, mimeType: mimeType } }
        ]}
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    const extractedData = JSON.parse(text || "{}");

    // Match logic for suggestions
    const suggestions: any = {};
    if (extractedData.shipperText) {
      // Very basic keyword matching just taking the first word for demo purposes.
      // In production, we could use full-text search or vector search.
      const firstWord = extractedData.shipperText.split(/[\s,]+/)[0];
      const match = await db.select().from(companies).where(ilike(companies.name, `%${firstWord}%`)).limit(1);
      if (match.length > 0) {
        suggestions.shipper = { exactMatch: true, company: { id: match[0].id, name: match[0].name } };
      }
    }

    if (extractedData.consigneeText) {
      const firstWord = extractedData.consigneeText.split(/[\s,]+/)[0];
      const match = await db.select().from(companies).where(ilike(companies.name, `%${firstWord}%`)).limit(1);
      if (match.length > 0) {
        suggestions.consignee = { exactMatch: true, company: { id: match[0].id, name: match[0].name } };
      }
    }

    res.json({ success: true, extractedData, suggestions });
  } catch (error: any) {
    console.error('AI Parse Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Keys Demo Endpoint
app.post('/api/keys/generate', (req, res) => {
  const { name } = req.body;
  const token = `sk_test_${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`;
  res.json({ 
    success: true, 
    key: { 
      id: Date.now().toString(), 
      name: name || 'API Key', 
      token, 
      createdAt: new Date().toISOString(),
      lastUsed: null
    } 
  });
});

import { initPubSub } from './services/pubsub.service.js';
import { startAiParserWorker } from './workers/ai-parser.worker.js';

import aiRoutes from './routes/ai.routes.js';
import documentsRoutes from './routes/documents.routes.js';

app.use('/api/ai', aiRoutes);
app.use('/api/documents', documentsRoutes);


async function bootstrap() {
  console.log('Starting Atlas Logistics Backend...');

  // Initialize Database connection implicitly by importing db
  if (db) {
    console.log('Database connection initialized.');
  }

  // Initialize PubSub and workers
  await initPubSub();
  startAiParserWorker();

  // Initialize Camunda Workers
  startRateComparerWorker();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`API Server running on http://0.0.0.0:${PORT}`);
    console.log('Backend is running and listening for Camunda jobs.');
  });
}

bootstrap().catch(console.error);
