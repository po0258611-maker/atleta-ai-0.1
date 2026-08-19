export const SERVER_CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 30, // 30 req/min per IP
  MAX_PROMPT_LENGTH: 4000,
};
