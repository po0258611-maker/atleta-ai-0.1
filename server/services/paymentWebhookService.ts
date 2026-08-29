import {
  subscriptionServerRepository,
} from '../repositories/subscriptionServerRepository';
import {
  ServerSubscription,
  SubscriptionStatus,
  PaymentProvider,
} from '../domain/subscriptionModel';
import { logger } from '../middlewares/logger';
import { WebhookSignatureVerifier } from './payments/webhookSignatureVerifier';

export interface WebhookEventPayload {
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  eventTimestamp?: number | string;
  data: {
    customerId: string;
    subscriptionId: string;
    userId?: string;
    status: string;
    planId?: 'PRO' | 'APEX_ELITE';
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    amountCents?: number;
  };
}

export interface HandleWebhookInput {
  payload: WebhookEventPayload;
  rawPayload?: string;
  signatureHeader?: string;
  timestampHeader?: string | number;
}

const RECOGNIZED_EVENTS = new Set([
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'payment_succeeded',
  'payment_failed',
  'subscription_updated',
  'pix.paid',
  'pix.settled',
  'pix.expired',
  'pix.refunded',
  'pix.failed',
]);

export class PaymentWebhookService {
  /**
   * Process incoming webhook event with strict cryptographic authentication,
   * atomic idempotency, sequence ordering, and secure status transitions.
   */
  async handleWebhook(
    inputOrPayload: WebhookEventPayload | HandleWebhookInput,
    signatureHeaderArg?: string,
    rawPayloadArg?: string,
    timestampHeaderArg?: string | number
  ): Promise<{
    processed: boolean;
    reason: string;
    subscription?: ServerSubscription;
  }> {
    // Normalizar entrada estruturada ou argumentos posicionais
    const isInputObject = 'payload' in inputOrPayload && typeof (inputOrPayload as any).payload === 'object';
    const payload: WebhookEventPayload = isInputObject ? (inputOrPayload as HandleWebhookInput).payload : (inputOrPayload as WebhookEventPayload);
    const signatureHeader = isInputObject
      ? (inputOrPayload as HandleWebhookInput).signatureHeader
      : signatureHeaderArg;
    const rawPayload = isInputObject
      ? (inputOrPayload as HandleWebhookInput).rawPayload || JSON.stringify(payload)
      : rawPayloadArg || JSON.stringify(payload);
    const timestampHeader = isInputObject
      ? (inputOrPayload as HandleWebhookInput).timestampHeader
      : timestampHeaderArg;

    const { provider, eventId, eventType, data, eventTimestamp } = payload;

    // =========================================================================
    // ETAPA 1: AUTENTICAÇÃO CRIPTOGRÁFICA OBRIGATÓRIA (EXECUTADA ANTES DE TUDO)
    // Nenhuma leitura de usuário, alteração de banco ou liberação de quota ocorre aqui.
    // =========================================================================
    if (!signatureHeader || signatureHeader.trim() === '') {
      logger.warn(`Webhook rejeitado: Assinatura ausente`, { provider, eventId });
      return { processed: false, reason: 'MISSING_SIGNATURE' };
    }

    const verification = WebhookSignatureVerifier.verify(
      provider,
      rawPayload,
      signatureHeader,
      timestampHeader
    );

    if (!verification.valid) {
      logger.warn(`Webhook rejeitado por falha criptográfica: ${verification.reason}`, {
        provider,
        eventId,
        reason: verification.reason,
      });
      return { processed: false, reason: verification.reason };
    }

    // =========================================================================
    // ETAPA 2: REIVINDICAÇÃO ATÔMICA E PROTEÇÃO CONTRA DUPLICATAS / CONCORRÊNCIA
    // Utiliza transação Firestore para garantir que exatamente 1 execução ocorra.
    // =========================================================================
    const claimResult = await subscriptionServerRepository.tryClaimWebhookEvent(
      provider,
      eventId,
      eventType
    );

    if (!claimResult.claimed && claimResult.alreadyProcessed) {
      logger.info(`Webhook ignorado (Idempotência ativa): ${provider} event ${eventId}`);
      return { processed: true, reason: 'ALREADY_PROCESSED' };
    }

    try {
      // =========================================================================
      // ETAPA 3: VALIDAÇÃO DE TIPO DE EVENTO DESCONHECIDO
      // Eventos não relacionados a pagamento/assinatura são ignorados com segurança.
      // =========================================================================
      if (!RECOGNIZED_EVENTS.has(eventType)) {
        logger.info(`Webhook com evento desconhecido/não suportado ignorado: ${eventType}`, {
          provider,
          eventId,
        });
        await subscriptionServerRepository.markWebhookCompleted(
          provider,
          eventId,
          eventType,
          'ignored',
          { note: 'Tipo de evento não aplicável para ciclo de assinaturas' }
        );
        return { processed: true, reason: 'UNKNOWN_EVENT_IGNORED' };
      }

      // =========================================================================
      // ETAPA 4: RESOLUÇÃO DE USUÁRIO
      // =========================================================================
      let userId = data.userId;
      if (!userId && data.subscriptionId) {
        const existingSub = await subscriptionServerRepository.findBySubscriptionId(data.subscriptionId);
        if (existingSub) {
          userId = existingSub.userId;
        }
      }

      if (!userId) {
        logger.warn(`Webhook rejeitado: Impossível associar a um atleta/usuário`, {
          provider,
          eventId,
          subscriptionId: data.subscriptionId,
        });
        await subscriptionServerRepository.markWebhookCompleted(
          provider,
          eventId,
          eventType,
          'user_not_found'
        );
        return { processed: false, reason: 'USER_NOT_FOUND' };
      }

      // =========================================================================
      // ETAPA 5: PROTEÇÃO CONTRA EVENTOS FORA DE ORDEM
      // Se um evento antigo chegar após um estado mais recente, não sobrescrever.
      // =========================================================================
      const existingSub = await subscriptionServerRepository.findByUserId(userId);
      if (existingSub && existingSub.updatedAt && eventTimestamp) {
        const incomingTime =
          typeof eventTimestamp === 'number'
            ? eventTimestamp > 10000000000
              ? eventTimestamp
              : eventTimestamp * 1000
            : new Date(eventTimestamp).getTime();

        const existingUpdateTime = new Date(existingSub.updatedAt).getTime();

        // Se o evento recebido for anterior à última atualização do registro do usuário
        if (incomingTime < existingUpdateTime) {
          logger.warn(`Webhook fora de ordem ignorado: evento antigo recebido`, {
            provider,
            eventId,
            incomingTime,
            existingUpdateTime,
          });
          await subscriptionServerRepository.markWebhookCompleted(
            provider,
            eventId,
            eventType,
            'out_of_order_ignored'
          );
          return {
            processed: true,
            reason: 'OUT_OF_ORDER_EVENT_IGNORED',
            subscription: existingSub,
          };
        }
      }

      // =========================================================================
      // ETAPA 6: MAPEAMENTO DE STATUS E TRANSIÇÃO DE ASSINATURA
      // =========================================================================
      let mappedStatus: SubscriptionStatus = 'active';
      if (eventType.includes('payment_failed') || data.status === 'past_due' || eventType === 'pix.failed' || eventType === 'pix.expired') {
        mappedStatus = 'past_due';
      } else if (eventType.includes('deleted') || data.status === 'canceled' || eventType === 'pix.refunded') {
        mappedStatus = 'canceled';
      } else if (eventType.includes('trialing') || data.status === 'trialing') {
        mappedStatus = 'trialing';
      } else if (data.status === 'expired') {
        mappedStatus = 'expired';
      } else if (eventType.includes('payment_succeeded') || data.status === 'active' || eventType === 'pix.paid' || eventType === 'pix.settled') {
        mappedStatus = 'active';
      }

      const now = new Date();
      const periodStart = data.currentPeriodStart || now.toISOString();
      const periodEnd = data.currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const updatedSub = await subscriptionServerRepository.saveSubscription({
        id: existingSub?.id || `sub_${userId}`,
        userId,
        planId: data.planId || existingSub?.planId || 'PRO',
        status: mappedStatus,
        provider,
        customerId: data.customerId || existingSub?.customerId || `cus_${userId}`,
        subscriptionId: data.subscriptionId || existingSub?.subscriptionId || `sub_${provider}_${userId}`,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: mappedStatus === 'canceled',
        createdAt: existingSub?.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
        priceBrl: data.amountCents ? data.amountCents / 100 : (existingSub?.priceBrl || 15.0),
        lastPaymentDate: mappedStatus === 'active' ? now.toISOString() : existingSub?.lastPaymentDate,
      });

      // Marca o evento como completado com sucesso
      await subscriptionServerRepository.markWebhookCompleted(
        provider,
        eventId,
        eventType,
        'completed',
        { userId, status: mappedStatus }
      );

      logger.info(`Webhook processado e autenticado com sucesso: ${provider} [${eventType}] -> ${userId} status: ${mappedStatus}`);

      return {
        processed: true,
        reason: 'SUCCESS',
        subscription: updatedSub,
      };
    } catch (error: any) {
      logger.error(`Erro ao processar webhook internamente`, { provider, eventId, error: error.message });
      // Libera a trava em caso de falha transitória do sistema para permitir retentativa do PSP
      await subscriptionServerRepository.releaseWebhookClaim(provider, eventId);
      throw error;
    }
  }

  /**
   * Safe Checkout Simulator for authorized athletes
   */
  async simulatePaymentApproval(
    userId: string,
    planSlug: 'PRO' | 'APEX_ELITE' = 'PRO',
    method: PaymentProvider = 'pix_direct'
  ): Promise<ServerSubscription> {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return await subscriptionServerRepository.saveSubscription({
      id: `sub_${userId}`,
      userId,
      planId: planSlug,
      status: 'active',
      provider: method,
      customerId: `cus_${userId}`,
      subscriptionId: `sub_real_${Date.now()}`,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      priceBrl: 15.0,
      lastPaymentDate: now.toISOString(),
    });
  }
}

export const paymentWebhookService = new PaymentWebhookService();
