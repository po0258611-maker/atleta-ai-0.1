import type { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../config/env';
import { logger } from './logger';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRequestMap = new Map<string, RateLimitRecord>();

// Cleanup stale IP entries without keeping Node alive during tests/shutdown.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (now > record.resetTime) {
      ipRequestMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);
cleanupTimer.unref?.();

function getClientIp(req: Request): string {
  // Express computes req.ip using the configured trust proxy policy.
  // Never consume X-Forwarded-For directly because it is client-controlled
  // unless a trusted proxy is explicitly configured in server.ts.
  return req.ip || req.socket.remoteAddress || 'unknown-ip';
}

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientIp = getClientIp(req);
  const now = Date.now();
  const record = ipRequestMap.get(clientIp);

  if (!record || now > record.resetTime) {
    ipRequestMap.set(clientIp, {
      count: 1,
      resetTime: now + SERVER_CONFIG.RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (record.count >= SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    logger.warn('Rate limit exceeded', {
      ip: clientIp,
      path: req.path,
      status: 429,
      retryAfter: retryAfterSeconds,
      timestamp: new Date().toISOString(),
    });

    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas solicitações enviadas. Aguarde um instante antes de tentar novamente.',
        retryAfter: retryAfterSeconds,
      },
      retryAfter: retryAfterSeconds,
    });
  }

  record.count += 1;
  return next();
}
