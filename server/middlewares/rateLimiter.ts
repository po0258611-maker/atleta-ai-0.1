import type { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../config/env';
import { logger } from './logger';

interface RateLimitRecord { count: number; resetTime: number; }
const requestMap = new Map<string, RateLimitRecord>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestMap.entries()) if (now > record.resetTime) requestMap.delete(key);
}, 5 * 60 * 1000);
cleanupTimer.unref?.();

function getClientIp(req: Request): string { return req.ip || req.socket.remoteAddress || 'unknown-ip'; }

function getRateLimitKey(req: Request): string {
  const athlete = req.athlete;
  const uid = athlete?.uid;
  const identity = uid ? `user:${uid}` : `ip:${getClientIp(req)}`;
  return `${identity}:${req.method}:${req.baseUrl || ''}${req.path}`;
}

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = getRateLimitKey(req);
  const now = Date.now();
  const record = requestMap.get(key);
  if (!record || now > record.resetTime) {
    requestMap.set(key, { count: 1, resetTime: now + SERVER_CONFIG.RATE_LIMIT_WINDOW_MS });
    return next();
  }
  if (record.count >= SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    logger.warn('Rate limit exceeded', { path: req.path, status: 429, retryAfter: retryAfterSeconds });
    return res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Muitas solicitações enviadas. Aguarde um instante antes de tentar novamente.', retryAfter: retryAfterSeconds }, retryAfter: retryAfterSeconds });
  }
  record.count += 1;
  return next();
}
