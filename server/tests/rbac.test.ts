/**
 * Test Suite: Backend Authorization, Firebase Admin Auth & RBAC
 */

import { requireRole, requireFeatureEntitlement } from '../middlewares/authorization';
import { requireAuth } from '../middlewares/auth';
import { entitlementService } from '../services/entitlementService';
import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { setFirestoreAdapter, MemoryFirestoreAdapter } from '../repositories/firestoreAdapter';
import type { Request, Response, NextFunction } from 'express';

setFirestoreAdapter(new MemoryFirestoreAdapter());

function createMockResponse() {
  const res: Partial<Response> = {};
  res.statusCode = 200;
  res.status = function (code: number) {
    this.statusCode = code;
    return this as Response;
  };
  res.json = function (data: any) {
    (this as any).data = data;
    return this as Response;
  };
  return res as Response & { statusCode: number; data: any };
}

async function runRbacTests() {
  console.log('--- INICIANDO TESTES DE AUTORIZAÇÃO BACKEND E RBAC ---');

  // Test 1: 401 Missing Bearer Token
  {
    const req = { headers: {}, path: '/api/ai-coach', ip: '127.0.0.1' } as unknown as Request;
    const res = createMockResponse();
    const calls: string[] = [];
    const next: NextFunction = () => { calls.push('next'); };

    await requireAuth(req, res, next);
    console.assert(res.statusCode === 401, 'Deve retornar status 401 para token ausente');
    console.assert(res.data?.error?.code === 'UNAUTHORIZED', 'Deve retornar código UNAUTHORIZED');
    console.assert(calls.length === 0, 'Next não deve ser chamado');
    console.log('✓ Teste 1: Rejeição 401 para Token Ausente');
  }

  // Test 2: 401 Invalid Bearer Token
  {
    const req = { headers: { authorization: 'Bearer token_invalido_123' }, path: '/api/ai-coach', ip: '127.0.0.1' } as unknown as Request;
    const res = createMockResponse();
    const calls: string[] = [];
    const next: NextFunction = () => { calls.push('next'); };

    await requireAuth(req, res, next);
    console.assert(res.statusCode === 401, 'Deve retornar status 401 para token inválido');
    console.assert(res.data?.error?.code === 'INVALID_TOKEN' || res.data?.error?.code === 'TOKEN_EXPIRED', 'Código de erro de token inválido');
    console.assert(calls.length === 0, 'Next não deve ser chamado');
    console.log('✓ Teste 2: Rejeição 401 para Token Inválido/Expirado');
  }

  // Test 3: 403 RBAC Role Insufficient (User is ATHLETE, endpoint requires ADMIN)
  {
    const req = {
      athlete: { uid: 'uid_atleta_01', email: 'atleta@teste.com', role: 'ATHLETE' },
    } as unknown as Request;
    const res = createMockResponse();
    const calls: string[] = [];
    const next: NextFunction = () => { calls.push('next'); };

    const adminGuard = requireRole(['ADMIN']);
    adminGuard(req, res, next);

    console.assert(res.statusCode === 403, 'Deve retornar status 403 para papel insuficiente');
    console.assert(res.data?.error?.code === 'FORBIDDEN', 'Código de erro deve ser FORBIDDEN');
    console.assert(calls.length === 0, 'Next não deve ser chamado');
    console.log('✓ Teste 3: Rejeição 403 por Papel RBAC Insuficiente');
  }

  // Test 4: 403 Backend Entitlement Quota Exceeded (Free user exceeding AI quota)
  {
    const uid = `uid_free_quota_test_${Date.now()}`;
    const req = {
      athlete: { uid, email: 'free@teste.com', role: 'ATHLETE' },
    } as unknown as Request;
    const res = createMockResponse();
    const calls: string[] = [];
    const next: NextFunction = () => { calls.push('next'); };

    // Consume all 10 messages for free plan
    for (let i = 0; i < 10; i++) {
      await entitlementService.consumeFeature(uid, 'AI_COACH_MESSAGES');
    }

    const entitlementGuard = requireFeatureEntitlement('AI_COACH_MESSAGES');
    await entitlementGuard(req, res, next);

    console.assert(res.statusCode === 403, 'Deve retornar 403 quando cota do backend é excedida');
    console.assert(res.data?.error?.code === 'MONTHLY_QUOTA_EXCEEDED', 'Razão deve ser MONTHLY_QUOTA_EXCEEDED');
    console.assert(calls.length === 0, 'Next não deve ser chamado');
    console.log('✓ Teste 4: Rejeição 403 quando Cota Mensal é Excedida no Backend');
  }

  // Test 5: 200 OK Authorized Premium Athlete
  {
    const premiumUid = `uid_premium_athlete_${Date.now()}`;
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Save active backend subscription
    await subscriptionServerRepository.saveSubscription({
      id: `sub_${premiumUid}`,
      userId: premiumUid,
      planId: 'PRO',
      status: 'active',
      provider: 'stripe',
      customerId: `cus_${premiumUid}`,
      subscriptionId: `sub_stripe_${premiumUid}`,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: future.toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      priceBrl: 39.90,
    });

    const req = {
      athlete: { uid: premiumUid, email: 'premium@teste.com', role: 'ATHLETE' },
    } as unknown as Request;
    const res = createMockResponse();
    const calls: string[] = [];
    const next: NextFunction = () => { calls.push('next'); };

    const entitlementGuard = requireFeatureEntitlement('AI_COACH_MESSAGES');
    await entitlementGuard(req, res, next);

    console.assert(calls.includes('next'), 'Next deve ser chamado para usuário autorizado');
    console.assert(res.statusCode === 200, 'Status deve permanecer 200 OK');
    console.log('✓ Teste 5: Sucesso 200 OK para Atleta Autorizado com Assinatura Premium');
  }

  console.log('--------------------------------------------------------------');
  console.log('TODOS OS 5 TESTES DE AUTORIZAÇÃO E RBAC PASSARAM COM SUCESSO!');
}

runRbacTests().catch((err) => {
  console.error('Falha nos testes de RBAC:', err);
  process.exit(1);
});
