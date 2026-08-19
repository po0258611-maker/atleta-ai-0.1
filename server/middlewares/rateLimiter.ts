import type { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../config/env';
import { logger } from './logger';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRequestMap = new Map<string, RateLimitRecord>();

// Cleanup stale IP entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (now > record.resetTime) {
      ipRequestMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();

  const record = ipRequestMap.get(clientIp);

  if (!record || now > record.resetTime) {
    ipRequestMap.set(clientIp, {
      count: 1,
      resetTime: now + SERVER_CONFIG.RATE_LIMIT_WINDOW_MS
    });
    return next();
  }

  if (record.count >= SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    logger.warn('Rate limit exceeded', { ip: clientIp, path: req.path });
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas requisições enviadas. Aguarde um minuto antes de tentar novamente.'
      }
    });
  }

  record.count += 1;
  return next();
}
