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
  SUPABASE_URL: isProduction ? requiredSecret('SUPABASE_URL') : (process.env.SUPABASE_URL || ''),
  SUPABASE_ANON_KEY: isProduction ? requiredSecret('SUPABASE_ANON_KEY') : (process.env.SUPABASE_ANON_KEY || ''),
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 30),
  MAX_PROMPT_LENGTH: Number(process.env.MAX_PROMPT_LENGTH || 4000),
};
