import type { Request, Response } from 'express';
import { paymentManagerService } from '../services/payments/paymentManagerService';
import { paymentWebhookService } from '../services/paymentWebhookService';
import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { entitlementService } from '../services/entitlementService';
import { logger } from '../middlewares/logger';

export async function handleCreatePaymentIntent(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  if (!uid) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária.' } });
  }

  const { paymentMethod, planSlug, idempotencyKey } = req.body;

  if (!idempotencyKey) {
    return res.status(400).json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Chave de idempotência obrigatória.' } });
  }

  const result = await paymentManagerService.initiatePayment({
    userId: uid,
    userEmail: req.athlete?.email || 'atleta@gmail.com',
    userName: req.athlete?.name || 'Atleta',
    planSlug: planSlug === 'APEX_ELITE' ? 'APEX_ELITE' : 'PRO',
    amountCents: planSlug === 'APEX_ELITE' ? 12000 : 1500,
    paymentMethod: paymentMethod || 'pix',
    idempotencyKey,
  });

  return res.json(result);
}

export async function handleCheckPaymentStatus(req: Request, res: Response) {
  const { transactionId } = req.params;
  const provider = (req.query.provider as string) || 'pix_direct';

  const status = await paymentManagerService.checkPaymentStatus(provider, transactionId);
  return res.json({ transactionId, status });
}

export async function handlePaymentWebhook(req: Request, res: Response) {
  const provider = (req.params.provider as any) || 'stripe';
  const eventId = req.headers['x-webhook-id'] as string || req.body?.id || `evt_${Date.now()}`;
  const eventType = req.body?.type || req.body?.event || 'payment_succeeded';
  const signature = req.headers['x-signature'] as string || req.headers['stripe-signature'] as string;

  if (!signature && process.env.NODE_ENV === 'production') {
    logger.warn('Webhook rejeitado: Assinatura HMAC ausente');
    return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Assinatura inválida.' } });
  }

  const result = await paymentWebhookService.handleWebhook(
    {
      provider,
      eventId,
      eventType,
      data: {
        customerId: req.body?.data?.customer_id || req.body?.customerId || 'cus_unknown',
        subscriptionId: req.body?.data?.subscription_id || req.body?.subscriptionId || `sub_${Date.now()}`,
        userId: req.body?.data?.user_id || req.body?.userId,
        status: req.body?.data?.status || 'active',
        planId: req.body?.data?.plan_id || 'PRO',
        currentPeriodStart: req.body?.data?.current_period_start,
        currentPeriodEnd: req.body?.data?.current_period_end,
        amountCents: req.body?.data?.amount_cents || 1500,
      },
    },
    signature
  );

  if (!result.processed && result.reason === 'USER_NOT_FOUND') {
    return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' } });
  }

  return res.json({ status: 'ok', result });
}

export async function handleGetSubscriptionHistory(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  if (!uid) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' } });
  }

  const history = await subscriptionServerRepository.getHistoryByUserId(uid);
  return res.json({ history });
}
