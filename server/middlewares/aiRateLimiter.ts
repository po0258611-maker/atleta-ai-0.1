import type { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../config/env';
import { getFirestoreAdapter } from '../repositories/firestoreAdapter';
import { logger } from './logger';

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

const requestMap = new Map<string, RateLimitState>();

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

function memoryConsume(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = requestMap.get(key);

  if (!existing || now >= existing.resetTime) {
    requestMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetTime - now) / 1000)) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function encodeKey(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

async function firestoreConsume(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const docId = encodeKey(key);
  const db = getFirestoreAdapter();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get('rateLimits', docId);
    const data = snap.exists ? snap.data() : undefined;
    const currentCount = typeof data?.count === 'number' && Number.isFinite(data.count) ? Math.max(0, Math.floor(data.count)) : 0;
    const storedReset = typeof data?.resetTime === 'number' && Number.isFinite(data.resetTime) ? data.resetTime : 0;
    const resetTime = storedReset > now ? storedReset : now + windowMs;

    if (!snap.exists || storedReset <= now) {
      tx.set('rateLimits', docId, {
        key,
        count: 1,
        resetTime,
        updatedAt: new Date(now).toISOString(),
      }, { merge: true });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (currentCount >= maxRequests) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((resetTime - now) / 1000)) };
    }

    tx.set('rateLimits', docId, {
      key,
      count: currentCount + 1,
      resetTime,
      updatedAt: new Date(now).toISOString(),
    }, { merge: true });
    return { allowed: true, retryAfterSeconds: 0 };
  });
}

async function consume(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
  if (SERVER_CONFIG.RATE_LIMIT_BACKEND === 'memory') {
    return memoryConsume(key, maxRequests, windowMs);
  }

  try {
    return await firestoreConsume(key, maxRequests, windowMs);
  } catch (error: any) {
    logger.error('Distributed AI rate limiter unavailable', {
      keyScope: key.startsWith('ai:user:') ? 'user' : 'ip',
      error: error?.message,
    });
    throw new Error('AI_RATE_LIMIT_SERVICE_UNAVAILABLE');
  }
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

async function runLimiter(req: Request, res: Response, next: NextFunction, key: string, keyType: 'IP' | 'USER', maxRequests: number, windowMs: number) {
  try {
    const result = await consume(key, maxRequests, windowMs);
    if (!result.allowed) {
      logger.warn('AI rate limit exceeded', {
        scope: keyType.toLowerCase(),
        path: req.path,
        uid: req.athlete?.uid,
        ip: getClientIp(req),
        retryAfter: result.retryAfterSeconds,
      });
      return reject(res, keyType, result.retryAfterSeconds);
    }
    return next();
  } catch {
    return res.status(503).json({
      success: false,
      error: {
        code: 'AI_RATE_LIMIT_SERVICE_UNAVAILABLE',
        message: 'O controle de frequência da IA está temporariamente indisponível. Tente novamente em instantes.',
      },
    });
  }
}

export async function aiIpRateLimiter(req: Request, res: Response, next: NextFunction) {
  return runLimiter(req, res, next, `ai:ip:${getClientIp(req)}`, 'IP', SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS, SERVER_CONFIG.RATE_LIMIT_WINDOW_MS);
}

export async function aiUserRateLimiter(req: Request, res: Response, next: NextFunction) {
  const uid = req.athlete?.uid;
  if (!uid) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sessão de autenticação obrigatória.' } });
  }

  return runLimiter(req, res, next, `ai:user:${uid}`, 'USER', SERVER_CONFIG.AI_RATE_LIMIT_MAX_REQUESTS, SERVER_CONFIG.AI_RATE_LIMIT_WINDOW_MS);
}

/** Backward-compatible export for existing non-AI callers/tests. */
export const rateLimiter = aiIpRateLimiter;
