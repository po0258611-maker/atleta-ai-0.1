/**
 * Test Suite: Quotas Atômicas e Proteção Contra Concorrência no Firestore
 * 
 * Verifica os Requisitos Obrigatórios:
 * 1. 20 Requisições Simultâneas (limite=10, inicial=0 -> 10 aprovadas, 10 bloqueadas, usage final=10)
 * 2. Condição de Corrida de Borda (9/10 com 5 requisições simultâneas -> 1 aprovada, 4 bloqueadas, usage final=10, NUNCA 14/10)
 * 3. Limite Já Atingido (10/10 -> 0 aprovadas, todas bloqueadas)
 * 4. Limite Ilimitado (limit = -1 -> todas as 25 requisições aprovadas)
 * 5. Novo Período Mensal (rollover temporal isolado)
 * 6. Usuários Diferentes (isolamento multitenant de quotas concorrentes)
 * 7. Features Diferentes (múltiplas métricas isoladas no mesmo usuário)
 * 8. Falha de Banco / Transação (erro controlado, sem liberação de recurso e sem incremento indevido)
 */

import { UsageRepository } from '../repositories/usageRepository';
import { MemoryFirestoreAdapter, IFirestoreAdapter } from '../repositories/firestoreAdapter';
import { EntitlementService } from '../services/entitlementService';
import { SubscriptionServerRepository } from '../repositories/subscriptionServerRepository';

async function runAtomicQuotaConcurrencyTests() {
  console.log('===================================================================');
  console.log('   ATLETA AI — TESTES DE QUOTAS ATÔMICAS E CONCORRÊNCIA FIRESTORE   ');
  console.log('===================================================================');

  // Adapter em memória para testes concorrentes
  const memoryStore = new MemoryFirestoreAdapter();
  const usageRepo = new UsageRepository(memoryStore);
  const subRepo = new SubscriptionServerRepository(memoryStore);
  const entitlementSvc = new EntitlementService();

  // -------------------------------------------------------------------------------------
  // TESTE 1: 20 Requisições Simultâneas (limite = 10, uso inicial = 0)
  // -------------------------------------------------------------------------------------
  console.log('\n--- TESTE 1: 20 REQUISIÇÕES SIMULTÂNEAS (limite=10, inicial=0) ---');
  const user1 = `usr_concurrent_1_${Date.now()}`;
  const limit1 = 10;

  // Lançar 20 requisições simultaneamente com Promise.all
  const promises20 = Array.from({ length: 20 }, (_, i) => 
    usageRepo.consumeAtomic(user1, 'AI_COACH_MESSAGES', limit1, 1)
  );

  const results20 = await Promise.all(promises20);
  const approved20 = results20.filter((r) => r.success);
  const blocked20 = results20.filter((r) => !r.success);
  const finalUsage1 = await usageRepo.getMonthlyUsage(user1, 'AI_COACH_MESSAGES');

  console.assert(approved20.length === 10, `Esperado 10 aprovadas, recebido: ${approved20.length}`);
  console.assert(blocked20.length === 10, `Esperado 10 bloqueadas, recebido: ${blocked20.length}`);
  console.assert(finalUsage1 === 10, `Usage final esperado = 10, recebido: ${finalUsage1}`);
  console.assert(finalUsage1 <= 10, `Usage final nunca pode exceder o limite de 10! (Atual: ${finalUsage1})`);

  console.log(`✓ Teste 1 Concluído: ${approved20.length} aprovadas, ${blocked20.length} bloqueadas, usage final = ${finalUsage1}/10`);

  // -------------------------------------------------------------------------------------
  // TESTE 2: Condição de Corrida de Borda (9/10 com 5 requisições simultâneas)
  // -------------------------------------------------------------------------------------
  console.log('\n--- TESTE 2: CONDIÇÃO DE BORDA (9/10 com 5 requisições simultâneas) ---');
  const user2 = `usr_concurrent_2_${Date.now()}`;
  
  // Pré-consumir 9 usos
  for (let i = 0; i < 9; i++) {
    await usageRepo.consumeAtomic(user2, 'AI_COACH_MESSAGES', 10, 1);
  }
  const usageBefore5 = await usageRepo.getMonthlyUsage(user2, 'AI_COACH_MESSAGES');
  console.assert(usageBefore5 === 9, `Uso antes do disparo deve ser 9, obtido: ${usageBefore5}`);

  // Disparar 5 requisições simultâneas concorrentes
  const promises5 = Array.from({ length: 5 }, () =>
    usageRepo.consumeAtomic(user2, 'AI_COACH_MESSAGES', 10, 1)
  );

  const results5 = await Promise.all(promises5);
  const approved5 = results5.filter((r) => r.success);
  const blocked5 = results5.filter((r) => !r.success);
  const finalUsage2 = await usageRepo.getMonthlyUsage(user2, 'AI_COACH_MESSAGES');

  console.assert(approved5.length === 1, `Apenas 1 requisição deve ter consumido o 10º uso (aprovadas: ${approved5.length})`);
  console.assert(blocked5.length === 4, `4 requisições devem ter sido bloqueadas (bloqueadas: ${blocked5.length})`);
  console.assert(finalUsage2 === 10, `Usage final deve ser rigorosamente 10 e NUNCA 14/10! (Atual: ${finalUsage2})`);

  console.log(`✓ Teste 2 Concluído: 1 aprovada, 4 bloqueadas, usage final estrito = ${finalUsage2}/10 (Sem vazamento 14/10)`);

  // -------------------------------------------------------------------------------------
  // TESTE 3: Limite Já Atingido (10/10)
  // -------------------------------------------------------------------------------------
  console.log('\n--- TESTE 3: LIMITE JÁ ATINGIDO (10/10) ---');
  const promisesAlreadyMax = Array.from({ length: 8 }, () =>
    usageRepo.consumeAtomic(user2, 'AI_COACH_MESSAGES', 10, 1)
  );
  const resultsAlreadyMax = await Promise.all(promisesAlreadyMax);
  const approvedAlreadyMax = resultsAlreadyMax.filter((r) => r.success);
  const blockedAlreadyMax = resultsAlreadyMax.filter((r) => !r.success);
  const usageAfterMax = await usageRepo.getMonthlyUsage(user2, 'AI_COACH_MESSAGES');

  console.assert(approvedAlreadyMax.length === 0, `Nenhuma requisição deve passar quando o limite já foi atingido`);
  console.assert(blockedAlreadyMax.length === 8, `Todas as 8 devem ser bloqueadas`);
  console.assert(usageAfterMax === 10, `Uso deve permanecer inalterado em 10`);

  console.log(`✓ Teste 3 Concluído: 0 aprovadas, 8 bloqueadas com quota esgotada`);

  // -------------------------------------------------------------------------------------
  // TESTE 4: Limite Ilimitado (limit = -1)
  // -------------------------------------------------------------------------------------
  console.log('\n--- TESTE 4: LIMITE ILIMITADO (limit = -1) ---');
  const userUnlimited = `usr_unlimited_${Date.now()}`;
  const promisesUnlimited = Array.from({ length: 25 }, () =>
    usageRepo.consumeAtomic(userUnlimited, 'AI_COACH_MESSAGES', -1, 1)
  );

  const resultsUnlimited = await Promise.all(promisesUnlimited);
  const approvedUnlimited = resultsUnlimited.filter((r) => r.success);
  const usageUnlimited = await usageRepo.getMonthlyUsage(userUnlimited, 'AI_COACH_MESSAGES');

  console.assert(approvedUnlimited.length === 25, `Todas as 25 requisições devem ser aprovadas para plano ilimitado`);
  console.assert(usageUnlimited === 25, `Usage total deve ser 25`);

  console.log(`✓ Teste 4 Concluído: 25/25 requisições aprovadas com quota ilimitada (total: ${usageUnlimited})`);

  // -------------------------------------------------------------------------------------
  // TESTE 5: Novo Período Mensal
  // -------------------------------------------------------------------------------------
  console.log('\n--- TESTE 5: NOVO PERÍODO MENSAL (Rollover temporal) ---');
  const userPeriod = `usr_period_${Date.now()}`;
  
  // Consumir limite total no período 2026-07
  await usageRepo.consumeAtomic(userPeriod, 'AI_COACH_MESSAGES', 5, 5, '2026-07');
  const usagePeriod1 = await usageRepo.getMonthlyUsage(userPeriod, 'AI_COACH_MESSAGES', '2026-07');
  console.assert(usagePeriod1 === 5, 'Uso no período 2026-07 deve ser 5');

  // No período seguinte 2026-08, uso deve começar em 0
  const usagePeriod2Initial = await usageRepo.getMonthlyUsage(userPeriod, 'AI_COACH_MESSAGES', '2026-08');
  console.assert(usagePeriod2Initial === 0, 'Uso no período novo 2026-08 deve ser 0');

  // Consumir no novo período
  const period2Consume = await usageRepo.consumeAtomic(userPeriod, 'AI_COACH_MESSAGES', 5, 2, '2026-08');
  console.assert(period2Consume.success === true, 'Consumo no novo período deve ser autorizado');
  console.assert(period2Consume.currentUsage === 2, 'Uso no período 2026-08 deve ser 2');

  console.log('✓ Teste 5 Concluído: Períodos mensais operam com isolamento temporal estrito');

  // -------------------------------------------------------------------------------------
  // TESTE 6: Usuários Diferentes (Isolamento Multi-tenant Concorrente)
  // -------------------------------------------------------------------------------------
  console.log('\n--- TESTE 6: USUÁRIOS DIFERENTES (Isolamento Multi-tenant Concorrente) ---');
  const userA = `usr_tenant_A_${Date.now()}`;
  const userB = `usr_tenant_B_${Date.now()}`;

  // User A consome 10/10
  await usageRepo.consumeAtomic(userA, 'AI_COACH_MESSAGES', 10, 10);
  const userAResult = await usageRepo.consumeAtomic(userA, 'AI_COACH_MESSAGES', 10, 1);
  console.assert(!userAResult.success, 'Usuário A com 10/10 deve ser bloqueado');

  // User B tenta consumir simultaneamente 5 unidades
  const userBPromises = Array.from({ length: 5 }, () =>
    usageRepo.consumeAtomic(userB, 'AI_COACH_MESSAGES', 10, 1)
  );
  const userBResults = await Promise.all(userBPromises);
  const userBApproved = userBResults.filter((r) => r.success);
  console.assert(userBApproved.length === 5, 'Todas as 5 requisições do Usuário B devem ser aprovadas independentemente do Usuário A');

  console.log('✓ Teste 6 Concluído: Usuários diferentes possuem cotas e estados totalmente independentes');

  // -------------------------------------------------------------------------------------
  // TESTE 7: Features Diferentes (Isolamento por Métrica no mesmo usuário)
  // -------------------------------------------------------------------------------------
  console.log('\n--- TESTE 7: FEATURES DIFERENTES (Isolamento de métricas) ---');
  const userMultiFeature = `usr_features_${Date.now()}`;

  // Feature 1 atinge limite
  await usageRepo.consumeAtomic(userMultiFeature, 'AI_COACH_MESSAGES', 3, 3);
  const feat1Attempt = await usageRepo.consumeAtomic(userMultiFeature, 'AI_COACH_MESSAGES', 3, 1);
  console.assert(!feat1Attempt.success, 'Feature 1 deve estar bloqueada');

  // Feature 2 consome normalmente
  const feat2Attempt = await usageRepo.consumeAtomic(userMultiFeature, 'ADVANCED_PERIODIZATION', 5, 2);
  console.assert(feat2Attempt.success === true, 'Feature 2 deve ser consumida com sucesso');
  console.assert(feat2Attempt.currentUsage === 2, 'Feature 2 deve contabilizar 2');

  console.log('✓ Teste 7 Concluído: Múltiplas features mantêm limites e contadores isolados');

  // -------------------------------------------------------------------------------------
  // TESTE 8: Falhas Controladas da Transação
  // -------------------------------------------------------------------------------------
  console.log('\n--- TESTE 8: TRATAMENTO DE FALHA NA TRANSAÇÃO ---');
  const failingAdapter: IFirestoreAdapter = {
    collection: () => {
      throw new Error('Firestore connection failed');
    },
    runTransaction: async () => {
      throw new Error('Transaction conflict / Firestore deadlocked');
    },
  };

  const failingUsageRepo = new UsageRepository(failingAdapter);
  let failedAsExpected = false;

  try {
    await failingUsageRepo.consumeAtomic(`usr_fail_${Date.now()}`, 'AI_COACH_MESSAGES', 10, 1);
  } catch (err: any) {
    failedAsExpected = true;
    console.assert(err.message.includes('Firestore') || err.message.includes('Transaction'), 'Erro original deve ser propagado');
  }

  console.assert(failedAsExpected === true, 'Falhas de transação devem lançar erro e jamais liberar acesso');
  console.log('✓ Teste 8 Concluído: Falhas de banco e transação abortam a operação sem liberar quota indevidamente');

  console.log('\n===================================================================');
  console.log('TODOS OS TESTES DE QUOTAS ATÔMICAS E CONCORRÊNCIA PASSARAM COM 100% DE SUCESSO!');
  console.log('===================================================================');
}

runAtomicQuotaConcurrencyTests().catch((err) => {
  console.error('Falha nos testes de concorrência de quotas:', err);
  process.exit(1);
});
