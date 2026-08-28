function requiredSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === 'production';

export const SERVER_CONFIG = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
  SUPABASE_URL: isProduction ? requiredSecret('SUPABASE_URL') : (process.env.SUPABASE_URL?.trim() || ''),
  SUPABASE_ANON_KEY: isProduction ? requiredSecret('SUPABASE_ANON_KEY') : (process.env.SUPABASE_ANON_KEY?.trim() || ''),
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID?.trim() || '',
  PAYMENT_MODE: process.env.PAYMENT_MODE === 'live' ? 'live' : 'mock',
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 30),
  MAX_PROMPT_LENGTH: Number(process.env.MAX_PROMPT_LENGTH || 4000),
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
