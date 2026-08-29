function requiredSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredProjectId(): string {
  const value = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!value) {
    throw new Error('FIREBASE_PROJECT_ID is required to initialize Firebase Admin SDK.');
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV?.trim() || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const corsOrigins = (process.env.CORS_ORIGINS || (isProduction ? '' : 'http://localhost:3000'))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (isProduction && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS is required in production.');
}

const paymentMode = process.env.PAYMENT_MODE?.trim() === 'live' ? 'live' : 'mock';

export const SERVER_CONFIG = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV,
  CORS_ORIGINS: corsOrigins,
  GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
  SUPABASE_URL: isProduction ? requiredSecret('SUPABASE_URL') : (process.env.SUPABASE_URL?.trim() || ''),
  SUPABASE_ANON_KEY: isProduction ? requiredSecret('SUPABASE_ANON_KEY') : (process.env.SUPABASE_ANON_KEY?.trim() || ''),
  FIREBASE_PROJECT_ID: isProduction || !isTest ? requiredProjectId() : (process.env.FIREBASE_PROJECT_ID?.trim() || ''),
  PAYMENT_MODE: paymentMode,
  STRIPE_WEBHOOK_SECRET: isProduction ? requiredSecret('STRIPE_WEBHOOK_SECRET') : (process.env.STRIPE_WEBHOOK_SECRET?.trim() || ''),
  PIX_WEBHOOK_SECRET: isProduction ? requiredSecret('PIX_WEBHOOK_SECRET') : (process.env.PIX_WEBHOOK_SECRET?.trim() || ''),
  TRUST_PROXY: process.env.TRUST_PROXY?.trim() === 'true',
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: Math.max(1, Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 30),
  MAX_PROMPT_LENGTH: Math.max(100, Number(process.env.MAX_PROMPT_LENGTH) || 4000),
};

if (isProduction && SERVER_CONFIG.PAYMENT_MODE !== 'live') {
  throw new Error('PAYMENT_MODE=live is required in production. Mock payment providers are disabled for safety.');
}

if (!Number.isFinite(SERVER_CONFIG.PORT) || SERVER_CONFIG.PORT < 1 || SERVER_CONFIG.PORT > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}

if (!Number.isFinite(SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS) || SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS < 1) {
  throw new Error('RATE_LIMIT_MAX_REQUESTS must be a positive number.');
}

if (!Number.isFinite(SERVER_CONFIG.MAX_PROMPT_LENGTH) || SERVER_CONFIG.MAX_PROMPT_LENGTH < 100) {
  throw new Error('MAX_PROMPT_LENGTH must be at least 100 characters.');
}
