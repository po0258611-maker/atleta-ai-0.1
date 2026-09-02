import type { Request, Response } from 'express';
import { entitlementService } from '../services/entitlementService';
import { logger } from '../middlewares/logger';

export async function handleGetEntitlements(req: Request, res: Response) {
  try {
    // Uses strictly validated Firebase UID from token (never trusting body/query from client).
    const userId = req.athlete?.uid;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Sessão de autenticação obrigatória.' },
      });
    }

    const summary = await entitlementService.getEntitlementsSummary(userId);
    return res.json(summary);
  } catch (error: any) {
    logger.error('Falha ao obter resumo de entitlements', {
      userId: req.athlete?.uid,
      error: error?.message,
    });

    // Never downgrade a paid user to FREE because of a database/read failure.
    // The entitlement endpoint is informational; on infrastructure failure it must
    // fail closed instead of returning a plausible but false subscription state.
    return res.status(503).json({
      error: {
        code: 'ENTITLEMENT_SERVICE_UNAVAILABLE',
        message: 'Não foi possível consultar o estado da assinatura neste momento.',
      },
    });
  }
}
