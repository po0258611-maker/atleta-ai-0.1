import type { Request, Response } from 'express';
import { entitlementService } from '../services/entitlementService';
import { logger } from '../middlewares/logger';

export async function handleGetEntitlements(req: Request, res: Response) {
  try {
    // Uses strictly validated Firebase UID from token (never trusting body/query from client)
    const userId = req.athlete?.uid || 'usr_anonymous_demo';
    const summary = await entitlementService.getEntitlementsSummary(userId);
    return res.json(summary);
  } catch (error: any) {
    logger.warn('Aviso: Falha ao obter resumo de entitlements, fornecendo fallback seguro FREE', {
      userId: req.athlete?.uid,
      error: error?.message,
    });
    return res.json({
      userId: req.athlete?.uid || 'usr_anonymous_demo',
      plan: 'FREE',
      planSlug: 'FREE',
      planName: 'Treino MAX Gratuito',
      status: 'FREE',
      subscriptionStatus: 'free',
      canonicalStatus: 'FREE',
      isSubscribed: false,
      isPremium: false,
      startDate: null,
      currentPeriodStart: null,
      endDate: null,
      currentPeriodEnd: null,
      renewsAt: null,
      renewAt: null,
      cancelAtPeriodEnd: false,
      features: {},
    });
  }
}

