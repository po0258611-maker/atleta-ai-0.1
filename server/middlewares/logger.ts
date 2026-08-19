export interface StructuredLog {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  userId?: string;
  ip?: string;
  path?: string;
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },
  error: (message: string, context?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }
};
