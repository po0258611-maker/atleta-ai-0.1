import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface ApiError extends Error {
  statusCode?: number;
  status?: number;
  code?: string;
  isOperational?: boolean;
}

// Conjunto de códigos de erro estáveis e conhecidos que podem ter mensagens controladas
const KNOWN_SAFE_STATUS_MESSAGES: Record<number, { code: string; defaultMessage: string }> = {
  400: { code: 'BAD_REQUEST', defaultMessage: 'Requisição inválida.' },
  401: { code: 'UNAUTHORIZED', defaultMessage: 'Autenticação necessária.' },
  403: { code: 'FORBIDDEN', defaultMessage: 'Acesso negado.' },
  404: { code: 'NOT_FOUND', defaultMessage: 'Recurso não encontrado.' },
  409: { code: 'CONFLICT', defaultMessage: 'Conflito com o estado atual do recurso.' },
  422: { code: 'UNPROCESSABLE_ENTITY', defaultMessage: 'Entidade não processável.' },
  429: { code: 'RATE_LIMIT_EXCEEDED', defaultMessage: 'Limite de requisições excedido. Tente novamente mais tarde.' },
  503: { code: 'SERVICE_UNAVAILABLE', defaultMessage: 'Serviço temporariamente indisponível.' },
};

// Padrões de dados sensíveis ou informações internas que NUNCA devem ir para a resposta pública
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /token/i,
  /bearer/i,
  /credential/i,
  /firestore/i,
  /database/i,
  /postgres/i,
  /supabase/i,
  /column/i,
  /table/i,
  /node_modules/i,
  /\.ts:\d+/i,
  /\.js:\d+/i,
  /\/app\//i,
  /\/home\//i,
  /at\s+[a-zA-Z0-9_.]+\s+\(/i, // Stack trace lines
];

function isSafeErrorMessage(msg: string | undefined): boolean {
  if (!msg || typeof msg !== 'string') return false;
  if (msg.length > 300) return false;
  // Se contiver qualquer indicador de stack trace ou dados sensíveis, não é seguro
  return !SENSITIVE_PATTERNS.some((pattern) => pattern.test(msg));
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const rawStatus = err.statusCode ?? err.status;
  const statusCode = typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
  const fallback = KNOWN_SAFE_STATUS_MESSAGES[statusCode] || {
    code: 'INTERNAL_SERVER_ERROR',
    defaultMessage: 'Ocorreu um erro interno no servidor.',
  };

  // Erros 5xx ou desconhecidos são sempre mascarados com mensagens genéricas seguras
  const isClientSafeStatus = statusCode >= 400 && statusCode < 500;
  const rawCode = err.code && typeof err.code === 'string' && /^[A-Z0-9_]+$/.test(err.code) ? err.code : fallback.code;

  let publicMessage = fallback.defaultMessage;
  if (isClientSafeStatus) {
    if (isSafeErrorMessage(err.message)) {
      publicMessage = err.message;
    } else {
      publicMessage = fallback.defaultMessage;
    }
  } else {
    // 5xx é sempre genérico
    publicMessage = 'Ocorreu um erro interno no servidor.';
  }

  // Log detalhado interno (mantém rastreabilidade para os desenvolvedores)
  logger.error('Unhandled or Handled API Error in pipeline', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    statusCode,
    errorCode: rawCode,
    errorMessage: err.message,
    stack: err.stack,
  });

  return res.status(statusCode).json({
    error: {
      code: rawCode,
      message: publicMessage,
    },
  });
}

