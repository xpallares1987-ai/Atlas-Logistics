import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyWebsocket from '@fastify/websocket';
import { 
  serializerCompiler, 
  validatorCompiler, 
  ZodTypeProvider, 
  jsonSchemaTransform 
} from 'fastify-type-provider-zod';
import { randomUUID } from 'crypto';
import { env } from './core/config.js';

import shipmentRoutes from './routes/shipments.js';
import processRoutes from './routes/processes.js';
import bpmRoutes from './routes/bpm.js';
import freightRoutes from './routes/freight.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import liveRoutes from './routes/live.js';
import rateRoutes from './routes/rates.js';
import documentRoutes from './routes/documents.js';
import userRoutes from './routes/users.js';
import crmRoutes from './routes/crm.js';
import quoteRoutes from './routes/quotes.js';
import financialRoutes from './routes/financial.js';
import customsRoutes from './routes/customs.js';
import wmsRoutes from './routes/wms.js';
import ediRoutes from './routes/edi.js';

const server = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'SYS:standard', ignore: 'pid,hostname' }
    }
  },
  genReqId: () => randomUUID()
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(helmet, { global: true, contentSecurityPolicy: false });

const ALLOWED_ORIGINS = env.NODE_ENV === 'production' 
  ? ['https://xpallares1987-ai.github.io'] 
  : ['http://localhost:5173', 'http://localhost:3000', 'https://xpallares1987-ai.github.io'];

server.register(cors, {
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
});

server.register(rateLimit, { max: 100, timeWindow: '1 minute' });
server.register(fastifyCompress, { global: true });

// WebSockets Configuration
server.register(fastifyWebsocket);

// JWT Configuration
server.register(fastifyJwt, {
  secret: env.ENCRYPTION_KEY || 'control-tower-industrial-secret-2027'
});

// Swagger Configuration
server.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'API Atlas Logistics SCM',
      description: 'API de grado industrial para la automatización de operativas de Freight Forwarding',
      version: '1.0.0'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  transform: jsonSchemaTransform
});

server.register(fastifySwaggerUi, {
  routePrefix: '/documentation',
});

// Decorator for authentication
server.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

import { zbc } from './core/zeebe.js';
import { startZeebeWorkers } from './workers/zeebe-workers.js';
import { eventBus } from './core/event-bus.js';

// Register Domain-Specific Routes
server.register(authRoutes);
server.register(shipmentRoutes);
server.register(processRoutes);
server.register(bpmRoutes);
server.register(freightRoutes);
server.register(healthRoutes);
server.register(liveRoutes);
server.register(rateRoutes);
server.register(documentRoutes);
server.register(userRoutes);
server.register(crmRoutes);
server.register(quoteRoutes);
server.register(financialRoutes);
server.register(customsRoutes);
server.register(wmsRoutes);
server.register(ediRoutes);

// Register WebSocket Route for Real-Time Event Broadcasting
server.register(async (app) => {
  app.get('/ws', { websocket: true }, (connection, _req) => {
    app.log.info('Client connected to WebSocket');
    
    // Listen to internal eventBus and broadcast to this connected WebSocket client
    const onWorkflowUpdate = (data: any) => {
      connection.socket.send(JSON.stringify(data));
    };
    
    eventBus.subscribe('workflow:update', onWorkflowUpdate);

    connection.socket.on('close', () => {
      app.log.info('Client disconnected from WebSocket');
      eventBus.unsubscribe('workflow:update', onWorkflowUpdate);
    });
  });
});

// Control de idempotencia con prevención de Memory Leak (TTL)
const idempotencyCache = new Map<string, number>();
const IDEMPOTENCY_TTL = 60000; // 1 minuto en milisegundos

server.addHook('preHandler', async (request, reply) => {
  if (request.method === 'POST' || request.method === 'PUT') {
    const idempotencyKey = request.headers['x-idempotency-key'] as string;
    if (idempotencyKey) {
      const now = Date.now();
      const expiration = idempotencyCache.get(idempotencyKey);

      if (expiration && expiration > now) {
        return reply.status(409).send({ error: 'Conflicto', message: 'La petición ya ha sido procesada' });
      }
      
      idempotencyCache.set(idempotencyKey, now + IDEMPOTENCY_TTL);

      // Limpieza periódica ligera si la caché crece demasiado
      if (idempotencyCache.size > 1000) {
        for (const [key, exp] of idempotencyCache.entries()) {
          if (exp <= now) {
            idempotencyCache.delete(key);
          }
        }
      }
    }
  }
});

export const startServer = async () => {
  try {
    const port = parseInt(env.PORT || '3000', 10);
    
    // Start Zeebe BPMN Workers
    startZeebeWorkers(zbc);

    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 API Atlas Logistics SCM en ejecución: http://0.0.0.0:${port}`);
    console.log(`📚 Documentación Swagger disponible en: http://0.0.0.0:${port}/documentation`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

startServer();