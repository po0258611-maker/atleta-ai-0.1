import type { Request, Response, NextFunction } from 'express';
import { generateAICoachResponse, explainPrescriptionResponse } from '../services/aiService';
import { logger } from '../middlewares/logger';
import { SERVER_CONFIG } from '../config/env';

export async function handleAICoach(req: Request, res: Response, next: NextFunction) {
  try {
    const { prompt, context } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'O campo prompt é obrigatório.' }
      });
    }

    if (prompt.length > SERVER_CONFIG.MAX_PROMPT_LENGTH) {
      return res.status(400).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'O prompt excede o tamanho máximo permitido.' }
      });
    }

    const reply = await generateAICoachResponse(prompt, context);
    return res.json({ reply });
  } catch (error) {
    logger.error('Error handling AI Coach request', { error });
    return next(error);
  }
}

export async function handleExplainPrescription(req: Request, res: Response, next: NextFunction) {
  try {
    const { exerciseName, targetSets, reps, rir, reason } = req.body;

    if (!exerciseName) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Nome do exercício é obrigatório.' }
      });
    }

    const explanation = await explainPrescriptionResponse(
      exerciseName,
      Number(targetSets) || 3,
      String(reps) || '8-12',
      Number(rir) || 2,
      String(reason) || 'Hipertrofia Miofibrilar e Sobrecarga'
    );

    return res.json({ explanation });
  } catch (error) {
    logger.error('Error handling prescription explanation request', { error });
    return next(error);
  }
}
