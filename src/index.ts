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

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de Seguridad y Registro
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

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

app.post('/api/shipments', async (req, res) => {
  try {
    const newShipment = await db.insert(shipments).values(req.body).returning();
    res.json(newShipment[0]);
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

import { invoices } from './db/schema.js';

// INVOICES API
app.get('/api/invoices', async (req, res) => {
  try {
    const allInvoices = await db.select().from(invoices);
    res.json(allInvoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const newInvoice = await db.insert(invoices).values(req.body).returning();
    res.json(newInvoice[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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

async function bootstrap() {
  console.log('Starting Atlas Logistics Backend...');

  // Initialize Database connection implicitly by importing db
  if (db) {
    console.log('Database connection initialized.');
  }

  // Initialize Camunda Workers
  startRateComparerWorker();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`API Server running on http://0.0.0.0:${PORT}`);
    console.log('Backend is running and listening for Camunda jobs.');
  });
}

bootstrap().catch(console.error);
