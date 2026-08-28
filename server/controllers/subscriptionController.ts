import type { Request, Response } from 'express';
import { paymentManagerService } from '../services/payments/paymentManagerService';
import { paymentWebhookService } from '../services/paymentWebhookService';
import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { logger } from '../middlewares/logger';
import { getPaidPlan, PaidPlanSlug } from '../config/plans';

const ALLOWED_PAYMENT_METHODS = new Set(['pix', 'pix_direct', 'stripe', 'credit_card']);

export async function handleCreatePaymentIntent(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  const email = req.athlete?.email;
  if (!uid || !email) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Autenticação com e-mail verificado necessária.' } });
  }

  const { paymentMethod, planSlug, idempotencyKey } = req.body ?? {};
  const plan = getPaidPlan(planSlug);

  if (!plan) {
    return res.status(400).json({ error: { code: 'INVALID_PLAN', message: 'Plano de pagamento inválido.' } });
  }

  if (typeof paymentMethod !== 'string' || !ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
    return res.status(400).json({ error: { code: 'INVALID_PAYMENT_METHOD', message: 'Método de pagamento inválido.' } });
  }

  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return res.status(400).json({ error: { code: 'INVALID_IDEMPOTENCY_KEY', message: 'Chave de idempotência inválida.' } });
  }

  try {
    const result = await paymentManagerService.initiatePayment({
      userId: uid,
      userEmail: email,
      userName: req.athlete?.name || 'Atleta',
      planSlug: plan.slug as PaidPlanSlug,
      amountCents: plan.amountCents,
      paymentMethod,
      idempotencyKey,
    });

    return res.json(result);
  } catch (error) {
    logger.error('Falha ao iniciar pagamento', { error, userId: uid });
    return res.status(503).json({
      error: {
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'O provedor de pagamento não está disponível no momento.',
      },
    });
  }
}

export async function handleCheckPaymentStatus(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  const { transactionId } = req.params;
  const provider = (req.query.provider as string) || 'pix_direct';

  if (!uid) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' } });
  }

  if (!transactionId || transactionId.length > 200) {
    return res.status(400).json({ error: { code: 'INVALID_TRANSACTION_ID', message: 'Identificador de transação inválido.' } });
  }

  const status = await paymentManagerService.checkPaymentStatus(provider, transactionId);
  return res.json({ transactionId, status });
}

export async function handlePaymentWebhook(req: Request, res: Response) {
  const provider = req.params.provider;
  const eventId = (req.headers['x-webhook-id'] as string | undefined) || req.body?.id;
  const eventType = req.body?.type || req.body?.event;
  const signature = (req.headers['x-signature'] as string | undefined) || (req.headers['stripe-signature'] as string | undefined);

  if (!['stripe', 'pix_direct', 'pix'].includes(provider)) {
    return res.status(400).json({ error: { code: 'INVALID_PROVIDER', message: 'Provedor de pagamento inválido.' } });
  }

  if (typeof eventId !== 'string' || eventId.length < 8 || eventId.length > 200) {
    return res.status(400).json({ error: { code: 'INVALID_WEBHOOK_EVENT_ID', message: 'Identificador do evento é obrigatório.' } });
  }

  if (typeof eventType !== 'string' || eventType.length < 3 || eventType.length > 200) {
    return res.status(400).json({ error: { code: 'INVALID_WEBHOOK_EVENT_TYPE', message: 'Tipo de evento é obrigatório.' } });
  }

  if (!signature) {
    logger.warn('Webhook rejeitado: assinatura ausente', { provider, eventId });
    return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Assinatura inválida.' } });
  }

  const data = req.body?.data ?? {};
  if (typeof data.subscription_id !== 'string' || !data.subscription_id || typeof data.customer_id !== 'string' || !data.customer_id) {
    return res.status(400).json({ error: { code: 'INVALID_WEBHOOK_DATA', message: 'Dados mínimos do pagamento ausentes.' } });
  }

  if (data.user_id !== undefined && typeof data.user_id !== 'string') {
    return res.status(400).json({ error: { code: 'INVALID_USER_ID', message: 'Identificador do usuário inválido.' } });
  }

  try {
    const result = await paymentWebhookService.handleWebhook(
      {
        provider: provider as any,
        eventId,
        eventType,
        data: {
          customerId: data.customer_id,
          subscriptionId: data.subscription_id,
          userId: data.user_id,
          status: typeof data.status === 'string' ? data.status : 'pending',
          planId: data.plan_id,
          currentPeriodStart: data.current_period_start,
          currentPeriodEnd: data.current_period_end,
          amountCents: typeof data.amount_cents === 'number' ? data.amount_cents : undefined,
        },
      },
      signature
    );

    if (!result.processed && result.reason === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' } });
    }

    return res.json({ status: 'ok', result });
  } catch (error) {
    logger.error('Falha no processamento do webhook', { error, provider, eventId });
    return res.status(500).json({ error: { code: 'WEBHOOK_PROCESSING_ERROR', message: 'Não foi possível processar o evento.' } });
  }
}

export async function handleGetSubscriptionHistory(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  if (!uid) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' } });
  }

  const history = await subscriptionServerRepository.getHistoryByUserId(uid);
  return res.json({ history });
}
