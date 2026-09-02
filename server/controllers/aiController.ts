import type { Request, Response, NextFunction } from 'express';
import { generateAICoachResponseDetailed, explainPrescriptionResponse } from '../services/aiService';
import { logger } from '../middlewares/logger';
import { SERVER_CONFIG } from '../config/env';
import { usageRepository } from '../repositories/usageRepository';

export async function handleAICoach(req: Request, res: Response, next: NextFunction) {
  try {
    const { prompt, context } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'O campo prompt é obrigatório.' } });
    }

    if (prompt.length > SERVER_CONFIG.MAX_PROMPT_LENGTH) {
      return res.status(400).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'O prompt excede o tamanho máximo permitido.' } });
    }

    const userId = req.athlete?.uid;
    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sessão de autenticação obrigatória.' } });
    }

    const result = await generateAICoachResponseDetailed(prompt, context);

    // The monthly entitlement is consumed before controller execution to close
    // quota races. If Gemini was not actually used and the request was fulfilled
    // by the deterministic fallback, release that reserved quota unit.
    if (result.source === 'deterministic_fallback') {
      try {
        const released = await usageRepository.releaseAtomic(userId, 'AI_COACH_MESSAGES', 1);
        logger.info('AI quota released after deterministic fallback', {
          userId,
          released: released.success,
          currentUsage: released.currentUsage,
        });
      } catch (releaseError: any) {
        // Do not break a valid fallback response because a compensating quota
        // operation failed. Surface this as an operational alert in logs.
        logger.error('Failed to release AI quota after deterministic fallback', {
          userId,
          error: releaseError?.message,
        });
      }
    }

    return res.json({ reply: result.reply, source: result.source });
  } catch (error) {
    logger.error('Error handling AI Coach request', { error });
    return next(error);
  }
}

export async function handleExplainPrescription(req: Request, res: Response, next: NextFunction) {
  try {
    const { exerciseName, targetSets, reps, rir, reason } = req.body;

    if (!exerciseName) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Nome do exercício é obrigatório.' } });
    }

    const explanation = await explainPrescriptionResponse(
      exerciseName,
      Number(targetSets) || 3,
      String(reps) || '8-12',
      Number(rir) || 2,
      String(reason) || 'Hipertrofia e Sobrecarga',
    );

    return res.json({ explanation });
  } catch (error) {
    logger.error('Error handling prescription explanation request', { error });
    return next(error);
  }
}
