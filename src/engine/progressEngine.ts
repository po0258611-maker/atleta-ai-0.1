import { FatigueAssessment, SetLog, UserProfile, WorkoutLog } from '../types';

export interface ProgressionRecommendation {
  exerciseId: string;
  exerciseName: string;
  strategyName: string;
  currentWeightKg: number;
  recommendedWeightKg: number;
  currentReps: string;
  recommendedReps: string;
  action: 'increase_load' | 'increase_reps' | 'maintain' | 'deload';
  explanation: string;
}

// Calculate fatigue score and deload status based on recent workouts and user state
export function calculateFatigueScore(
  profile: UserProfile,
  recentLogs: WorkoutLog[],
  subjectiveDOMS: number = 3, // 1 to 5 scale
  performanceDrop: boolean = false
): FatigueAssessment {
  let score = 30; // Base score

  // Sleep factor impact
  if (profile.sleepHours < 6) score += 20;
  else if (profile.sleepHours < 7) score += 10;
  else if (profile.sleepHours >= 8) score -= 10;

  // Stress level impact
  if (profile.stressLevel === 'high') score += 15;
  if (profile.stressLevel === 'moderate') score += 5;

  // Recent logs volume & RPE impact
  if (recentLogs.length > 0) {
    const avgRPE =
      recentLogs.reduce((acc, log) => acc + log.sessionRPE, 0) / recentLogs.length;
    if (avgRPE >= 8.5) score += 15;
    if (avgRPE >= 9.5) score += 25;

    // Check consecutive workout density
    if (recentLogs.length >= 4) score += 10;
  }

  // DOMS impact
  score += (subjectiveDOMS - 1) * 6;

  // Performance drop penalty
  if (performanceDrop) score += 20;

  score = Math.min(100, Math.max(0, Math.round(score)));

  let status: FatigueAssessment['status'] = 'optimal';
  let recommendedAction = 'Fisiologia otimizada. Continue aplicativa a sobrecarga progressiva (adicione 1-2kg ou 1 repetição).';

  if (score > 85) {
    status = 'deload_recommended';
    recommendedAction = 'DELOAD RECOMENDADO! Reduza o volume semanal em 40% e a intensidade para RIR 3-4 durante 7 dias para ressensibilizar os receptores musculares e desinflamar articulações.';
  } else if (score > 70) {
    status = 'high_fatigue';
    recommendedAction = 'Fadiga acumulada elevada. Mantenha as cargas atuais sem tentar bater recordes e priorize 8 horas de sono.';
  } else if (score > 50) {
    status = 'moderate';
    recommendedAction = 'Fadiga moderada normal do treinamento produtivo. Mantenha o planejamento com RIR 2.';
  }

  return {
    currentFatigueScore: score,
    status,
    volumeAccumulation: recentLogs.length * 12,
    intensityFactor: recentLogs.length > 0 ? recentLogs[0].sessionRPE : 8,
    consecutiveDays: recentLogs.length,
    sleepFactor: profile.sleepHours,
    recommendedAction,
  };
}

// Double Progression algorithm
export function calculateDoubleProgression(
  exerciseId: string,
  exerciseName: string,
  lastSets: SetLog[],
  targetRepRange: [number, number] = [8, 12]
): ProgressionRecommendation {
  if (!lastSets || lastSets.length === 0) {
    return {
      exerciseId,
      exerciseName,
      strategyName: 'Double Progression (Progressão Dupla)',
      currentWeightKg: 20,
      recommendedWeightKg: 20,
      currentReps: `${targetRepRange[0]}-${targetRepRange[1]}`,
      recommendedReps: `${targetRepRange[0]}`,
      action: 'maintain',
      explanation: 'Primeira sessão registrada. Estabeleça a carga base com RIR 2.',
    };
  }

  const [minReps, maxReps] = targetRepRange;
  const currentWeight = lastSets[0].weightKg;
  const allSetsHitMaxReps = lastSets.every((s) => s.repsDone >= maxReps && s.completed);

  if (allSetsHitMaxReps) {
    const newWeight = Math.round((currentWeight * 1.05) * 2) / 2; // +5% increment
    return {
      exerciseId,
      exerciseName,
      strategyName: 'Double Progression (Progressão Dupla)',
      currentWeightKg: currentWeight,
      recommendedWeightKg: newWeight,
      currentReps: `${maxReps}`,
      recommendedReps: `${minReps}`,
      action: 'increase_load',
      explanation: `Você atingiu ${maxReps} repetições em todas as séries! Suba a carga de ${currentWeight}kg para ${newWeight}kg e retorne para ${minReps} reps.`,
    };
  }

  const avgReps = Math.round(lastSets.reduce((a, s) => a + s.repsDone, 0) / lastSets.length);
  return {
    exerciseId,
    exerciseName,
    strategyName: 'Double Progression (Progressão Dupla)',
    currentWeightKg: currentWeight,
    recommendedWeightKg: currentWeight,
    currentReps: `${avgReps}`,
    recommendedReps: `${Math.min(maxReps, avgReps + 1)}`,
    action: 'increase_reps',
    explanation: `Mantenha a carga de ${currentWeight}kg e tente buscar +1 repetição por série antes de aumentar o peso.`,
  };
}
