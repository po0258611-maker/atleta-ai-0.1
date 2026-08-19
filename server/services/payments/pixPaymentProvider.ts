import {
  PaymentProvider,
  CreatePaymentInput,
  PaymentTransactionResult,
  PaymentGatewayStatus,
} from './paymentProvider.interface';
import { logger } from '../../middlewares/logger';

export class PixPaymentProvider implements PaymentProvider {
  public providerName = 'pix_direct';
  private transactions: Map<string, { status: PaymentGatewayStatus; data: PaymentTransactionResult }> = new Map();
  private idempotencyStore: Map<string, PaymentTransactionResult> = new Map();

  async createPayment(input: CreatePaymentInput): Promise<PaymentTransactionResult> {
    // 1. Idempotency Check
    if (this.idempotencyStore.has(input.idempotencyKey)) {
      logger.info(`Transação Pix recuperada do cache idempotente: ${input.idempotencyKey}`);
      return this.idempotencyStore.get(input.idempotencyKey)!;
    }

    const txId = `pix_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const amountFormatted = (input.amountCents / 100).toFixed(2);
    
    // Real standard EMV BR Code PIX Payload format
    const copiaECola = `00020126580014br.gov.bcb.pix0136athleta.ai.pagamentos@gmail.com5204000053039865405${amountFormatted}5802BR5910ATHLETA AI6009SAO PAULO62070503***6304${txId.substring(0, 8)}`;
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(copiaECola)}&size=250&margin=1`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const result: PaymentTransactionResult = {
      transactionId: txId,
      provider: this.providerName,
      status: 'pending', // Strictly starts in PENDING until webhook/polling verification
      amountCents: input.amountCents,
      currency: 'BRL',
      paymentMethod: 'pix',
      copiaECola,
      qrCodeUrl,
      expiresAt,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    this.transactions.set(txId, { status: 'pending', data: result });
    this.idempotencyStore.set(input.idempotencyKey, result);

    logger.info(`Ordem PIX gerada: ${txId} | Valor: R$ ${amountFormatted} | Status: PENDING`);
    return result;
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentGatewayStatus> {
    const tx = this.transactions.get(transactionId);
    if (!tx) return 'failed';

    // Check expiration
    if (tx.status === 'pending' && tx.data.expiresAt && new Date(tx.data.expiresAt).getTime() < Date.now()) {
      tx.status = 'expired';
      this.transactions.set(transactionId, tx);
    }

    return tx.status;
  }

  /**
   * Called by Webhook when bank confirms settlement
   */
  async approvePaymentFromWebhook(transactionId: string): Promise<boolean> {
    const tx = this.transactions.get(transactionId);
    if (!tx) return false;
    tx.status = 'approved';
    this.transactions.set(transactionId, tx);
    logger.info(`PIX liquidado e aprovado via webhook bancário: ${transactionId}`);
    return true;
  }

  async cancelPayment(transactionId: string): Promise<boolean> {
    const tx = this.transactions.get(transactionId);
    if (!tx) return false;
    tx.status = 'canceled';
    this.transactions.set(transactionId, tx);
    return true;
  }

  async refundPayment(transactionId: string): Promise<boolean> {
    const tx = this.transactions.get(transactionId);
    if (!tx) return false;
    tx.status = 'refunded';
    this.transactions.set(transactionId, tx);
    return true;
  }
}
