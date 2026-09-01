import {
  WorkoutLog,
  UserProfile,
  Exercise,
  SetLog,
  FatigueAssessment,
} from '../types';
import { OneRepMaxCalculator, OneRepMaxResult } from './oneRepMaxService';
import { BodyCompositionService, BodyCompositionTarget } from './bodyCompositionService';

export type ProgressionStrategyType =
  | 'DOUBLE_PROGRESSION'
  | 'LOAD_PROGRESSION'
  | 'REP_PROGRESSION'
  | 'MAINTENANCE'
  | 'REGRESSION'
  | 'DELOAD_CONSIDERATION';

export interface AdaptiveProgressionDecision {
  strategy: ProgressionStrategyType;
  exerciseName: string;
  currentWeightKg: number;
  recommendedWeightKg: number;
  weightDeltaKg: number;
  targetRepRange: string;
  recommendedTargetReps: string;
  targetRIR: number;
  action: 'increase_load' | 'increase_reps' | 'maintain' | 'decrease_load' | 'deload';
  badge: string;
  reason: string;
  fatigueWarning?: string;
  oneRepMax: OneRepMaxResult;
}

export interface AutoAdjustmentRecommendation {
  type: 'LOAD_BOOST' | 'LOAD_REDUCTION' | 'OPTIMAL_MAINTAIN' | 'DELOAD_RECOMMENDED';
  exerciseName: string;
  recommendedWeightKg: number;
  weightDeltaKg: number;
  reason: string;
  badge: string;
}

export interface PeriodizationAnalysis {
  acwrRatio: number;
  avgRecentRpe: number;
  overallFatigueStatus: 'OPTIMAL' | 'OVERREACHING' | 'UNDERLOADED' | 'CRITICAL_FATIGUE';
  recommendedAction: string;
  isDeloadNeeded: boolean;
  estimated1RM: {
    squat: OneRepMaxResult;
    bench: OneRepMaxResult;
    deadlift: OneRepMaxResult;
    overhead: OneRepMaxResult;
  };
}

export interface IntelligentGoalTarget {
  targetWeightKg: number;
  estimatedWeeksToGoal: number;
  recommendedDailyCalories: number;
  macroRatio: {
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
  };
  bodyComposition: BodyCompositionTarget;
}

const finiteNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export class ProgressionEngine {
  static calculateLoadIncrement(
    currentWeightKg: number,
    exercise?: Partial<Exercise>
  ): number {
    const weight = Math.max(0, finiteNumber(currentWeightKg, 0));
    const equipment = exercise?.equipamento || 'barbell';
    const isIsolation = exercise?.categoria === 'isolation';
    const isUpper =
      exercise?.grupoMuscular === 'biceps' ||
      exercise?.grupoMuscular === 'triceps' ||
      exercise?.grupoMuscular === 'ombros';

    if (equipment === 'dumbbell' || (isIsolation && isUpper)) {
      if (weight <= 12) return 1.0;
      return 2.0;
    }
    if (equipment === 'cable') return weight <= 20 ? 1.25 : 2.5;
    if (equipment === 'machine') return 2.5;
    if (equipment === 'barbell') {
      if (weight >= 100) return 5.0;
      if (weight >= 50) return 2.5;
      return 2.0;
    }
    return Math.max(1, Math.round((weight * 0.04) * 2) / 2);
  }

  static evaluateAdaptiveProgression(
    exercise: Exercise | { id: string; nome: string; equipamento?: any; categoria?: any; grupoMuscular?: any },
    recentSets: SetLog[],
    targetRepRangeStr: string = '8-12',
    targetRIR: number = 2,
    recentFatigueScore: number = 40
  ): AdaptiveProgressionDecision {
    const parsedRange = targetRepRangeStr.split('-').map((n) => parseInt(n.trim(), 10));
    const minReps = Number.isFinite(parsedRange[0]) ? Math.max(1, parsedRange[0]) : 8;
    const maxReps = parsedRange.length > 1 && Number.isFinite(parsedRange[1])
      ? Math.max(minReps, parsedRange[1])
      : 12;
    const safeTargetRIR = clamp(finiteNumber(targetRIR, 2), 0, 5);
    const safeFatigue = clamp(finiteNumber(recentFatigueScore, 40), 0, 100);
    const sets = Array.isArray(recentSets) ? recentSets : [];
    const oneRepMax = OneRepMaxCalculator.calculateFromSets(sets);

    if (sets.length === 0) {
      return {
        strategy: 'MAINTENANCE', exerciseName: exercise.nome, currentWeightKg: 20,
        recommendedWeightKg: 20, weightDeltaKg: 0, targetRepRange: `${minReps}-${maxReps}`,
        recommendedTargetReps: `${minReps}`, targetRIR: safeTargetRIR, action: 'maintain',
        badge: 'LINHA DE BASE',
        reason: 'Primeira sessão do ciclo. Estabeleça uma carga de referência mantendo o RIR prescrito.',
        oneRepMax,
      };
    }

    const currentWeight = Math.max(0, finiteNumber(sets[0]?.weightKg, 20));
    const completedSets = sets.filter((s) => s.completed);
    const allSetsCompleted = completedSets.length === sets.length;
    // Performance averages use completed sets only. Incomplete sets must not inflate progression decisions.
    const performanceSets = completedSets.length > 0 ? completedSets : sets;
    const avgReps = Math.round(
      performanceSets.reduce((sum, s) => sum + Math.max(0, finiteNumber(s.repsDone, 0)), 0) /
      performanceSets.length
    );
    const avgActualRIR = Math.round(
      (performanceSets.reduce(
        (sum, s) => sum + clamp(finiteNumber(s.actualRIR, safeTargetRIR), 0, 5), 0
      ) / performanceSets.length) * 10
    ) / 10;

    const missedMinReps = performanceSets.filter(
      (s) => Math.max(0, finiteNumber(s.repsDone, 0)) < minReps
    ).length;
    const isPerformanceCrashing = missedMinReps >= 2;

    if (safeFatigue >= 80) {
      const deloadWeight = Math.max(2, Math.round((currentWeight * 0.85) * 2) / 2);
      return {
        strategy: 'DELOAD_CONSIDERATION', exerciseName: exercise.nome,
        currentWeightKg: currentWeight, recommendedWeightKg: deloadWeight,
        weightDeltaKg: Math.round((deloadWeight - currentWeight) * 10) / 10,
        targetRepRange: `${minReps}-${maxReps}`, recommendedTargetReps: `${minReps}`,
        targetRIR: Math.min(5, safeTargetRIR + 2), action: 'deload', badge: 'DELOAD ATIVO',
        reason: `Fadiga fisiológica alta detectada (${safeFatigue}/100). Reduza a carga em ~15% e mantenha RIR ${Math.min(5, safeTargetRIR + 2)} para favorecer recuperação.`,
        fatigueWarning: 'Evite buscar falha concêntrica enquanto a recuperação não for restabelecida.',
        oneRepMax,
      };
    }

    if (isPerformanceCrashing) {
      if (safeFatigue >= 60 || avgActualRIR === 0) {
        return {
          strategy: 'REGRESSION', exerciseName: exercise.nome, currentWeightKg: currentWeight,
          recommendedWeightKg: currentWeight, weightDeltaKg: 0,
          targetRepRange: `${minReps}-${maxReps}`, recommendedTargetReps: `${minReps}`,
          targetRIR: Math.min(5, safeTargetRIR + 1), action: 'maintain', badge: 'INVESTIGAR FADIGA',
          reason: `Queda de repetições detectada abaixo de ${minReps} reps. Não aumente a carga enquanto a recuperação não estiver adequada.`,
          fatigueWarning: 'Priorize recuperação e reavalie o desempenho na próxima sessão.', oneRepMax,
        };
      }
      const reducedWeight = Math.max(2, Math.round((currentWeight * 0.95) * 2) / 2);
      return {
        strategy: 'REGRESSION', exerciseName: exercise.nome, currentWeightKg: currentWeight,
        recommendedWeightKg: reducedWeight,
        weightDeltaKg: Math.round((reducedWeight - currentWeight) * 10) / 10,
        targetRepRange: `${minReps}-${maxReps}`, recommendedTargetReps: `${minReps}`,
        targetRIR: safeTargetRIR, action: 'decrease_load', badge: 'AJUSTE DE CARGA',
        reason: `A carga de ${currentWeight}kg excedeu a capacidade para a faixa ${minReps}-${maxReps}. Reduza cerca de 5% e priorize técnica.`,
        oneRepMax,
      };
    }

    const allHitMaxReps = allSetsCompleted && performanceSets.every(
      (s) => Math.max(0, finiteNumber(s.repsDone, 0)) >= maxReps
    );
    const validRirForProgression = avgActualRIR >= 1;

    if (allHitMaxReps && validRirForProgression) {
      const increment = this.calculateLoadIncrement(currentWeight, exercise);
      const newWeight = currentWeight + increment;
      return {
        strategy: 'DOUBLE_PROGRESSION', exerciseName: exercise.nome,
        currentWeightKg: currentWeight, recommendedWeightKg: newWeight,
        weightDeltaKg: increment, targetRepRange: `${minReps}-${maxReps}`,
        recommendedTargetReps: `${minReps}`, targetRIR: safeTargetRIR,
        action: 'increase_load', badge: 'SUBIR CARGA',
        reason: `Você atingiu ${maxReps} reps em todas as séries com RIR seguro (${avgActualRIR}). Aumente +${increment}kg e retorne para ${minReps} reps.`,
        oneRepMax,
      };
    }

    if (avgReps < maxReps) {
      const nextTargetReps = Math.min(maxReps, avgReps + 1);
      return {
        strategy: 'REP_PROGRESSION', exerciseName: exercise.nome,
        currentWeightKg: currentWeight, recommendedWeightKg: currentWeight,
        weightDeltaKg: 0, targetRepRange: `${minReps}-${maxReps}`,
        recommendedTargetReps: `${nextTargetReps}`, targetRIR: safeTargetRIR,
        action: 'increase_reps', badge: 'BUSCAR +1 REP',
        reason: `Mantenha ${currentWeight}kg e busque ${nextTargetReps} reps antes de aumentar a carga.`,
        oneRepMax,
      };
    }

    return {
      strategy: 'MAINTENANCE', exerciseName: exercise.nome,
      currentWeightKg: currentWeight, recommendedWeightKg: currentWeight, weightDeltaKg: 0,
      targetRepRange: `${minReps}-${maxReps}`, recommendedTargetReps: `${avgReps}`,
      targetRIR: safeTargetRIR, action: 'maintain', badge: 'ESTABILIZAÇÃO',
      reason: `Consolide a técnica com ${currentWeight}kg a RIR ${safeTargetRIR} mantendo ${avgReps} repetições limpas.`,
      oneRepMax,
    };
  }

  static calculateSetAutoAdjustment(
    exerciseName: string,
    currentWeightKg: number,
    repsCompleted: number,
    rpeReported: number
  ): AutoAdjustmentRecommendation {
    const weight = Math.max(0, finiteNumber(currentWeightKg, 0));
    const reps = Math.max(0, finiteNumber(repsCompleted, 0));
    const rpe = clamp(finiteNumber(rpeReported, 7), 1, 10);

    if (rpe >= 9.5) {
      const newWeight = Math.max(2, Math.round((weight * 0.95) * 2) / 2);
      const delta = Math.round((newWeight - weight) * 10) / 10;
      return { type: 'LOAD_REDUCTION', exerciseName, recommendedWeightKg: newWeight,
        weightDeltaKg: delta,
        reason: `RPE ${rpe} muito elevado. Reduza aproximadamente 5% para preservar a técnica nas próximas séries.`,
        badge: 'AUTORREGULAÇÃO' };
    }
    if (rpe <= 6.5 && reps >= 8) {
      const delta = weight <= 20 ? 1.0 : 2.5;
      const newWeight = weight + delta;
      return { type: 'LOAD_BOOST', exerciseName, recommendedWeightKg: newWeight,
        weightDeltaKg: delta,
        reason: `RPE ${rpe} baixo e ${reps} reps concluídas. Um pequeno aumento pode manter o estímulo adequado.`,
        badge: 'ESTÍMULO ÓTIMO' };
    }
    return { type: 'OPTIMAL_MAINTAIN', exerciseName, recommendedWeightKg: weight,
      weightDeltaKg: 0, reason: `RPE ${rpe} dentro de uma faixa controlada. Mantenha ${weight}kg na próxima série.`,
      badge: 'CARGA OTIMIZADA' };
  }

  static analyzePeriodization(logs: WorkoutLog[]): PeriodizationAnalysis {
    const safeLogs = Array.isArray(logs) ? logs : [];
    const squat1RM = OneRepMaxCalculator.calculateFromHistory('agachamento', safeLogs);
    const bench1RM = OneRepMaxCalculator.calculateFromHistory('supino', safeLogs);
    const deadlift1RM = OneRepMaxCalculator.calculateFromHistory('terra', safeLogs);
    const overhead1RM = OneRepMaxCalculator.calculateFromHistory('desenvolvimento', safeLogs);

    if (safeLogs.length === 0) {
      return { acwrRatio: 1.0, avgRecentRpe: 8.0, overallFatigueStatus: 'OPTIMAL',
        recommendedAction: 'Continue no plano atual de sobrecarga progressiva.', isDeloadNeeded: false,
        estimated1RM: { squat: squat1RM, bench: bench1RM, deadlift: deadlift1RM, overhead: overhead1RM } };
    }

    const getLogVolume = (log: WorkoutLog): number => {
      let total = 0;
      log.exerciseLogs?.forEach((ex) => ex.sets?.forEach((s) => {
        if (s.completed) total += Math.max(0, finiteNumber(s.repsDone, 0)) * Math.max(0, finiteNumber(s.weightKg, 0));
      }));
      return Number.isFinite(total) ? total : 0;
    };

    const acuteVolume = safeLogs.slice(0, 3).reduce((sum, log) => sum + getLogVolume(log), 0);
    const totalVolumeAll = safeLogs.reduce((sum, log) => sum + getLogVolume(log), 0);
    const chronicVolume = totalVolumeAll > 0 ? (totalVolumeAll / safeLogs.length) * 3 : 1;
    const acwrRatio = chronicVolume > 0 ? Math.round((acuteVolume / chronicVolume) * 100) / 100 : 1.0;

    const logsWithRpe = safeLogs.slice(0, 4).filter((l) => typeof l.sessionRPE === 'number' && Number.isFinite(l.sessionRPE));
    const avgRecentRpe = logsWithRpe.length > 0
      ? Math.round((logsWithRpe.reduce((a, l) => a + clamp(l.sessionRPE as number, 1, 10), 0) / logsWithRpe.length) * 10) / 10
      : 0;

    let overallFatigueStatus: PeriodizationAnalysis['overallFatigueStatus'] = 'OPTIMAL';
    let isDeloadNeeded = false;
    let recommendedAction = 'Sua capacidade de recuperação está adequada. Mantenha progressão conforme desempenho.';
    if (acwrRatio > 1.35 || avgRecentRpe >= 9.0) {
      overallFatigueStatus = 'CRITICAL_FATIGUE'; isDeloadNeeded = true;
      recommendedAction = 'Considere um deload: reduza temporariamente volume e/ou carga e monitore a recuperação.';
    } else if (acwrRatio > 1.2) {
      overallFatigueStatus = 'OVERREACHING';
      recommendedAction = 'Sobrecarga acumulada alta. Monitore recuperação e desempenho antes de aumentar volume.';
    } else if (acwrRatio < 0.8) {
      overallFatigueStatus = 'UNDERLOADED';
      recommendedAction = 'Volume recente abaixo do histórico. Aumente a regularidade gradualmente se a recuperação estiver adequada.';
    }

    return { acwrRatio, avgRecentRpe, overallFatigueStatus, recommendedAction, isDeloadNeeded,
      estimated1RM: { squat: squat1RM, bench: bench1RM, deadlift: deadlift1RM, overhead: overhead1RM } };
  }

  static calculateIntelligentGoals(profile: UserProfile, userSpecifiedBodyFatGoal?: number | null): IntelligentGoalTarget {
    const isHypertrophy = profile.objective === 'hypertrophy' || profile.objective === 'strength';
    const isLoss = profile.objective === 'fat_loss';
    const weight = Math.max(0, finiteNumber(profile.weightKg, 0));
    const targetWeightKg = isHypertrophy
      ? Math.round((weight + 3) * 10) / 10
      : isLoss ? Math.round(Math.max(0, weight - 4) * 10) / 10 : weight;
    const estimatedWeeksToGoal = isHypertrophy ? 12 : isLoss ? 10 : 8;
    const bodyComposition = BodyCompositionService.evaluateBodyCompositionTarget(profile, userSpecifiedBodyFatGoal);
    return { targetWeightKg, estimatedWeeksToGoal,
      recommendedDailyCalories: bodyComposition.nutritionalRecommendation.recommendedDailyCalories,
      macroRatio: bodyComposition.nutritionalRecommendation.macroRatio, bodyComposition };
  }
}
