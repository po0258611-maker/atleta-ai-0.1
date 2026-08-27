import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const databaseRouter = Router();

function sanitizeSupabaseUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return 'https://ivnxxXsZ7nIkhSmjl8t2A.supabase.co';
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

const SUPABASE_URL = sanitizeSupabaseUrl(process.env.SUPABASE_URL);
const SUPABASE_KEY = (process.env.SUPABASE_ANON_KEY || '').trim() || 'sb_publishable_1ivnxxXsZ7nIkhSmjl8t2A_tvWn9LeJ';

function getSupabaseServer() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

databaseRouter.get('/status', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const client = getSupabaseServer();
    const { error } = await client.auth.getSession();
    const latency = Date.now() - startTime;

    if (error) {
      return res.status(200).json({
        provider: 'Supabase',
        connected: false,
        url: SUPABASE_URL,
        message: error.message,
        latencyMs: latency,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      provider: 'Supabase',
      connected: true,
      url: SUPABASE_URL,
      publishableKeyMasked: `${SUPABASE_KEY.slice(0, 14)}...${SUPABASE_KEY.slice(-6)}`,
      message: 'Banco de Dados e API Supabase conectados com sucesso.',
      latencyMs: latency,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno';
    return res.status(500).json({
      provider: 'Supabase',
      connected: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }
});
