import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth';

export const authRouter = Router();

/**
 * Firebase is the single authentication authority for the application.
 * Login, registration and logout are handled by Firebase Client SDK.
 * The API only validates the Firebase ID token and exposes the authenticated identity.
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  return res.json({
    user: req.athlete,
  });
});
