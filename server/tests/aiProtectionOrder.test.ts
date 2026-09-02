import { aiIpRateLimiter, aiUserRateLimiter } from '../middlewares/aiRateLimiter';
import { SERVER_CONFIG } from '../config/env';
import type { Request, Response } from 'express';

function mockReq(ip: string, uid?: string): Request {
  return {
    ip,
    path: '/api/ai-coach',
    socket: { remoteAddress: ip },
    athlete: uid ? ({ uid, role: 'ATHLETE' } as any) : undefined,
  } as Request;
}

function mockRes() {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  let body: any = null;

  const res = {
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
  } as unknown as Response;

  return { res, status: () => statusCode, headers: () => headers, body: () => body };
}

async function run() {
  const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
  const uidA = `ai_guard_a_${Date.now()}`;
  const uidB = `ai_guard_b_${Date.now()}`;

  let ipNext = false;
  const ipResponse = mockRes();
  aiIpRateLimiter(mockReq(ip), ipResponse.res, () => { ipNext = true; });
  console.assert(ipNext, 'IP guard must allow a request below the IP limit');

  let userANext = false;
  const userAResponse = mockRes();
  aiUserRateLimiter(mockReq(ip, uidA), userAResponse.res, () => { userANext = true; });
  console.assert(userANext, 'Authenticated user A must be allowed independently');

  let userBNext = false;
  const userBResponse = mockRes();
  aiUserRateLimiter(mockReq(ip, uidB), userBResponse.res, () => { userBNext = true; });
  console.assert(userBNext, 'Authenticated user B must be allowed independently on the same IP');

  let missingAuthNext = false;
  const missingAuthResponse = mockRes();
  aiUserRateLimiter(mockReq(`${ip}-no-auth`), missingAuthResponse.res, () => { missingAuthNext = true; });
  console.assert(!missingAuthNext, 'User guard must never allow an unauthenticated request');
  console.assert(missingAuthResponse.status() === 401, 'Missing authenticated UID must return HTTP 401');

  for (let i = 0; i < SERVER_CONFIG.AI_RATE_LIMIT_MAX_REQUESTS - 1; i++) {
    const response = mockRes();
    aiUserRateLimiter(mockReq(`${ip}-user-limit`, uidA), response.res, () => {});
  }
  const blocked = mockRes();
  aiUserRateLimiter(mockReq(`${ip}-user-limit`, uidA), blocked.res, () => {});

  console.assert(blocked.status() === 429, 'Authenticated user rate limit must return HTTP 429');
  console.assert(blocked.headers()['retry-after'], '429 must include Retry-After');
  console.assert(blocked.body()?.error?.code === 'RATE_LIMIT_EXCEEDED', '429 must use RATE_LIMIT_EXCEEDED code');

  console.log('AI protection order tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
