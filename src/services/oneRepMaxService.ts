import { SetLog, WorkoutLog } from '../types';

export type OneRepMaxState = 'unknown' | 'estimated' | 'measured';

export interface OneRepMaxResult {
  state: OneRepMaxState;
  valueKg: number | null;
  method?: 'epley' | 'brzycki' | 'wathan' | 'direct_1rm';
  confidence: 'high' | 'moderate' | 'low' | 'none';
  explanation: string;
  sourceSet?: {
    weightKg: number;
    repsDone: number;
    actualRIR?: number;
  };
}

/**
 * Calculates 1RM strictly based on documented biomechanical formulas (Epley/Brzycki)
 * using real performance logs.
 *
 * NEVER invents or assumes default 1RM values when no logs exist.
 */
export class OneRepMaxCalculator {
  /**
   * Epley Formula: 1RM = Weight * (1 + Reps / 30)
   * Valid for Reps <= 10. For reps > 10, confidence decreases.
   */
  static calculateEpley(weightKg: number, reps: number): number {
    if (weightKg <= 0 || reps <= 0) return 0;
    if (reps === 1) return weightKg;
    return Math.round((weightKg * (1 + reps / 30)) * 10) / 10;
  }

  /**
   * Brzycki Formula: 1RM = Weight / (1.0278 - 0.0278 * Reps)
   */
  static calculateBrzycki(weightKg: number, reps: number): number {
    if (weightKg <= 0 || reps <= 0) return 0;
    if (reps === 1) return weightKg;
    if (reps >= 36) return weightKg; // Formula asymptote limit
    return Math.round((weightKg / (1.0278 - 0.0278 * reps)) * 10) / 10;
  }

  /**
   * Calculates 1RM from completed sets for a specific exercise.
   * If there is not enough completed data (no completed sets or 0 weight), returns 'unknown'.
   */
  static calculateFromSets(sets: SetLog[]): OneRepMaxResult {
    const validCompletedSets = (sets || []).filter(
      (s) => s.completed && s.weightKg > 0 && s.repsDone > 0
    );

    if (validCompletedSets.length === 0) {
      return {
        state: 'unknown',
        valueKg: null,
        confidence: 'none',
        explanation: 'Sem dados suficientes registrados para estimar 1RM. Complete uma série com carga para calibrar o motor.',
      };
    }

    // Find the highest e1RM set
    let bestSet = validCompletedSets[0];
    let maxE1RM = 0;

    for (const set of validCompletedSets) {
      // If RIR was reported, effective reps = repsDone + RIR (proximity to failure)
      const effectiveReps = Math.min(12, set.repsDone + (typeof set.actualRIR === 'number' && set.actualRIR >= 0 ? set.actualRIR : 0));
      const e1rm = this.calculateEpley(set.weightKg, effectiveReps);

      if (e1rm > maxE1RM) {
        maxE1RM = e1rm;
        bestSet = set;
      }
    }

    if (bestSet.repsDone === 1 && (bestSet.actualRIR === 0 || bestSet.actualRIR === undefined)) {
      return {
        state: 'measured',
        valueKg: bestSet.weightKg,
        method: 'direct_1rm',
        confidence: 'high',
        explanation: `1RM medido diretamente em teste de repetição máxima (${bestSet.weightKg}kg).`,
        sourceSet: bestSet,
      };
    }

    const confidence: OneRepMaxResult['confidence'] =
      bestSet.repsDone <= 6 ? 'high' : bestSet.repsDone <= 10 ? 'moderate' : 'low';

    return {
      state: 'estimated',
      valueKg: maxE1RM,
      method: 'epley',
      confidence,
      explanation: `1RM estimado em ${maxE1RM}kg via Fórmula de Epley com base na melhor série (${bestSet.repsDone} reps com ${bestSet.weightKg}kg).`,
      sourceSet: bestSet,
    };
  }

  /**
   * Scans all historic workout logs for a given exercise ID / keyword to calculate the latest or best 1RM
   */
  static calculateFromHistory(
    exerciseIdOrName: string,
    logs: WorkoutLog[]
  ): OneRepMaxResult {
    if (!logs || logs.length === 0) {
      return {
        state: 'unknown',
        valueKg: null,
        confidence: 'none',
        explanation: 'Nenhum treino histórico registrado com este exercício.',
      };
    }

    const normalizedQuery = exerciseIdOrName.toLowerCase().trim();
    const matchingSets: SetLog[] = [];

    for (const log of logs) {
      if (!log.exerciseLogs) continue;
      for (const exLog of log.exerciseLogs) {
        const idMatches = exLog.exerciseId && exLog.exerciseId.toLowerCase().includes(normalizedQuery);
        const nameMatches = exLog.exerciseName && exLog.exerciseName.toLowerCase().includes(normalizedQuery);

        if (idMatches || nameMatches) {
          if (Array.isArray(exLog.sets)) {
            matchingSets.push(...exLog.sets);
          }
        }
      }
    }

    return this.calculateFromSets(matchingSets);
  }
}
