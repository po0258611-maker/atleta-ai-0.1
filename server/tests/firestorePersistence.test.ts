// Firestore persistence tests use the in-memory adapter by default.
// The real Cloud Firestore smoke test is opt-in via RUN_FIRESTORE_CLOUD_TESTS=true.
// This keeps ordinary CI deterministic and avoids requiring Google ADC credentials.

import { SubscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { UsageRepository } from '../repositories/usageRepository';
import { MemoryFirestoreAdapter, IFirestoreAdapter } from '../repositories/firestoreAdapter';
import { ServerSubscription } from '../domain/subscriptionModel';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runPersistenceTests() {
  console.log('--- INICIANDO TESTES DE PERSISTÊNCIA FIRESTORE (BACKEND REPOSITORIES) ---');

  const sharedMemoryStore = new MemoryFirestoreAdapter();
  const subRepo = new SubscriptionServerRepository(sharedMemoryStore);
  const usageRepo = new UsageRepository(sharedMemoryStore);
  const userIdA = `usr_athleta_alpha_${Date.now()}`;
  const userIdB = `usr_athleta_beta_${Date.now()}`;
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subA: ServerSubscription = {
    id: `sub_alpha_${Date.now()}`,
    userId: userIdA,
    planId: 'PRO',
    status: 'active',
    provider: 'stripe',
    customerId: `cus_alpha_${Date.now()}`,
    subscriptionId: `sub_stripe_alpha_${Date.now()}`,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: future.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    priceBrl: 39.90,
  };

  await subRepo.saveSubscription(subA);
  assert((await subRepo.findByUserId(userIdA))?.planId === 'PRO', 'Assinatura deve ser recuperada por userId');
  assert((await subRepo.findBySubscriptionId(subA.subscriptionId))?.userId === userIdA, 'Assinatura deve ser recuperada por subscriptionId');
  console.log('✓ Testes 1-2: criação e recuperação de assinatura');

  await subRepo.updateStatus(userIdA, 'past_due', 'PLAN_CHANGED');
  assert((await subRepo.findByUserId(userIdA))?.status === 'past_due', 'Status deve ser past_due');
  await subRepo.updateStatus(userIdA, 'canceled', 'CANCELED');
  assert((await subRepo.findByUserId(userIdA))?.status === 'canceled', 'Status deve ser canceled');
  console.log('✓ Testes 3-4: atualização e cancelamento');

  const historyA = await subRepo.getHistoryByUserId(userIdA);
  assert(historyA.length >= 3, `Histórico deve conter pelo menos 3 eventos; recebeu ${historyA.length}`);
  assert(historyA.some((h) => h.eventType === 'CREATED'), 'Histórico deve conter CREATED');
  assert(historyA.some((h) => h.eventType === 'CANCELED'), 'Histórico deve conter CANCELED');
  console.log('✓ Teste 5: histórico de auditoria');

  assert(await usageRepo.incrementUsage(userIdA, 'AI_COACH_MESSAGES', 3) === 3, 'Primeiro incremento deve resultar em 3');
  assert(await usageRepo.incrementUsage(userIdA, 'AI_COACH_MESSAGES', 2) === 5, 'Segundo incremento deve resultar em 5');
  assert(await usageRepo.getMonthlyUsage(userIdA, 'AI_COACH_MESSAGES') === 5, 'Quota mensal deve retornar 5');
  console.log('✓ Testes 6-7: quota persistida e recuperada');

  const freshSubRepo = new SubscriptionServerRepository(sharedMemoryStore);
  const freshUsageRepo = new UsageRepository(sharedMemoryStore);
  assert((await freshSubRepo.findByUserId(userIdA))?.status === 'canceled', 'Nova instância deve ler assinatura persistida');
  assert(await freshUsageRepo.getMonthlyUsage(userIdA, 'AI_COACH_MESSAGES') === 5, 'Nova instância deve ler quota persistida');
  console.log('✓ Teste 8: persistência entre instâncias');

  assert(await freshSubRepo.findByUserId(userIdB) === null, 'Usuário B não deve acessar assinatura de A');
  assert(await freshUsageRepo.getMonthlyUsage(userIdB, 'AI_COACH_MESSAGES') === 0, 'Usuário B deve ter quota independente');
  assert((await freshSubRepo.getHistoryByUserId(userIdB)).length === 0, 'Usuário B não deve acessar histórico de A');
  console.log('✓ Teste 9: isolamento por usuário');

  const failingAdapter: IFirestoreAdapter = {
    collection: () => { throw new Error('5 NOT_FOUND: Database connection terminated'); },
    runTransaction: async () => { throw new Error('5 NOT_FOUND: Database connection terminated'); },
  };
  const failingSubRepo = new SubscriptionServerRepository(failingAdapter);
  const failingUsageRepo = new UsageRepository(failingAdapter);
  let subFailed = false;
  try { await failingSubRepo.findByUserId(userIdA); } catch (err) {
    subFailed = true;
    assert(String(err).includes('NOT_FOUND') || String(err).includes('Database'), 'Erro de banco deve ser propagado');
  }
  assert(subFailed, 'Falha do Firestore não pode virar acesso livre');
  let usageFailed = false;
  try { await failingUsageRepo.getMonthlyUsage(userIdA, 'AI_COACH_MESSAGES'); } catch { usageFailed = true; }
  assert(usageFailed, 'Falha do Firestore não pode virar quota zero');
  console.log('✓ Teste 10: falhas de banco são propagadas com segurança');

  if (process.env.RUN_FIRESTORE_CLOUD_TESTS === 'true') {
    console.log('--- VERIFICAÇÃO OPT-IN DE FIRESTORE CLOUD ---');
    const { getAdminFirestore } = await import('../services/firebaseAdmin');
    const liveAdminDb = getAdminFirestore();
    await liveAdminDb.collection('subscriptions').doc(`__ping_test_${Date.now()}`).get();
    console.log('✓ INTEGRAÇÃO FIRESTORE CLOUD VALIDADA');
  } else {
    console.log('ℹ Teste Cloud Firestore ignorado no CI (RUN_FIRESTORE_CLOUD_TESTS=true para executar).');
  }

  console.log('----------------------------------------------------------------------');
  console.log('TODOS OS TESTES DE PERSISTÊNCIA FIRESTORE PASSARAM!');
}

runPersistenceTests().catch((err) => {
  console.error('Falha nos testes de persistência Firestore:', err);
  process.exit(1);
});
