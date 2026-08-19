import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { User } from '../domain/types';

// Extend Express Request to include authenticated user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      rawToken?: string;
    }
  }
}

export async function authGuard(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Acesso negado. Token de autenticação ausente ou inválido.',
      },
    });
  }

  const rawToken = authHeader.substring(7).trim();
  try {
    const user = await authService.validateSession(rawToken);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Sua sessão expirou. Faça login novamente.',
        },
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Conta suspensa. Entre em contato com o suporte.',
        },
      });
    }

    req.user = user;
    req.rawToken = rawToken;
    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token de autenticação inválido.',
      },
    });
  }
}
