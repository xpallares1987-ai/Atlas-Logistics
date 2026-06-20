import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import argon2 from 'argon2';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const authRoutes: FastifyPluginAsyncZod = async (server) => {
  server.post('/api/auth/login', {
    schema: {
      description: 'Authenticate user and return JWT token',
      tags: ['Auth'],
      body: z.object({
        username: z.string(),
        password: z.string()
      }),
      response: {
        200: z.object({
          token: z.string()
        }),
        401: z.object({
          error: z.string(),
          message: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const { username, password } = request.body as any;

    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    const isValid = await argon2.verify(user.password_hash, password);

    if (isValid) {
      const token = server.jwt.sign({ 
        id: user.id,
        username: user.username, 
        role: user.role,
        carrier_id: user.carrier_id
      }, { expiresIn: '8h' });

      return { token };
    }

    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
  });

  server.get('/api/auth/me', {
    schema: {
      description: 'Get current user profile from token',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: z.object({
          id: z.number(),
          username: z.string(),
          role: z.string(),
          carrier_id: z.number().nullable()
        })
      }
    },
    onRequest: [(server as any).authenticate]
  }, async (request) => {
    return request.user;
  });

  server.post('/api/auth/register', {
    schema: {
      description: 'Register a new agent/carrier user (Admin only)',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      body: z.object({
        username: z.string().min(3),
        password: z.string().min(8),
        email: z.string().email(),
        role: z.enum(['agent', 'carrier']),
        carrier_id: z.number().optional()
      }),
      response: {
        201: z.object({
          message: z.string(),
          userId: z.number()
        }),
        403: z.object({
          error: z.string(),
          message: z.string()
        })
      }
    },
    onRequest: [(server as any).authenticate]
  }, async (request, reply) => {
    const user = request.user as any;
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Admin access required' });
    }

    const body = request.body as any;
    const password_hash = await argon2.hash(body.password, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    const [newUser] = await db.insert(users).values({
      username: body.username,
      email: body.email,
      password_hash,
      role: body.role,
      carrier_id: body.carrier_id
    }).returning({ id: users.id });

    return reply.status(201).send({ message: 'User registered successfully', userId: newUser.id });
  });
};

export default authRoutes;
