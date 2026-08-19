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
  acwrRatio: number; // Acute-to-Chronic Workload Ratio
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

export class ProgressionEngine {
  /**
   * Calculates realistic load increments based on exercise category and equipment.
   * Avoids universal +2.5kg for everything (e.g. dumbells/lateral raises vs barbell squats).
   */
  static calculateLoadIncrement(
    currentWeightKg: number,
    exercise?: Partial<Exercise>
  ): number {
    const equipment = exercise?.equipamento || 'barbell';
    const isIsolation = exercise?.categoria === 'isolation';
    const isUpper =
      exercise?.grupoMuscular === 'biceps' ||
      exercise?.grupoMuscular === 'triceps' ||
      exercise?.grupoMuscular === 'ombros';

    // 1. Dumbbell isolations / Upper body small muscles: smaller steps (1kg - 2kg total or 2-4%)
    if (equipment === 'dumbbell' || (isIsolation && isUpper)) {
      if (currentWeightKg <= 12) return 1.0;
      if (currentWeightKg <= 24) return 2.0;
      return 2.0;
    }

    // 2. Cables / Machines: typically 2.5kg to 5kg pin increments
    if (equipment === 'cable') {
      return currentWeightKg <= 20 ? 1.25 : 2.5;
    }
    if (equipment === 'machine') {
      return 2.5;
    }

    // 3. Heavy Compound Barbell Lifts (Squat, Deadlift, Bench): 2.5kg to 5kg
    if (equipment === 'barbell') {
      if (currentWeightKg >= 100) return 5.0;
      if (currentWeightKg >= 50) return 2.5;
      return 2.0;
    }

    // Default proportional increment (~3% to 5%, rounded to nearest 0.5kg)
    const proportional = Math.max(1, Math.round((currentWeightKg * 0.04) * 2) / 2);
    return proportional;
  }

  /**
   * Evaluates historical performance and fatigue to recommend adaptive progression strategy
   */
  static evaluateAdaptiveProgression(
    exercise: Exercise | { id: string; nome: string; equipamento?: any; categoria?: any; grupoMuscular?: any },
    recentSets: SetLog[],
    targetRepRangeStr: string = '8-12',
    targetRIR: number = 2,
    recentFatigueScore: number = 40
  ): AdaptiveProgressionDecision {
    const parsedRange = targetRepRangeStr.split('-').map((n) => parseInt(n.trim(), 10));
    const minReps = !isNaN(parsedRange[0]) ? parsedRange[0] : 8;
    const maxReps = parsedRange.length > 1 && !isNaN(parsedRange[1]) ? parsedRange[1] : 12;

    // Calculate real e1RM from sets using verified Epley formula
    const oneRepMax = OneRepMaxCalculator.calculateFromSets(recentSets || []);

    if (!recentSets || recentSets.length === 0) {
      return {
        strategy: 'MAINTENANCE',
        exerciseName: exercise.nome,
        currentWeightKg: 20,
        recommendedWeightKg: 20,
        weightDeltaKg: 0,
        targetRepRange: `${minReps}-${maxReps}`,
        recommendedTargetReps: `${minReps}`,
        targetRIR,
        action: 'maintain',
        badge: 'LINHA DE BASE',
        reason: 'Primeira sessão do ciclo. Estabeleça uma carga de referência mantendo o RIR prescrito.',
        oneRepMax,
      };
    }

    const currentWeight = recentSets[0].weightKg || 20;
    const completedSets = recentSets.filter((s) => s.completed);
    const allSetsCompleted = completedSets.length === recentSets.length;
    const avgReps = Math.round(recentSets.reduce((sum, s) => sum + (s.repsDone || 0), 0) / recentSets.length);
    const avgActualRIR = Math.round(
      (recentSets.reduce((sum, s) => sum + (typeof s.actualRIR === 'number' ? s.actualRIR : targetRIR), 0) /
        recentSets.length) *
        10
    ) / 10;

    // Check performance drop (< min reps on multiple sets)
    const missedMinReps = recentSets.filter((s) => (s.repsDone || 0) < minReps).length;
    const isPerformanceCrashing = missedMinReps >= 2;

    // Case 1: High systemic fatigue / Deload required
    if (recentFatigueScore >= 80) {
      const deloadWeight = Math.round((currentWeight * 0.85) * 2) / 2;
      return {
        strategy: 'DELOAD_CONSIDERATION',
        exerciseName: exercise.nome,
        currentWeightKg: currentWeight,
        recommendedWeightKg: deloadWeight,
        weightDeltaKg: Math.round((deloadWeight - currentWeight) * 10) / 10,
        targetRepRange: `${minReps}-${maxReps}`,
        recommendedTargetReps: `${minReps}`,
        targetRIR: targetRIR + 2,
        action: 'deload',
        badge: 'DELOAD ATIVO',
        reason: `Fadiga fisiológica alta detectada (${recentFatigueScore}/100). Reduza a carga em ~15% e mantenha RIR ${targetRIR + 2} para dissipar fadiga neuromuscular.`,
        fatigueWarning: 'Evite buscar falha concêntrica enquanto a recuperação não for restabelecida.',
        oneRepMax,
      };
    }

    // Case 2: Performance regression under normal/high fatigue -> Investigate fatigue before adding volume
    if (isPerformanceCrashing) {
      if (recentFatigueScore >= 60 || avgActualRIR === 0) {
        return {
          strategy: 'REGRESSION',
          exerciseName: exercise.nome,
          currentWeightKg: currentWeight,
          recommendedWeightKg: currentWeight,
          weightDeltaKg: 0,
          targetRepRange: `${minReps}-${maxReps}`,
          recommendedTargetReps: `${minReps}`,
          targetRIR: targetRIR + 1,
          action: 'maintain',
          badge: 'INVESTIGAR FADIGA',
          reason: `Queda de repetições detectada abaixo de ${minReps} reps com RIR 0. O declínio indica acúmulo de fadiga local/central. Não aumente volume; recupere antes de subir cargas.`,
          fatigueWarning: 'Priorize sono e descanso entre sessões.',
          oneRepMax,
        };
      }

      // If just too heavy, slight load regression (-5%)
      const reducedWeight = Math.max(2, Math.round((currentWeight * 0.95) * 2) / 2);
      return {
        strategy: 'REGRESSION',
        exerciseName: exercise.nome,
        currentWeightKg: currentWeight,
        recommendedWeightKg: reducedWeight,
        weightDeltaKg: Math.round((reducedWeight - currentWeight) * 10) / 10,
        targetRepRange: `${minReps}-${maxReps}`,
        recommendedTargetReps: `${minReps}`,
        targetRIR,
        action: 'decrease_load',
        badge: 'AJUSTE DE CARGA',
        reason: `A carga de ${currentWeight}kg excedeu a capacidade para a faixa ${minReps}-${maxReps}. Reduzido para ${reducedWeight}kg para retomar padrão de excelência técnica.`,
        oneRepMax,
      };
    }

    // Case 3: Double Progression Success — Top of rep range hit with valid RIR
    const allHitMaxReps = allSetsCompleted && recentSets.every((s) => (s.repsDone || 0) >= maxReps);
    const validRirForProgression = avgActualRIR >= 1; // Not grinding at RIR 0 in every set

    if (allHitMaxReps && validRirForProgression) {
      const increment = this.calculateLoadIncrement(currentWeight, exercise);
      const newWeight = currentWeight + increment;

      return {
        strategy: 'DOUBLE_PROGRESSION',
        exerciseName: exercise.nome,
        currentWeightKg: currentWeight,
        recommendedWeightKg: newWeight,
        weightDeltaKg: increment,
        targetRepRange: `${minReps}-${maxReps}`,
        recommendedTargetReps: `${minReps}`,
        targetRIR,
        action: 'increase_load',
        badge: 'SUBIR CARGA',
        reason: `Excelente! Você completou ${maxReps} reps em todas as séries com RIR seguro (${avgActualRIR}). Aumente +${increment}kg (para ${newWeight}kg) e retorne para ${minReps} reps.`,
        oneRepMax,
      };
    }

    // Case 4: Rep Progression — Inside rep bracket, building volume with current load
    if (avgReps < maxReps) {
      const nextTargetReps = Math.min(maxReps, avgReps + 1);
      return {
        strategy: 'REP_PROGRESSION',
        exerciseName: exercise.nome,
        currentWeightKg: currentWeight,
        recommendedWeightKg: currentWeight,
        weightDeltaKg: 0,
        targetRepRange: `${minReps}-${maxReps}`,
        recommendedTargetReps: `${nextTargetReps}`,
        targetRIR,
        action: 'increase_reps',
        badge: 'BUSCAR +1 REP',
        reason: `Mantenha a carga de ${currentWeight}kg. Sua meta na próxima sessão é buscar +1 repetição por série (meta: ${nextTargetReps} reps) antes de progredir a carga.`,
        oneRepMax,
      };
    }

    // Case 5: Maintenance
    return {
      strategy: 'MAINTENANCE',
      exerciseName: exercise.nome,
      currentWeightKg: currentWeight,
      recommendedWeightKg: currentWeight,
      weightDeltaKg: 0,
      targetRepRange: `${minReps}-${maxReps}`,
      recommendedTargetReps: `${avgReps}`,
      targetRIR,
      action: 'maintain',
      badge: 'ESTABILIZAÇÃO',
      reason: `Consolide a técnica com ${currentWeight}kg a RIR ${targetRIR} mantendo ${avgReps} repetições limpas.`,
      oneRepMax,
    };
  }

  /**
   * Real-time intra-session auto-regulation for next set based on instantaneous RPE feedback
   */
  static calculateSetAutoAdjustment(
    exerciseName: string,
    currentWeightKg: number,
    repsCompleted: number,
    rpeReported: number
  ): AutoAdjustmentRecommendation {
    if (rpeReported >= 9.5) {
      const newWeight = Math.max(2, Math.round((currentWeightKg * 0.95) * 2) / 2);
      const delta = Math.round((newWeight - currentWeightKg) * 10) / 10;
      return {
        type: 'LOAD_REDUCTION',
        exerciseName,
        recommendedWeightKg: newWeight,
        weightDeltaKg: delta,
        reason: `RPE ${rpeReported} muito elevado (RIR 0). Carga reduzida em 5% (${delta}kg) para preservar a integridade técnica nas próximas séries.`,
        badge: 'AUTORREGULAÇÃO',
      };
    }

    if (rpeReported <= 6.5 && repsCompleted >= 8) {
      const delta = currentWeightKg <= 20 ? 1.0 : 2.5;
      const newWeight = currentWeightKg + delta;
      return {
        type: 'LOAD_BOOST',
        exerciseName,
        recommendedWeightKg: newWeight,
        weightDeltaKg: delta,
        reason: `RPE ${rpeReported} leve (RIR 3+). Carga aumentada em +${delta}kg para manter o estímulo na zona hipertrófica ideal.`,
        badge: 'ESTÍMULO ÓTIMO',
      };
    }

    return {
      type: 'OPTIMAL_MAINTAIN',
      exerciseName,
      recommendedWeightKg: currentWeightKg,
      weightDeltaKg: 0,
      reason: `RPE ${rpeReported} calibrado (RIR 1-2). Mantenha ${currentWeightKg}kg na próxima série.`,
      badge: 'CARGA OTIMIZADA',
    };
  }

  /**
   * Analyzes workout history to determine ACWR, Deload triggers, and real 1RM calculations.
   * NEVER invents default 1RM values when logs are absent.
   */
  static analyzePeriodization(logs: WorkoutLog[]): PeriodizationAnalysis {
    const squat1RM = OneRepMaxCalculator.calculateFromHistory('agachamento', logs);
    const bench1RM = OneRepMaxCalculator.calculateFromHistory('supino', logs);
    const deadlift1RM = OneRepMaxCalculator.calculateFromHistory('terra', logs);
    const overhead1RM = OneRepMaxCalculator.calculateFromHistory('desenvolvimento', logs);

    if (!logs || logs.length === 0) {
      return {
        acwrRatio: 1.0,
        avgRecentRpe: 8.0,
        overallFatigueStatus: 'OPTIMAL',
        recommendedAction: 'Continue no plano atual de sobrecarga progressiva linear e dupla.',
        isDeloadNeeded: false,
        estimated1RM: {
          squat: squat1RM,
          bench: bench1RM,
          deadlift: deadlift1RM,
          overhead: overhead1RM,
        },
      };
    }

    const getLogVolume = (log: WorkoutLog): number => {
      let total = 0;
      log.exerciseLogs?.forEach((ex) => {
        ex.sets?.forEach((s) => {
          if (s.completed) {
            total += (s.repsDone || 0) * (s.weightKg || 0);
          }
        });
      });
      return total || 0;
    };

    const acuteVolume = logs.slice(0, 3).reduce((sum, log) => sum + getLogVolume(log), 0);
    const totalVolumeAll = logs.reduce((sum, log) => sum + getLogVolume(log), 0);
    const chronicVolume = totalVolumeAll > 0 ? (totalVolumeAll / logs.length) * 3 : 1;

    const acwrRatio = chronicVolume > 0 ? Math.round((acuteVolume / chronicVolume) * 100) / 100 : 1.0;

    const recentRpes = logs.slice(0, 4).map((l) => l.sessionRPE || 8);
    const avgRecentRpe = Math.round((recentRpes.reduce((a, b) => a + b, 0) / (recentRpes.length || 1)) * 10) / 10;

    let overallFatigueStatus: PeriodizationAnalysis['overallFatigueStatus'] = 'OPTIMAL';
    let isDeloadNeeded = false;
    let recommendedAction = 'Sua capacidade de recuperação está otimizada. Mantenha progressão de cargas e repetições.';

    if (acwrRatio > 1.35 || avgRecentRpe >= 9.0) {
      overallFatigueStatus = 'CRITICAL_FATIGUE';
      isDeloadNeeded = true;
      recommendedAction = 'DELOAD ESTRATÉGICO RECOMENDADO: Reduza o número de séries em 40% e a carga em 15% durante 7 dias para evitar overtraining.';
    } else if (acwrRatio > 1.2) {
      overallFatigueStatus = 'OVERREACHING';
      recommendedAction = 'Sobrecarga acumulada alta. Monitore a qualidade do sono e a hidratação pós-treino.';
    } else if (acwrRatio < 0.8) {
      overallFatigueStatus = 'UNDERLOADED';
      recommendedAction = 'Volume recente abaixo do limiar de adaptação. Aumente a regularidade das sessões.';
    }

    return {
      acwrRatio,
      avgRecentRpe,
      overallFatigueStatus,
      recommendedAction,
      isDeloadNeeded,
      estimated1RM: {
        squat: squat1RM,
        bench: bench1RM,
        deadlift: deadlift1RM,
        overhead: overhead1RM,
      },
    };
  }

  /**
   * Calculates intelligent nutritional targets and training direction for user profile
   * without fabricating arbitrary universal body fat targets (12%, 14%, 15%).
   */
  static calculateIntelligentGoals(
    profile: UserProfile,
    userSpecifiedBodyFatGoal?: number | null
  ): IntelligentGoalTarget {
    const isHypertrophy = profile.objective === 'hypertrophy' || profile.objective === 'strength';
    const isLoss = profile.objective === 'fat_loss';

    const targetWeightKg = isHypertrophy
      ? Math.round((profile.weightKg + 3) * 10) / 10
      : isLoss
      ? Math.round((profile.weightKg - 4) * 10) / 10
      : profile.weightKg;

    const estimatedWeeksToGoal = isHypertrophy ? 12 : isLoss ? 10 : 8;

    const bodyComposition = BodyCompositionService.evaluateBodyCompositionTarget(
      profile,
      userSpecifiedBodyFatGoal
    );

    return {
      targetWeightKg,
      estimatedWeeksToGoal,
      recommendedDailyCalories: bodyComposition.nutritionalRecommendation.recommendedDailyCalories,
      macroRatio: bodyComposition.nutritionalRecommendation.macroRatio,
      bodyComposition,
    };
  }
}
