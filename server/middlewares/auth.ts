import type { Request, Response, NextFunction } from 'express';
import { verifyFirebaseIdToken, DecodedAthleteToken } from '../services/firebaseAdmin';
import { logger } from './logger';

// Augment Express Request type to include decoded Firebase athlete
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      athlete?: DecodedAthleteToken;
      idToken?: string;
    }
  }
}

/**
 * Authentication Middleware: Validates Bearer ID Token using Firebase Admin SDK
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Acesso negado: Bearer token ausente na requisição', { path: req.path, ip: req.ip });
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Acesso negado. Token de autorização Bearer ausente ou formato inválido.',
      },
    });
  }

  const idToken = authHeader.substring(7).trim();

  if (!idToken) {
    return res.status(401).json({
      error: {
        code: 'TOKEN_EMPTY',
        message: 'Token de autorização não fornecido.',
      },
    });
  }

  try {
    const decodedAthlete = await verifyFirebaseIdToken(idToken);
    req.athlete = decodedAthlete;
    req.idToken = idToken;
    return next();
  } catch (error: any) {
    let errorCode = 'INVALID_TOKEN';
    let errorMessage = 'Token de autenticação inválido ou expirado.';

    if (error.code === 'auth/id-token-expired') {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Sua sessão expirou. Faça login novamente via Google.';
    }

    return res.status(401).json({
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
  }
}
