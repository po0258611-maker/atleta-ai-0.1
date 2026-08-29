import { Router } from 'express';
import { handleAICoach, handleExplainPrescription } from '../controllers/aiController';
import { rateLimiter } from '../middlewares/rateLimiter';
import { requireAuth } from '../middlewares/auth';
import { requireFeatureEntitlement } from '../middlewares/authorization';

export const aiRouter = Router();

// Authenticate before applying the limiter so authenticated requests can be keyed by athlete UID.
aiRouter.post(
  '/ai-coach',
  requireAuth,
  rateLimiter,
  requireFeatureEntitlement('AI_COACH_MESSAGES'),
  handleAICoach
);

aiRouter.post(
  '/explain-prescription',
  requireAuth,
  rateLimiter,
  handleExplainPrescription
);
