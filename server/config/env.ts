function requiredSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function positiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === 'production';

const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() || '';
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || '';

if (isProduction && !firebaseProjectId) {
  throw new Error('FIREBASE_PROJECT_ID is required in production.');
}

export const SERVER_CONFIG = {
  PORT: positiveNumber('PORT', 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || 'gemini-3.7-flash',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
  SUPABASE_URL: isProduction ? requiredSecret('SUPABASE_URL') : supabaseUrl,
  SUPABASE_ANON_KEY: isProduction ? requiredSecret('SUPABASE_ANON_KEY') : supabaseAnonKey,
  FIREBASE_PROJECT_ID: firebaseProjectId,
  PAYMENT_MODE: process.env.PAYMENT_MODE === 'live' ? 'live' : 'mock',
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: positiveNumber('RATE_LIMIT_MAX_REQUESTS', 30),
  MAX_PROMPT_LENGTH: positiveNumber('MAX_PROMPT_LENGTH', 4000),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

if (isProduction && SERVER_CONFIG.PAYMENT_MODE !== 'live') {
  throw new Error('PAYMENT_MODE=live is required in production. Mock payment providers are disabled for safety.');
}

if (SERVER_CONFIG.MAX_PROMPT_LENGTH < 100) {
  throw new Error('MAX_PROMPT_LENGTH must be at least 100 characters.');
}
