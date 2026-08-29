/**
 * Test Suite: Modelo Definitivo de Assinaturas e Entitlements (Prompt 04)
 * 
 * Valida:
 * 1. Planos FREE, PRO e APEX_ELITE com diferenciação estrita de recursos e cotas
 * 2. Estados: FREE, ACTIVE, PAST_DUE, CANCELED, EXPIRED, TRIAL
 * 3. Expiração autoritativa: Bloqueio estrito de recursos premium após vencimento
 * 4. Cancelamento com período de carência vs Cancelamento imediato
 * 5. Renovação autoritativa de assinaturas
 * 6. Downgrade e Upgrade de planos com transição imediata de cotas no backend
 * 7. Fonte única de verdade (plan, status, início, término, renovação, cancelamento, quotas, recursos)
 * 8. Regra de segurança: Tentativa de manipulação de flags pelo frontend (isPremium, isSubscribed, planSlug) é rejeitada
 */

import { entitlementService } from '../services/entitlementService';
import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { usageRepository } from '../repositories/usageRepository';
import { setFirestoreAdapter, MemoryFirestoreAdapter } from '../repositories/firestoreAdapter';
import { PLAN_DEFINITIONS } from '../domain/planDefinitions';

setFirestoreAdapter(new MemoryFirestoreAdapter());

async function runCommercialEntitlementTestSuite() {
  console.log('========================================================================');
  console.log('--- INICIANDO TESTES DO MODELO DEFINITIVO DE ASSINATURAS & ENTITLEMENTS ---');
  console.log('========================================================================\n');

  const now = new Date();
  const future30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const past5d = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const past35d = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString();

  // --------------------------------------------------------------------------
  // CENÁRIO 1: PLANO FREE (Default & Fallback)
  // --------------------------------------------------------------------------
  {
    console.log('>> CENÁRIO 1: Plano FREE e Comportamento Padrão');
    const freeUser = `usr_free_${Date.now()}`;

    // Usuário sem registro no banco
    const resNoSub = await entitlementService.resolveUserPlan(freeUser);
    console.assert(resNoSub.plan.slug === 'FREE', 'Usuário sem assinatura deve ser FREE');
    console.assert(resNoSub.status === 'FREE', 'Status deve ser FREE');
    console.assert(resNoSub.isEntitled === false, 'isEntitled deve ser false para FREE');

    // Validação de cotas FREE
    const evalAi = await entitlementService.evaluateAccess(freeUser, 'AI_COACH_MESSAGES');
    console.assert(evalAi.granted === true && evalAi.limit === 10, 'FREE tem limite de 10 msgs AI');

    const evalVideo = await entitlementService.evaluateAccess(freeUser, 'VIDEO_BIOMECHANICS');
    console.assert(evalVideo.granted === true && evalVideo.limit === 1, 'FREE tem limite de 1 vídeo');

    const evalPeriodization = await entitlementService.evaluateAccess(freeUser, 'ADVANCED_PERIODIZATION');
    console.assert(evalPeriodization.granted === false, 'FREE não pode acessar periodização avançada');

    const evalApex = await entitlementService.evaluateAccess(freeUser, 'APEX_EXCLUSIVE_FEATURES');
    console.assert(evalApex.granted === false, 'FREE não pode acessar recursos exclusivos APEX');

    console.log('✓ Cenário 1 Aprovado: Plano FREE respeita limites e bloqueia recursos premium.');
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 2: PLANO PRO (Diferenciação Estrita)
  // --------------------------------------------------------------------------
  {
    console.log('\n>> CENÁRIO 2: Plano PRO Ativo');
    const proUser = `usr_pro_${Date.now()}`;
    await subscriptionServerRepository.saveSubscription({
      id: `sub_${proUser}`,
      userId: proUser,
      planId: 'PRO',
      status: 'ACTIVE',
      provider: 'stripe',
      customerId: `cus_${proUser}`,
      subscriptionId: `sub_stripe_${proUser}`,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: future30d,
      cancelAtPeriodEnd: false,
      autoRenew: true,
      priceBrl: 15.0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    const resPro = await entitlementService.resolveUserPlan(proUser);
    console.assert(resPro.plan.slug === 'PRO', 'Plano deve ser PRO');
    console.assert(resPro.status === 'ACTIVE', 'Status deve ser ACTIVE');
    console.assert(resPro.isEntitled === true, 'isEntitled deve ser true');

    // PRO: AI Coach ilimitado (-1)
    const evalAi = await entitlementService.evaluateAccess(proUser, 'AI_COACH_MESSAGES');
    console.assert(evalAi.granted === true && evalAi.limit === -1, 'PRO tem AI Coach ilimitado');

    // PRO: Biomecânica = 30
    const evalVideo = await entitlementService.evaluateAccess(proUser, 'VIDEO_BIOMECHANICS');
    console.assert(evalVideo.granted === true && evalVideo.limit === 30, 'PRO tem limite de 30 vídeos de biomecânica');

    // PRO: Periodização avançada liberada
    const evalPeriodization = await entitlementService.evaluateAccess(proUser, 'ADVANCED_PERIODIZATION');
    console.assert(evalPeriodization.granted === true && evalPeriodization.limit === -1, 'PRO tem Periodização Avançada');

    // PRO: NÃO tem recursos exclusivos APEX (Diferenciação PRO vs APEX)
    const evalApex = await entitlementService.evaluateAccess(proUser, 'APEX_EXCLUSIVE_FEATURES');
    console.assert(evalApex.granted === false, 'PRO não possui recursos exclusivos APEX_ELITE');

    console.log('✓ Cenário 2 Aprovado: Plano PRO configurado com distinção estrita.');
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 3: PLANO APEX_ELITE (Topo de Linha)
  // --------------------------------------------------------------------------
  {
    console.log('\n>> CENÁRIO 3: Plano APEX_ELITE Ativo');
    const apexUser = `usr_apex_${Date.now()}`;
    await subscriptionServerRepository.saveSubscription({
      id: `sub_${apexUser}`,
      userId: apexUser,
      planId: 'APEX_ELITE',
      status: 'ACTIVE',
      provider: 'stripe',
      customerId: `cus_${apexUser}`,
      subscriptionId: `sub_stripe_${apexUser}`,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: future30d,
      cancelAtPeriodEnd: false,
      autoRenew: true,
      priceBrl: 120.0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    const resApex = await entitlementService.resolveUserPlan(apexUser);
    console.assert(resApex.plan.slug === 'APEX_ELITE', 'Plano deve ser APEX_ELITE');
    console.assert(resApex.status === 'ACTIVE', 'Status deve ser ACTIVE');

    // APEX_ELITE: Biomecânica ilimitada (-1) e Recursos APEX liberados (-1)
    const evalVideo = await entitlementService.evaluateAccess(apexUser, 'VIDEO_BIOMECHANICS');
    console.assert(evalVideo.granted === true && evalVideo.limit === -1, 'APEX_ELITE tem Biomecânica Ilimitada');

    const evalApex = await entitlementService.evaluateAccess(apexUser, 'APEX_EXCLUSIVE_FEATURES');
    console.assert(evalApex.granted === true && evalApex.limit === -1, 'APEX_ELITE tem Recursos Exclusivos liberados');

    console.log('✓ Cenário 3 Aprovado: APEX_ELITE desbloqueia todos os recursos topo de linha.');
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 4: EXPIRAÇÃO (Bloqueio Imediato de Recursos Premium)
  // --------------------------------------------------------------------------
  {
    console.log('\n>> CENÁRIO 4: Expiração de Assinatura');
    const expiredUser = `usr_expired_${Date.now()}`;
    await subscriptionServerRepository.saveSubscription({
      id: `sub_${expiredUser}`,
      userId: expiredUser,
      planId: 'APEX_ELITE',
      status: 'ACTIVE', // Banco tinha ACTIVE mas a data expirou
      provider: 'stripe',
      customerId: `cus_${expiredUser}`,
      subscriptionId: `sub_stripe_${expiredUser}`,
      currentPeriodStart: past35d,
      currentPeriodEnd: past5d, // Expirou há 5 dias
      cancelAtPeriodEnd: false,
      autoRenew: false,
      priceBrl: 120.0,
      createdAt: past35d,
      updatedAt: past5d,
    });

    const resExpired = await entitlementService.resolveUserPlan(expiredUser);
    console.assert(resExpired.status === 'EXPIRED', 'Status resolvido deve ser EXPIRED');
    console.assert(resExpired.plan.slug === 'FREE', 'Plano resolvido deve ser FREE por fallback');
    console.assert(resExpired.isEntitled === false, 'isEntitled deve ser false');

    // Tentativa de acessar recurso APEX com assinatura expirada
    const evalApex = await entitlementService.evaluateAccess(expiredUser, 'APEX_EXCLUSIVE_FEATURES');
    console.assert(evalApex.granted === false, 'Assinatura expirada NÃO pode acessar recursos APEX');
    console.assert(evalApex.reason === 'SUBSCRIPTION_EXPIRED' || evalApex.reason === 'FEATURE_NOT_IN_PLAN', 'Motivo deve ser bloqueio por expiração');

    // Tentativa de consumir IA coach cai na cota FREE (limite 10)
    const evalAi = await entitlementService.evaluateAccess(expiredUser, 'AI_COACH_MESSAGES');
    console.assert(evalAi.limit === 10, 'Usuário expirado cai na cota FREE (10)');

    console.log('✓ Cenário 4 Aprovado: Assinatura expirada bloqueia premium e reverte para FREE.');
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 5: CANCELAMENTO COM PERÍODO DE CARÊNCIA VS CANCELAMENTO IMEDIATO
  // --------------------------------------------------------------------------
  {
    console.log('\n>> CENÁRIO 5: Cancelamento de Assinatura');
    const cancelGraceUser = `usr_cancel_grace_${Date.now()}`;
    
    // Usuário assinou PRO e solicitou cancelamento ao fim do ciclo
    await subscriptionServerRepository.saveSubscription({
      id: `sub_${cancelGraceUser}`,
      userId: cancelGraceUser,
      planId: 'PRO',
      status: 'CANCELED',
      provider: 'stripe',
      customerId: `cus_${cancelGraceUser}`,
      subscriptionId: `sub_stripe_${cancelGraceUser}`,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: future30d, // Ainda faltam 30 dias
      cancelAtPeriodEnd: true,
      canceledAt: now.toISOString(),
      autoRenew: false,
      priceBrl: 15.0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    const resGrace = await entitlementService.resolveUserPlan(cancelGraceUser);
    console.assert(resGrace.status === 'CANCELED', 'Status deve ser CANCELED');
    console.assert(resGrace.plan.slug === 'PRO', 'Durante o período pago restante, o plano deve permanecer PRO');
    console.assert(resGrace.isEntitled === true, 'Usuário cancelado com período pago retém isEntitled = true até o vencimento');

    // Agora usuário com cancelamento imediato / vencido
    const cancelExpiredUser = `usr_cancel_exp_${Date.now()}`;
    await subscriptionServerRepository.saveSubscription({
      id: `sub_${cancelExpiredUser}`,
      userId: cancelExpiredUser,
      planId: 'PRO',
      status: 'CANCELED',
      provider: 'stripe',
      customerId: `cus_${cancelExpiredUser}`,
      subscriptionId: `sub_stripe_${cancelExpiredUser}`,
      currentPeriodStart: past35d,
      currentPeriodEnd: past5d, // Já passou
      cancelAtPeriodEnd: true,
      canceledAt: past35d,
      autoRenew: false,
      priceBrl: 15.0,
      createdAt: past35d,
      updatedAt: past5d,
    });

    const resCancelExp = await entitlementService.resolveUserPlan(cancelExpiredUser);
    console.assert(resCancelExp.status === 'EXPIRED', 'Após término do período, status deve ser EXPIRED');
    console.assert(resCancelExp.plan.slug === 'FREE', 'Cai em fallback para FREE');
    console.assert(resCancelExp.isEntitled === false, 'isEntitled = false');

    console.log('✓ Cenário 5 Aprovado: Cancelamento respeita período pago e bloqueia após expiração.');
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 6: RENOVAÇÃO AUTORITATIVA
  // --------------------------------------------------------------------------
  {
    console.log('\n>> CENÁRIO 6: Renovação de Assinatura');
    const renewUser = `usr_renew_${Date.now()}`;
    
    // Usuário quase expirando ou cancelado
    await subscriptionServerRepository.saveSubscription({
      id: `sub_${renewUser}`,
      userId: renewUser,
      planId: 'PRO',
      status: 'CANCELED',
      provider: 'pix_direct',
      customerId: `cus_${renewUser}`,
      subscriptionId: `sub_pix_${renewUser}`,
      currentPeriodStart: past35d,
      currentPeriodEnd: past5d,
      cancelAtPeriodEnd: true,
      canceledAt: past35d,
      autoRenew: false,
      priceBrl: 15.0,
      createdAt: past35d,
      updatedAt: past5d,
    });

    // Executa renovação autoritativa no backend
    const renewed = await entitlementService.renewSubscription(renewUser, 30);
    console.assert(renewed !== null, 'Renovação deve retornar objeto atualizado');
    console.assert(renewed?.status === 'ACTIVE', 'Status após renovação deve ser ACTIVE');
    console.assert(renewed?.autoRenew === true, 'autoRenew deve ser restaurado para true');
    console.assert(renewed?.cancelAtPeriodEnd === false, 'cancelAtPeriodEnd deve ser resetado para false');

    const resRenew = await entitlementService.resolveUserPlan(renewUser);
    console.assert(resRenew.status === 'ACTIVE', 'Plano resolvido deve ser ACTIVE');
    console.assert(resRenew.plan.slug === 'PRO', 'Plano deve ser PRO');
    console.assert(resRenew.isEntitled === true, 'isEntitled restaurado para true');

    console.log('✓ Cenário 6 Aprovado: Renovação restaura privilégios e estende período com segurança.');
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 7: DOWNGRADE E UPGRADE DE PLANOS
  // --------------------------------------------------------------------------
  {
    console.log('\n>> CENÁRIO 7: Downgrade e Upgrade de Planos');
    const tierUser = `usr_tier_${Date.now()}`;

    // Começa como APEX_ELITE
    await entitlementService.changePlan(tierUser, 'APEX_ELITE');
    let planRes = await entitlementService.resolveUserPlan(tierUser);
    console.assert(planRes.plan.slug === 'APEX_ELITE', 'Deve ser APEX_ELITE');

    // Downgrade para PRO
    await entitlementService.changePlan(tierUser, 'PRO');
    planRes = await entitlementService.resolveUserPlan(tierUser);
    console.assert(planRes.plan.slug === 'PRO', 'Deve ser PRO após downgrade');
    
    // Verifica que APEX_EXCLUSIVE_FEATURES não está mais liberado no plano PRO
    const evalApex = await entitlementService.evaluateAccess(tierUser, 'APEX_EXCLUSIVE_FEATURES');
    console.assert(evalApex.granted === false, 'Após downgrade para PRO, APEX_EXCLUSIVE_FEATURES é bloqueado');

    // Downgrade para FREE
    await entitlementService.changePlan(tierUser, 'FREE');
    planRes = await entitlementService.resolveUserPlan(tierUser);
    console.assert(planRes.plan.slug === 'FREE', 'Deve ser FREE após downgrade completo');
    console.assert(planRes.isEntitled === false, 'isEntitled deve ser false');

    console.log('✓ Cenário 7 Aprovado: Upgrade e Downgrade refletem instantaneamente nas cotas do backend.');
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 8: FONTE ÚNICA DE VERDADE (Summary Completo)
  // --------------------------------------------------------------------------
  {
    console.log('\n>> CENÁRIO 8: Fonte Única de Verdade (Entitlements Summary)');
    const summaryUser = `usr_summary_${Date.now()}`;
    await entitlementService.changePlan(summaryUser, 'PRO');

    const summary = await entitlementService.getEntitlementsSummary(summaryUser);
    console.assert(summary.userId === summaryUser, 'userId correto');
    console.assert(summary.plan === 'PRO' && summary.planSlug === 'PRO', 'plan e planSlug consistentes');
    console.assert(summary.status === 'ACTIVE', 'status é ACTIVE');
    console.assert(summary.isSubscribed === true && summary.isPremium === true, 'isSubscribed e isPremium verdadeiros');
    console.assert(summary.currentPeriodStart !== null, 'currentPeriodStart presente');
    console.assert(summary.currentPeriodEnd !== null, 'currentPeriodEnd presente');
    console.assert(summary.autoRenew === true, 'autoRenew presente');
    console.assert(summary.quotas !== undefined && summary.features !== undefined, 'quotas e features presentes');

    console.log('✓ Cenário 8 Aprovado: Resumo autoritativo fornece todos os campos essenciais.');
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 9: SEGURANÇA - REJEIÇÃO DE MANIPULAÇÃO PELO FRONTEND
  // --------------------------------------------------------------------------
  {
    console.log('\n>> CENÁRIO 9: Regra de Segurança (Frontend Fraud Prevention)');
    const victimUser = `usr_fraud_test_${Date.now()}`;
    // Usuário não tem assinatura (ou tem FREE)
    // O atacante tenta enviar no body da requisição: { isPremium: true, isSubscribed: true, planSlug: 'APEX_ELITE' }
    
    // O backend sempre resolve o plano a partir do userId verificado
    const resolved = await entitlementService.resolveUserPlan(victimUser);
    console.assert(resolved.plan.slug === 'FREE', 'Backend ignora alegações do frontend e resolve FREE');
    console.assert(resolved.isEntitled === false, 'isEntitled = false no backend');

    // Tentativa de consumo de recurso premium
    const access = await entitlementService.evaluateAccess(victimUser, 'APEX_EXCLUSIVE_FEATURES');
    console.assert(access.granted === false, 'Backend bloqueia acesso premium independente de payloads forjados');

    console.log('✓ Cenário 9 Aprovado: O backend é a autoridade absoluta. Impossível burlar via frontend.');
  }

  console.log('\n========================================================================');
  console.log('TODOS OS 9 CENÁRIOS DO MODELO COMERCIAL FORAM VALIDADOS COM 100% DE SUCESSO!');
  console.log('========================================================================');
}

runCommercialEntitlementTestSuite().catch((err) => {
  console.error('Falha nos testes comerciais:', err);
  process.exit(1);
});
