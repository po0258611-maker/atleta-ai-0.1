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

export class PaymentManagerService {
  private pixProvider = new PixPaymentProvider();
  private stripeProvider = new StripeGatewayProvider();

  getProvider(method: string): PaymentProvider {
    if (method === 'pix' || method === 'pix_direct') {
      return this.pixProvider;
    }
    return this.stripeProvider;
  }

  async initiatePayment(input: CreatePaymentInput): Promise<PaymentTransactionResult> {
    const provider = this.getProvider(input.paymentMethod);
    return await provider.createPayment(input);
  }

  async checkPaymentStatus(providerName: string, transactionId: string): Promise<PaymentGatewayStatus> {
    const provider = this.getProvider(providerName);
    return await provider.getPaymentStatus(transactionId);
  }

  /**
   * Process verified webhook event to upgrade subscription
   */
  async processVerifiedPayment(
    userId: string,
    transactionId: string,
    providerName: string,
    planSlug: 'PRO' | 'APEX_ELITE' = 'PRO'
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await subscriptionServerRepository.saveSubscription({
      id: `sub_${userId}`,
      userId,
      planId: planSlug,
      status: 'active',
      provider: providerName as any,
      customerId: `cus_${userId}`,
      subscriptionId: transactionId,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      priceBrl: planSlug === 'APEX_ELITE' ? 120.00 : 15.00,
      lastPaymentDate: now.toISOString(),
    });

    logger.info(`Assinatura ativada após verificação real de pagamento: ${userId} (${transactionId})`);
  }
}

export const paymentManagerService = new PaymentManagerService();
