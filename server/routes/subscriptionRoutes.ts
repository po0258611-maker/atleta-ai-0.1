import { Router } from 'express';
import {
  handlePaymentWebhook,
  handleCreatePaymentIntent,
  handleCheckPaymentStatus,
  handleGetSubscriptionHistory,
  handleCancelSubscription,
  handleReactivateSubscription,
  handleChangePlan,
} from '../controllers/subscriptionController';
import { requireAuth } from '../middlewares/auth';
import { SERVER_CONFIG } from '../config/env';

export const subscriptionRouter = Router();

function requirePaymentsEnabled(_req: any, res: any, next: any) {
  if (!SERVER_CONFIG.PAYMENTS_ENABLED || SERVER_CONFIG.PAYMENT_MODE !== 'live') {
    return res.status(503).json({
      error: {
        code: 'PAYMENTS_NOT_ENABLED',
        message: 'Pagamentos ainda não estão habilitados. O fluxo comercial será ativado em uma fase específica.',
      },
    });
  }
  return next();
}

// Payment endpoints remain present but are fail-closed until the real gateway phase.
subscriptionRouter.post('/webhooks/:provider', requirePaymentsEnabled, handlePaymentWebhook);
subscriptionRouter.post('/create-intent', requireAuth, requirePaymentsEnabled, handleCreatePaymentIntent);
subscriptionRouter.get('/status/:transactionId', requireAuth, requirePaymentsEnabled, handleCheckPaymentStatus);

// Subscription history/lifecycle remains available for already-existing server records.
subscriptionRouter.get('/history', requireAuth, handleGetSubscriptionHistory);
subscriptionRouter.post('/cancel', requireAuth, handleCancelSubscription);
subscriptionRouter.post('/reactivate', requireAuth, handleReactivateSubscription);
subscriptionRouter.post('/change-plan', requireAuth, handleChangePlan);
