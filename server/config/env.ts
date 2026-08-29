const NODE_ENV = process.env.NODE_ENV?.trim() || 'development';
const isProduction = NODE_ENV === 'production';

const defaultOrigins = isProduction ? [] : ['http://localhost:3000', 'https://ai.studio', 'https://aistudio.google.com'];
const corsOrigins = (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : defaultOrigins)
  .map((s) => s.trim()).filter(Boolean);

const paymentMode = process.env.PAYMENT_MODE?.trim() === 'live' ? 'live' : 'mock';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';
const pixWebhookSecret = process.env.PIX_WEBHOOK_SECRET?.trim() || '';

const appVersion = process.env.APP_VERSION?.trim() || '2.6.0';

if (isProduction) {
  if (corsOrigins.length === 0) throw new Error('CORS_ORIGINS é obrigatório em produção.');
  if (!process.env.FIREBASE_PROJECT_ID?.trim()) throw new Error('FIREBASE_PROJECT_ID é obrigatório em produção.');
  if (!process.env.GEMINI_API_KEY?.trim()) throw new Error('GEMINI_API_KEY é obrigatório em produção.');
  if (paymentMode === 'live' && (!stripeWebhookSecret || !pixWebhookSecret)) {
    throw new Error('STRIPE_WEBHOOK_SECRET e PIX_WEBHOOK_SECRET são obrigatórios quando PAYMENT_MODE=live.');
  }
}

export const SERVER_CONFIG = {
  PORT: Math.max(1, Number(process.env.PORT) || 3000),
  NODE_ENV,
  APP_VERSION: appVersion,
  CORS_ORIGINS: corsOrigins,
  GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
  SUPABASE_URL: process.env.SUPABASE_URL?.trim() || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim() || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID?.trim() || '',
  PAYMENT_MODE: paymentMode,
  STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
  PIX_WEBHOOK_SECRET: pixWebhookSecret,
  TRUST_PROXY: process.env.TRUST_PROXY?.trim() === 'true',
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: Math.max(1, Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 30),
  MAX_PROMPT_LENGTH: Math.max(100, Number(process.env.MAX_PROMPT_LENGTH) || 4000),
};
