import { Router } from 'express';
import { handleGetEntitlements } from '../controllers/entitlementController';
import { requireAuth } from '../middlewares/auth';

export const entitlementRouter = Router();

// /api/entitlements/me protegido por Firebase Admin Auth
entitlementRouter.get('/me', requireAuth, handleGetEntitlements);
entitlementRouter.get('/public-summary', handleGetEntitlements);
