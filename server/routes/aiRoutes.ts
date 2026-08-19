import { Router } from 'express';
import { handleAICoach, handleExplainPrescription } from '../controllers/aiController';
import { rateLimiter } from '../middlewares/rateLimiter';
import { requireAuth } from '../middlewares/auth';
import { requireFeatureEntitlement } from '../middlewares/authorization';

export const aiRouter = Router();

// /api/ai-coach protegido: 
// 1. Rate Limiting por IP
// 2. Autenticação estrita via Firebase ID Token (requireAuth)
// 3. Validação autoritativa de Entitlements e Quotas no Backend (requireFeatureEntitlement)
aiRouter.post(
  '/ai-coach', 
  rateLimiter, 
  requireAuth, 
  requireFeatureEntitlement('AI_COACH_MESSAGES'), 
  handleAICoach
);

// /api/explain-prescription protegido por autenticação
aiRouter.post(
  '/explain-prescription', 
  rateLimiter, 
  requireAuth, 
  handleExplainPrescription
);
