import { createClient, SupabaseClient } from '@supabase/supabase-js';

function sanitizeSupabaseUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return '';
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

const metaEnv = typeof import.meta !== 'undefined'
  ? (import.meta as unknown as { env?: Record<string, string> }).env
  : undefined;

const supabaseUrl = sanitizeSupabaseUrl(metaEnv?.VITE_SUPABASE_URL);
const supabaseKey = (metaEnv?.VITE_SUPABASE_ANON_KEY || '').trim();

function assertSupabaseConfig(): void {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente do frontend.'
    );
  }
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  assertSupabaseConfig();

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
 * Verifies Supabase API and authentication connectivity.
 */
export async function testSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const startTime = Date.now();

  if (!supabaseUrl || !supabaseKey) {
    return {
      connected: false,
      url: supabaseUrl,
      keyConfigured: false,
      message: 'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.getSession();
    const latency = Date.now() - startTime;

    if (error) {
      return {
        connected: false,
        url: supabaseUrl,
        keyConfigured: true,
        message: `Erro na autenticação da API Supabase: ${error.message}`,
        latencyMs: latency,
      };
    }

    return {
      connected: true,
      url: supabaseUrl,
      keyConfigured: true,
      message: 'Conectado com sucesso ao Supabase.',
      latencyMs: latency,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha desconhecida';
    return {
      connected: false,
      url: supabaseUrl,
      keyConfigured: true,
      message: `Não foi possível conectar ao endpoint Supabase: ${errorMsg}`,
      latencyMs: Date.now() - startTime,
    };
  }
}
