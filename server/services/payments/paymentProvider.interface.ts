/**
 * Server Payment Provider Abstraction
 * Supports real payment gateways (Stripe, Mercado Pago, Asaas, Pix Direct, Google Play)
 * 
 * Normalized states:
 * - pending: awaiting customer payment
 * - approved: payment confirmed and verified
 * - failed: payment declined by processor
 * - expired: invoice/pix expired
 * - refunded: amount returned to customer
 * - canceled: transaction aborted
 */

export type PaymentGatewayStatus =
  | 'pending'
  | 'approved'
  | 'failed'
  | 'expired'
  | 'refunded'
  | 'canceled';

export type PaymentMethodType = 'pix' | 'credit_card' | 'google_play' | 'boleto';

export interface CreatePaymentInput {
  userId: string;
  userEmail: string;
  userName: string;
  planSlug: 'PRO' | 'APEX_ELITE';
  amountCents: number;
  paymentMethod: PaymentMethodType;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentTransactionResult {
  transactionId: string;
  provider: string;
  status: PaymentGatewayStatus;
  amountCents: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  qrCodeUrl?: string;
  copiaECola?: string;
  expiresAt?: string;
  checkoutUrl?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface PaymentProvider {
  providerName: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentTransactionResult>;
  getPaymentStatus(transactionId: string): Promise<PaymentGatewayStatus>;
  cancelPayment(transactionId: string): Promise<boolean>;
  refundPayment(transactionId: string, amountCents?: number): Promise<boolean>;
}
