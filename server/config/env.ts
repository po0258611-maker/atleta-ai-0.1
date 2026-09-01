import fs from 'fs';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV?.trim() || 'development';
const isProduction = NODE_ENV === 'production';

const defaultOrigins = isProduction
  ? ['https://ai.studio', 'https://aistudio.google.com']
  : ['http://localhost:3000', 'https://ai.studio', 'https://aistudio.google.com'];
const corsOrigins = (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : defaultOrigins)
  .map((s) => s.trim())
  .filter(Boolean);

const paymentMode = process.env.PAYMENT_MODE?.trim() === 'live' ? 'live' : 'mock';
const configuredPort = Number(process.env.PORT);
const port = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535 ? configuredPort : 3000;

function resolveFirebaseProjectId(): string {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed?.projectId && typeof parsed.projectId === 'string') return parsed.projectId.trim();
    }
  } catch {}
  return process.env.FIREBASE_PROJECT_ID?.trim() || '';
}

export const SERVER_CONFIG = {
  PORT: port,
  NODE_ENV,
  CORS_ORIGINS: corsOrigins,
  GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
  SUPABASE_URL: process.env.SUPABASE_URL?.trim() || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim() || '',
  FIREBASE_PROJECT_ID: resolveFirebaseProjectId(),
  PAYMENT_MODE: paymentMode,
  MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || '',
  MERCADOPAGO_ENV: (process.env.MERCADOPAGO_ENV?.trim() === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
  MERCADOPAGO_NOTIFICATION_URL: process.env.MERCADOPAGO_NOTIFICATION_URL?.trim() || '',
  MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET?.trim() || '',
  PIX_WEBHOOK_SECRET: process.env.PIX_WEBHOOK_SECRET?.trim() || '',
  TRUST_PROXY: process.env.TRUST_PROXY?.trim() === 'true',
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: Math.max(1, Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 300),
  MAX_PROMPT_LENGTH: Math.max(100, Number(process.env.MAX_PROMPT_LENGTH) || 4000),
};

export function validateProductionConfig(): void {
  if (!isProduction) return;

  const required: Record<string, string> = {
    PAYMENT_MODE: SERVER_CONFIG.PAYMENT_MODE,
    FIREBASE_PROJECT_ID: SERVER_CONFIG.FIREBASE_PROJECT_ID,
  };

  if (SERVER_CONFIG.PAYMENT_MODE === 'live') {
    required.MERCADOPAGO_ACCESS_TOKEN = SERVER_CONFIG.MERCADOPAGO_ACCESS_TOKEN;
    required.MERCADOPAGO_WEBHOOK_SECRET = SERVER_CONFIG.MERCADOPAGO_WEBHOOK_SECRET;
    required.MERCADOPAGO_NOTIFICATION_URL = SERVER_CONFIG.MERCADOPAGO_NOTIFICATION_URL;

    if (SERVER_CONFIG.MERCADOPAGO_ENV !== 'production') {
      throw new Error('MERCADOPAGO_ENV must be "production" when PAYMENT_MODE is "live" in production.');
    }
  }

  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`Invalid production configuration. Missing: ${missing.join(', ')}`);
  if (SERVER_CONFIG.PAYMENT_MODE !== 'live') throw new Error('PAYMENT_MODE must be "live" in production. Mock payment mode is forbidden.');
}
