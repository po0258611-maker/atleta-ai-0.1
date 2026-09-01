import {
  PaymentProvider,
  CreatePaymentInput,
  PaymentTransactionResult,
  PaymentGatewayStatus,
} from './paymentProvider.interface';
import { SERVER_CONFIG } from '../../config/env';
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
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
};

function mapStatus(status?: string): PaymentGatewayStatus {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'pending':
    case 'in_process':
    case 'in_mediation':
      return 'pending';
    case 'cancelled':
    case 'canceled':
      return 'canceled';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    case 'rejected':
    case 'charged_back_reversed':
      return 'failed';
    default:
      return 'pending';
  }
}

function assertConfigured(): void {
  if (!SERVER_CONFIG.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN_NOT_CONFIGURED');
  }
}

async function mercadoPagoRequest<T>(path: string, init: RequestInit): Promise<T> {
  assertConfigured();

  const response = await fetch(`${MERCADO_PAGO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SERVER_CONFIG.MERCADOPAGO_ACCESS_TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const detail = typeof body === 'object' && body !== null && 'message' in body
      ? String((body as { message?: unknown }).message || '')
      : '';
    throw new Error(`MERCADOPAGO_API_ERROR:${response.status}:${detail || 'request_failed'}`);
  }

  return body as T;
}

export class MercadoPagoPixProvider implements PaymentProvider {
  public providerName = 'mercadopago_pix';

  async createPayment(input: CreatePaymentInput): Promise<PaymentTransactionResult> {
    if (input.paymentMethod !== 'pix') {
      throw new Error('MERCADOPAGO_PIX_METHOD_REQUIRED');
    }
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error('INVALID_PAYMENT_AMOUNT');
    }
    if (!input.userEmail || !input.userEmail.includes('@')) {
      throw new Error('INVALID_PAYER_EMAIL');
    }

    const externalReference = `athleta_ai:${input.userId}:${input.planSlug}:${input.idempotencyKey}`;
    const amount = Number((input.amountCents / 100).toFixed(2));

    const payment = await mercadoPagoRequest<MercadoPagoPayment>('/v1/payments', {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: `ATHLETA AI - Plano ${input.planSlug}`,
        payment_method_id: 'pix',
        payer: {
          email: input.userEmail,
          first_name: input.userName?.trim().split(/\s+/)[0] || 'Cliente',
        },
        external_reference: externalReference,
        notification_url: SERVER_CONFIG.MERCADOPAGO_NOTIFICATION_URL || undefined,
        metadata: {
          athleta_user_id: input.userId,
          athleta_plan: input.planSlug,
          athleta_idempotency_key: input.idempotencyKey,
          ...(input.metadata || {}),
        },
      }),
    });

    if (!payment.id) {
      throw new Error('MERCADOPAGO_PAYMENT_ID_MISSING');
    }

    const transactionData = payment.point_of_interaction?.transaction_data;
    if (!transactionData?.qr_code || !transactionData.qr_code_base64) {
      throw new Error('MERCADOPAGO_PIX_DATA_MISSING');
    }

    const createdAt = new Date().toISOString();
    const expiresAt = payment.date_of_expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const qrCodeUrl = `data:image/png;base64,${transactionData.qr_code_base64}`;

    const result: PaymentTransactionResult = {
      transactionId: String(payment.id),
      provider: this.providerName,
      status: mapStatus(payment.status),
      amountCents: input.amountCents,
      currency: payment.currency_id || 'BRL',
      paymentMethod: 'pix',
      copiaECola: transactionData.qr_code,
      qrCodeUrl,
      expiresAt,
      idempotencyKey: input.idempotencyKey,
      createdAt,
    };

    logger.info(`Mercado Pago PIX criado: ${payment.id} | R$ ${amount.toFixed(2)} | status=${payment.status || 'unknown'}`);
    return result;
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentGatewayStatus> {
    if (!transactionId || !/^\d+$/.test(transactionId)) return 'failed';
    const payment = await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(transactionId)}`, {
      method: 'GET',
    });
    return mapStatus(payment.status);
  }

  async cancelPayment(transactionId: string): Promise<boolean> {
    if (!transactionId || !/^\d+$/.test(transactionId)) return false;
    try {
      await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(transactionId)}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      return true;
    } catch (error) {
      logger.error(`Falha ao cancelar pagamento Mercado Pago ${transactionId}`, error);
      return false;
    }
  }

  async refundPayment(transactionId: string, amountCents?: number): Promise<boolean> {
    if (!transactionId || !/^\d+$/.test(transactionId)) return false;
    try {
      const body = amountCents && amountCents > 0
        ? { amount: Number((amountCents / 100).toFixed(2)) }
        : undefined;
      await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(transactionId)}/refunds`, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      return true;
    } catch (error) {
      logger.error(`Falha ao reembolsar pagamento Mercado Pago ${transactionId}`, error);
      return false;
    }
  }
}

export const mercadoPagoPixProvider = new MercadoPagoPixProvider();
