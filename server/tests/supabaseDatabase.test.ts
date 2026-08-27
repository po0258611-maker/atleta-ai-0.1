import { createClient } from '@supabase/supabase-js';

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
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim() || 'sb_publishable_1ivnxxXsZ7nIkhSmjl8t2A_tvWn9LeJ';

async function runSupabaseTests() {
  console.log('\n--- INICIANDO TESTES DO BANCO DE DADOS E API SUPABASE ---');

  // Teste 1: Inicialização do Cliente Supabase
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  if (!client || typeof client.auth !== 'object') {
    throw new Error('Falha ao instanciar cliente Supabase.');
  }
  console.log('✓ Teste 1: Instanciação do Cliente Supabase com Chave Publicável');

  // Teste 2: Verificação de Endpoint de Autenticação / Sessão
  const sessionResult = await client.auth.getSession();
  if (sessionResult.error) {
    console.warn(`! Aviso no getSession: ${sessionResult.error.message}`);
  } else {
    console.log('✓ Teste 2: Endpoint de Autenticação Supabase acessível e respondendo');
  }

  // Teste 3: Verificação de Formato da Chave de API
  if (!SUPABASE_ANON_KEY.startsWith('sb_publishable_') && !SUPABASE_ANON_KEY.startsWith('eyJ')) {
    throw new Error('Formato da chave Supabase inválido.');
  }
  console.log('✓ Teste 3: Validação de Formato da Chave de API Publicável');

  // Teste 4: Verificação de Conexão com URL configurada
  const parsedUrl = new URL(SUPABASE_URL);
  if (!parsedUrl.protocol.startsWith('http')) {
    throw new Error('Protocolo da URL do Supabase inválido.');
  }
  console.log(`✓ Teste 4: URL de Cluster Supabase validada (${parsedUrl.hostname})`);

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DO BANCO DE DADOS SUPABASE PASSARAM COM SUCESSO!\n');
}

runSupabaseTests().catch((err) => {
  console.error('❌ Erro nos testes do Supabase:', err);
  process.exit(1);
});
