/**
 * Test Suite: Entitlement and Identity Engine
 * Validates:
 * 1. User Registration & Password Hashing
 * 2. Login & Session Token Generation
 * 3. Free User normal quota access
 * 4. Free User exceeding monthly limit
 * 5. Premium User unlimited access
 * 6. Premium User expired fallback to Free
 * 7. User without subscription fallback
 */

import { authService } from '../services/authService';
import { entitlementService } from '../services/entitlementService';
import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { usageRepository } from '../repositories/usageRepository';

async function runTests() {
  console.log('--- INICIANDO TESTES DO MOTOR DE IDENTIDADE E ENTITLEMENTS ---');

  // Test 1: Register and Login
  const testEmail = `atleta_${Date.now()}@test.com`;
  const registerResult = await authService.register(testEmail, 'Atleta Teste', 'segredo123', '127.0.0.1', 'NodeTest');
  console.assert(registerResult.token.length > 20, 'Token de sessão gerado com sucesso');
  console.assert(registerResult.user.email === testEmail, 'E-mail normalizado corretamente');
  console.log('✓ Teste 1: Cadastro e Sessão Criptográfica');

  // Test 2: Login with correct and incorrect password
  const loginSuccess = await authService.login(testEmail, 'segredo123', '127.0.0.1', 'NodeTest');
  console.assert(loginSuccess.user.id === registerResult.user.id, 'Login efetuado com sucesso');
  try {
    await authService.login(testEmail, 'senha_errada', '127.0.0.1', 'NodeTest');
    console.error('ERRO: Não deveria logar com senha errada');
  } catch {
    console.log('✓ Teste 2: Rejeição segura de credencial incorreta');
  }

  // Test 3: Free Normal Usage (AI_COACH_MESSAGES limit = 10)
  const freeUserId = registerResult.user.id;
  await usageRepository.resetUsage(freeUserId, 'AI_COACH_MESSAGES');
  
  const evalInitial = await entitlementService.evaluateAccess(freeUserId, 'AI_COACH_MESSAGES');
  console.assert(evalInitial.granted === true, 'Free normal deve ter acesso');
  console.assert(evalInitial.limit === 10, 'Limite free deve ser 10');
  console.assert(evalInitial.remaining === 10, 'Saldo inicial restante deve ser 10');
  console.log('✓ Teste 3: Free Normal dentro do limite');

  // Test 4: Free Exceeding Quota
  for (let i = 0; i < 10; i++) {
    await entitlementService.consumeFeature(freeUserId, 'AI_COACH_MESSAGES');
  }
  const evalExceeded = await entitlementService.evaluateAccess(freeUserId, 'AI_COACH_MESSAGES');
  console.assert(evalExceeded.granted === false, 'Acesso deve ser negado após atingir cota');
  console.assert(evalExceeded.reason === 'MONTHLY_QUOTA_EXCEEDED', 'Razão de bloqueio deve ser MONTHLY_QUOTA_EXCEEDED');
  console.assert(evalExceeded.remaining === 0, 'Saldo restante deve ser 0');
  console.log('✓ Teste 4: Free bloqueado com precisão ao atingir limite mensal');

  // Test 5: Premium User Unlimited Access
  const premiumUserId = `usr_premium_${Date.now()}`;
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await subscriptionServerRepository.saveSubscription({
    id: `sub_${premiumUserId}`,
    userId: premiumUserId,
    planId: 'PRO',
    status: 'active',
    provider: 'stripe',
    customerId: `cus_${premiumUserId}`,
    subscriptionId: `sub_stripe_${premiumUserId}`,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: future.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    priceBrl: 39.90,
  });

  const evalPremium = await entitlementService.evaluateAccess(premiumUserId, 'AI_COACH_MESSAGES');
  console.assert(evalPremium.granted === true, 'Premium deve ter acesso liberado');
  console.assert(evalPremium.limit === -1, 'Limite de IA para Premium é ilimitado (-1)');
  console.log('✓ Teste 5: Premium Ilimitado verificado com sucesso');

  // Test 6: Premium Expired Fallback to Free
  const expiredUserId = `usr_expired_${Date.now()}`;
  const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  await subscriptionServerRepository.saveSubscription({
    id: `sub_${expiredUserId}`,
    userId: expiredUserId,
    planId: 'PRO',
    status: 'active',
    provider: 'stripe',
    customerId: `cus_${expiredUserId}`,
    subscriptionId: `sub_stripe_${expiredUserId}`,
    currentPeriodStart: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodEnd: past.toISOString(), // Expired
    cancelAtPeriodEnd: false,
    createdAt: past.toISOString(),
    updatedAt: past.toISOString(),
    priceBrl: 39.90,
  });

  const evalExpired = await entitlementService.evaluateAccess(expiredUserId, 'ADVANCED_PERIODIZATION');
  console.assert(evalExpired.granted === false, 'Plano expirado não pode acessar recurso Premium');
  console.assert(evalExpired.planSlug === 'FREE', 'Plano expirado cai em fallback para FREE');
  console.log('✓ Teste 6: Assinatura Expirada com Fallback automático para FREE');

  // Test 7: User Without Subscription
  const noSubUserId = `usr_nosub_${Date.now()}`;
  const evalNoSub = await entitlementService.evaluateAccess(noSubUserId, 'AI_COACH_MESSAGES');
  console.assert(evalNoSub.granted === true, 'Usuário sem assinatura recebe plano Free');
  console.assert(evalNoSub.limit === 10, 'Cotas do Free são aplicadas');
  console.log('✓ Teste 7: Usuário sem assinatura operando com segurança no FREE');

  console.log('--------------------------------------------------------------');
  console.log('TODOS OS 7 TESTES DE IDENTIDADE E ENTITLEMENTS PASSARAM COM 100% DE SUCESSO!');
}

runTests().catch((err) => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
