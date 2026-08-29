import { Router } from 'express';
import { handleGetEntitlements } from '../controllers/entitlementController';
import { requireAuth } from '../middlewares/auth';

export const entitlementRouter = Router();

// Entitlements are private and always resolved from the Firebase-authenticated UID.
entitlementRouter.get('/me', requireAuth, handleGetEntitlements);
