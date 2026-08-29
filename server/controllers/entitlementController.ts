import type { Request, Response } from 'express';
import { entitlementService } from '../services/entitlementService';
import { logger } from '../middlewares/logger';

export async function handleGetEntitlements(req: Request, res: Response) {
  const userId = req.athlete?.uid;

  if (!userId) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Usuário autenticado é obrigatório.' },
    });
  }

  try {
    const summary = await entitlementService.getEntitlementsSummary(userId);
    return res.json(summary);
  } catch (error: any) {
    logger.error('Falha ao obter resumo de entitlements', {
      userId,
      error: error?.message || error,
    });

    // Never convert backend/database failures into a successful FREE response.
    // A 503 prevents clients from treating an unavailable authority as a valid subscription state.
    return res.status(503).json({
      error: {
        code: 'ENTITLEMENTS_UNAVAILABLE',
        message: 'Não foi possível consultar o status da assinatura no momento.',
      },
    });
  }
}
