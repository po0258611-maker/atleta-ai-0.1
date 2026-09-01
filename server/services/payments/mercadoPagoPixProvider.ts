import { PaymentProvider, CreatePaymentInput, PaymentTransactionResult, PaymentGatewayStatus } from './paymentProvider.interface';
import { SERVER_CONFIG } from '../../config/env';
import { paymentTransactionRepository } from '../../repositories/paymentTransactionRepository';
import { logger } from '../../middlewares/logger';

const MERCADO_PAGO_API = 'https://api.mercadopago.com';

type MercadoPagoPayment = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  date_of_expiration?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
};

function mapStatus(status?: string): PaymentGatewayStatus {
  switch (status) {
    case 'approved': return 'approved';
    case 'pending': case 'in_process': case 'in_mediation': return 'pending';
    case 'cancelled': case 'canceled': return 'canceled';
    case 'refunded': case 'charged_back': return 'refunded';
    case 'rejected': case 'charged_back_reversed': return 'failed';
    default: return 'pending';
  }
}

function assertConfigured(): void {
  if (!SERVER_CONFIG.MERCADOPAGO_ACCESS_TOKEN) throw new Error('MERCADOPAGO_ACCESS_TOKEN_NOT_CONFIGURED');
}

async function mercadoPagoRequest<T>(path: string, init: RequestInit): Promise<T> {
  assertConfigured();
  const response = await fetch(`${MERCADO_PAGO_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${SERVER_CONFIG.MERCADOPAGO_ACCESS_TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const detail = typeof body === 'object' && body !== null && 'message' in body ? String((body as { message?: unknown }).message || '') : '';
    throw new Error(`MERCADOPAGO_API_ERROR:${response.status}:${detail || 'request_failed'}`);
  }
  return body as T;
}

export class MercadoPagoPixProvider implements PaymentProvider {
  public providerName = 'mercadopago';

  async createPayment(input: CreatePaymentInput): Promise<PaymentTransactionResult> {
    if (input.paymentMethod !== 'pix') throw new Error('MERCADOPAGO_PIX_METHOD_REQUIRED');
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error('INVALID_PAYMENT_AMOUNT');
    if (!input.userEmail || !input.userEmail.includes('@')) throw new Error('INVALID_PAYER_EMAIL');

    const existing = await paymentTransactionRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing && existing.provider === this.providerName) return {
      transactionId: existing.transactionId, provider: existing.provider, status: existing.status, amountCents: existing.amountCents,
      currency: existing.currency, paymentMethod: existing.paymentMethod, qrCodeUrl: existing.qrCodeUrl, copiaECola: existing.qrCode,
      expiresAt: existing.expiresAt, idempotencyKey: existing.idempotencyKey, createdAt: existing.createdAt,
    };

    const externalReference = `athleta_ai:${input.userId}:${input.planSlug}:${input.idempotencyKey}`;
    const amount = Number((input.amountCents / 100).toFixed(2));
    const payment = await mercadoPagoRequest<MercadoPagoPayment>('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        transaction_amount: amount,
        description: `ATHLETA AI - Plano ${input.planSlug}`,
        payment_method_id: 'pix',
        payer: { email: input.userEmail, first_name: input.userName?.trim().split(/\s+/)[0] || 'Cliente' },
        external_reference: externalReference,
        notification_url: SERVER_CONFIG.MERCADOPAGO_NOTIFICATION_URL || undefined,
        metadata: { athleta_user_id: input.userId, athleta_plan: input.planSlug, athleta_idempotency_key: input.idempotencyKey, ...(input.metadata || {}) },
      }),
    });

    if (!payment.id) throw new Error('MERCADOPAGO_PAYMENT_ID_MISSING');
    if (payment.currency_id && payment.currency_id !== 'BRL') throw new Error('MERCADOPAGO_CURRENCY_MISMATCH');
    if (typeof payment.transaction_amount === 'number' && Number(payment.transaction_amount.toFixed(2)) !== amount) throw new Error('MERCADOPAGO_AMOUNT_MISMATCH');

    const transactionData = payment.point_of_interaction?.transaction_data;
    if (!transactionData?.qr_code || !transactionData.qr_code_base64) throw new Error('MERCADOPAGO_PIX_DATA_MISSING');

    const createdAt = new Date().toISOString();
    const expiresAt = payment.date_of_expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const result: PaymentTransactionResult = {
      transactionId: String(payment.id), provider: this.providerName, status: mapStatus(payment.status), amountCents: input.amountCents,
      currency: payment.currency_id || 'BRL', paymentMethod: 'pix', copiaECola: transactionData.qr_code,
      qrCodeUrl: `data:image/png;base64,${transactionData.qr_code_base64}`, expiresAt, idempotencyKey: input.idempotencyKey, createdAt,
    };

    await paymentTransactionRepository.save({ transactionId: result.transactionId, provider: this.providerName, userId: input.userId, userEmail: input.userEmail,
      planSlug: input.planSlug, amountCents: input.amountCents, currency: result.currency, paymentMethod: 'pix', status: result.status,
      idempotencyKey: input.idempotencyKey, externalReference, createdAt, updatedAt: createdAt, expiresAt, providerStatus: payment.status,
      qrCode: transactionData.qr_code, qrCodeUrl: result.qrCodeUrl });

    logger.info(`Mercado Pago PIX criado: ${payment.id} | R$ ${amount.toFixed(2)} | status=${payment.status || 'unknown'}`);
    return result;
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentGatewayStatus> {
    if (!transactionId || !/^\d+$/.test(transactionId)) return 'failed';
    const payment = await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(transactionId)}`, { method: 'GET' });
    const status = mapStatus(payment.status);
    try { await paymentTransactionRepository.updateStatus(transactionId, status, payment.status); }
    catch (error) { logger.warn('Status Mercado Pago consultado, mas não persistido', { transactionId, error }); }
    return status;
  }

  async cancelPayment(transactionId: string): Promise<boolean> {
    if (!transactionId || !/^\d+$/.test(transactionId)) return false;
    try {
      await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(transactionId)}`, { method: 'PUT', headers: { 'X-Idempotency-Key': `cancel:${transactionId}` }, body: JSON.stringify({ status: 'cancelled' }) });
      await paymentTransactionRepository.updateStatus(transactionId, 'canceled', 'cancelled');
      return true;
    } catch (error) { logger.error(`Falha ao cancelar pagamento Mercado Pago ${transactionId}`, error); return false; }
  }

  async refundPayment(transactionId: string, amountCents?: number): Promise<boolean> {
    if (!transactionId || !/^\d+$/.test(transactionId)) return false;
    try {
      if (amountCents !== undefined && (!Number.isInteger(amountCents) || amountCents <= 0)) return false;
      const body = amountCents !== undefined ? { amount: Number((amountCents / 100).toFixed(2)) } : undefined;
      const refundKey = `refund:${transactionId}:${amountCents === undefined ? 'full' : amountCents}`;
      await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(transactionId)}/refunds`, { method: 'POST', headers: { 'X-Idempotency-Key': refundKey }, ...(body ? { body: JSON.stringify(body) } : {}) });
      await paymentTransactionRepository.updateStatus(transactionId, 'refunded', 'refunded');
      return true;
    } catch (error) { logger.error(`Falha ao reembolsar pagamento Mercado Pago ${transactionId}`, error); return false; }
  }
}

export const mercadoPagoPixProvider = new MercadoPagoPixProvider();
