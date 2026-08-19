import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  // Sanitized logging without exposing secrets or credentials
  logger.error('Unhandled API Error', {
    path: req.path,
    method: req.method,
    statusCode,
    errorCode,
    errorMessage: err.message
  });

  return res.status(statusCode).json({
    error: {
      code: errorCode,
      message: statusCode === 500 ? 'Ocorreu um erro interno no servidor.' : err.message
    }
  });
}
