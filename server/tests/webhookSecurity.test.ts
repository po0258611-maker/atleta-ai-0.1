/**
 * Test Suite: Webhook Cryptographic Security, Idempotency & Replay Attack Protection
 *
 * Verifies all 9 mandatory requirements:
 * 1. Assinatura válida (Stripe e PIX) -> Processa com sucesso e atualiza assinatura
 * 2. Assinatura inválida (HMAC incorreto / string aleatória) -> Rejeita imediatamente
 * 3. Header ausente -> Rejeita antes de qualquer consulta ou mutação
 * 4. Payload adulterado (1 byte alterado) -> Falha de HMAC e rejeição
 * 5. Evento duplicado -> Idempotência atômica bloqueia duplicação
 * 6. Replay attack (timestamp expirado > 300s) -> Rejeita como replay attack
 * 7. Evento desconhecido -> Ignorado com segurança sem conceder entitlement
 * 8. Evento fora de ordem -> Evento antigo não sobrescreve estado mais recente
 * 9. Tentativa de liberação sem autenticação -> Usuário permanece strictly no plano FREE
 *
 * "Nenhum teste de assinatura falsa pode resultar em assinatura PRO."
 */

import { paymentWebhookService } from '../services/paymentWebhookService';
import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { entitlementService } from '../services/entitlementService';
import { WebhookSignatureVerifier } from '../services/payments/webhookSignatureVerifier';
import { setFirestoreAdapter, MemoryFirestoreAdapter } from '../repositories/firestoreAdapter';
import { SERVER_CONFIG } from '../config/env';

setFirestoreAdapter(new MemoryFirestoreAdapter());

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runWebhookSecurityTests() {
  console.log('\n========================================================================');
  console.log('--- TESTES DE SEGURANÇA CRIPTOGRÁFICA DE WEBHOOKS (ATLETA AI) ---');
  console.log('========================================================================\n');

  const victimUser = `athlete_victim_${Date.now()}`;
  const legitimateUser = `athlete_legit_${Date.now()}`;

  // Pre-check: Victim user must be on FREE plan
  {
    const initialPlan = await entitlementService.resolveUserPlan(victimUser);
    assert(initialPlan.plan.slug === 'FREE', 'Pré-condição: Atleta vítima inicia no plano FREE');
    assert(initialPlan.status === 'FREE', 'Pré-condição: Status inicial é FREE');
  }

  // =========================================================================
  // 1. ASSINATURA VÁLIDA (Stripe e PIX)
  // =========================================================================
  console.log('\n[CENÁRIO 1] Teste de Assinatura Criptográfica Válida (Stripe & Pix):');
  {
    const eventId = `evt_valid_stripe_${Date.now()}`;
    const payload = {
      provider: 'stripe' as const,
      eventId,
      eventType: 'invoice.payment_succeeded',
      data: {
        userId: legitimateUser,
        customerId: `cus_${legitimateUser}`,
        subscriptionId: `sub_stripe_${legitimateUser}`,
        status: 'active',
        planId: 'PRO' as const,
        amountCents: 1500,
      },
    };
    const rawPayload = JSON.stringify(payload);
    const validSignature = WebhookSignatureVerifier.generateStripeSignature(rawPayload);

    const result = await paymentWebhookService.handleWebhook({
      payload,
      rawPayload,
      signatureHeader: validSignature,
    });

    assert(result.processed === true, 'Webhook com assinatura Stripe válida deve ser processado');
    assert(result.reason === 'SUCCESS', 'Razão deve ser SUCCESS');
    assert(result.subscription?.status === 'active', 'Assinatura deve se tornar active');

    const verifiedPlan = await entitlementService.resolveUserPlan(legitimateUser);
    assert(verifiedPlan.plan.slug === 'PRO', 'Atleta legítimo é elevado para plano PRO');
    assert(verifiedPlan.status === 'ACTIVE', 'Status do usuário é ACTIVE');


    // Teste válido PIX
    const pixUser = `athlete_pix_${Date.now()}`;
    const pixEventId = `evt_valid_pix_${Date.now()}`;
    const pixPayload = {
      provider: 'pix_direct' as const,
      eventId: pixEventId,
      eventType: 'pix.paid',
      data: {
        userId: pixUser,
        customerId: `cus_${pixUser}`,
        subscriptionId: `sub_pix_${pixUser}`,
        status: 'active',
        planId: 'PRO' as const,
        amountCents: 1500,
      },
    };
    const pixRawPayload = JSON.stringify(pixPayload);
    const pixSignature = WebhookSignatureVerifier.generatePixSignature(pixRawPayload);

    const pixResult = await paymentWebhookService.handleWebhook({
      payload: pixPayload,
      rawPayload: pixRawPayload,
      signatureHeader: pixSignature,
    });

    assert(pixResult.processed === true, 'Webhook com assinatura Pix válida deve ser processado');
    assert(pixResult.subscription?.status === 'active', 'Assinatura Pix ativada');
  }

  // =========================================================================
  // 2. ASSINATURA INVÁLIDA (String falsa / HMAC incorreto)
  // =========================================================================
  console.log('\n[CENÁRIO 2] Teste de Assinatura Inválida (HMAC Falso / Assinatura Forjada):');
  {
    const eventId = `evt_fake_sig_${Date.now()}`;
    const payload = {
      provider: 'stripe' as const,
      eventId,
      eventType: 'invoice.payment_succeeded',
      data: {
        userId: victimUser,
        customerId: `cus_${victimUser}`,
        subscriptionId: `sub_victim_${victimUser}`,
        status: 'active',
        planId: 'PRO' as const,
        amountCents: 1500,
      },
    };
    const rawPayload = JSON.stringify(payload);
    const fakeSignature = `t=${Math.floor(Date.now() / 1000)},v1=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`;

    const result = await paymentWebhookService.handleWebhook({
      payload,
      rawPayload,
      signatureHeader: fakeSignature,
    });

    assert(result.processed === false, 'Webhook com assinatura falsa deve ser rejeitado');
    assert(result.reason === 'INVALID_SIGNATURE_MISMATCH', 'Razão deve ser INVALID_SIGNATURE_MISMATCH');

    // Confirmação de segurança: Atleta vítima NÃO foi promovido para PRO
    const victimPlan = await entitlementService.resolveUserPlan(victimUser);
    assert(victimPlan.plan.slug === 'FREE', 'SEGURANÇA: Usuário continua strictly no plano FREE após assinatura falsa');
    assert(victimPlan.status === 'FREE', 'SEGURANÇA: Status continua FREE');
  }


  // =========================================================================
  // 3. HEADER AUSENTE
  // =========================================================================
  console.log('\n[CENÁRIO 3] Teste de Header de Assinatura Ausente:');
  {
    const eventId = `evt_no_header_${Date.now()}`;
    const payload = {
      provider: 'stripe' as const,
      eventId,
      eventType: 'invoice.payment_succeeded',
      data: {
        userId: victimUser,
        customerId: `cus_${victimUser}`,
        subscriptionId: `sub_victim_${victimUser}`,
        status: 'active',
        planId: 'PRO' as const,
      },
    };
    const rawPayload = JSON.stringify(payload);

    const result = await paymentWebhookService.handleWebhook({
      payload,
      rawPayload,
      signatureHeader: undefined,
    });

    assert(result.processed === false, 'Webhook sem header de assinatura deve ser rejeitado');
    assert(result.reason === 'MISSING_SIGNATURE', 'Razão deve ser MISSING_SIGNATURE');

    const victimPlan = await entitlementService.resolveUserPlan(victimUser);
    assert(victimPlan.plan.slug === 'FREE', 'SEGURANÇA: Usuário continua strictly no plano FREE sem header');
  }

  // =========================================================================
  // 4. PAYLOAD ADULTERADO (Assinatura original vs. Payload modificado)
  // =========================================================================
  console.log('\n[CENÁRIO 4] Teste de Payload Adulterado (Tampering Attack):');
  {
    const eventId = `evt_tampered_${Date.now()}`;
    const originalPayload = {
      provider: 'stripe' as const,
      eventId,
      eventType: 'invoice.payment_succeeded',
      data: {
        userId: 'some_other_user',
        customerId: 'cus_other',
        subscriptionId: 'sub_other',
        status: 'active',
        planId: 'PRO' as const,
        amountCents: 1500,
      },
    };
    const originalRaw = JSON.stringify(originalPayload);
    // Assinatura gerada para o payload original
    const signature = WebhookSignatureVerifier.generateStripeSignature(originalRaw);

    // Atacante modifica o userId no payload bruto para roubar a assinatura
    const tamperedPayload = {
      ...originalPayload,
      data: {
        ...originalPayload.data,
        userId: victimUser, // Adulteração maliciosa!
      },
    };
    const tamperedRaw = JSON.stringify(tamperedPayload);

    const result = await paymentWebhookService.handleWebhook({
      payload: tamperedPayload,
      rawPayload: tamperedRaw,
      signatureHeader: signature,
    });

    assert(result.processed === false, 'Payload adulterado deve falhar na verificação criptográfica');
    assert(result.reason === 'INVALID_SIGNATURE_MISMATCH', 'Razão deve ser INVALID_SIGNATURE_MISMATCH');

    const victimPlan = await entitlementService.resolveUserPlan(victimUser);
    assert(victimPlan.plan.slug === 'FREE', 'SEGURANÇA: Usuário não obtém PRO através de payload adulterado');
  }

  // =========================================================================
  // 5. EVENTO DUPLICADO (Idempotência Atômica)
  // =========================================================================
  console.log('\n[CENÁRIO 5] Teste de Evento Duplicado (Idempotência Transacional):');
  {
    const dupUser = `athlete_dup_${Date.now()}`;
    const eventId = `evt_dup_test_${Date.now()}`;
    const payload = {
      provider: 'stripe' as const,
      eventId,
      eventType: 'invoice.payment_succeeded',
      data: {
        userId: dupUser,
        customerId: `cus_${dupUser}`,
        subscriptionId: `sub_${dupUser}`,
        status: 'active',
        planId: 'PRO' as const,
      },
    };
    const rawPayload = JSON.stringify(payload);
    const signature = WebhookSignatureVerifier.generateStripeSignature(rawPayload);

    // Primeira entrega
    const firstCall = await paymentWebhookService.handleWebhook({
      payload,
      rawPayload,
      signatureHeader: signature,
    });
    assert(firstCall.reason === 'SUCCESS', 'Primeira entrega deve processar com sucesso');

    // Segunda entrega (duplicada)
    const secondCall = await paymentWebhookService.handleWebhook({
      payload,
      rawPayload,
      signatureHeader: signature,
    });
    assert(secondCall.processed === true, 'Segunda entrega deve ser aceita idempotentemente');
    assert(secondCall.reason === 'ALREADY_PROCESSED', 'Razão deve ser ALREADY_PROCESSED');

    // Histórico de auditoria não deve duplicar
    const history = await subscriptionServerRepository.getHistoryByUserId(dupUser);
    assert(history.length === 1, 'Trilha de auditoria não deve conter registros duplicados do mesmo webhook');
  }

  // =========================================================================
  // 6. REPLAY ATTACK (Timestamp expirado > 300s)
  // =========================================================================
  console.log('\n[CENÁRIO 6] Teste de Replay Attack (Timestamp Expirado / Fora de Tolerância):');
  {
    const eventId = `evt_replay_${Date.now()}`;
    const payload = {
      provider: 'stripe' as const,
      eventId,
      eventType: 'invoice.payment_succeeded',
      data: {
        userId: victimUser,
        customerId: `cus_${victimUser}`,
        subscriptionId: `sub_replay_${victimUser}`,
        status: 'active',
        planId: 'PRO' as const,
      },
    };
    const rawPayload = JSON.stringify(payload);

    // Timestamp de 15 minutos no passado (900 segundos atrás)
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 900;
    const replaySignature = WebhookSignatureVerifier.generateStripeSignature(
      rawPayload,
      SERVER_CONFIG.STRIPE_WEBHOOK_SECRET,
      expiredTimestamp
    );

    const result = await paymentWebhookService.handleWebhook({
      payload,
      rawPayload,
      signatureHeader: replaySignature,
    });

    assert(result.processed === false, 'Replay com timestamp expirado deve ser bloqueado');
    assert(result.reason === 'REPLAY_ATTACK_TIMESTAMP_EXPIRED', 'Razão deve ser REPLAY_ATTACK_TIMESTAMP_EXPIRED');

    const victimPlan = await entitlementService.resolveUserPlan(victimUser);
    assert(victimPlan.plan.slug === 'FREE', 'SEGURANÇA: Replay attack não concede acesso PRO');
  }

  // =========================================================================
  // 7. EVENTO DESCONHECIDO (Não relacionado a assinaturas)
  // =========================================================================
  console.log('\n[CENÁRIO 7] Teste de Evento Desconhecido/Não Suportado:');
  {
    const unkUser = `athlete_unk_${Date.now()}`;
    const eventId = `evt_unknown_${Date.now()}`;
    const payload = {
      provider: 'stripe' as const,
      eventId,
      eventType: 'customer.discount.created', // Evento não suportado para ativação de plano
      data: {
        userId: unkUser,
        customerId: `cus_${unkUser}`,
        subscriptionId: `sub_${unkUser}`,
        status: 'active',
      },
    };
    const rawPayload = JSON.stringify(payload);
    const signature = WebhookSignatureVerifier.generateStripeSignature(rawPayload);

    const result = await paymentWebhookService.handleWebhook({
      payload,
      rawPayload,
      signatureHeader: signature,
    });

    assert(result.processed === true, 'Evento desconhecido é tratado sem erro');
    assert(result.reason === 'UNKNOWN_EVENT_IGNORED', 'Razão deve ser UNKNOWN_EVENT_IGNORED');

    const plan = await entitlementService.resolveUserPlan(unkUser);
    assert(plan.plan.slug === 'FREE', 'SEGURANÇA: Evento desconhecido não altera nem concede plano PRO');
  }

  // =========================================================================
  // 8. EVENTO FORA DE ORDEM (Evento antigo chegando após estado recente)
  // =========================================================================
  console.log('\n[CENÁRIO 8] Teste de Evento Fora de Ordem (Sequência Temporal):');
  {
    const oooUser = `athlete_ooo_${Date.now()}`;
    const subId = `sub_ooo_${oooUser}`;

    // Estado 1: Pagamento ativo recente
    const recentEventId = `evt_recent_${Date.now()}`;
    const recentPayload = {
      provider: 'stripe' as const,
      eventId: recentEventId,
      eventType: 'invoice.payment_succeeded',
      eventTimestamp: Date.now(),
      data: {
        userId: oooUser,
        customerId: `cus_${oooUser}`,
        subscriptionId: subId,
        status: 'active',
        planId: 'PRO' as const,
      },
    };
    const recentRaw = JSON.stringify(recentPayload);
    const recentSig = WebhookSignatureVerifier.generateStripeSignature(recentRaw);

    await paymentWebhookService.handleWebhook({
      payload: recentPayload,
      rawPayload: recentRaw,
      signatureHeader: recentSig,
    });

    const activePlan = await entitlementService.resolveUserPlan(oooUser);
    assert(activePlan.status === 'ACTIVE', 'Usuário está ativo após pagamento recente');

    // Estado 2: Evento antigo de falha (com timestamp anterior) chega com atraso na rede
    const oldEventId = `evt_old_${Date.now()}`;
    const oldPayload = {
      provider: 'stripe' as const,
      eventId: oldEventId,
      eventType: 'invoice.payment_failed',
      eventTimestamp: Date.now() - 100000, // Criado no passado
      data: {
        userId: oooUser,
        customerId: `cus_${oooUser}`,
        subscriptionId: subId,
        status: 'past_due',
      },
    };
    const oldRaw = JSON.stringify(oldPayload);
    const oldSig = WebhookSignatureVerifier.generateStripeSignature(oldRaw);

    const oldResult = await paymentWebhookService.handleWebhook({
      payload: oldPayload,
      rawPayload: oldRaw,
      signatureHeader: oldSig,
    });

    assert(oldResult.reason === 'OUT_OF_ORDER_EVENT_IGNORED', 'Evento antigo fora de ordem deve ser ignorado');

    const preservedPlan = await entitlementService.resolveUserPlan(oooUser);
    assert(preservedPlan.status === 'ACTIVE', 'SEGURANÇA: Estado recente ativo foi preservado contra evento antigo');

  }

  // =========================================================================
  // 9. TENTATIVA DE LIBERAR ASSINATURA SEM AUTENTICAÇÃO
  // =========================================================================
  console.log('\n[CENÁRIO 9] Tentativa de Liberar Assinatura Sem Autenticação Válida:');
  {
    const attacks = [
      { name: 'Assinatura Vazia', sig: '' },
      { name: 'Assinatura de Outro Servidor', sig: WebhookSignatureVerifier.generateStripeSignature('{}', 'whsec_wrong_secret') },
      { name: 'String Arbitrária', sig: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature' },
    ];

    for (const attack of attacks) {
      const attackEventId = `evt_attack_${Math.random().toString(36).substring(2, 9)}`;
      const attackPayload = {
        provider: 'stripe' as const,
        eventId: attackEventId,
        eventType: 'invoice.payment_succeeded',
        data: {
          userId: victimUser,
          customerId: `cus_${victimUser}`,
          subscriptionId: `sub_hacked_${victimUser}`,
          status: 'active',
          planId: 'PRO' as const,
        },
      };
      const raw = JSON.stringify(attackPayload);

      const res = await paymentWebhookService.handleWebhook({
        payload: attackPayload,
        rawPayload: raw,
        signatureHeader: attack.sig,
      });

      assert(res.processed === false, `Ataque "${attack.name}" bloqueado com sucesso`);
      const userPlan = await entitlementService.resolveUserPlan(victimUser);
      assert(userPlan.plan.slug === 'FREE', `SEGURANÇA: Vítima permanece strictly no plano FREE após ataque "${attack.name}"`);
    }
  }

  console.log('\n========================================================================');
  console.log('✅ TODOS OS 9 CENÁRIOS DE SEGURANÇA CRIPTOGRÁFICA DE WEBHOOKS FORAM VALIDADOS!');
  console.log('========================================================================\n');
}

runWebhookSecurityTests().catch((err) => {
  console.error('Erro fatal nos testes de segurança de webhook:', err);
  process.exit(1);
});
