import type { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../config/env';
import { logger } from './logger';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const requestMap = new Map<string, RateLimitRecord>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestMap.entries()) {
    if (now >= record.resetTime) requestMap.delete(key);
  }
}, 5 * 60 * 1000);
cleanupTimer.unref?.();

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown-ip';
}

function consume(key: string, maxRequests: number) {
  const now = Date.now();
  const existing = requestMap.get(key);

  if (!existing || now >= existing.resetTime) {
    requestMap.set(key, {
      count: 1,
      resetTime: now + SERVER_CONFIG.RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetTime - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function reject(res: Response, keyType: 'IP' | 'USER', retryAfterSeconds: number) {
  res.setHeader('Retry-After', retryAfterSeconds.toString());
  return res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Muitas solicitações enviadas. Aguarde um instante antes de tentar novamente.',
      retryAfter: retryAfterSeconds,
      scope: keyType.toLowerCase(),
    },
    retryAfter: retryAfterSeconds,
  });
}

/**
 * Cheap pre-auth guard. Uses only the trusted Express IP value and runs before
 * Firebase token verification to contain unauthenticated request abuse.
 */
export function aiIpRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const result = consume(`ai:ip:${ip}`, SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS);

  if (!result.allowed) {
    logger.warn('AI IP rate limit exceeded', {
      ip,
      path: req.path,
      retryAfter: result.retryAfterSeconds,
    });
    return reject(res, 'IP', result.retryAfterSeconds);
  }

  return next();
}

/**
 * Authoritative authenticated guard. UID is accepted only after Firebase Admin
 * verification has attached req.athlete.
 */
export function aiUserRateLimiter(req: Request, res: Response, next: NextFunction) {
  const uid = req.athlete?.uid;

  if (!uid) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Sessão de autenticação obrigatória.',
      },
    });
  }

  const result = consume(`ai:user:${uid}`, SERVER_CONFIG.AI_RATE_LIMIT_MAX_REQUESTS);

  if (!result.allowed) {
    logger.warn('AI user rate limit exceeded', {
      uid,
      path: req.path,
      retryAfter: result.retryAfterSeconds,
    });
    return reject(res, 'USER', result.retryAfterSeconds);
  }

  return next();
}

/** Backward-compatible export for existing non-AI callers/tests. */
export const rateLimiter = aiIpRateLimiter;
