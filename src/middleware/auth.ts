import { FastifyRequest, FastifyReply } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../config/logger.js';

const IAP_AUDIENCE = process.env.IAP_AUDIENCE || ''; 
const client = new OAuth2Client();

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      email: string;
      id: string;
      role?: string;
    };
  }
}

export const authMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const iapJwt = request.headers['x-goog-iap-jwt-assertion'] as string;
    const cookieToken = request.cookies['token'];
    
    if (!iapJwt && !cookieToken) {
      if (process.env.NODE_ENV === 'production' && IAP_AUDIENCE) {
        reply.code(401).send({ error: 'Missing Authentication.' });
        throw new Error("Unauthorized");
      } else {
        request.user = {
          email: 'localdev@atlaslogistics.com',
          id: '00000000-0000-0000-0000-000000000000'
        };
        return;
      }
    }
    
    // Si tenemos cookie HttpOnly pero no IAP (ej. login interno)
    if (cookieToken && !iapJwt) {
      try {
        const decoded = await request.jwtVerify<{email: string, sub: string}>();
        request.user = {
          email: decoded.email,
          id: decoded.sub
        };
      } catch (jwtErr) {
        logger.error(jwtErr, 'Error verificando HttpOnly JWT:');
        reply.code(401).send({ error: 'Invalid Session Cookie' });
        throw new Error("Unauthorized");
      }
      return; // Token de cookie verificado
    }

    if (iapJwt) {
      const response = await client.getIapPublicKeys();
      const ticket = await client.verifySignedJwtWithCertsAsync(
        iapJwt,
        response.pubkeys,
        IAP_AUDIENCE,
        ['https://cloud.google.com/iap']
      );

      const payload = ticket.getPayload();
      if (payload && payload.email && payload.sub) {
        request.user = {
          email: payload.email,
          id: payload.sub
        };
      }
    }
  } catch (error) {
    logger.error(error, 'Error verificando IAP JWT:');
    reply.code(401).send({ error: 'Invalid Identity Token' });
    throw new Error("Unauthorized");
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Basic RBAC check. Assuming role is populated by authMiddleware or a DB lookup middleware.
    const userRole = request.user?.role || 'USER'; 
    if (!allowedRoles.includes(userRole)) {
      reply.code(403).send({ error: 'Forbidden: Insufficient permissions' });
      throw new Error("Forbidden");
    }
  };
};
