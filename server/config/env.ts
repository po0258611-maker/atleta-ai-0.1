const NODE_ENV = process.env.NODE_ENV?.trim() || 'development';
const isProduction = NODE_ENV === 'production';

const defaultOrigins = isProduction
  ? ['https://ai.studio', 'https://aistudio.google.com']
  : ['http://localhost:3000', 'https://ai.studio', 'https://aistudio.google.com'];
const corsOrigins = (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : defaultOrigins)
  .map((s) => s.trim())
  .filter(Boolean);

const paymentMode = process.env.PAYMENT_MODE?.trim() === 'live' ? 'live' : 'mock';

export const SERVER_CONFIG = {
  PORT: 3000,
  NODE_ENV,
  CORS_ORIGINS: corsOrigins,
  GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
  SUPABASE_URL: process.env.SUPABASE_URL?.trim() || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim() || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID?.trim() || 'storied-cable-xn50x',
  PAYMENT_MODE: paymentMode,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET?.trim() || 'whsec_test_stripe_secret_key_athleta_ai_2026',
  PIX_WEBHOOK_SECRET: process.env.PIX_WEBHOOK_SECRET?.trim() || 'pix_whsec_test_secret_athleta_ai_2026',
  TRUST_PROXY: process.env.TRUST_PROXY?.trim() === 'true',
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: Math.max(1, Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 300),
  MAX_PROMPT_LENGTH: Math.max(100, Number(process.env.MAX_PROMPT_LENGTH) || 4000),
};

