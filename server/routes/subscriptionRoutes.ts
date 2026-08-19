import { Router } from 'express';
import {
  handlePaymentWebhook,
  handleCreatePaymentIntent,
  handleCheckPaymentStatus,
  handleGetSubscriptionHistory,
} from '../controllers/subscriptionController';
import { requireAuth } from '../middlewares/auth';

export const subscriptionRouter = Router();

// Webhook endpoint (Processed via cryptographic verification & idempotency)
subscriptionRouter.post('/webhooks/:provider', handlePaymentWebhook);

// Payment Intents & Orders (Requires Firebase Auth Bearer Token)
subscriptionRouter.post('/create-intent', requireAuth, handleCreatePaymentIntent);
subscriptionRouter.get('/status/:transactionId', requireAuth, handleCheckPaymentStatus);
subscriptionRouter.get('/history', requireAuth, handleGetSubscriptionHistory);
