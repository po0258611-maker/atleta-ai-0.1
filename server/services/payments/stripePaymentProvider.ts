import {
  PaymentProvider,
  CreatePaymentInput,
  PaymentTransactionResult,
  PaymentGatewayStatus,
} from './paymentProvider.interface';
import { logger } from '../../middlewares/logger';

export class StripeGatewayProvider implements PaymentProvider {
  public providerName = 'stripe';
  private transactions: Map<string, PaymentTransactionResult> = new Map();
  private idempotencyStore: Map<string, PaymentTransactionResult> = new Map();

  async createPayment(input: CreatePaymentInput): Promise<PaymentTransactionResult> {
    if (this.idempotencyStore.has(input.idempotencyKey)) {
      return this.idempotencyStore.get(input.idempotencyKey)!;
    }

    const txId = `cs_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const result: PaymentTransactionResult = {
      transactionId: txId,
      provider: this.providerName,
      status: 'pending', // Starts pending until Stripe webhook signals checkout.session.completed
      amountCents: input.amountCents,
      currency: 'BRL',
      paymentMethod: 'credit_card',
      checkoutUrl: `https://checkout.stripe.com/c/pay/${txId}`,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    this.transactions.set(txId, result);
    this.idempotencyStore.set(input.idempotencyKey, result);
    logger.info(`Sessão Stripe Checkout criada: ${txId}`);
    return result;
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentGatewayStatus> {
    const tx = this.transactions.get(transactionId);
    return tx ? tx.status : 'failed';
  }

  async updateStatusFromWebhook(transactionId: string, status: PaymentGatewayStatus): Promise<boolean> {
    const tx = this.transactions.get(transactionId);
    if (!tx) return false;
    tx.status = status;
    this.transactions.set(transactionId, tx);
    return true;
  }

  async cancelPayment(transactionId: string): Promise<boolean> {
    const tx = this.transactions.get(transactionId);
    if (!tx) return false;
    tx.status = 'canceled';
    return true;
  }

  async refundPayment(transactionId: string): Promise<boolean> {
    const tx = this.transactions.get(transactionId);
    if (!tx) return false;
    tx.status = 'refunded';
    return true;
  }
}
