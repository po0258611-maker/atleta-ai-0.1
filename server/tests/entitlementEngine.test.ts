/**
 * Integration tests for subscription entitlements.
 * These tests intentionally exercise the authoritative backend service against
 * the in-memory Firestore adapter used by the test environment.
 */

import assert from 'node:assert/strict';
import { entitlementService } from '../services/entitlementService';
import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { usageRepository } from '../repositories/usageRepository';
import { setFirestoreAdapter, MemoryFirestoreAdapter } from '../repositories/firestoreAdapter';

setFirestoreAdapter(new MemoryFirestoreAdapter());

async function createSubscription(userId: string, overrides: Record<string, unknown> = {}) {
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await subscriptionServerRepository.saveSubscription({
    id: `sub_${userId}`,
    userId,
    planId: 'PRO',
    status: 'active',
    provider: 'stripe',
    customerId: `cus_${userId}`,
    subscriptionId: `sub_stripe_${userId}`,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: future.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    priceBrl: 39.90,
    ...overrides,
  });
}

async function runTests() {
  console.log('--- INICIANDO TESTES DO MOTOR DE IDENTIDADE E ENTITLEMENTS ---');

  const testUserId = `atleta_${Date.now()}`;
  const planInfo = await entitlementService.resolveUserPlan(testUserId);
  assert.equal(planInfo.plan.slug, 'FREE');
  console.log('✓ Teste 1: Resolução de identidade e plano padrão');

  const initialQuota = await entitlementService.evaluateAccess(testUserId, 'AI_COACH_MESSAGES');
  assert.equal(initialQuota.granted, true);
  assert.equal(initialQuota.remaining, 10);
  console.log('✓ Teste 2: Validação de entitlements no plano FREE');

  const freeUserId = testUserId;
  await usageRepository.resetUsage(freeUserId, 'AI_COACH_MESSAGES');
  const evalInitial = await entitlementService.evaluateAccess(freeUserId, 'AI_COACH_MESSAGES');
  assert.equal(evalInitial.granted, true);
  assert.equal(evalInitial.limit, 10);
  assert.equal(evalInitial.remaining, 10);
  console.log('✓ Teste 3: Free normal dentro do limite');

  for (let i = 0; i < 10; i += 1) {
    const consumed = await entitlementService.consumeFeature(freeUserId, 'AI_COACH_MESSAGES');
    assert.equal(consumed.granted, true);
  }
  const evalExceeded = await entitlementService.evaluateAccess(freeUserId, 'AI_COACH_MESSAGES');
  assert.equal(evalExceeded.granted, false);
  assert.equal(evalExceeded.reason, 'MONTHLY_QUOTA_EXCEEDED');
  assert.equal(evalExceeded.remaining, 0);
  console.log('✓ Teste 4: Free bloqueado com precisão ao atingir limite mensal');

  const premiumUserId = `usr_premium_${Date.now()}`;
  await createSubscription(premiumUserId);
  const evalPremium = await entitlementService.evaluateAccess(premiumUserId, 'AI_COACH_MESSAGES');
  assert.equal(evalPremium.granted, true);
  assert.equal(evalPremium.limit, -1);
  console.log('✓ Teste 5: Premium ilimitado verificado');

  const expiredUserId = `usr_expired_${Date.now()}`;
  const now = new Date();
  const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  await createSubscription(expiredUserId, {
    currentPeriodStart: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodEnd: past.toISOString(),
  });
  const evalExpired = await entitlementService.evaluateAccess(expiredUserId, 'ADVANCED_PERIODIZATION');
  assert.equal(evalExpired.granted, false);
  assert.equal(evalExpired.planSlug, 'FREE');
  console.log('✓ Teste 6: Assinatura expirada com fallback para FREE');

  const noSubUserId = `usr_nosub_${Date.now()}`;
  const evalNoSub = await entitlementService.evaluateAccess(noSubUserId, 'AI_COACH_MESSAGES');
  assert.equal(evalNoSub.granted, true);
  assert.equal(evalNoSub.limit, 10);
  console.log('✓ Teste 7: Usuário sem assinatura operando no FREE');

  const immediateCancelUserId = `usr_immediate_cancel_${Date.now()}`;
  await createSubscription(immediateCancelUserId);
  await entitlementService.cancelSubscription(immediateCancelUserId, true);
  const immediateResolution = await entitlementService.resolveUserPlan(immediateCancelUserId);
  assert.equal(immediateResolution.status, 'CANCELED');
  assert.equal(immediateResolution.isEntitled, false);
  assert.equal(immediateResolution.plan.slug, 'FREE');
  console.log('✓ Teste 8: Cancelamento imediato revoga entitlement imediatamente');

  const periodEndCancelUserId = `usr_period_cancel_${Date.now()}`;
  await createSubscription(periodEndCancelUserId);
  await entitlementService.cancelSubscription(periodEndCancelUserId, false);
  const periodEndResolution = await entitlementService.resolveUserPlan(periodEndCancelUserId);
  assert.equal(periodEndResolution.status, 'CANCELED');
  assert.equal(periodEndResolution.isEntitled, true);
  assert.equal(periodEndResolution.plan.slug, 'PRO');
  console.log('✓ Teste 9: Cancelamento no fim do período preserva entitlement até o vencimento');

  await assert.rejects(
    () => entitlementService.consumeFeature(premiumUserId, 'AI_COACH_MESSAGES', 0),
    /delta must be a positive integer/,
  );
  console.log('✓ Teste 10: Consumo de quota rejeita delta inválido');

  console.log('--------------------------------------------------------------');
  console.log('TODOS OS 10 TESTES DE IDENTIDADE E ENTITLEMENTS PASSARAM.');
}

runTests().catch((err) => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
