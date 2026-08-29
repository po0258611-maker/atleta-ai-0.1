const NODE_ENV = process.env.NODE_ENV?.trim() || 'development';
const isProduction = NODE_ENV === 'production';

// Same-origin deployments do not need CORS_ORIGINS. Cross-origin browser
// access is allowed only for explicitly configured origins in server.ts.
const defaultOrigins = isProduction
  ? []
  : ['http://localhost:3000', 'https://ai.studio', 'https://aistudio.google.com'];
const corsOrigins = (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : defaultOrigins)
  .map((s) => s.trim()).filter(Boolean);

/**
 * Optional runtime environment access.
 *
 * AI Studio prompts for environment variables that it can statically associate
 * with direct process.env.PROPERTY accesses. These values are deliberately
 * optional until the corresponding feature is enabled, so read them through
 * one typed helper instead of making them startup requirements.
 */
function readOptionalEnv(name: string): string {
  return process.env[name]?.trim() || '';
}

// Payment configuration is intentionally preserved. Live payment processing is
// opt-in and remains disabled unless explicitly configured with PAYMENT_MODE=live.
const paymentMode = readOptionalEnv('PAYMENT_MODE') === 'live' ? 'live' : 'mock';
const stripeWebhookSecret = readOptionalEnv('STRIPE_WEBHOOK_SECRET');
const pixWebhookSecret = readOptionalEnv('PIX_WEBHOOK_SECRET');

const appVersion = readOptionalEnv('APP_VERSION') || '2.6.0';

if (isProduction && paymentMode === 'live' && (!stripeWebhookSecret || !pixWebhookSecret)) {
  throw new Error('STRIPE_WEBHOOK_SECRET e PIX_WEBHOOK_SECRET são obrigatórios quando PAYMENT_MODE=live.');
}

export const SERVER_CONFIG = {
  PORT: Math.max(1, Number(process.env.PORT) || 3000),
  NODE_ENV,
  APP_VERSION: appVersion,
  CORS_ORIGINS: corsOrigins,
  GEMINI_MODEL: readOptionalEnv('GEMINI_MODEL') || 'gemini-2.5-flash',
  GEMINI_API_KEY: readOptionalEnv('GEMINI_API_KEY'),
  SUPABASE_URL: readOptionalEnv('SUPABASE_URL'),
  SUPABASE_ANON_KEY: readOptionalEnv('SUPABASE_ANON_KEY'),
  FIREBASE_PROJECT_ID: readOptionalEnv('FIREBASE_PROJECT_ID'),
  PAYMENT_MODE: paymentMode,
  STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
  PIX_WEBHOOK_SECRET: pixWebhookSecret,
  TRUST_PROXY: readOptionalEnv('TRUST_PROXY') === 'true',
  FIRESTORE_ALLOW_MEMORY_FALLBACK: !isProduction && readOptionalEnv('FIRESTORE_ALLOW_MEMORY_FALLBACK') === 'true',
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: Math.max(1, Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 30),
  MAX_PROMPT_LENGTH: Math.max(100, Number(process.env.MAX_PROMPT_LENGTH) || 4000),
};
