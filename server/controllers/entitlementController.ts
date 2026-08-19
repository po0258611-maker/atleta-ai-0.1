import type { Request, Response } from 'express';
import { entitlementService } from '../services/entitlementService';

export async function handleGetEntitlements(req: Request, res: Response) {
  // Uses strictly validated Firebase UID from token (never trusting body/query from client)
  const userId = req.athlete?.uid || 'usr_anonymous_demo';
  const summary = await entitlementService.getEntitlementsSummary(userId);
  return res.json(summary);
}
