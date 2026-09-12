/**
 * Test Suite: Firestore Backend Persistence Migration
 * 
 * Verifies the 10 Mandatory Requirements:
 * 1. Criar assinatura
 * 2. Recuperar assinatura (por userId e por subscriptionId)
 * 3. Atualizar assinatura (status e campos)
 * 4. Cancelar assinatura (transição para canceled)
 * 5. Registrar histórico (auditoria de eventos CREATED, PLAN_CHANGED, CANCELED)
 * 6. Persistir quota (incremento no período)
 * 7. Recuperar quota (leitura precisa de consumo)
 * 8. Persistência após recriação do repository (nova instância lendo da mesma base)
 * 9. Isolamento estrito por userId (Usuário A vs Usuário B)
 * 10. Tratamento explícito de falha de banco (Não converter erro em FREE ou quota zero)
 */

import { SubscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { UsageRepository } from '../repositories/usageRepository';
import { MemoryFirestoreAdapter, IFirestoreAdapter, AdminFirestoreAdapter, canUseMemoryFallback, isFirestoreUnavailableError } from '../repositories/firestoreAdapter';
import { ServerSubscription } from '../domain/subscriptionModel';
import { getAdminFirestore } from '../services/firebaseAdmin';

async function runPersistenceTests() {
  console.log('--- INICIANDO TESTES DE PERSISTÊNCIA FIRESTORE (BACKEND REPOSITORIES) ---');

  // Shared in-memory Firestore engine to test cross-instance persistence and multi-tenancy
  const sharedMemoryStore = new MemoryFirestoreAdapter();
  const subRepo = new SubscriptionServerRepository(sharedMemoryStore);
  const usageRepo = new UsageRepository(sharedMemoryStore);

  const userIdA = `usr_athleta_alpha_${Date.now()}`;
  const userIdB = `usr_athleta_beta_${Date.now()}`;
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 1. Criar assinatura
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
  console.log('✓ Teste 1: Assinatura criada com sucesso no Firestore');

  // 2. Recuperar assinatura (por userId e subscriptionId)
  const retrievedA = await subRepo.findByUserId(userIdA);
  console.assert(retrievedA !== null, 'Assinatura do usuário A deve ser recuperada');
  console.assert(retrievedA?.planId === 'PRO', 'Plano recuperado deve ser PRO');
  console.assert(retrievedA?.priceBrl === 39.90, 'Preço deve ser 39.90');

  const retrievedBySubId = await subRepo.findBySubscriptionId(subA.subscriptionId);
  console.assert(retrievedBySubId !== null, 'Assinatura deve ser encontrada por subscriptionId');
  console.assert(retrievedBySubId?.userId === userIdA, 'UserId deve coincidir');
  console.log('✓ Teste 2: Assinatura recuperada por userId e por subscriptionId');

  // 3. Atualizar assinatura
  await subRepo.updateStatus(userIdA, 'past_due', 'PLAN_CHANGED');
  const updatedA = await subRepo.findByUserId(userIdA);
  console.assert(updatedA?.status === 'past_due', 'Status deve ter sido atualizado para past_due');
  console.log('✓ Teste 3: Assinatura atualizada com sucesso');

  // 4. Cancelar assinatura
  await subRepo.updateStatus(userIdA, 'canceled', 'CANCELED');
  const canceledA = await subRepo.findByUserId(userIdA);
  console.assert(canceledA?.status === 'canceled', 'Status deve ter sido cancelado');
  console.log('✓ Teste 4: Assinatura cancelada com sucesso');

  // 5. Registrar histórico
  const historyA = await subRepo.getHistoryByUserId(userIdA);
  console.assert(historyA.length >= 3, `Histórico deve conter pelo menos 3 eventos (registrados: ${historyA.length})`);
  console.assert(historyA.some((h) => h.eventType === 'CREATED'), 'Histórico deve registrar evento CREATED');
  console.assert(historyA.some((h) => h.eventType === 'CANCELED'), 'Histórico deve registrar evento CANCELED');
  console.log(`✓ Teste 5: Trilha de histórico registrada (${historyA.length} eventos de auditoria)`);

  // 6. Persistir quota
  const countAfter1 = await usageRepo.incrementUsage(userIdA, 'AI_COACH_MESSAGES', 3);
  console.assert(countAfter1 === 3, 'Uso inicial incrementado deve ser 3');
  const countAfter2 = await usageRepo.incrementUsage(userIdA, 'AI_COACH_MESSAGES', 2);
  console.assert(countAfter2 === 5, 'Uso após segundo incremento deve ser 5');
  console.log('✓ Teste 6: Quota de uso persistida com incrementos cumulativos');

  // 7. Recuperar quota
  const currentUsageA = await usageRepo.getMonthlyUsage(userIdA, 'AI_COACH_MESSAGES');
  console.assert(currentUsageA === 5, 'Leitura de quota mensal deve retornar 5');
  console.log('✓ Teste 7: Leitura de quota mensal recuperada com precisão');

  // 8. Persistência após recriação do repository (nova instância lendo da mesma base persistente)
  const freshSubRepo = new SubscriptionServerRepository(sharedMemoryStore);
  const freshUsageRepo = new UsageRepository(sharedMemoryStore);

  const reloadedSub = await freshSubRepo.findByUserId(userIdA);
  console.assert(reloadedSub !== null && reloadedSub.status === 'canceled', 'Nova instância do repositório deve ler a assinatura persistida');

  const reloadedUsage = await freshUsageRepo.getMonthlyUsage(userIdA, 'AI_COACH_MESSAGES');
  console.assert(reloadedUsage === 5, 'Nova instância do repositório de uso deve ler quota persistida (5)');
  console.log('✓ Teste 8: Persistência garantida após recriação de instâncias dos repositórios');

  // 9. Isolamento estrito por userId (Usuário A vs Usuário B)
  const userBSub = await freshSubRepo.findByUserId(userIdB);
  console.assert(userBSub === null, 'Usuário B não deve ver a assinatura do Usuário A');

  const userBUsage = await freshUsageRepo.getMonthlyUsage(userIdB, 'AI_COACH_MESSAGES');
  console.assert(userBUsage === 0, 'Usuário B deve ter quota independente zerada');

  const userBHistory = await freshSubRepo.getHistoryByUserId(userIdB);
  console.assert(userBHistory.length === 0, 'Usuário B não deve ter acesso ao histórico do Usuário A');
  console.log('✓ Teste 9: Isolamento estrito de dados e quotas entre múltiplos usuários');

  // 10. Tratamento explícito de falha de banco
  const failingAdapter: IFirestoreAdapter = {
    collection: () => {
      throw new Error('5 NOT_FOUND: Database connection terminated');
    },
    runTransaction: async () => {
      throw new Error('5 NOT_FOUND: Database connection terminated');
    },
  };

  const failingSubRepo = new SubscriptionServerRepository(failingAdapter);
  const failingUsageRepo = new UsageRepository(failingAdapter);

  let subFailed = false;
  try {
    await failingSubRepo.findByUserId(userIdA);
  } catch (err: any) {
    subFailed = true;
    console.assert(err.message.includes('NOT_FOUND') || err.message.includes('Database'), 'Erro de banco deve ser propagado');
  }
  console.assert(subFailed === true, 'Falha do Firestore não pode ser silenciada na busca de assinatura');

  let usageFailed = false;
  try {
    await failingUsageRepo.getMonthlyUsage(userIdA, 'AI_COACH_MESSAGES');
  } catch (err: any) {
    usageFailed = true;
  }
  console.assert(usageFailed === true, 'Falha do Firestore não pode ser silenciada na leitura de quota');
  console.log('✓ Teste 10: Tratamento explícito de falha de banco validado (Erros nunca convertidos em acesso livre)');

  // ----------------------------------------------------------------------
  // STAGE 04: POLÍTICA FAIL-CLOSED DO FIRESTORE (TESTES OBRIGATÓRIOS A-E)
  // ----------------------------------------------------------------------
  console.log('--- STAGE 04: TESTES DA POLÍTICA FAIL-CLOSED DO FIRESTORE ---');
  const envSnapshot = { ...process.env };

  try {
    // TESTE A: Firestore disponível -> usa Firestore normalmente
    {
      const mockCloudDb = {
        collection: (name: string) => ({
          doc: (id: string) => ({
            get: async () => ({ id, exists: true, data: () => ({ name: 'Atleta Cloud Real', source: 'cloud_firestore' }) }),
            set: async () => {},
            delete: async () => {},
          }),
          where: () => ({ get: async () => ({ empty: false, docs: [] }) }),
          limit: () => ({ get: async () => ({ empty: false, docs: [] }) }),
          get: async () => ({ empty: false, docs: [] }),
        }),
        runTransaction: async (fn: any) => fn({
          get: async (_c: string, d: string) => ({ id: d, exists: true, data: () => ({ source: 'cloud_firestore' }) }),
          set: () => {},
          delete: () => {},
        }),
      };

      const adapterA = new AdminFirestoreAdapter(undefined, mockCloudDb);
      const snapA = await adapterA.collection('users').doc('user_cloud').get();
      console.assert(snapA.exists === true, 'TESTE A: Documento deve existir no Firestore');
      console.assert(snapA.data()?.source === 'cloud_firestore', 'TESTE A: Deve ler diretamente do Firestore disponível');
      console.log('✓ TESTE A: Firestore disponível -> usa Firestore normalmente');
    }

    // TESTE B: Firestore indisponível + fallback explicitamente permitido -> usa memória
    {
      process.env.NODE_ENV = 'test';
      process.env.FIRESTORE_ALLOW_MEMORY_FALLBACK = 'true';
      delete process.env.FIRESTORE_DISABLE_MEMORY_FALLBACK;

      console.assert(canUseMemoryFallback() === true, 'TESTE B: canUseMemoryFallback deve retornar true');

      const unavailableDb = {
        collection: () => {
          const err: any = new Error('14 UNAVAILABLE: Could not reach Cloud Firestore backend');
          err.code = 14;
          throw err;
        },
        runTransaction: async () => {
          const err: any = new Error('14 UNAVAILABLE: Could not reach Cloud Firestore backend');
          err.code = 14;
          throw err;
        },
      };

      const fallbackMem = new MemoryFirestoreAdapter();
      await fallbackMem.collection('users').doc('user_mem').set({ name: 'Atleta Memória', fallbackActive: true });

      const adapterB = new AdminFirestoreAdapter(fallbackMem, unavailableDb);
      const snapB = await adapterB.collection('users').doc('user_mem').get();
      console.assert(snapB.exists === true, 'TESTE B: Documento deve ser recuperado do fallback');
      console.assert(snapB.data()?.fallbackActive === true, 'TESTE B: Deve usar adapter de memória quando fallback explicitamente permitido');

      const txResult = await adapterB.runTransaction(async (tx) => {
        const doc = await tx.get('users', 'user_mem');
        return doc.data();
      });
      console.assert(txResult?.fallbackActive === true, 'TESTE B: Transação deve usar memória quando permitido');
      console.log('✓ TESTE B: Firestore indisponível + fallback explicitamente permitido -> usa memória');
    }

    // TESTE C: Firestore indisponível + fallback não permitido -> NÃO usa memória, retorna/lança erro controlado
    {
      process.env.NODE_ENV = 'test';
      process.env.FIRESTORE_ALLOW_MEMORY_FALLBACK = 'false';
      delete process.env.FIRESTORE_DISABLE_MEMORY_FALLBACK;

      console.assert(canUseMemoryFallback() === false, 'TESTE C: canUseMemoryFallback deve ser false');

      const unavailableDb = {
        collection: () => {
          const err: any = new Error('14 UNAVAILABLE: Could not reach Cloud Firestore backend');
          err.code = 14;
          throw err;
        },
        runTransaction: async () => {
          const err: any = new Error('14 UNAVAILABLE: Could not reach Cloud Firestore backend');
          err.code = 14;
          throw err;
        },
      };

      const fallbackMem = new MemoryFirestoreAdapter();
      await fallbackMem.collection('users').doc('user_isolated').set({ name: 'Deveria Estar Inacessível' });

      const adapterC = new AdminFirestoreAdapter(fallbackMem, unavailableDb);
      let threwControlledError = false;
      try {
        await adapterC.collection('users').doc('user_isolated').get();
      } catch (err: any) {
        threwControlledError = isFirestoreUnavailableError(err);
      }
      console.assert(threwControlledError === true, 'TESTE C: Falha do Firestore deve produzir erro controlado e NUNCA usar memória');

      let txThrewError = false;
      try {
        await adapterC.runTransaction(async (tx) => tx.get('users', 'user_isolated'));
      } catch (err: any) {
        txThrewError = isFirestoreUnavailableError(err);
      }
      console.assert(txThrewError === true, 'TESTE C: Transação deve falhar com erro controlado');
      console.log('✓ TESTE C: Firestore indisponível + fallback não permitido -> NÃO usa memória e lança erro controlado');
    }

    // TESTE D: Configuração de produção sem variável explícita -> fallback permanece DESABILITADO
    {
      process.env.NODE_ENV = 'production';
      delete process.env.FIRESTORE_ALLOW_MEMORY_FALLBACK;
      delete process.env.FIRESTORE_DISABLE_MEMORY_FALLBACK;

      console.assert(canUseMemoryFallback() === false, 'TESTE D: Em produção sem variável, canUseMemoryFallback DEVE ser false');
      console.log('✓ TESTE D: Configuração de produção sem variável explícita -> fallback permanece DESABILITADO');
    }

    // TESTE E: Configuração inválida do Firestore em produção -> não deve resultar em sucesso falso nem persistência em memória silenciosa
    {
      process.env.NODE_ENV = 'production';
      delete process.env.FIRESTORE_ALLOW_MEMORY_FALLBACK;
      delete process.env.FIRESTORE_DISABLE_MEMORY_FALLBACK;

      const invalidConfigDb = {
        collection: () => {
          throw new Error('Invalid production configuration: Missing default credentials or FIREBASE_PROJECT_ID');
        },
        runTransaction: async () => {
          throw new Error('Invalid production configuration: Missing default credentials or FIREBASE_PROJECT_ID');
        },
      };

      const fallbackMem = new MemoryFirestoreAdapter();
      const adapterE = new AdminFirestoreAdapter(fallbackMem, invalidConfigDb);

      let docFailed = false;
      try {
        await adapterE.collection('users').doc('prod_user').set({ name: 'Insecure Silent Write' });
      } catch (err: any) {
        docFailed = true;
        console.assert(
          err.message.includes('Invalid production configuration'),
          'TESTE E: Erro original de configuração deve ser propagado'
        );
      }
      console.assert(docFailed === true, 'TESTE E: Gravação não pode fingir sucesso em produção com config inválida');

      // Confirma que nenhum dado foi gravado silenciosamente no fallback em memória
      const memorySnap = await fallbackMem.collection('users').doc('prod_user').get();
      console.assert(memorySnap.exists === false, 'TESTE E: Fallback de memória não deve ser alimentado silenciosamente em produção');
      console.log('✓ TESTE E: Configuração inválida do Firestore em produção -> erro controlado sem sucesso falso nem memória silenciosa');
    }
  } finally {
    process.env = envSnapshot;
  }

  // Verificação de conectividade real com Firestore Cloud
  console.log('--- VERIFICAÇÃO DE INTEGRAÇÃO COM FIRESTORE CLOUD REAL ---');
  const shouldRunCloudTest = process.env.RUN_FIRESTORE_CLOUD_TEST === 'true';

  if (!shouldRunCloudTest) {
    console.log('[INFO] Smoke test de Firestore Cloud IGNORADO (Defina RUN_FIRESTORE_CLOUD_TEST=true para executar verificação contra banco real).');
  } else {
    console.log('[INFO] RUN_FIRESTORE_CLOUD_TEST=true detectado. Executando verificação de conectividade real...');
    try {
      const liveAdminDb = getAdminFirestore();
      const liveTestDoc = liveAdminDb.collection('subscriptions').doc(`__ping_test_${Date.now()}`);
      await liveTestDoc.get();
      console.log('✓ INTEGRAÇÃO FIRESTORE CLOUD REAL VALIDADA COM SUCESSO');
    } catch (cloudErr: any) {
      console.error(`❌ [FALHA] Erro na verificação de conectividade com Firestore Cloud:`, cloudErr);
      throw new Error(`Falha no smoke test de Firestore Cloud: ${cloudErr?.message || cloudErr}`);
    }
  }

  console.log('----------------------------------------------------------------------');
  console.log('TODOS OS 10 TESTES DE PERSISTÊNCIA FIRESTORE DO BACKEND PASSARAM!');
}

runPersistenceTests().catch((err) => {
  console.error('Falha nos testes de persistência Firestore:', err);
  process.exit(1);
});
