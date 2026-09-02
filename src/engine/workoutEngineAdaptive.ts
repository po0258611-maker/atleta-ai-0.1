import { FullBodyProgram, MuscleGroup, WorkoutItem, WorkoutDay, WorkoutLog } from '../types';
import { generateFullBodyWorkout as generateV2, selectExerciseForPattern } from './workoutEngineV2';

const MUSCLES: MuscleGroup[] = [
  'peitoral', 'costas', 'ombros', 'biceps', 'triceps',
  'quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'core',
];

const EMPTY = (): Record<MuscleGroup, number> =>
  Object.fromEntries(MUSCLES.map((muscle) => [muscle, 0])) as Record<MuscleGroup, number>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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
  const warmup = items.length ? 300 : 0;
  return Math.ceil((transition + work + rest + warmup) / 60);
}

function systemicFatigue(items: WorkoutItem[]): number {
  if (items.length === 0) return 0;
  const weighted = items.reduce((sum, item) => sum + item.exercise.fatigueIndex * item.targetSets, 0);
  const maximum = items.reduce((sum, item) => sum + 5 * item.targetSets, 0);
  return clamp(Math.round((weighted / Math.max(1, maximum)) * 100), 0, 100);
}

function rebalanceDay(
  dayItems: WorkoutItem[],
  target: Record<MuscleGroup, number>,
  priorities: MuscleGroup[],
  budget: number,
  timeLimit: number,
): WorkoutItem[] {
  const frequency = EMPTY();
  dayItems.forEach((item) => { frequency[item.exercise.grupoMuscular] += 1; });

  const items = dayItems.map((item) => {
    const muscle = item.exercise.grupoMuscular;
    let desired = Math.round((target[muscle] || 10) / Math.max(1, frequency[muscle]));
    if (priorities.includes(muscle)) desired += 1;
    desired = clamp(desired, 2, 5);
    return { ...item, targetSets: desired };
  });

  const reductionOrder = () => [...items].sort((a, b) => {
    const aPriority = priorities.includes(a.exercise.grupoMuscular) ? 1 : 0;
    const bPriority = priorities.includes(b.exercise.grupoMuscular) ? 1 : 0;
    const aIsolation = a.exercise.categoria === 'isolation' ? 0 : 1;
    const bIsolation = b.exercise.categoria === 'isolation' ? 0 : 1;
    return aPriority - bPriority || aIsolation - bIsolation || b.exercise.fatigueIndex - a.exercise.fatigueIndex;
  });

  const reduceUntil = (shouldReduce: () => boolean) => {
    let guard = 0;
    while (shouldReduce() && guard < 100) {
      const candidate = reductionOrder().find((item) => item.targetSets > 2);
      if (!candidate) break;
      candidate.targetSets -= 1;
      guard += 1;
    }
  };

  reduceUntil(() => items.reduce((sum, item) => sum + item.targetSets, 0) > budget);
  reduceUntil(() => estimateMinutes(items) > timeLimit && items.some((item) => item.targetSets > 2));

  return items;
}

function rebuildDay(day: WorkoutDay, items: WorkoutItem[]): WorkoutDay {
  return {
    ...day,
    items,
    estimatedTimeMin: estimateMinutes(items),
    systemicFatigueScore: systemicFatigue(items),
  };
}

function recentExerciseFrequency(logs: WorkoutLog[], maxLogs: number = 4): Map<string, number> {
  const counts = new Map<string, number>();
  [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maxLogs)
    .forEach((log) => {
      const uniqueExerciseIds = new Set(log.exerciseLogs.map((exercise) => exercise.exerciseId));
      uniqueExerciseIds.forEach((exerciseId) => counts.set(exerciseId, (counts.get(exerciseId) || 0) + 1));
    });
  return counts;
}

function rotateRepeatedExercises(program: FullBodyProgram, logs: WorkoutLog[]): FullBodyProgram {
  if (logs.length === 0) return program;

  const recentFrequency = recentExerciseFrequency(logs);
  if (recentFrequency.size === 0) return program;

  const usedIds = new Set(program.splitDays.flatMap((day) => day.items.map((item) => item.exercise.id)));
  let rotations = 0;

  const splitDays = program.splitDays.map((day) => {
    const items = day.items.map((item) => {
      const recentCount = recentFrequency.get(item.exercise.id) || 0;
      if (recentCount < 2) return item;

      const reservedIds = new Set(usedIds);
      reservedIds.delete(item.exercise.id);
      const selection = selectExerciseForPattern(item.exercise.padraoMotor, program.profile, reservedIds);

      if (selection.selectedExercise.id === item.exercise.id) return item;

      usedIds.delete(item.exercise.id);
      usedIds.add(selection.selectedExercise.id);
      rotations += 1;

      return {
        ...item,
        id: `item_${day.id}_${selection.selectedExercise.id}`,
        exercise: selection.selectedExercise,
        originalExercise: undefined,
        isReplaced: false,
        replacementNotes: `Rotação automática: o exercício anterior apareceu em ${recentCount} das últimas ${Math.min(4, logs.length)} sessões.`,
        orderRationale: `${item.orderRationale} Rotação aplicada para reduzir repetição recente e preservar o padrão motor.`,
      };
    });

    return rebuildDay(day, items);
  });

  if (rotations === 0) return program;

  return {
    ...program,
    splitDays,
    generationWarnings: Array.from(new Set([
      ...(program.generationWarnings || []),
      `${rotations} exercício(s) foram rotacionados com base no histórico recente de sessões.`,
    ])),
  };
}

export function generateFullBodyWorkout(
  rawProfile: Parameters<typeof generateV2>[0],
  recentLogs: WorkoutLog[] = [],
): FullBodyProgram {
  const base = generateV2(rawProfile);
  const target = base.targetWeeklyVolumeMap || base.weeklyVolumeMap;
  const priorities = base.profile.priorities || [];
  const budget = sessionBudget(base.profile.timePerSessionMin);
  const splitDays = base.splitDays.map((day) => {
    const rebalanced = rebalanceDay(
      day.items,
      target,
      priorities,
      budget,
      base.profile.timePerSessionMin,
    );
    return rebuildDay(day, rebalanced);
  });

  const weeklyVolumeMap = EMPTY();
  const frequencyMap = EMPTY();
  const generationWarnings = [...(base.generationWarnings || [])];

  splitDays.forEach((day) => {
    if (day.estimatedTimeMin > base.profile.timePerSessionMin) {
      generationWarnings.push(
        `Sessão ${day.id} estimada em ${day.estimatedTimeMin} min, acima da janela de ${base.profile.timePerSessionMin} min mesmo após ajuste de séries.`,
      );
    }

    day.items.forEach((item) => {
      const primary = item.exercise.grupoMuscular;
      weeklyVolumeMap[primary] += item.targetSets;
      frequencyMap[primary] += 1;
      item.exercise.musculosSecundarios.forEach((secondary) => {
        const factor = indirectFactor(item, secondary);
        weeklyVolumeMap[secondary] += Math.round(item.targetSets * factor * 10) / 10;
        frequencyMap[secondary] += factor;
      });
    });
  });

  const program: FullBodyProgram = {
    ...base,
    splitDays,
    weeklyVolumeMap,
    frequencyMap,
    generationWarnings: Array.from(new Set(generationWarnings)),
  };

  const rotated = rotateRepeatedExercises(program, recentLogs);
  if (rotated === program) return program;

  const rotatedVolume = EMPTY();
  const rotatedFrequency = EMPTY();
  rotated.splitDays.forEach((day) => {
    day.items.forEach((item) => {
      const primary = item.exercise.grupoMuscular;
      rotatedVolume[primary] += item.targetSets;
      rotatedFrequency[primary] += 1;
      item.exercise.musculosSecundarios.forEach((secondary) => {
        const factor = indirectFactor(item, secondary);
        rotatedVolume[secondary] += Math.round(item.targetSets * factor * 10) / 10;
        rotatedFrequency[secondary] += factor;
      });
    });
  });

  return {
    ...rotated,
    weeklyVolumeMap: rotatedVolume,
    frequencyMap: rotatedFrequency,
  };
}
