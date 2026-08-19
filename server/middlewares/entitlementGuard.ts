import type { Request, Response, NextFunction } from 'express';
import { entitlementService } from '../services/entitlementService';
import { FeatureKey } from '../domain/planDefinitions';

export function requireEntitlement(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // If no user context, fallback to anonymous demo user or block
    const userId = req.user?.id || 'usr_anonymous_demo';

    const evaluation = await entitlementService.evaluateAccess(userId, feature);

    if (!evaluation.granted) {
      const messages: Record<string, string> = {
        FEATURE_NOT_IN_PLAN: 'Este recurso é exclusivo dos planos PRO e APEX.',
        MONTHLY_QUOTA_EXCEEDED: 'Você atingiu o limite mensal para este recurso no seu plano.',
        SUBSCRIPTION_EXPIRED: 'Sua assinatura expirou. Renove seu plano para continuar.',
        NO_SUBSCRIPTION: 'Assinatura ativa requerida.',
      };

      return res.status(403).json({
        error: {
          code: evaluation.reason || 'ACCESS_DENIED',
          message: messages[evaluation.reason || ''] || 'Acesso não autorizado.',
          planSlug: evaluation.planSlug,
          currentUsage: evaluation.currentUsage,
          limit: evaluation.limit,
        },
      });
    }

    // Auto-consume unit if granted
    await entitlementService.consumeFeature(userId, feature);
    return next();
  };
}
