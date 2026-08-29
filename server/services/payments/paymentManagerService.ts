import {
  PaymentProvider,
  CreatePaymentInput,
  PaymentTransactionResult,
  PaymentGatewayStatus,
} from './paymentProvider.interface';
import { PixPaymentProvider } from './pixPaymentProvider';
import { StripeGatewayProvider } from './stripePaymentProvider';
import { subscriptionServerRepository } from '../../repositories/subscriptionServerRepository';
import { logger } from '../../middlewares/logger';
import { SERVER_CONFIG } from '../../config/env';
import { getPaidPlan } from '../../config/plans';

export class PaymentManagerService {
  private pixProvider = new PixPaymentProvider();
  private stripeProvider = new StripeGatewayProvider();

  getProvider(method: string): PaymentProvider {
    if (method === 'pix' || method === 'pix_direct') return this.pixProvider;
    return this.stripeProvider;
  }

  async initiatePayment(input: CreatePaymentInput): Promise<PaymentTransactionResult> {
    const plan = getPaidPlan(input.planSlug);
    if (!plan || plan.amountCents !== input.amountCents) {
      throw new Error('INVALID_SERVER_PRICING');
    }

    return this.getProvider(input.paymentMethod).createPayment(input);
  }

  async checkPaymentStatus(providerName: string, transactionId: string): Promise<PaymentGatewayStatus> {
    return this.getProvider(providerName).getPaymentStatus(transactionId);
  }

  async processVerifiedPayment(
    userId: string,
    transactionId: string,
    providerName: string,
    planSlug: 'PRO' | 'APEX_ELITE' = 'PRO'
  ): Promise<void> {
    const plan = getPaidPlan(planSlug);
    if (!plan) throw new Error('INVALID_PLAN');

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await subscriptionServerRepository.saveSubscription({
      id: `sub_${userId}`,
      userId,
      planId: plan.slug,
      status: 'active',
      provider: providerName as any,
      customerId: `cus_${userId}`,
      subscriptionId: transactionId,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      priceBrl: plan.priceBrl,
      lastPaymentDate: now.toISOString(),
    });

    logger.info(`Assinatura ativada após verificação real de pagamento: ${userId} (${transactionId})`);
  }
}

export const paymentManagerService = new PaymentManagerService();
