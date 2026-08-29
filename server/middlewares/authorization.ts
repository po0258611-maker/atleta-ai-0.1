import type { Request, Response, NextFunction } from 'express';
import { entitlementService } from '../services/entitlementService';
import { FeatureKey } from '../domain/planDefinitions';
import { logger } from './logger';

export type UserRole = 'ATHLETE' | 'COACH' | 'ADMIN';

/**
 * Authorization Middleware: Checks if the authenticated athlete has the minimum required Role
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.athlete) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' },
      });
    }

    const userRole = (req.athlete.role as UserRole) || 'ATHLETE';

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Acesso negado por RBAC', { uid: req.athlete.uid, role: userRole, required: allowedRoles });
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Você não tem privilégios suficientes para acessar este recurso.',
          requiredRoles: allowedRoles,
          currentRole: userRole,
        },
      });
    }

    return next();
  };
}

/**
 * Entitlement Authorization Middleware: Evaluates quotas, plan validity, and feature entitlements on the backend
 * Never trusts client-side "isSubscribed" flags.
 */
export function requireFeatureEntitlement(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.athlete || !req.athlete.uid) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Sessão de autenticação obrigatória.' },
      });
    }

    const uid = req.athlete.uid;
    // Operação Atômica única: avalia plano, verifica limites e incrementa uso sob transação
    try {
      const evaluation = await entitlementService.consumeFeature(uid, feature);

      if (!evaluation.granted) {
        logger.warn('Acesso negado por Entitlement / Quota', {
          uid,
          feature,
          reason: evaluation.reason,
          usage: evaluation.currentUsage,
          limit: evaluation.limit,
        });

        const messages: Record<string, string> = {
          FEATURE_NOT_IN_PLAN: 'Este recurso é exclusivo dos planos PRO e APEX.',
          MONTHLY_QUOTA_EXCEEDED: 'Limite mensal para este recurso atingido. Faça upgrade para continuar.',
          SUBSCRIPTION_EXPIRED: 'Sua assinatura expirou. Renove seu plano para continuar.',
          NO_SUBSCRIPTION: 'Assinatura ativa requerida.',
        };

        return res.status(403).json({
          error: {
            code: evaluation.reason || 'FEATURE_FORBIDDEN',
            message: messages[evaluation.reason || ''] || 'Acesso não autorizado ao recurso.',
            planSlug: evaluation.planSlug,
            currentUsage: evaluation.currentUsage,
            limit: evaluation.limit,
            remaining: evaluation.remaining,
          },
        });
      }

      return next();
    } catch (err: any) {
      logger.error('Erro ao verificar/consumir quota atômica', { uid, feature, error: err.message });
      return res.status(500).json({
        error: {
          code: 'QUOTA_SYSTEM_ERROR',
          message: 'Erro interno ao validar cotas de uso do sistema.',
        },
      });
    }
  };
}
