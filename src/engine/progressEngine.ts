import { FatigueAssessment, SetLog, UserProfile, WorkoutLog, Exercise } from '../types';
import { ProgressionEngine, AdaptiveProgressionDecision } from '../services/progressionEngine';
import { MultifactorialFatigueEngine, MultifactorialFatigueAnalysis } from '../services/fatigueEngine';

export interface ProgressionRecommendation {
  exerciseId: string;
  exerciseName: string;
  strategyName: string;
  currentWeightKg: number;
  recommendedWeightKg: number;
  currentReps: string;
  recommendedReps: string;
  action: 'increase_load' | 'increase_reps' | 'maintain' | 'deload' | 'decrease_load';
  explanation: string;
}

/**
 * Calculates multifactorial fatigue assessment across volume, performance, RPE, RIR,
 * sleep, stress, pain/limitations and performance trends.
 */
export function calculateFatigueScore(
  profile: UserProfile,
  recentLogs: WorkoutLog[],
  subjectiveDOMS: number = 2,
  performanceDrop: boolean = false,
  reportedPainAreas: string[] = [],
  reportedPainSeverity: number = 1
): FatigueAssessment {
  const analysis: MultifactorialFatigueAnalysis = MultifactorialFatigueEngine.evaluate({
    profile,
    recentLogs,
    subjectiveDOMS,
    performanceDrop,
    reportedPainAreas,
    reportedPainSeverity,
  });

  return {
    currentFatigueScore: analysis.fatigueScore,
    status: analysis.status,
    volumeAccumulation: analysis.metrics.volumeFactor,
    intensityFactor: analysis.metrics.intensityRpeFactor,
    consecutiveDays: recentLogs.length,
    sleepFactor: profile.sleepHours,
    recommendedAction: analysis.actionGuidance,
  };
}

/**
 * Adaptive Progression evaluation (delegates to ProgressionEngine with backward compatibility)
 */
export function calculateDoubleProgression(
  exerciseId: string,
  exerciseName: string,
  lastSets: SetLog[],
  targetRepRange: [number, number] = [8, 12],
  exercise?: Partial<Exercise>,
  fatigueScore: number = 40
): ProgressionRecommendation {
  const mockExercise = exercise || { id: exerciseId, nome: exerciseName, equipamento: 'barbell' };
  const rangeStr = `${targetRepRange[0]}-${targetRepRange[1]}`;

  const decision: AdaptiveProgressionDecision = ProgressionEngine.evaluateAdaptiveProgression(
    mockExercise as any,
    lastSets,
    rangeStr,
    2,
    fatigueScore
  );

  return {
    exerciseId,
    exerciseName,
    strategyName: decision.badge,
    currentWeightKg: decision.currentWeightKg,
    recommendedWeightKg: decision.recommendedWeightKg,
    currentReps: decision.targetRepRange,
    recommendedReps: decision.recommendedTargetReps,
    action: decision.action,
    explanation: decision.reason,
  };
}
