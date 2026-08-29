import { rateLimiter } from '../middlewares/rateLimiter';
import { SERVER_CONFIG } from '../config/env';
import { callGeminiWithBackoff, isRateLimitError, generateAICoachResponse } from '../services/aiService';
import { AISecurityGuard } from '../services/aiSecurityGuard';
import { entitlementService } from '../services/entitlementService';
import { requireFeatureEntitlement } from '../middlewares/authorization';
import { setFirestoreAdapter, MemoryFirestoreAdapter } from '../repositories/firestoreAdapter';
import type { Request, Response } from 'express';

setFirestoreAdapter(new MemoryFirestoreAdapter());

function createMockReqRes(ip = '127.0.0.1', path = '/api/ai-coach', uid?: string) {
  const req: Partial<Request> = {
    ip,
    path,
    socket: { remoteAddress: ip } as any,
    athlete: uid ? { uid, role: 'ATHLETE' } : undefined,
  };

  const headers: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: any = null;

  const res: Partial<Response> = {
    setHeader: (key: string, value: string) => {
      headers[key.toLowerCase()] = value;
      return res as Response;
    },
    status: (code: number) => {
      statusCode = code;
      return res as Response;
    },
    json: (body: any) => {
      jsonBody = body;
      return res as Response;
    },
  };

  return { req: req as Request, res: res as Response, getHeaders: () => headers, getStatus: () => statusCode, getJson: () => jsonBody };
}

export async function runRateLimitDiagnosticTests() {
  console.log('\n===================================================================');
  console.log('   TREINO MAX — F3 RATE LIMIT & DIAGNOSTIC TEST SUITE              ');
  console.log('===================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    total++;
    if (!condition) {
      console.error(`❌ FALHA: ${name} ${detail ? `(${detail})` : ''}`);
      throw new Error(`Test failed: ${name}`);
    }
    passed++;
    console.log(`✓ [${passed}] ${name}`);
  }

  // 1. Rate Limit Isolado por IP
  {
    const ipA = '192.168.1.100';
    const ipB = '10.0.0.5';

    // Reach max requests for IP A
    for (let i = 0; i < SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS; i++) {
      const mock = createMockReqRes(ipA);
      let nextCalled = false;
      rateLimiter(mock.req, mock.res, () => { nextCalled = true; });
      assert(nextCalled, `RateLimit IP A request #${i + 1} passed`);
    }

    // Next request for IP A should be blocked
    const mockA = createMockReqRes(ipA);
    let nextCalledA = false;
    rateLimiter(mockA.req, mockA.res, () => { nextCalledA = true; });
    assert(!nextCalledA, 'RateLimit IP A blocked on max limit exceeded');
    assert(mockA.getStatus() === 429, 'RateLimit IP A returns HTTP 429');

    // Request for IP B should still be allowed (IP Isolation)
    const mockB = createMockReqRes(ipB);
    let nextCalledB = false;
    rateLimiter(mockB.req, mockB.res, () => { nextCalledB = true; });
    assert(nextCalledB, 'RateLimit IP B allowed independently (IP Isolation)');
  }

  // 2. Rate Limit Isolado por Usuário Autenticado
  {
    const uid1 = `usr_test_rate_1_${Date.now()}`;
    const uid2 = `usr_test_rate_2_${Date.now()}`;

    // Entitlement/Quota isolation per UID
    const eval1 = await entitlementService.consumeFeature(uid1, 'AI_COACH_MESSAGES');
    const eval2 = await entitlementService.consumeFeature(uid2, 'AI_COACH_MESSAGES');

    assert(eval1.granted === true, 'Entitlement granted for UID 1 independently');
    assert(eval2.granted === true, 'Entitlement granted for UID 2 independently');
  }

  // 3. Exceder limite e receber HTTP 429 com cabeçalho Retry-After
  {
    const testIp = `172.16.0.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS; i++) {
      const mock = createMockReqRes(testIp);
      rateLimiter(mock.req, mock.res, () => {});
    }

    const blocked = createMockReqRes(testIp);
    rateLimiter(blocked.req, blocked.res, () => {});

    assert(blocked.getStatus() === 429, 'HTTP 429 status returned when rate limit exceeded');
    const headers = blocked.getHeaders();
    assert(headers['retry-after'] !== undefined, 'Retry-After header present in 429 response');
    const retrySec = parseInt(headers['retry-after'], 10);
    assert(!isNaN(retrySec) && retrySec > 0, 'Retry-After header contains valid positive integer seconds');
  }

  // 4. Formato de resposta em erro HTTP 429
  {
    const testIp = `172.16.1.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS; i++) {
      const mock = createMockReqRes(testIp);
      rateLimiter(mock.req, mock.res, () => {});
    }

    const blocked = createMockReqRes(testIp);
    rateLimiter(blocked.req, blocked.res, () => {});

    const json = blocked.getJson();
    assert(json.success === false, '429 payload has success: false');
    assert(json.error?.code === 'RATE_LIMIT_EXCEEDED', '429 payload has error.code = RATE_LIMIT_EXCEEDED');
    assert(typeof json.error?.message === 'string', '429 payload has error.message string');
    assert(typeof json.retryAfter === 'number' && json.retryAfter > 0, '429 payload contains numeric retryAfter');
  }

  // 5. Exponential Backoff e Jitter na Chamada de IA
  {
    let attempts = 0;
    const mockCall = async () => {
      attempts++;
      if (attempts < 3) {
        const err: any = new Error('429 RESOURCE_EXHAUSTED rate limit');
        err.status = 429;
        throw err;
      }
      return 'AI Response Success';
    };

    const startTime = Date.now();
    const result = await callGeminiWithBackoff(mockCall, 3, 50);
    const elapsed = Date.now() - startTime;

    assert(attempts === 3, 'callGeminiWithBackoff retried until success on attempt 3');
    assert(result === 'AI Response Success', 'callGeminiWithBackoff returned final result after retries');
    assert(elapsed >= 100, 'Exponential backoff delays were applied between attempts');
  }

  // 6. Verificação de Quota ANTES da Chamada Externa de IA
  {
    const uidQuotaExhausted = `usr_exhausted_${Date.now()}`;
    // Exhaust quota (e.g. 10 messages for FREE plan)
    for (let i = 0; i < 10; i++) {
      await entitlementService.consumeFeature(uidQuotaExhausted, 'AI_COACH_MESSAGES');
    }

    const middleware = requireFeatureEntitlement('AI_COACH_MESSAGES');
    const mock = createMockReqRes('127.0.0.1', '/api/ai-coach', uidQuotaExhausted);

    let nextCalled = false;
    await middleware(mock.req, mock.res, () => { nextCalled = true; });

    assert(!nextCalled, 'requireFeatureEntitlement blocks before reaching controller/Gemini API when quota exhausted');
    assert(mock.getStatus() === 403, 'requireFeatureEntitlement returns HTTP 403 for quota exhaustion');
    assert(mock.getJson().error?.code === 'MONTHLY_QUOTA_EXCEEDED', 'Returns MONTHLY_QUOTA_EXCEEDED error code');
  }

  // 7. Fallback Seguro Sem Expor Dados Sensíveis
  {
    const reply = await generateAICoachResponse('Como treinar hipertrofia?');
    assert(typeof reply === 'string' && reply.length > 50, 'generateAICoachResponse provides structured response on rate limit/fallback');
    const secretScan = AISecurityGuard.validateAIResponse(reply);
    assert(secretScan.isValid === true, 'Fallback response is sanitized and free of secret leakage');
  }

  // 8. Detection of Rate Limit Error Helper
  {
    const err429: any = new Error('Resource exhausted rate limit 429');
    err429.status = 429;
    assert(isRateLimitError(err429) === true, 'isRateLimitError identifies HTTP 429 status correctly');

    const errQuota = new Error('Quota exceeded for AI model');
    assert(isRateLimitError(errQuota) === true, 'isRateLimitError identifies Quota exceeded message correctly');

    const err500 = new Error('Internal Server Error');
    assert(isRateLimitError(err500) === false, 'isRateLimitError returns false for generic 500 error');
  }

  console.log('\n===================================================================');
  console.log(`   DIAGNOSTIC RESULT: ${passed}/${total} TESTS PASSED (100%)       `);
  console.log('===================================================================\n');
}

if (process.argv[1]?.endsWith('rateLimitDiagnostic.test.ts')) {
  runRateLimitDiagnosticTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
