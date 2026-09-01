import type { Request, Response } from 'express';
import { mercadoPagoWebhookService } from '../services/payments/mercadoPagoWebhookService';
import { logger } from '../middlewares/logger';

export async function handleMercadoPagoWebhook(req: Request, res: Response) {
  const body = req.body ?? {};
  const dataId = typeof req.query['data.id'] === 'string' ? req.query['data.id'] : '';
  const requestId = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : '';
  const signature = typeof req.headers['x-signature'] === 'string' ? req.headers['x-signature'] : '';
  const eventType = typeof body.type === 'string' ? body.type : '';
  const eventId = typeof body.id === 'string' || typeof body.id === 'number' ? String(body.id) : '';

  // Mercado Pago can send notifications without a payment payload for unrelated topics.
  // Only payment notifications are allowed to reach the payment processor.
  if (eventType !== 'payment' && body.action !== 'payment.updated') {
    return res.status(200).json({ status: 'ignored', reason: 'UNSUPPORTED_EVENT' });
  }

  if (!/^\d+$/.test(dataId) || !requestId || !signature || !eventId) {
    return res.status(400).json({ error: { code: 'INVALID_MERCADOPAGO_WEBHOOK', message: 'Notificação Mercado Pago inválida.' } });
  }

  try {
    const result = await mercadoPagoWebhookService.processPaymentWebhook({
      paymentId: dataId,
      requestId,
      signature,
      eventId,
      eventType: eventType || 'payment',
    });

    if (!result.processed && result.reason === 'INVALID_SIGNATURE') {
      return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Assinatura inválida.' } });
    }

    return res.status(200).json({ status: 'ok', result });
  } catch (error: any) {
    logger.error('Falha no webhook Mercado Pago', {
      eventId,
      paymentId: dataId,
      error: error?.message || error,
    });
    return res.status(500).json({ error: { code: 'WEBHOOK_PROCESSING_ERROR', message: 'Falha ao processar notificação.' } });
  }
}
