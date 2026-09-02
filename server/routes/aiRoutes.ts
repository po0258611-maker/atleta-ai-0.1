import { Router } from 'express';
import { handleAICoach, handleExplainPrescription } from '../controllers/aiController';
import { aiIpRateLimiter, aiUserRateLimiter } from '../middlewares/aiRateLimiter';
import { requireAuth } from '../middlewares/auth';
import { requireFeatureEntitlement } from '../middlewares/authorization';

export const aiRouter = Router();

/**
 * AI request protection order:
 * 1. Cheap IP guard to contain unauthenticated abuse.
 * 2. Firebase Admin authentication.
 * 3. Authenticated user guard to apply per-identity frequency limits.
 * 4. Authoritative plan/quota consumption.
 * 5. Controller/model execution.
 */
aiRouter.post(
  '/ai-coach',
  aiIpRateLimiter,
  requireAuth,
  aiUserRateLimiter,
  requireFeatureEntitlement('AI_COACH_MESSAGES'),
  handleAICoach,
);

// Prescription explanations are authenticated and rate-limited per IP + user,
// but they do not consume the monthly AI Coach message quota.
aiRouter.post(
  '/explain-prescription',
  aiIpRateLimiter,
  requireAuth,
  aiUserRateLimiter,
  handleExplainPrescription,
);
