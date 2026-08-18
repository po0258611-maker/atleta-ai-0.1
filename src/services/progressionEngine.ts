import { WorkoutLog, UserProfile, FullBodyProgram } from '../types';

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
    squatKg: number;
    benchKg: number;
    deadliftKg: number;
    overheadKg: number;
  };
}

export interface IntelligentGoalTarget {
  targetWeightKg: number;
  targetBodyFatPct: number;
  estimatedWeeksToGoal: number;
  recommendedDailyCalories: number;
  macroRatio: {
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
  };
  milestone1RMSquat: number;
  milestone1RMBench: number;
  milestone1RMDeadlift: number;
}

export class ProgressionEngine {
  /**
   * Calculates auto-regulated load adjustment for the next set based on RPE feedback
   */
  static calculateSetAutoAdjustment(
    exerciseName: string,
    currentWeightKg: number,
    repsCompleted: number,
    rpeReported: number
  ): AutoAdjustmentRecommendation {
    // Target RPE for hypertrophy working sets is typically 8 (RIR 2)
    if (rpeReported >= 9.5) {
      // Overreaching on current set - reduce load by 5%
      const newWeight = Math.max(2, Math.round((currentWeightKg * 0.95) * 2) / 2);
      const delta = Math.round((newWeight - currentWeightKg) * 10) / 10;
      return {
        type: 'LOAD_REDUCTION',
        exerciseName,
        recommendedWeightKg: newWeight,
        weightDeltaKg: delta,
        reason: `RPE ${rpeReported} muito elevado (falha iminente). Carga reduzida em 5% para preservar integridade técnica na próxima série.`,
        badge: 'AUTO-REDUÇÃO APEX',
      };
    }

    if (rpeReported <= 6.5 && repsCompleted >= 8) {
      // Very light - boost load by +2.5kg
      const newWeight = currentWeightKg + 2.5;
      return {
        type: 'LOAD_BOOST',
        exerciseName,
        recommendedWeightKg: newWeight,
        weightDeltaKg: 2.5,
        reason: `RPE ${rpeReported} leve (RIR 3+). Carga aumentada em +2.5kg para manter a zona ideal de hipertrofia.`,
        badge: 'AUTO-SOBRECARGA APEX',
      };
    }

    return {
      type: 'OPTIMAL_MAINTAIN',
      exerciseName,
      recommendedWeightKg: currentWeightKg,
      weightDeltaKg: 0,
      reason: `RPE ${rpeReported} perfeito (RIR ~2). Mantenha ${currentWeightKg}kg na próxima série.`,
      badge: 'CARGA OTIMIZADA',
    };
  }

  /**
   * Analyzes workout history to determine ACWR, Deload triggers, and 1RM projections
   */
  static analyzePeriodization(logs: WorkoutLog[]): PeriodizationAnalysis {
    if (!logs || logs.length === 0) {
      return {
        acwrRatio: 1.0,
        avgRecentRpe: 8.0,
        overallFatigueStatus: 'OPTIMAL',
        recommendedAction: 'Continue no plano atual de sobrecarga progressiva linear.',
        isDeloadNeeded: false,
        estimated1RM: { squatKg: 100, benchKg: 80, deadliftKg: 120, overheadKg: 50 },
      };
    }

    // Helper to calculate total volume for a WorkoutLog
    const getLogVolume = (log: WorkoutLog): number => {
      let total = 0;
      log.exerciseLogs?.forEach((ex) => {
        ex.sets?.forEach((s) => {
          if (s.completed) {
            total += (s.repsDone || 0) * (s.weightKg || 0);
          }
        });
      });
      return total || 5000; // default baseline if 0
    };

    // Acute workload (last 3 sessions volume) vs Chronic workload (avg of all sessions)
    const acuteVolume = logs.slice(0, 3).reduce((sum, log) => sum + getLogVolume(log), 0);
    const totalVolumeAll = logs.reduce((sum, log) => sum + getLogVolume(log), 0);
    const chronicVolume = (totalVolumeAll / logs.length) * 3;

    const acwrRatio = chronicVolume > 0 ? Math.round((acuteVolume / chronicVolume) * 100) / 100 : 1.0;

    const recentRpes = logs.slice(0, 4).map((l) => l.sessionRPE || 8);
    const avgRecentRpe = Math.round((recentRpes.reduce((a, b) => a + b, 0) / (recentRpes.length || 1)) * 10) / 10;

    let overallFatigueStatus: PeriodizationAnalysis['overallFatigueStatus'] = 'OPTIMAL';
    let isDeloadNeeded = false;
    let recommendedAction = 'Sua capacidade de recuperação está otimizada. Mantenha progressão de cargas.';

    if (acwrRatio > 1.35 || avgRecentRpe >= 9.0) {
      overallFatigueStatus = 'CRITICAL_FATIGUE';
      isDeloadNeeded = true;
      recommendedAction = 'DELOAD ESTRATÉGICO RECOMENDADO: Reduza o número de séries em 40% e a carga em 15% durante 7 dias para evitar overtraining e lesões articulares.';
    } else if (acwrRatio > 1.2) {
      overallFatigueStatus = 'OVERREACHING';
      recommendedAction = 'Sobrecarga acumulada alta. Monitore a qualidade do sono e a hidratação pós-treino.';
    } else if (acwrRatio < 0.8) {
      overallFatigueStatus = 'UNDERLOADED';
      recommendedAction = 'Volume recente abaixo do limiar de adaptação. Aumente a frequência de treinos.';
    }

    return {
      acwrRatio,
      avgRecentRpe,
      overallFatigueStatus,
      recommendedAction,
      isDeloadNeeded,
      estimated1RM: {
        squatKg: Math.round(100 * (1 + 10 / 30)),
        benchKg: Math.round(80 * (1 + 8 / 30)),
        deadliftKg: Math.round(120 * (1 + 6 / 30)),
        overheadKg: Math.round(50 * (1 + 8 / 30)),
      },
    };
  }

  /**
   * Calculates intelligent goal targets and macrocycles for user profile
   */
  static calculateIntelligentGoals(profile: UserProfile): IntelligentGoalTarget {
    const isHypertrophy = profile.objective === 'hypertrophy' || profile.objective === 'strength';
    const isLoss = profile.objective === 'fat_loss';

    const targetWeightKg = isHypertrophy
      ? Math.round((profile.weightKg + 4) * 10) / 10
      : isLoss
      ? Math.round((profile.weightKg - 5) * 10) / 10
      : profile.weightKg;

    const targetBodyFatPct = isLoss ? 12 : isHypertrophy ? 14 : 15;
    const estimatedWeeksToGoal = isHypertrophy ? 12 : isLoss ? 10 : 8;

    // BMR estimation
    const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + (profile.gender === 'male' ? 5 : -161);
    const maintenanceCal = Math.round(bmr * 1.55);
    const recommendedDailyCalories = isHypertrophy
      ? maintenanceCal + 300
      : isLoss
      ? maintenanceCal - 400
      : maintenanceCal;

    // Macros
    const proteinGrams = Math.round(profile.weightKg * 2.2);
    const fatsGrams = Math.round(profile.weightKg * 0.9);
    const remainingCals = recommendedDailyCalories - (proteinGrams * 4 + fatsGrams * 9);
    const carbsGrams = Math.max(50, Math.round(remainingCals / 4));

    return {
      targetWeightKg,
      targetBodyFatPct,
      estimatedWeeksToGoal,
      recommendedDailyCalories,
      macroRatio: {
        proteinGrams,
        carbsGrams,
        fatsGrams,
      },
      milestone1RMSquat: Math.round(profile.weightKg * 1.5),
      milestone1RMBench: Math.round(profile.weightKg * 1.2),
      milestone1RMDeadlift: Math.round(profile.weightKg * 1.8),
    };
  }
}
