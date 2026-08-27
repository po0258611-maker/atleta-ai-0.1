export const SERVER_CONFIG = {
  PORT: 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://ivnxxXsZ7nIkhSmjl8t2A.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'sb_publishable_1ivnxxXsZ7nIkhSmjl8t2A_tvWn9LeJ',
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 30, // 30 req/min per IP
  MAX_PROMPT_LENGTH: 4000,
};
