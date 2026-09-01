import type { Request, Response } from 'express';
import { paymentTransactionRepository } from '../repositories/paymentTransactionRepository';
import { mercadoPagoPixProvider } from '../services/payments/mercadoPagoPixProvider';
import { logger } from '../middlewares/logger';

export async function handleMercadoPagoPaymentStatus(req: Request, res: Response) {
  const uid = req.athlete?.uid;
  const { transactionId } = req.params;
  if (!uid) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' } });
  if (!transactionId || !/^\d{1,30}$/.test(transactionId)) {
    return res.status(400).json({ error: { code: 'INVALID_TRANSACTION_ID', message: 'Identificador de pagamento inválido.' } });
  }

  try {
    const transaction = await paymentTransactionRepository.findByTransactionId(transactionId);
    if (!transaction || transaction.provider !== 'mercadopago') {
      return res.status(404).json({ error: { code: 'TRANSACTION_NOT_FOUND', message: 'Pagamento não encontrado.' } });
    }
    if (transaction.userId !== uid) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Pagamento não pertence ao usuário autenticado.' } });
    }

    const status = await mercadoPagoPixProvider.getPaymentStatus(transactionId);
    return res.status(200).json({ transactionId, provider: 'mercadopago', status });
  } catch (error: any) {
    logger.error('Falha ao consultar status Mercado Pago', { transactionId, userId: uid, error: error?.message || error });
    return res.status(503).json({ error: { code: 'PAYMENT_STATUS_UNAVAILABLE', message: 'Não foi possível consultar o status do pagamento.' } });
  }
}
