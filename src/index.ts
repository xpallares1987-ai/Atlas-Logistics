import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import cors from 'cors';
import { db } from './db/db.config.js';
import { startRateComparerWorker } from './bpm/workers/rate-comparer.worker.js';
import { zbc } from './bpm/client.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
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

async function bootstrap() {
  console.log('Starting Atlas Logistics Backend...');

  // Initialize Database connection implicitly by importing db
  if (db) {
    console.log('Database connection initialized.');
  }

  // Initialize Camunda Workers
  startRateComparerWorker();

  app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
    console.log('Backend is running and listening for Camunda jobs.');
  });
}

bootstrap().catch(console.error);
