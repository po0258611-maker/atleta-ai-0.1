import { FullBodyProgram, MuscleGroup, WorkoutItem, WorkoutDay } from '../types';
import { generateFullBodyWorkout as generateV2 } from './workoutEngineV2';

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

export function generateFullBodyWorkout(rawProfile: Parameters<typeof generateV2>[0]): FullBodyProgram {
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

  return {
    ...base,
    splitDays,
    weeklyVolumeMap,
    frequencyMap,
    generationWarnings: Array.from(new Set(generationWarnings)),
  };
}
