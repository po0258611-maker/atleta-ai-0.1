import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const databaseRouter = Router();

function getSupabaseServer() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_ANON_KEY || '').trim();

  if (!url || !key) {
    throw new Error('Supabase server configuration is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

databaseRouter.get('/status', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const client = getSupabaseServer();
    const { error } = await client.from('profiles').select('id', { head: true, count: 'exact' });
    const latency = Date.now() - startTime;

    if (error) {
      return res.status(503).json({
        provider: 'Supabase',
        connected: false,
        message: 'Supabase is not ready.',
        latencyMs: latency,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      provider: 'Supabase',
      connected: true,
      message: 'Supabase database connection is healthy.',
      latencyMs: latency,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal configuration error';
    return res.status(503).json({
      provider: 'Supabase',
      connected: false,
      error: process.env.NODE_ENV === 'production' ? 'Database configuration unavailable.' : errorMsg,
      timestamp: new Date().toISOString(),
    });
  }
});
