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
    };
  }
}

export const authMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const iapJwt = request.headers['x-goog-iap-jwt-assertion'] as string;
    
    if (!iapJwt) {
      if (process.env.NODE_ENV === 'production' && IAP_AUDIENCE) {
        reply.code(401).send({ error: 'Missing IAP JWT header.' });
        throw new Error("Unauthorized");
      } else {
        request.user = {
          email: 'localdev@atlaslogistics.com',
          id: '00000000-0000-0000-0000-000000000000'
        };
        return;
      }
    }

    const response = await client.getIapPublicKeys();
    const ticket = await client.verifySignedJwtWithCertsAsync(
      iapJwt,
      response.pubkeys,
      IAP_AUDIENCE,
      ['https://cloud.google.com/iap']
    );

    const payload = ticket.getPayload();
    if (payload) {
      request.user = {
        email: payload.email,
        id: payload.sub
      };
    }
  } catch (error) {
    logger.error('Error verificando IAP JWT:', error);
    reply.code(401).send({ error: 'Invalid Identity Token' });
    throw new Error("Unauthorized");
  }
};
