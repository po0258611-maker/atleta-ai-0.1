import type { Request, Response } from 'express';
import { paymentManagerService } from '../services/payments/paymentManagerService';
import { paymentWebhookService } from '../services/paymentWebhookService';
import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { entitlementService } from '../services/entitlementService';
import { logger } from '../middlewares/logger';
import { getPaidPlan, PaidPlanSlug } from '../config/plans';
import { PaymentMethodType } from '../services/payments/paymentProvider.interface';

const ALLOWED_PAYMENT_METHODS: Record<string, PaymentMethodType> = {
  pix: 'pix',
  pix_direct: 'pix',
  stripe: 'credit_card',
  credit_card: 'credit_card',
  google_play: 'google_play',
  boleto: 'boleto',
};

export async function handleCreatePaymentIntent(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  const email = req.athlete?.email;
  if (!uid || !email) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Autenticação com e-mail verificado necessária.' } });
  }

  const { paymentMethod: rawPaymentMethod, planSlug, idempotencyKey } = req.body ?? {};
  const plan = getPaidPlan(planSlug);

  if (!plan) {
    return res.status(400).json({ error: { code: 'INVALID_PLAN', message: 'Plano de pagamento inválido.' } });
  }

  if (typeof rawPaymentMethod !== 'string' || !ALLOWED_PAYMENT_METHODS[rawPaymentMethod]) {
    return res.status(400).json({ error: { code: 'INVALID_PAYMENT_METHOD', message: 'Método de pagamento inválido ou não suportado.' } });
  }

  const normalizedMethod = ALLOWED_PAYMENT_METHODS[rawPaymentMethod];

  if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) {
    return res.status(400).json({ error: { code: 'INVALID_IDEMPOTENCY_KEY', message: 'Chave de idempotência inválida.' } });
  }

  try {
    const result = await paymentManagerService.initiatePayment({
      userId: uid,
      userEmail: email,
      userName: req.athlete?.name || 'Atleta',
      planSlug: plan.slug as PaidPlanSlug,
      amountCents: plan.amountCents,
      paymentMethod: normalizedMethod,
      idempotencyKey,
    });

    return res.json(result);
  } catch (error: any) {
    logger.error('Falha ao iniciar pagamento', { error: error?.message || error, userId: uid });
    const message = error?.message === 'PAYMENT_METHOD_NOT_SUPPORTED'
      ? 'Este método de pagamento ainda não está disponível.'
      : 'O provedor de pagamento não está disponível no momento.';
    return res.status(error?.message === 'PAYMENT_METHOD_NOT_SUPPORTED' ? 400 : 503).json({
      error: {
        code: error?.message === 'PAYMENT_METHOD_NOT_SUPPORTED' ? 'PAYMENT_METHOD_NOT_SUPPORTED' : 'PAYMENT_PROVIDER_UNAVAILABLE',
        message,
      },
    });
  }
}

export async function handleCheckPaymentStatus(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  const { transactionId } = req.params;
  const provider = typeof req.query.provider === 'string' ? req.query.provider : 'pix_direct';

  if (!uid) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' } });
  }

  if (!transactionId || transactionId.length > 200) {
    return res.status(400).json({ error: { code: 'INVALID_TRANSACTION_ID', message: 'Identificador de transação inválido.' } });
  }

  const subscription = await subscriptionServerRepository.findBySubscriptionId(transactionId);
  if (subscription && subscription.userId !== uid) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Transação não pertence ao usuário autenticado.' } });
  }

  if (!subscription && process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transação não encontrada.' } });
  }

  try {
    const status = await paymentManagerService.checkPaymentStatus(provider, transactionId);
    return res.json({ transactionId, status });
  } catch (error: any) {
    logger.error('Falha ao consultar status de pagamento', { userId: uid, transactionId, error: error?.message || error });
    return res.status(503).json({ error: { code: 'PAYMENT_STATUS_UNAVAILABLE', message: 'Não foi possível consultar o status do pagamento.' } });
  }
}

export async function handlePaymentWebhook(req: Request, res: Response) {
  const provider = req.params.provider;
  const eventId = (req.headers['x-webhook-id'] as string | undefined) || req.body?.id;
  const eventType = req.body?.type || req.body?.event;
  const signature =
    (req.headers['stripe-signature'] as string | undefined) ||
    (req.headers['x-signature'] as string | undefined) ||
    (req.headers['x-hub-signature-256'] as string | undefined);
  const timestampHeader =
    (req.headers['x-signature-timestamp'] as string | undefined) ||
    (req.headers['x-webhook-timestamp'] as string | undefined);

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
    return res.status(401).json({ error: { code: 'MISSING_SIGNATURE', message: 'Assinatura criptográfica obrigatória ausente.' } });
  }

  const rawPayload = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  const data = req.body?.data ?? {};

  if (typeof data.subscription_id !== 'string' || !data.subscription_id || typeof data.customer_id !== 'string' || !data.customer_id) {
    return res.status(400).json({ error: { code: 'INVALID_WEBHOOK_DATA', message: 'Dados mínimos do pagamento ausentes.' } });
  }

  if (data.user_id !== undefined && typeof data.user_id !== 'string') {
    return res.status(400).json({ error: { code: 'INVALID_USER_ID', message: 'Identificador do usuário inválido.' } });
  }

  try {
    const result = await paymentWebhookService.handleWebhook({
      payload: {
        provider: provider as any,
        eventId,
        eventType,
        eventTimestamp: req.body?.created ? req.body.created * 1000 : req.body?.timestamp,
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
      rawPayload,
      signatureHeader: signature,
      timestampHeader,
    });

    if (!result.processed) {
      if (
        result.reason === 'MISSING_SIGNATURE' ||
        result.reason.includes('SIGNATURE') ||
        result.reason.includes('REPLAY') ||
        result.reason.includes('TIMESTAMP') ||
        result.reason.includes('FORMAT')
      ) {
        return res.status(401).json({
          error: {
            code: result.reason,
            message: 'Falha na autenticação criptográfica do webhook.',
          },
        });
      }
      if (result.reason === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' } });
      }
    }

    return res.json({ status: 'ok', result });
  } catch (error: any) {
    logger.error('Falha no processamento do webhook', { error: error?.message || error, provider, eventId });
    return res.status(500).json({ error: { code: 'WEBHOOK_PROCESSING_ERROR', message: 'Não foi possível processar o evento.' } });
  }
}

export async function handleGetSubscriptionHistory(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  if (!uid) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' } });
  }

  try {
    const history = await subscriptionServerRepository.getHistoryByUserId(uid);
    return res.json({ history });
  } catch (err: any) {
    logger.error('Erro ao buscar histórico de assinatura', { userId: uid, error: err?.message });
    return res.status(503).json({ error: { code: 'SUBSCRIPTION_HISTORY_UNAVAILABLE', message: 'Não foi possível carregar o histórico de assinatura.' } });
  }
}

export async function handleCancelSubscription(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  if (!uid) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' } });
  }

  try {
    const immediate = req.body?.immediate === true;
    const result = await entitlementService.cancelSubscription(uid, immediate);
    if (!result) {
      return res.status(404).json({ error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'Nenhuma assinatura encontrada para este usuário.' } });
    }

    const summary = await entitlementService.getEntitlementsSummary(uid);
    return res.json({ success: true, subscription: result, summary });
  } catch (err: any) {
    logger.error('Erro ao cancelar assinatura', { userId: uid, error: err?.message });
    return res.status(500).json({ error: { code: 'CANCEL_ERROR', message: 'Não foi possível cancelar a assinatura no momento.' } });
  }
}

export async function handleReactivateSubscription(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  if (!uid) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' } });
  }

  try {
    const result = await entitlementService.reactivateSubscription(uid);
    if (!result) {
      return res.status(404).json({ error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'Nenhuma assinatura encontrada para este usuário.' } });
    }

    const summary = await entitlementService.getEntitlementsSummary(uid);
    return res.json({ success: true, subscription: result, summary });
  } catch (err: any) {
    logger.error('Erro ao reativar assinatura', { userId: uid, error: err?.message });
    return res.status(500).json({ error: { code: 'REACTIVATE_ERROR', message: 'Não foi possível reativar a assinatura no momento.' } });
  }
}

export async function handleChangePlan(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  if (!uid) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' } });
  }

  const { planSlug } = req.body ?? {};
  if (!['FREE', 'PRO', 'APEX_ELITE'].includes(planSlug)) {
    return res.status(400).json({ error: { code: 'INVALID_PLAN', message: 'Plano inválido especificado.' } });
  }

  // Paid plan activation must come from a verified payment webhook.
  if (planSlug !== 'FREE') {
    return res.status(409).json({
      error: {
        code: 'PAYMENT_REQUIRED',
        message: 'Alteração para um plano pago deve ser concluída através do fluxo de pagamento.',
      },
    });
  }

  try {
    const result = await entitlementService.changePlan(uid, 'FREE');
    const summary = await entitlementService.getEntitlementsSummary(uid);
    return res.json({ success: true, subscription: result, summary });
  } catch (err: any) {
    logger.error('Erro ao alterar plano', { userId: uid, error: err?.message });
    return res.status(500).json({ error: { code: 'CHANGE_PLAN_ERROR', message: 'Não foi possível alterar o plano no momento.' } });
  }
}
