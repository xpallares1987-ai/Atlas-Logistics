import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';

const IAP_AUDIENCE = process.env.IAP_AUDIENCE || ''; 
const client = new OAuth2Client();

// Extending Express Request to hold user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        id: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const iapJwt = req.headers['x-goog-iap-jwt-assertion'] as string;
    
    // Si no hay IAP JWT y estamos en entorno local, creamos un mock o rechazamos.
    // Para simplificar localmente, si no hay IAP y no estamos en producción estricta, lo permitimos.
    if (!iapJwt) {
      if (process.env.NODE_ENV === 'production' && IAP_AUDIENCE) {
        return res.status(401).json({ error: 'Missing IAP JWT header.' });
      } else {
        // Local Mock
        req.user = {
          email: 'localdev@atlaslogistics.com',
          id: '00000000-0000-0000-0000-000000000000'
        };
        return next();
      }
    }

    // Verificar Token IAP
    const response = await client.getIapPublicKeys();
    const ticket = await client.verifySignedJwtWithCertsAsync(
      iapJwt,
      response.pubkeys,
      IAP_AUDIENCE,
      ['https://cloud.google.com/iap']
    );

    const payload = ticket.getPayload();
    if (payload) {
      req.user = {
        email: payload.email,
        id: payload.sub // El subject actua como ID unico de Google
      };
    }
    
    next();
  } catch (error) {
    console.error('Error verificando IAP JWT:', error);
    return res.status(401).json({ error: 'Invalid Identity Token' });
  }
};
