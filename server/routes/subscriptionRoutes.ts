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
import { handleMercadoPagoWebhook } from '../controllers/mercadoPagoWebhookController';
import { handleMercadoPagoPaymentStatus } from '../controllers/mercadoPagoPaymentController';
import { requireAuth } from '../middlewares/auth';

export const subscriptionRouter = Router();

// Mercado Pago webhook: public endpoint authenticated exclusively by MP x-signature HMAC.
subscriptionRouter.post('/webhooks/mercadopago', handleMercadoPagoWebhook);

// Other provider webhooks (legacy/generic path).
subscriptionRouter.post('/webhooks/:provider', handlePaymentWebhook);

// Payment Intents & Orders (Requires Firebase Auth Bearer Token)
subscriptionRouter.post('/create-intent', requireAuth, handleCreatePaymentIntent);
// Dedicated MP status route comes before the generic route and derives ownership from persisted transaction data.
subscriptionRouter.get('/status/:transactionId', requireAuth, handleMercadoPagoPaymentStatus);
subscriptionRouter.get('/status-generic/:transactionId', requireAuth, handleCheckPaymentStatus);
subscriptionRouter.get('/history', requireAuth, handleGetSubscriptionHistory);

// Subscription Lifecycle Management (Authoritative backend operations)
subscriptionRouter.post('/cancel', requireAuth, handleCancelSubscription);
subscriptionRouter.post('/reactivate', requireAuth, handleReactivateSubscription);
subscriptionRouter.post('/change-plan', requireAuth, handleChangePlan);
