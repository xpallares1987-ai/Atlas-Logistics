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

import shipmentRoutes from './routes/shipments.js';
import processRoutes from './routes/processes.js';
import freightRoutes from './routes/freight.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import liveRoutes from './routes/live.js';

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

const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production' 
  ? ['https://xpallares1987-ai.github.io'] 
  : ['http://localhost:5173', 'http://localhost:3000', 'https://xpallares1987-ai.github.io'];

server.register(cors, {
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
});

server.register(rateLimit, { max: 100, timeWindow: '1 minute' });
server.register(fastifyCompress, { global: true });

// WebSockets Configuration (Phase 4)
server.register(fastifyWebsocket);

// JWT Configuration (Phase 4)
server.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'control-tower-industrial-secret-2027'
});

// Swagger Configuration (Phase 4)
server.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Atlas Logistics API',
      description: 'Industrial-grade logistics process automation API',
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

// Register Domain-Specific Routes
server.register(authRoutes);
server.register(shipmentRoutes);
server.register(processRoutes);
server.register(freightRoutes);
server.register(healthRoutes);
server.register(liveRoutes);

const idempotencyCache = new Set<string>();

server.addHook('preHandler', async (request, reply) => {
  if (request.method === 'POST' || request.method === 'PUT') {
    const idempotencyKey = request.headers['x-idempotency-key'] as string;
    if (idempotencyKey) {
      if (idempotencyCache.has(idempotencyKey)) {
        return reply.status(409).send({ error: 'Conflict', message: 'Request already processed' });
      }
      idempotencyCache.add(idempotencyKey);
    }
  }
});

export const startServer = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Atlas Logistics API running on http://localhost:3000');
    console.log('Documentation available at http://localhost:3000/documentation');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

startServer();