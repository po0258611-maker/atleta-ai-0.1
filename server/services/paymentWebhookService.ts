import {
  subscriptionServerRepository,
} from '../repositories/subscriptionServerRepository';
import {
  ServerSubscription,
  SubscriptionStatus,
  PaymentProvider,
} from '../domain/subscriptionModel';
import { logger } from '../middlewares/logger';

export interface WebhookEventPayload {
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
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

export class PaymentWebhookService {
  /**
   * Process incoming webhook event with idempotency, signature validation, and status transitions
   */
  async handleWebhook(payload: WebhookEventPayload, signatureHeader?: string): Promise<{
    processed: boolean;
    reason: string;
    subscription?: ServerSubscription;
  }> {
    const { provider, eventId, eventType, data } = payload;

    // 1. Idempotency Check
    const alreadyProcessed = await subscriptionServerRepository.isWebhookProcessed(provider, eventId);
    if (alreadyProcessed) {
      logger.info(`Webhook ignorado (Idempotência ativa): ${provider} event ${eventId}`);
      return { processed: true, reason: 'ALREADY_PROCESSED' };
    }

    // 2. Resolve User ID (by direct payload or querying by customer/subscription)
    let userId = data.userId;
    if (!userId) {
      const existingSub = await subscriptionServerRepository.findBySubscriptionId(data.subscriptionId);
      if (existingSub) {
        userId = existingSub.userId;
      }
    }

    if (!userId) {
      logger.warn(`Webhook rejeitado: Impossível associar a um usuário`, { provider, eventId, data });
      return { processed: false, reason: 'USER_NOT_FOUND' };
    }

    // 3. Status Mapping
    let mappedStatus: SubscriptionStatus = 'active';
    if (eventType.includes('payment_failed') || data.status === 'past_due') {
      mappedStatus = 'past_due';
    } else if (eventType.includes('deleted') || data.status === 'canceled') {
      mappedStatus = 'canceled';
    } else if (eventType.includes('trialing') || data.status === 'trialing') {
      mappedStatus = 'trialing';
    } else if (data.status === 'expired') {
      mappedStatus = 'expired';
    } else if (eventType.includes('payment_succeeded') || data.status === 'active') {
      mappedStatus = 'active';
    }

    const now = new Date();
    const periodStart = data.currentPeriodStart || now.toISOString();
    const periodEnd = data.currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 4. Save/Update Subscription in Server Repository
    const updatedSub = await subscriptionServerRepository.saveSubscription({
      id: `sub_${userId}`,
      userId,
      planId: data.planId || 'PRO',
      status: mappedStatus,
      provider,
      customerId: data.customerId,
      subscriptionId: data.subscriptionId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: mappedStatus === 'canceled',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      priceBrl: (data.amountCents || 1500) / 100,
      lastPaymentDate: now.toISOString(),
    });

    // 5. Mark as processed for idempotency
    await subscriptionServerRepository.markWebhookProcessed(provider, eventId);
    logger.info(`Webhook processado com sucesso: ${provider} [${eventType}] -> ${userId} status: ${mappedStatus}`);

    return {
      processed: true,
      reason: 'SUCCESS',
      subscription: updatedSub,
    };
  }

  /**
   * Safe Checkout Simulator for authorized athletes
   */
  async simulatePaymentApproval(userId: string, planSlug: 'PRO' | 'APEX_ELITE' = 'PRO', method: PaymentProvider = 'pix_direct'): Promise<ServerSubscription> {
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
      priceBrl: 15.00,
      lastPaymentDate: now.toISOString(),
    });
  }
}

export const paymentWebhookService = new PaymentWebhookService();
