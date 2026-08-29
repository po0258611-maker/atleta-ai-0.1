import type { Request, Response, NextFunction } from 'express';
import { entitlementService } from '../services/entitlementService';
import { FeatureKey } from '../domain/planDefinitions';

export function requireEntitlement(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // If no user context, fallback to anonymous demo user or block
    const userId = req.athlete?.uid || 'usr_anonymous_demo';

    try {
      const evaluation = await entitlementService.consumeFeature(userId, feature);

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

      return next();
    } catch (err: any) {
      return res.status(500).json({
        error: {
          code: 'QUOTA_SYSTEM_ERROR',
          message: 'Erro interno ao processar cota de uso.',
        },
      });
    }
  };
}
