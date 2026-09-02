import type { Request, Response } from 'express';
import { SERVER_CONFIG } from '../config/env';
import { aiIpRateLimiter, aiUserRateLimiter } from '../middlewares/aiRateLimiter';

function mock(ip: string, uid?: string) {
  const req = {
    ip,
    path: '/api/ai-coach',
    socket: { remoteAddress: ip },
    athlete: uid ? { uid, role: 'ATHLETE' } : undefined,
  } as unknown as Request;

  const headers: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: unknown = null;
  const res = {
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(body: unknown) {
      jsonBody = body;
      return res;
    },
  } as unknown as Response;

  return { req, res, headers, getStatus: () => statusCode, getJson: () => jsonBody };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const ipA = `198.51.100.10-${Date.now()}`;
  const ipB = `198.51.100.11-${Date.now()}`;

  for (let i = 0; i < SERVER_CONFIG.RATE_LIMIT_MAX_REQUESTS; i++) {
    const r = mock(ipA);
    let next = false;
    aiIpRateLimiter(r.req, r.res, () => { next = true; });
    assert(next, `IP request ${i + 1} should pass`);
  }

  const blockedIp = mock(ipA);
  let ipNext = false;
  aiIpRateLimiter(blockedIp.req, blockedIp.res, () => { ipNext = true; });
  assert(!ipNext, 'IP limiter must block after configured IP limit');
  assert(blockedIp.getStatus() === 429, 'IP limiter must return 429');
  assert(Number(blockedIp.headers['retry-after']) > 0, 'IP limiter must expose positive Retry-After');
  assert((blockedIp.getJson() as any)?.error?.scope === 'ip', 'IP limiter must identify the scope');

  const otherIp = mock(ipB);
  let otherNext = false;
  aiIpRateLimiter(otherIp.req, otherIp.res, () => { otherNext = true; });
  assert(otherNext, 'A different IP must have an independent budget');

  const uidA = `uid-rate-a-${Date.now()}`;
  const uidB = `uid-rate-b-${Date.now()}`;

  for (let i = 0; i < SERVER_CONFIG.AI_RATE_LIMIT_MAX_REQUESTS; i++) {
    const r = mock('203.0.113.10', uidA);
    let next = false;
    aiUserRateLimiter(r.req, r.res, () => { next = true; });
    assert(next, `User A request ${i + 1} should pass`);
  }

  const blockedUser = mock('203.0.113.10', uidA);
  let blockedNext = false;
  aiUserRateLimiter(blockedUser.req, blockedUser.res, () => { blockedNext = true; });
  assert(!blockedNext, 'Authenticated user limiter must block after AI limit');
  assert(blockedUser.getStatus() === 429, 'Authenticated user limiter must return 429');
  assert((blockedUser.getJson() as any)?.error?.scope === 'user', 'User limiter must identify the scope');

  const independentUser = mock('203.0.113.10', uidB);
  let independentNext = false;
  aiUserRateLimiter(independentUser.req, independentUser.res, () => { independentNext = true; });
  assert(independentNext, 'A different authenticated user must have an independent budget');

  const unauthenticated = mock('203.0.113.20');
  let unauthNext = false;
  aiUserRateLimiter(unauthenticated.req, unauthenticated.res, () => { unauthNext = true; });
  assert(!unauthNext, 'Authenticated limiter must fail closed without verified UID');
  assert(unauthenticated.getStatus() === 401, 'Authenticated limiter must return 401 without UID');

  console.log('AI rate limiter tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
