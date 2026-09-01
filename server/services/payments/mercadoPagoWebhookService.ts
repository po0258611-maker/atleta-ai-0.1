import crypto from 'crypto';
import { SERVER_CONFIG } from '../../config/env';
import { getPaidPlan } from '../../config/plans';
import { paymentManagerService } from './paymentManagerService';
import { paymentTransactionRepository } from '../../repositories/paymentTransactionRepository';
import { subscriptionServerRepository } from '../../repositories/subscriptionServerRepository';
import { logger } from '../../middlewares/logger';

type MercadoPagoPayment = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
};

const API_URL = 'https://api.mercadopago.com';
const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

function parseSignature(signature: string): { ts?: string; v1?: string } {
  const result: { ts?: string; v1?: string } = {};
  for (const part of signature.split(',')) {
    const [key, value] = part.split('=').map((item) => item.trim());
    if (key === 'ts' || key === 'v1') result[key] = value;
  }
  return result;
}

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a.toLowerCase(), 'hex'), Buffer.from(b.toLowerCase(), 'hex'));
}

export function verifyMercadoPagoWebhookSignature(
  dataId: string,
  requestId: string,
  signature: string,
  secret = SERVER_CONFIG.MERCADOPAGO_WEBHOOK_SECRET
): boolean {
  if (!dataId || !requestId || !secret) return false;
  const parsed = parseSignature(signature);
  if (!parsed.ts || !parsed.v1 || !/^\d+$/.test(parsed.ts)) return false;
  const timestampValue = Number(parsed.ts);
  if (!Number.isSafeInteger(timestampValue)) return false;
  const timestampMs = parsed.ts.length >= 13 ? timestampValue : timestampValue * 1000;
  if (!Number.isSafeInteger(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_TIMESTAMP_SKEW_MS) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${parsed.ts};`;
  const digest = crypto.createHmac('sha256', secret).update(manifest, 'utf8').digest('hex');
  return safeEqualHex(digest, parsed.v1);
}

async function getPayment(paymentId: string): Promise<MercadoPagoPayment> {
  if (!SERVER_CONFIG.MERCADOPAGO_ACCESS_TOKEN) throw new Error('MERCADOPAGO_ACCESS_TOKEN_NOT_CONFIGURED');
  const response = await fetch(`${API_URL}/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${SERVER_CONFIG.MERCADOPAGO_ACCESS_TOKEN}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`MERCADOPAGO_PAYMENT_LOOKUP_FAILED:${response.status}`);
  return response.json() as Promise<MercadoPagoPayment>;
}

function parseExternalReference(reference: string | undefined) {
  if (!reference) return null;
  const match = /^athleta_ai:([^:]+):(PRO|APEX_ELITE):([A-Za-z0-9._:-]{16,128})$/.exec(reference);
  if (!match) return null;
  return { userId: match[1], planSlug: match[2] as 'PRO' | 'APEX_ELITE', idempotencyKey: match[3] };
}

export class MercadoPagoWebhookService {
  async processPaymentWebhook(input: { paymentId: string; requestId: string; signature: string; eventId: string; eventType: string }): Promise<{ processed: boolean; reason: string }> {
    if (!verifyMercadoPagoWebhookSignature(input.paymentId, input.requestId, input.signature)) {
      logger.warn('Mercado Pago webhook rejeitado por assinatura inválida', { eventId: input.eventId });
      return { processed: false, reason: 'INVALID_SIGNATURE' };
    }

    const claim = await subscriptionServerRepository.tryClaimWebhookEvent('mercadopago', input.eventId, input.eventType);
    if (!claim.claimed && claim.alreadyProcessed) return { processed: true, reason: 'ALREADY_PROCESSED' };

    try {
      const payment = await getPayment(input.paymentId);
      if (String(payment.id) !== input.paymentId) throw new Error('MERCADOPAGO_PAYMENT_ID_MISMATCH');
      const reference = parseExternalReference(payment.external_reference);
      if (!reference) throw new Error('MERCADOPAGO_EXTERNAL_REFERENCE_INVALID');
      const plan = getPaidPlan(reference.planSlug);
      if (!plan) throw new Error('INVALID_PLAN');

      const transaction = await paymentTransactionRepository.findByTransactionId(input.paymentId);
      if (!transaction) throw new Error('MERCADOPAGO_TRANSACTION_NOT_FOUND');
      if (transaction.provider !== 'mercadopago') throw new Error('MERCADOPAGO_PROVIDER_MISMATCH');
      if (transaction.userId !== reference.userId) throw new Error('MERCADOPAGO_USER_MISMATCH');
      if (transaction.planSlug !== reference.planSlug) throw new Error('MERCADOPAGO_PLAN_MISMATCH');
      if (transaction.idempotencyKey !== reference.idempotencyKey) throw new Error('MERCADOPAGO_IDEMPOTENCY_MISMATCH');
      if (transaction.amountCents !== plan.amountCents || transaction.currency !== 'BRL') throw new Error('MERCADOPAGO_TRANSACTION_AMOUNT_MISMATCH');

      const expectedAmount = Number((plan.amountCents / 100).toFixed(2));
      if (payment.currency_id !== 'BRL' || payment.transaction_amount !== expectedAmount) throw new Error('MERCADOPAGO_AMOUNT_MISMATCH');

      if (payment.status !== 'approved') {
        const mappedStatus = payment.status === 'cancelled' || payment.status === 'canceled' ? 'canceled' : payment.status === 'rejected' ? 'failed' : 'pending';
        await paymentTransactionRepository.updateStatus(input.paymentId, mappedStatus, payment.status || 'unknown');
        await subscriptionServerRepository.markWebhookCompleted('mercadopago', input.eventId, input.eventType, 'ignored', { paymentId: input.paymentId, paymentStatus: payment.status || 'unknown' });
        return { processed: true, reason: `PAYMENT_NOT_APPROVED:${payment.status || 'unknown'}` };
      }

      await paymentManagerService.processVerifiedPayment(reference.userId, input.paymentId, 'mercadopago', reference.planSlug);
      await subscriptionServerRepository.markWebhookCompleted('mercadopago', input.eventId, input.eventType, 'completed', { userId: reference.userId, planSlug: reference.planSlug, paymentId: input.paymentId });
      logger.info('Mercado Pago payment aprovado e assinatura ativada', { paymentId: input.paymentId, userId: reference.userId, plan: reference.planSlug });
      return { processed: true, reason: 'PAYMENT_APPROVED' };
    } catch (error) {
      await subscriptionServerRepository.releaseWebhookClaim('mercadopago', input.eventId);
      throw error;
    }
  }
}

export const mercadoPagoWebhookService = new MercadoPagoWebhookService();
