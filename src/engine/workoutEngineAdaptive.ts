import { FullBodyProgram, MuscleGroup, UserProfile, WorkoutItem, WorkoutLog } from '../types';
import { generateFullBodyWorkout as generateV2, selectExerciseForPattern } from './workoutEngineV2';

const MUSCLES: MuscleGroup[] = [
  'peitoral', 'costas', 'ombros', 'biceps', 'triceps',
  'quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'core',
];

const EMPTY = (): Record<MuscleGroup, number> =>
  Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<MuscleGroup, number>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function sessionBudget(minutes: number): number {
  if (minutes <= 30) return 7;
  if (minutes <= 45) return 10;
  if (minutes <= 60) return 14;
  if (minutes <= 75) return 18;
  return 22;
}

function indirectFactor(item: WorkoutItem, secondary: MuscleGroup): number {
  if (!item.exercise.musculosSecundarios.includes(secondary) || item.exercise.categoria === 'isolation') return 0;
  return secondary === 'biceps' || secondary === 'triceps' ? 0.5 : 0.35;
}

function parseRepMidpoint(range: string): number {
  const match = range.match(/(\d+)\s*-\s*(\d+)/);
  return match ? (Number(match[1]) + Number(match[2])) / 2 : 10;
}

function estimateMinutes(items: WorkoutItem[]): number {
  const transition = Math.max(0, items.length - 1) * 60;
  const work = items.reduce(
    (sum, item) => sum + item.targetSets * clamp(parseRepMidpoint(item.targetReps) * 3.5, 20, 60),
    0,
  );
  const rest = items.reduce(
    (sum, item) => sum + Math.max(0, item.targetSets - 1) * item.targetRestSec,
    0,
  );
  return Math.ceil((transition + work + rest + (items.length ? 300 : 0)) / 60);
}

function rebalanceDay(
  dayItems: WorkoutItem[],
  target: Record<MuscleGroup, number>,
  priorities: MuscleGroup[],
  budget: number,
): WorkoutItem[] {
  const frequency = EMPTY();
  dayItems.forEach((item) => {
    frequency[item.exercise.grupoMuscular] += 1;
  });

  const items = dayItems.map((item) => {
    let sets = Math.round(
      (target[item.exercise.grupoMuscular] || 10) /
      Math.max(1, frequency[item.exercise.grupoMuscular]),
    );
    if (priorities.includes(item.exercise.grupoMuscular)) sets += 1;
    return { ...item, targetSets: clamp(sets, 2, 5) };
  });

  let total = items.reduce((sum, item) => sum + item.targetSets, 0);
  const reductionOrder = [...items].sort((a, b) => {
    const aPriority = priorities.includes(a.exercise.grupoMuscular) ? 1 : 0;
    const bPriority = priorities.includes(b.exercise.grupoMuscular) ? 1 : 0;
    const aIsolation = a.exercise.categoria === 'isolation' ? 0 : 1;
    const bIsolation = b.exercise.categoria === 'isolation' ? 0 : 1;
    return aPriority - bPriority || aIsolation - bIsolation || b.exercise.fatigueIndex - a.exercise.fatigueIndex;
  });

  for (const item of reductionOrder) {
    while (total > budget && item.targetSets > 2) {
      item.targetSets -= 1;
      total -= 1;
    }
    if (total <= budget) break;
  }

  return items;
}

function recompute(splitDays: FullBodyProgram['splitDays']) {
  const weekly = EMPTY();
  const frequency = EMPTY();

  for (const day of splitDays) {
    for (const item of day.items) {
      const primary = item.exercise.grupoMuscular;
      weekly[primary] += item.targetSets;
      frequency[primary] += 1;

      for (const secondary of item.exercise.musculosSecundarios) {
        const factor = indirectFactor(item, secondary);
        weekly[secondary] += Math.round(item.targetSets * factor * 10) / 10;
        frequency[secondary] += factor;
      }
    }

    day.estimatedTimeMin = estimateMinutes(day.items);
    const weighted = day.items.reduce(
      (sum, item) => sum + item.exercise.fatigueIndex * item.targetSets,
      0,
    );
    const maximum = day.items.reduce((sum, item) => sum + 5 * item.targetSets, 0);
    day.systemicFatigueScore = maximum ? Math.round((weighted / maximum) * 100) : 0;
  }

  return { weekly, frequency };
}

function extractRecentExerciseIds(context: WorkoutLog[] | Set<string>): Set<string> {
  if (context instanceof Set) return new Set(context);

  const ids = new Set<string>();
  const recentLogs = Array.isArray(context) ? context.slice(0, 6) : [];
  for (const log of recentLogs) {
    for (const exerciseLog of log.exerciseLogs || []) {
      if (exerciseLog.exerciseId) ids.add(exerciseLog.exerciseId);
    }
  }
  return ids;
}

function rotateRecentExercises(
  program: FullBodyProgram,
  recentExerciseIds: Set<string>,
): { rotated: string[]; limited: string[] } {
  if (recentExerciseIds.size === 0) return { rotated: [], limited: [] };

  const usedIds = new Set<string>();
  const rotated: string[] = [];
  const limited: string[] = [];

  for (const day of program.splitDays) {
    for (const item of day.items) {
      const currentId = item.exercise.id;
      usedIds.add(currentId);

      if (!recentExerciseIds.has(currentId)) continue;

      try {
        const blockedRecentIds = new Set(recentExerciseIds);
        const blockedIds = new Set([...blockedRecentIds, ...usedIds]);
        const rotationProfile: UserProfile = {
          ...program.profile,
          forbiddenExercises: Array.from(
            new Set([...program.profile.forbiddenExercises, ...blockedIds]),
          ),
        };
        const result = selectExerciseForPattern(item.exercise.padraoMotor, rotationProfile, usedIds);

        // Historical rotation is allowed only when we preserve the original movement pattern.
        if (
          result.selectedExercise.padraoMotor !== item.exercise.padraoMotor ||
          blockedRecentIds.has(result.selectedExercise.id) ||
          usedIds.has(result.selectedExercise.id)
        ) {
          limited.push(`${item.exercise.nome} (${item.exercise.padraoMotor})`);
          continue;
        }

        const previousName = item.exercise.nome;
        item.exercise = result.selectedExercise;
        item.originalExercise = result.originalExercise || item.originalExercise;
        item.isReplaced = true;
        item.replacementNotes = result.replacementNotes || `Rotacionado após uso recente de ${previousName}.`;
        usedIds.add(result.selectedExercise.id);
        rotated.push(`${previousName} → ${result.selectedExercise.nome}`);
      } catch {
        limited.push(`${item.exercise.nome} (${item.exercise.padraoMotor})`);
        // Keep the valid base exercise when no safe alternative exists.
      }
    }
  }

  return { rotated, limited };
}

export function generateFullBodyWorkout(
  rawProfile: UserProfile,
  recentContext: WorkoutLog[] | Set<string> = [],
): FullBodyProgram {
  const recentExerciseIds = extractRecentExerciseIds(recentContext);
  const base = generateV2(rawProfile);
  const rotation = rotateRecentExercises(base, recentExerciseIds);
  const target = base.targetWeeklyVolumeMap || base.weeklyVolumeMap;
  const priorities = base.profile.priorities || [];

  const splitDays = base.splitDays.map((day) => ({
    ...day,
    items: rebalanceDay(
      day.items,
      target,
      priorities,
      sessionBudget(base.profile.timePerSessionMin),
    ),
  }));

  const warnings = [...(base.generationWarnings || [])];
  if (rotation.rotated.length > 0) {
    warnings.push(`Histórico recente: ${rotation.rotated.length} exercício(s) rotacionado(s) para aumentar variedade sem alterar os padrões do Full Body.`);
  }
  if (rotation.limited.length > 0) {
    warnings.push(`Rotação histórica limitada: ${rotation.limited.length} exercício(s) recente(s) permaneceram por falta de alternativa segura dentro do catálogo e das restrições atuais.`);
  }

  for (const day of splitDays) {
    const estimated = estimateMinutes(day.items);
    if (estimated > base.profile.timePerSessionMin + 10) {
      warnings.push(
        `Sessão ${day.id} estimada em ${estimated} min, acima da janela de ${base.profile.timePerSessionMin} min.`,
      );
    }
  }

  const { weekly, frequency } = recompute(splitDays);

  return {
    ...base,
    splitDays,
    weeklyVolumeMap: weekly,
    frequencyMap: frequency,
    generationWarnings: Array.from(new Set(warnings)),
  };
}
