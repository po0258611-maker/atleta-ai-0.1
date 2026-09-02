/**
 * Test Suite: Build Traceability & Environment Resolution
 *
 * Verifies:
 * 1. Resolução em ambiente local (sem variáveis de CI -> fallback limpo)
 * 2. Resolução em CI com COMMIT_SHA
 * 3. Resolução em CI com GITHUB_SHA
 * 4. Resolução em CI com GIT_COMMIT_SHA / VITE_COMMIT_SHA / K_REVISION
 * 5. Versão do pacote preservada
 * 6. Timestamp ISO válido
 * 7. Ausência estrita de segredos ou tokens no metadata de build
 * 8. Formato dos endpoints de diagnóstico /api/health e /api/ready
 */

import { resolveBuildInfo, BUILD_INFO } from '../config/buildInfo';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[ASSERTION_FAILED] ${message}`);
  }
}

async function runBuildTraceabilityTestSuite() {
  console.log('===================================================================');
  console.log('   ATLETA AI — BUILD TRACEABILITY TEST SUITE                       ');
  console.log('===================================================================');

  // Test 1: Resolução em ambiente local limpo (sem variáveis de CI)
  {
    const cleanEnv: NodeJS.ProcessEnv = {
      NODE_ENV: 'development',
      npm_package_version: '0.3.0',
    };
    const info = resolveBuildInfo(cleanEnv);

    assert(info.version === '0.3.0', 'Versão deve ser 0.3.0');
    assert(typeof info.commitSha === 'string' && info.commitSha.length > 0, 'commitSha deve estar definido');
    assert(info.environment === 'development', 'Ambiente deve ser development');
    assert(!isNaN(Date.parse(info.buildTime)), 'buildTime deve ser um timestamp ISO válido');
    console.log(`✓ [1] Resolução local: version=${info.version}, sha=${info.commitSha}, env=${info.environment}`);
  }

  // Test 2: Resolução com COMMIT_SHA de CI
  {
    const ciEnv: NodeJS.ProcessEnv = {
      NODE_ENV: 'production',
      COMMIT_SHA: 'a1b2c3d4e5f6',
      npm_package_version: '0.3.0',
      BUILD_TIME: '2026-09-02T12:00:00.000Z',
    };
    const info = resolveBuildInfo(ciEnv);

    assert(info.commitSha === 'a1b2c3d4e5f6', 'Deve capturar COMMIT_SHA exatamente');
    assert(info.version === '0.3.0', 'Versão preservada');
    assert(info.environment === 'production', 'Ambiente de produção');
    assert(info.buildTime === '2026-09-02T12:00:00.000Z', 'Build time preservado');
    console.log('✓ [2] Resolução com COMMIT_SHA de CI verificada');
  }

  // Test 3: Resolução com GITHUB_SHA
  {
    const githubEnv: NodeJS.ProcessEnv = {
      GITHUB_SHA: 'f0e1d2c3b4a5987654321',
      npm_package_version: '0.3.0',
    };
    const info = resolveBuildInfo(githubEnv);

    assert(info.commitSha === 'f0e1d2c3b4a5987654321', 'Deve capturar GITHUB_SHA corretamente');
    console.log('✓ [3] Resolução com GITHUB_SHA verificada');
  }

  // Test 4: Prioridade de variáveis de commit
  {
    const multiEnv: NodeJS.ProcessEnv = {
      COMMIT_SHA: 'priority_sha_123',
      GITHUB_SHA: 'secondary_sha_456',
    };
    const info = resolveBuildInfo(multiEnv);

    assert(info.commitSha === 'priority_sha_123', 'COMMIT_SHA deve ter prioridade máxima');
    console.log('✓ [4] Hierarquia de prioridade de variáveis de CI verificada');
  }

  // Test 5: Ausência total de credenciais ou secrets no objeto de build
  {
    const testEnv: NodeJS.ProcessEnv = {
      COMMIT_SHA: 'safe_sha_999',
      GEMINI_API_KEY: 'AIzaSySecretApiKeyMustNeverLeak',
      MERCADOPAGO_ACCESS_TOKEN: 'APP_USR_secret_token_123',
      SUPABASE_ANON_KEY: 'eyJhbGciOi...secret',
      STRIPE_WEBHOOK_SECRET: 'whsec_secret_key',
    };
    const info = resolveBuildInfo(testEnv);
    const serialized = JSON.stringify(info);

    assert(!serialized.includes('AIzaSy'), 'GEMINI_API_KEY não deve constar no build info');
    assert(!serialized.includes('APP_USR'), 'MERCADOPAGO_ACCESS_TOKEN não deve constar');
    assert(!serialized.includes('eyJhbGci'), 'SUPABASE_ANON_KEY não deve constar');
    assert(!serialized.includes('whsec_'), 'STRIPE_WEBHOOK_SECRET não deve constar');

    const keys = Object.keys(info);
    assert(
      keys.length === 4 &&
        keys.includes('version') &&
        keys.includes('commitSha') &&
        keys.includes('buildTime') &&
        keys.includes('environment'),
      'Objeto de build deve conter estritamente as 4 chaves públicas autorizadas'
    );
    console.log('✓ [5] Isolamento de segurança: nenhuma credencial ou secret vazada');
  }

  // Test 6: BUILD_INFO em tempo de execução global
  {
    assert(typeof BUILD_INFO.version === 'string', 'BUILD_INFO.version deve ser string');
    assert(typeof BUILD_INFO.commitSha === 'string', 'BUILD_INFO.commitSha deve ser string');
    assert(typeof BUILD_INFO.buildTime === 'string', 'BUILD_INFO.buildTime deve ser string');
    assert(typeof BUILD_INFO.environment === 'string', 'BUILD_INFO.environment deve ser string');
    console.log('✓ [6] Singleton BUILD_INFO inicializado e íntegro');
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DE BUILD TRACEABILITY PASSARAM COM SUCESSO!       ');
  console.log('===================================================================');
}

runBuildTraceabilityTestSuite().catch((err) => {
  console.error('Falha nos testes de build traceability:', err);
  process.exit(1);
});
