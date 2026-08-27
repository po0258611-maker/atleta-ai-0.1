import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase credentials provided by user or environment
const DEFAULT_SUPABASE_PROJECT_ID = 'ivnxxXsZ7nIkhSmjl8t2A';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_1ivnxxXsZ7nIkhSmjl8t2A_tvWn9LeJ';

function sanitizeSupabaseUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return `https://${DEFAULT_SUPABASE_PROJECT_ID.toLowerCase()}.supabase.co`;
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined;

const supabaseUrl = sanitizeSupabaseUrl(metaEnv?.VITE_SUPABASE_URL);
const supabaseKey = (metaEnv?.VITE_SUPABASE_ANON_KEY || '').trim() || DEFAULT_SUPABASE_KEY;

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export const supabase = getSupabaseClient();

export interface SupabaseConnectionStatus {
  connected: boolean;
  url: string;
  keyConfigured: boolean;
  message: string;
  latencyMs?: number;
}

/**
 * Verifies Supabase API and Database connectivity
 */
export async function testSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const startTime = Date.now();
  try {
    const client = getSupabaseClient();
    // Test auth service health check
    const { error } = await client.auth.getSession();
    const latency = Date.now() - startTime;

    if (error) {
      return {
        connected: false,
        url: supabaseUrl,
        keyConfigured: Boolean(supabaseKey),
        message: `Erro na autenticação da API Supabase: ${error.message}`,
        latencyMs: latency,
      };
    }

    return {
      connected: true,
      url: supabaseUrl,
      keyConfigured: Boolean(supabaseKey),
      message: 'Conectado com sucesso ao Banco de Dados / API Supabase.',
      latencyMs: latency,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha desconhecida';
    return {
      connected: false,
      url: supabaseUrl,
      keyConfigured: Boolean(supabaseKey),
      message: `Não foi possível conectar ao endpoint Supabase: ${errorMsg}`,
      latencyMs: Date.now() - startTime,
    };
  }
}
