import { Exercise, FullBodyProgram, SetLog, UserProfile, WorkoutLog, WorkoutItem } from '../types';
import { ProgressionEngine, AdaptiveProgressionDecision } from '../services/progressionEngine';
import { MultifactorialFatigueEngine } from '../services/fatigueEngine';

export interface NextWorkoutRecommendation {
  exerciseId: string;
  exerciseName: string;
  action: AdaptiveProgressionDecision['action'];
  recommendedWeightKg: number;
  recommendedTargetReps: string;
  targetRIR: number;
  reason: string;
  badge: string;
  fatigueWarning?: string;
}

export interface NextWorkoutAnalysis {
  fatigueScore: number;
  fatigueStatus: string;
  actionGuidance: string;
  isDeloadNeeded: boolean;
  recommendations: NextWorkoutRecommendation[];
}

function parseRepRange(range: string): [number, number] {
  const match = range.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return [8, 12];
  return [Number(match[1]), Number(match[2])];
}

function getLatestSets(logs: WorkoutLog[], exerciseId: string): SetLog[] {
  for (const log of logs) {
    const exerciseLog = (log.exerciseLogs || []).find((entry) => entry.exerciseId === exerciseId);
    if (exerciseLog?.sets?.length) return exerciseLog.sets;
  }
  return [];
}

function buildFatigueContext(profile: UserProfile, logs: WorkoutLog[]) {
  return MultifactorialFatigueEngine.evaluate({
    profile,
    recentLogs: logs,
    subjectiveDOMS: 2,
    performanceDrop: false,
    reportedPainAreas: [],
    reportedPainSeverity: 1,
  });
}

export function analyzeNextWorkout(
  program: FullBodyProgram,
  recentLogs: WorkoutLog[],
  dayId: 'A' | 'B' | 'C' | 'D',
): NextWorkoutAnalysis {
  const logs = Array.isArray(recentLogs) ? [...recentLogs] : [];
  logs.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const fatigue = buildFatigueContext(program.profile, logs);
  const day = program.splitDays.find((candidate) => candidate.id === dayId) || program.splitDays[0];
  const recommendations: NextWorkoutRecommendation[] = [];

  if (!day) {
    return {
      fatigueScore: fatigue.fatigueScore,
      fatigueStatus: fatigue.status,
      actionGuidance: fatigue.actionGuidance,
      isDeloadNeeded: fatigue.status === 'deload_recommended' || fatigue.fatigueScore >= 80,
      recommendations,
    };
  }

  for (const item of day.items as WorkoutItem[]) {
    const [minReps, maxReps] = parseRepRange(item.targetReps);
    const lastSets = getLatestSets(logs, item.exercise.id);
    const decision = ProgressionEngine.evaluateAdaptiveProgression(
      item.exercise as Exercise,
      lastSets,
      `${minReps}-${maxReps}`,
      item.targetRIR,
      fatigue.fatigueScore,
    );

    recommendations.push({
      exerciseId: item.exercise.id,
      exerciseName: item.exercise.nome,
      action: decision.action,
      recommendedWeightKg: decision.recommendedWeightKg,
      recommendedTargetReps: decision.recommendedTargetReps,
      targetRIR: decision.targetRIR,
      reason: decision.reason,
      badge: decision.badge,
      fatigueWarning: decision.fatigueWarning,
    });
  }

  return {
    fatigueScore: fatigue.fatigueScore,
    fatigueStatus: fatigue.status,
    actionGuidance: fatigue.actionGuidance,
    isDeloadNeeded: fatigue.status === 'deload_recommended' || fatigue.fatigueScore >= 80,
    recommendations,
  };
}
