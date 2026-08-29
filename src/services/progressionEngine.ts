import {
  WorkoutLog,
  UserProfile,
  Exercise,
  SetLog,
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
  macroRatio: { proteinGrams: number; carbsGrams: number; fatsGrams: number };
  bodyComposition: BodyCompositionTarget;
}

export class ProgressionEngine {
  static calculateLoadIncrement(currentWeightKg: number, exercise?: Partial<Exercise>): number {
    const equipment = exercise?.equipamento || 'barbell';
    const isIsolation = exercise?.categoria === 'isolation';
    const isUpper = exercise?.grupoMuscular === 'biceps' || exercise?.grupoMuscular === 'triceps' || exercise?.grupoMuscular === 'ombros';
    if (equipment === 'dumbbell' || (isIsolation && isUpper)) {
      if (currentWeightKg <= 12) return 1.0;
      if (currentWeightKg <= 24) return 2.0;
      return 2.0;
    }
    if (equipment === 'cable') return currentWeightKg <= 20 ? 1.25 : 2.5;
    if (equipment === 'machine') return currentWeightKg <= 40 ? 2.5 : 5.0;
    if (equipment === 'barbell') {
      if (currentWeightKg >= 100) return 5.0;
      if (currentWeightKg >= 50) return 2.5;
      return 2.0;
    }
    return Math.max(0.5, Math.round((currentWeightKg * 0.04) * 2) / 2);
  }

  static evaluateAdaptiveProgression(
    exercise: Exercise | { id: string; nome: string; equipamento?: any; categoria?: any; grupoMuscular?: any },
    recentSets: SetLog[],
    targetRepRangeStr = '8-12',
    targetRIR = 2,
    recentFatigueScore = 40
  ): AdaptiveProgressionDecision {
    const parsedRange = targetRepRangeStr.split('-').map((n) => parseInt(n.trim(), 10));
    const minReps = Number.isFinite(parsedRange[0]) ? Math.max(1, parsedRange[0]) : 8;
    const maxReps = parsedRange.length > 1 && Number.isFinite(parsedRange[1]) ? Math.max(minReps, parsedRange[1]) : 12;
    const oneRepMax = OneRepMaxCalculator.calculateFromSets(recentSets || []);

    if (!recentSets?.length) {
      return {
        strategy: 'MAINTENANCE', exerciseName: exercise.nome, currentWeightKg: 20, recommendedWeightKg: 20, weightDeltaKg: 0,
        targetRepRange: `${minReps}-${maxReps}`, recommendedTargetReps: `${minReps}`, targetRIR, action: 'maintain', badge: 'LINHA DE BASE',
        reason: 'Primeira sessão do ciclo. Estabeleça uma carga de referência mantendo o RIR prescrito.', oneRepMax,
      };
    }

    const completedSets = recentSets.filter((s) => s.completed && Number.isFinite(s.repsDone) && s.repsDone > 0);
    if (!completedSets.length) {
      return {
        strategy: 'MAINTENANCE', exerciseName: exercise.nome, currentWeightKg: recentSets[0]?.weightKg || 20, recommendedWeightKg: recentSets[0]?.weightKg || 20,
        weightDeltaKg: 0, targetRepRange: `${minReps}-${maxReps}`, recommendedTargetReps: `${minReps}`, targetRIR,
        action: 'maintain', badge: 'SEM DADOS VÁLIDOS', reason: 'Nenhuma série concluída com dados válidos. Repita a sessão antes de alterar a carga.', oneRepMax,
      };
    }

    const currentWeight = Math.max(0, completedSets[0].weightKg || recentSets[0].weightKg || 20);
    const avgReps = completedSets.reduce((sum, s) => sum + s.repsDone, 0) / completedSets.length;
    const avgActualRIR = completedSets.reduce((sum, s) => sum + (Number.isFinite(s.actualRIR) ? s.actualRIR : targetRIR), 0) / completedSets.length;
    const missedMinReps = completedSets.filter((s) => s.repsDone < minReps).length;
    const isPerformanceCrashing = completedSets.length >= 2 && missedMinReps >= Math.ceil(completedSets.length / 2);

    if (recentFatigueScore >= 80) {
      const deloadWeight = Math.max(0, Math.round(currentWeight * 0.85 * 2) / 2);
      return {
        strategy: 'DELOAD_CONSIDERATION', exerciseName: exercise.nome, currentWeightKg: currentWeight, recommendedWeightKg: deloadWeight,
        weightDeltaKg: Math.round((deloadWeight - currentWeight) * 10) / 10, targetRepRange: `${minReps}-${maxReps}`,
        recommendedTargetReps: `${minReps}`, targetRIR: Math.min(4, targetRIR + 2), action: 'deload', badge: 'DELOAD ATIVO',
        reason: `Fadiga elevada (${Math.round(recentFatigueScore)}/100). Reduza carga e volume temporariamente e priorize recuperação.`,
        fatigueWarning: 'Evite falha concêntrica até a recuperação melhorar.', oneRepMax,
      };
    }

    if (isPerformanceCrashing) {
      if (recentFatigueScore >= 60 || avgActualRIR <= 0.5) {
        return {
          strategy: 'REGRESSION', exerciseName: exercise.nome, currentWeightKg: currentWeight, recommendedWeightKg: currentWeight,
          weightDeltaKg: 0, targetRepRange: `${minReps}-${maxReps}`, recommendedTargetReps: `${minReps}`, targetRIR: Math.min(3, targetRIR + 1),
          action: 'maintain', badge: 'INVESTIGAR FADIGA',
          reason: `O desempenho caiu abaixo de ${minReps} repetições em parte relevante das séries. Mantenha a carga e reduza a exigência até recuperar.`,
          fatigueWarning: 'Verifique sono, estresse, dor e recuperação entre sessões.', oneRepMax,
        };
      }
      const reducedWeight = Math.max(2, Math.round(currentWeight * 0.95 * 2) / 2);
      return {
        strategy: 'REGRESSION', exerciseName: exercise.nome, currentWeightKg: currentWeight, recommendedWeightKg: reducedWeight,
        weightDeltaKg: Math.round((reducedWeight - currentWeight) * 10) / 10, targetRepRange: `${minReps}-${maxReps}`,
        recommendedTargetReps: `${minReps}`, targetRIR, action: 'decrease_load', badge: 'AJUSTE DE CARGA',
        reason: `A carga atual não sustenta a faixa ${minReps}-${maxReps}. Reduza ~5% para recuperar execução e repetições.`, oneRepMax,
      };
    }

    const allHitMaxReps = completedSets.length === recentSets.length && completedSets.every((s) => s.repsDone >= maxReps);
    const validRirForProgression = avgActualRIR >= 1;
    if (allHitMaxReps && validRirForProgression) {
      const increment = this.calculateLoadIncrement(currentWeight, exercise);
      const newWeight = Math.round((currentWeight + increment) * 2) / 2;
      return {
        strategy: 'DOUBLE_PROGRESSION', exerciseName: exercise.nome, currentWeightKg: currentWeight, recommendedWeightKg: newWeight,
        weightDeltaKg: increment, targetRepRange: `${minReps}-${maxReps}`, recommendedTargetReps: `${minReps}`, targetRIR,
        action: 'increase_load', badge: 'SUBIR CARGA',
        reason: `Todas as séries chegaram a ${maxReps} reps com RIR médio ${avgActualRIR.toFixed(1)}. Aumente a carga e volte ao início da faixa.`, oneRepMax,
      };
    }

    if (avgReps < maxReps) {
      const nextTargetReps = Math.max(minReps, Math.min(maxReps, Math.floor(avgReps) + 1));
      return {
        strategy: 'REP_PROGRESSION', exerciseName: exercise.nome, currentWeightKg: currentWeight, recommendedWeightKg: currentWeight,
        weightDeltaKg: 0, targetRepRange: `${minReps}-${maxReps}`, recommendedTargetReps: `${nextTargetReps}`, targetRIR,
        action: 'increase_reps', badge: 'BUSCAR +1 REP',
        reason: `Mantenha ${currentWeight}kg e busque chegar a ${nextTargetReps} reps antes de aumentar a carga.`, oneRepMax,
      };
    }

    return {
      strategy: 'MAINTENANCE', exerciseName: exercise.nome, currentWeightKg: currentWeight, recommendedWeightKg: currentWeight, weightDeltaKg: 0,
      targetRepRange: `${minReps}-${maxReps}`, recommendedTargetReps: `${Math.round(avgReps)}`, targetRIR, action: 'maintain', badge: 'ESTABILIZAÇÃO',
      reason: `Consolide a carga de ${currentWeight}kg com execução consistente e RIR próximo de ${targetRIR}.`, oneRepMax,
    };
  }

  static calculateSetAutoAdjustment(exerciseName: string, currentWeightKg: number, repsCompleted: number, rpeReported: number): AutoAdjustmentRecommendation {
    const weight = Math.max(0, currentWeightKg);
    const rpe = Math.min(10, Math.max(0, rpeReported));
    if (rpe >= 9.5) {
      const newWeight = Math.max(2, Math.round(weight * 0.95 * 2) / 2);
      return { type: 'LOAD_REDUCTION', exerciseName, recommendedWeightKg: newWeight, weightDeltaKg: Math.round((newWeight - weight) * 10) / 10, reason: `RPE ${rpe.toFixed(1)} alto. Reduza aproximadamente 5% para preservar técnica.`, badge: 'AUTORREGULAÇÃO' };
    }
    if (rpe <= 6.5 && repsCompleted >= 8) {
      const delta = Math.max(0.5, Math.min(2.5, weight * 0.025));
      const newWeight = Math.round((weight + delta) * 2) / 2;
      const actualDelta = Math.round((newWeight - weight) * 10) / 10;
      return { type: 'LOAD_BOOST', exerciseName, recommendedWeightKg: newWeight, weightDeltaKg: actualDelta, reason: `RPE ${rpe.toFixed(1)} baixo para o desempenho observado. Aumente levemente a carga na próxima série.`, badge: 'ESTÍMULO ÓTIMO' };
    }
    return { type: 'OPTIMAL_MAINTAIN', exerciseName, recommendedWeightKg: weight, weightDeltaKg: 0, reason: `RPE ${rpe.toFixed(1)} compatível com uma série produtiva. Mantenha a carga.`, badge: 'CARGA OTIMIZADA' };
  }

  static analyzePeriodization(logs: WorkoutLog[]): PeriodizationAnalysis {
    const safeLogs = [...(logs || [])].filter((l) => l && !Number.isNaN(Date.parse(l.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const squat1RM = OneRepMaxCalculator.calculateFromHistory('agachamento', safeLogs);
    const bench1RM = OneRepMaxCalculator.calculateFromHistory('supino', safeLogs);
    const deadlift1RM = OneRepMaxCalculator.calculateFromHistory('terra', safeLogs);
    const overhead1RM = OneRepMaxCalculator.calculateFromHistory('desenvolvimento', safeLogs);

    if (!safeLogs.length) {
      return { acwrRatio: 1, avgRecentRpe: 8, overallFatigueStatus: 'OPTIMAL', recommendedAction: 'Sem histórico suficiente para periodização. Estabeleça uma base de 2–4 semanas.', isDeloadNeeded: false, estimated1RM: { squat: squat1RM, bench: bench1RM, deadlift: deadlift1RM, overhead: overhead1RM } };
    }

    const volumeOf = (log: WorkoutLog) => log.exerciseLogs?.reduce((total, ex) => total + (ex.sets || []).reduce((s, set) => set.completed ? s + Math.max(0, set.repsDone || 0) * Math.max(0, set.weightKg || 0) : s, 0), 0) || 0;
    const now = Date.now();
    const acuteCutoff = now - 7 * 24 * 60 * 60 * 1000;
    const chronicCutoff = now - 28 * 24 * 60 * 60 * 1000;
    const acuteLogs = safeLogs.filter((l) => Date.parse(l.date) >= acuteCutoff);
    const chronicLogs = safeLogs.filter((l) => Date.parse(l.date) >= chronicCutoff);
    const acuteWeeklyLoad = acuteLogs.reduce((sum, l) => sum + volumeOf(l), 0);
    const chronicWeeklyAverage = chronicLogs.length ? chronicLogs.reduce((sum, l) => sum + volumeOf(l), 0) / 4 : 0;
    const acwrRatio = chronicWeeklyAverage > 0 ? Math.round((acuteWeeklyLoad / chronicWeeklyAverage) * 100) / 100 : 1;

    const recentRpes = safeLogs.filter((l) => Date.parse(l.date) >= acuteCutoff).map((l) => Number.isFinite(l.sessionRPE) ? l.sessionRPE : 8).slice(0, 4);
    const avgRecentRpe = recentRpes.length ? Math.round((recentRpes.reduce((a, b) => a + b, 0) / recentRpes.length) * 10) / 10 : 8;

    let overallFatigueStatus: PeriodizationAnalysis['overallFatigueStatus'] = 'OPTIMAL';
    let isDeloadNeeded = false;
    let recommendedAction = 'Mantenha a progressão e monitore desempenho, sono e percepção de esforço.';
    if (acwrRatio > 1.35 || avgRecentRpe >= 9.5) {
      overallFatigueStatus = 'CRITICAL_FATIGUE'; isDeloadNeeded = true;
      recommendedAction = 'Considere um deload temporário, reduzindo volume e/ou carga, e reavalie após a recuperação.';
    } else if (acwrRatio > 1.2 || avgRecentRpe >= 9.0) {
      overallFatigueStatus = 'OVERREACHING';
      recommendedAction = 'Reduza progressão agressiva e monitore recuperação antes de aumentar volume.';
    } else if (acwrRatio < 0.8) {
      overallFatigueStatus = 'UNDERLOADED';
      recommendedAction = 'O volume recente está baixo em relação ao histórico disponível. Aumente gradualmente, não de forma abrupta.';
    }

    return { acwrRatio, avgRecentRpe, overallFatigueStatus, recommendedAction, isDeloadNeeded, estimated1RM: { squat: squat1RM, bench: bench1RM, deadlift: deadlift1RM, overhead: overhead1RM } };
  }

  static calculateIntelligentGoals(profile: UserProfile, userSpecifiedBodyFatGoal?: number | null): IntelligentGoalTarget {
    const isHypertrophy = profile.objective === 'hypertrophy' || profile.objective === 'strength';
    const isLoss = profile.objective === 'fat_loss';
    const targetWeightKg = isHypertrophy ? Math.round((profile.weightKg + Math.max(1, profile.weightKg * 0.025)) * 10) / 10 : isLoss ? Math.max(25, Math.round((profile.weightKg * 0.95) * 10) / 10) : profile.weightKg;
    const estimatedWeeksToGoal = isHypertrophy ? 12 : isLoss ? 8 : 8;
    const bodyComposition = BodyCompositionService.evaluateBodyCompositionTarget(profile, userSpecifiedBodyFatGoal);
    return { targetWeightKg, estimatedWeeksToGoal, recommendedDailyCalories: bodyComposition.nutritionalRecommendation.recommendedDailyCalories, macroRatio: bodyComposition.nutritionalRecommendation.macroRatio, bodyComposition };
  }
}
