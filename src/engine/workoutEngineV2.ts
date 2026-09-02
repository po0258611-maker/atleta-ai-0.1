import {
  Exercise,
  FullBodyProgram,
  GymEnvironment,
  MuscleGroup,
  MovementPattern,
  UserProfile,
  WorkoutDay,
  WorkoutItem,
  ExperienceLevel,
  WorkoutGoal,
} from '../types';
import { EXERCISE_DATABASE, getSmartReplacements } from './exerciseData';

const MUSCLES: MuscleGroup[] = [
  'peitoral', 'costas', 'ombros', 'biceps', 'triceps',
  'quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'core',
];

const PATTERNS_BY_DAY: Record<'A' | 'B' | 'C' | 'D', MovementPattern[]> = {
  A: ['squat', 'horizontal_push', 'horizontal_pull', 'isolation_upper', 'core'],
  B: ['hinge', 'vertical_pull', 'vertical_push', 'isolation_lower', 'isolation_upper'],
  C: ['squat', 'horizontal_push', 'horizontal_pull', 'hinge', 'core'],
  D: ['hinge', 'vertical_pull', 'vertical_push', 'isolation_lower', 'core'],
};

const DAY_TITLES: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'Full Body A — Agachar + Empurrar + Puxar',
  B: 'Full Body B — Hinge + Tração/Empurre Vertical',
  C: 'Full Body C — Variação de Padrões + Cadeia Posterior',
  D: 'Full Body D — Vertical + Cadeia Posterior + Core',
};

const DAY_DESCRIPTIONS: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'Sessão com prioridade em padrão de agachamento e equilíbrio entre empurrar e puxar.',
  B: 'Sessão com ênfase na cadeia posterior e padrões verticais, controlando fadiga sistêmica.',
  C: 'Sessão de variação dos padrões fundamentais com novo estímulo para membros inferiores.',
  D: 'Sessão de consolidação com padrões verticais, cadeia posterior e estabilidade do core.',
};

const emptyMuscleMap = (): Record<MuscleGroup, number> =>
  Object.fromEntries(MUSCLES.map((muscle) => [muscle, 0])) as Record<MuscleGroup, number>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeForbiddenList(values: string[] = []): Set<string> {
  return new Set(values.filter(Boolean).map(normalizeText));
}

function isForbidden(exercise: Exercise, forbidden: Set<string>): boolean {
  return forbidden.has(normalizeText(exercise.id)) || forbidden.has(normalizeText(exercise.nome));
}

function environmentAllows(exercise: Exercise, environment: GymEnvironment): boolean {
  if (environment === 'full_gym') return true;
  if (environment === 'small_gym') return exercise.equipamento !== 'smith';
  return exercise.equipamento === 'bodyweight' || exercise.equipamento === 'dumbbell' || exercise.equipamento === 'band';
}

function matchesPattern(exercise: Exercise, pattern: MovementPattern | 'isolation_upper' | 'isolation_lower'): boolean {
  if (pattern === 'isolation_upper') {
    return exercise.categoria === 'isolation' && ['biceps', 'triceps', 'ombros'].includes(exercise.grupoMuscular);
  }
  if (pattern === 'isolation_lower') {
    return exercise.categoria === 'isolation' && ['posteriores', 'gluteos', 'panturrilhas'].includes(exercise.grupoMuscular);
  }
  return exercise.padraoMotor === pattern;
}

function limitationConflict(exercise: Exercise, limitations: string[]): boolean {
  const text = limitations.map(normalizeText).join(' ');
  if (!text) return false;

  const conflicts: Array<[string[], (e: Exercise) => boolean]> = [
    [['joelho', 'joelhos', 'patela'], (e) => ['squat', 'lunge'].includes(e.padraoMotor)],
    [['lombar', 'coluna', 'costas baixas'], (e) => e.padraoMotor === 'hinge' || e.padraoMotor === 'squat'],
    [['ombro', 'ombros', 'manguito', 'shoulder'], (e) => e.padraoMotor === 'vertical_push'],
    [['cotovelo', 'cotovelos', 'elbow'], (e) => ['biceps', 'triceps'].includes(e.grupoMuscular)],
  ];

  return conflicts.some(([keywords, predicate]) => keywords.some((keyword) => text.includes(normalizeText(keyword))) && predicate(exercise));
}

function isSafeCandidate(exercise: Exercise, profile: UserProfile, forbidden: Set<string>, pattern: MovementPattern | 'isolation_upper' | 'isolation_lower'): boolean {
  return matchesPattern(exercise, pattern)
    && !isForbidden(exercise, forbidden)
    && environmentAllows(exercise, profile.environment)
    && !limitationConflict(exercise, profile.limitations);
}

function sanitizeProfile(profile: Partial<UserProfile>): UserProfile {
  const availableDays = ([2, 3, 4, 5].includes(profile.availableDays as number) ? profile.availableDays : 4) as 2 | 3 | 4 | 5;
  const timePerSessionMin = ([30, 45, 60, 75, 90].includes(profile.timePerSessionMin as number) ? profile.timePerSessionMin : 60) as 30 | 45 | 60 | 75 | 90;
  const experience: ExperienceLevel = ['beginner', 'intermediate', 'advanced'].includes(profile.experience as string)
    ? profile.experience as ExperienceLevel
    : 'intermediate';
  const objective: WorkoutGoal = ['hypertrophy', 'strength', 'fat_loss', 'recomposition', 'conditioning', 'health'].includes(profile.objective as string)
    ? profile.objective as WorkoutGoal
    : 'hypertrophy';
  const environment: GymEnvironment = ['full_gym', 'small_gym', 'home', 'minimal'].includes(profile.environment as string)
    ? profile.environment as GymEnvironment
    : 'full_gym';

  const priorities = Array.isArray(profile.priorities) ? profile.priorities.filter((value): value is MuscleGroup => MUSCLES.includes(value)) : [];
  const limitations = Array.isArray(profile.limitations) ? profile.limitations.filter((value): value is string => typeof value === 'string') : [];
  const forbiddenExercises = Array.isArray(profile.forbiddenExercises)
    ? profile.forbiddenExercises.filter((value): value is string => typeof value === 'string')
    : [];

  return {
    name: profile.name?.trim() || 'Atleta',
    gender: profile.gender === 'female' ? 'female' : 'male',
    age: typeof profile.age === 'number' && Number.isFinite(profile.age) && profile.age > 0 ? profile.age : 26,
    heightCm: typeof profile.heightCm === 'number' && Number.isFinite(profile.heightCm) && profile.heightCm > 0 ? profile.heightCm : 175,
    weightKg: typeof profile.weightKg === 'number' && Number.isFinite(profile.weightKg) && profile.weightKg > 0 ? profile.weightKg : 75,
    experience,
    availableDays,
    timePerSessionMin,
    objective,
    environment,
    priorities,
    limitations,
    forbiddenExercises,
    sleepHours: typeof profile.sleepHours === 'number' && Number.isFinite(profile.sleepHours) && profile.sleepHours > 0 ? profile.sleepHours : 8,
    stressLevel: profile.stressLevel === 'high' || profile.stressLevel === 'low' ? profile.stressLevel : 'moderate',
  };
}

export interface PrescribedParameters {
  targetReps: string;
  targetRIR: number;
  targetRPE: number;
  targetRestSec: number;
  cadence: string;
}

export function calculateWeeklyTargetVolume(profile: UserProfile): Record<MuscleGroup, number> {
  const p = sanitizeProfile(profile);
  let base = p.experience === 'beginner' ? 10 : p.experience === 'intermediate' ? 14 : 18;

  if (p.objective === 'hypertrophy') base += 2;
  if (p.objective === 'strength') base -= 2;
  if (p.sleepHours < 7 || p.stressLevel === 'high') base -= 2;

  base = clamp(base, 6, 20);

  const map: Record<MuscleGroup, number> = {
    peitoral: base,
    costas: base + 2,
    ombros: base,
    biceps: Math.max(6, Math.round(base * 0.75)),
    triceps: Math.max(6, Math.round(base * 0.75)),
    quadriceps: base,
    posteriores: base,
    gluteos: base,
    panturrilhas: Math.max(6, Math.round(base * 0.7)),
    core: 8,
  };

  p.priorities.forEach((muscle) => {
    map[muscle] = Math.min(22, map[muscle] + 2);
  });

  return map;
}

export function determinePrescriptionParameters(
  exercise: Exercise,
  experience: ExperienceLevel,
  objective: WorkoutGoal,
): PrescribedParameters {
  const isCompound = exercise.categoria === 'compound';
  let targetReps = '8-12';

  if (objective === 'strength') targetReps = isCompound ? '4-6' : '6-8';
  else if (objective === 'hypertrophy') targetReps = isCompound ? '6-10' : '10-15';
  else if (objective === 'conditioning' || objective === 'health') targetReps = isCompound ? '8-12' : '12-15';
  else if (objective === 'fat_loss') targetReps = isCompound ? '6-10' : '10-15';
  else if (objective === 'recomposition') targetReps = isCompound ? '6-10' : '8-15';

  const targetRIR = experience === 'advanced' ? (isCompound ? 1 : 0) : experience === 'intermediate' ? (isCompound ? 2 : 1) : 2;
  const targetRPE = clamp(10 - targetRIR, 6, 10);
  const defaultRest = isCompound ? 120 : 75;
  const targetRestSec = objective === 'strength' && isCompound ? Math.max(150, exercise.descanso || 0) : (exercise.descanso || defaultRest);

  return {
    targetReps,
    targetRIR,
    targetRPE,
    targetRestSec,
    cadence: exercise.cadencia || (isCompound ? '3-0-1-0' : '2-0-1-1'),
  };
}

function scoreExercise(
  exercise: Exercise,
  profile: UserProfile,
  pattern: MovementPattern | 'isolation_upper' | 'isolation_lower',
  usedIds: Set<string>,
): number {
  let score = 0;
  const isPriority = profile.priorities.includes(exercise.grupoMuscular);
  const experienceRank = { beginner: 1, intermediate: 2, advanced: 3 } as const;
  const requestedRank = experienceRank[profile.experience];
  const exerciseRank = experienceRank[exercise.nivel];

  if (matchesPattern(exercise, pattern)) score += 50;
  if (isPriority) score += 35;
  if (exerciseRank === requestedRank) score += 20;
  else if (exerciseRank < requestedRank) score += 12;
  else score -= 10;
  if (exercise.categoria === 'compound') score += 8;
  if (profile.objective === 'strength' && exercise.categoria === 'compound') score += 8;
  if (profile.objective === 'hypertrophy' && exercise.categoria === 'isolation') score += 5;
  score -= Math.max(0, exercise.fatigueIndex - 3) * 5;
  if (usedIds.has(exercise.id)) score -= 35;
  return score;
}

export function selectExerciseForPattern(
  pattern: MovementPattern | 'isolation_upper' | 'isolation_lower',
  profile: UserProfile,
  usedIds: Set<string>,
): {
  selectedExercise: Exercise;
  originalExercise?: Exercise;
  isReplaced: boolean;
  replacementNotes: string;
} {
  const forbidden = normalizeForbiddenList(profile.forbiddenExercises);
  const compatible = EXERCISE_DATABASE.filter((exercise) => isSafeCandidate(exercise, profile, forbidden, pattern));

  if (compatible.length === 0) {
    const replacementCandidates = EXERCISE_DATABASE
      .filter((exercise) => matchesPattern(exercise, pattern) && !isForbidden(exercise, forbidden) && !limitationConflict(exercise, profile.limitations))
      .flatMap((exercise) => getSmartReplacements(exercise, profile.environment, profile.forbiddenExercises)
        .map((replacement) => ({ exercise: replacement, original: exercise })))
      .filter(({ exercise }) => isSafeCandidate(exercise, profile, forbidden, pattern));

    const fallback = replacementCandidates
      .sort((a, b) => scoreExercise(b.exercise, profile, pattern, usedIds) - scoreExercise(a.exercise, profile, pattern, usedIds))[0];

    if (fallback) {
      return {
        selectedExercise: fallback.exercise,
        originalExercise: fallback.original,
        isReplaced: true,
        replacementNotes: `Substituição automática para compatibilidade com ${profile.environment}, preservando as limitações e proibições cadastradas.`,
      };
    }

    throw new Error(`Não existe exercício seguro disponível para o padrão ${pattern} com as restrições atuais.`);
  }

  const selected = [...compatible].sort((a, b) => scoreExercise(b, profile, pattern, usedIds) - scoreExercise(a, profile, pattern, usedIds))[0];
  const wasPreviouslyUsed = usedIds.has(selected.id);

  return {
    selectedExercise: selected,
    isReplaced: false,
    replacementNotes: wasPreviouslyUsed ? 'Repetição necessária por limitação do catálogo compatível.' : '',
  };
}

function calculateSessionSetBudget(timePerSessionMin: number): number {
  if (timePerSessionMin <= 30) return 7;
  if (timePerSessionMin <= 45) return 10;
  if (timePerSessionMin <= 60) return 14;
  if (timePerSessionMin <= 75) return 18;
  return 22;
}

function allocateSessionSets(
  selectedItems: Array<{ dayId: 'A' | 'B' | 'C' | 'D'; exercise: Exercise }>,
  targetWeeklyVolume: Record<MuscleGroup, number>,
  priorities: MuscleGroup[],
  budget: number,
): Map<string, number> {
  const frequencies = emptyMuscleMap();
  selectedItems.forEach(({ exercise }) => { frequencies[exercise.grupoMuscular] += 1; });

  const allocations = new Map<string, number>();
  selectedItems.forEach(({ dayId, exercise }, index) => {
    const frequency = Math.max(1, frequencies[exercise.grupoMuscular]);
    let sets = Math.round((targetWeeklyVolume[exercise.grupoMuscular] || 10) / frequency);
    if (priorities.includes(exercise.grupoMuscular)) sets += 1;
    if (exercise.categoria === 'compound') sets += 1;
    sets = clamp(sets, 2, 5);
    allocations.set(`${dayId}_${index}_${exercise.id}`, sets);
  });

  const total = [...allocations.values()].reduce((sum, value) => sum + value, 0);
  let excess = total - budget;

  if (excess > 0) {
    const reducible = [...selectedItems.keys()].sort((a, b) => {
      const ea = selectedItems[a].exercise;
      const eb = selectedItems[b].exercise;
      const pa = priorities.includes(ea.grupoMuscular) ? 1 : 0;
      const pb = priorities.includes(eb.grupoMuscular) ? 1 : 0;
      const ca = ea.categoria === 'isolation' ? 0 : 1;
      const cb = eb.categoria === 'isolation' ? 0 : 1;
      return pa - pb || ca - cb;
    });

    for (const index of reducible) {
      const item = selectedItems[index];
      const key = `${item.dayId}_${index}_${item.exercise.id}`;
      const current = allocations.get(key) || 2;
      const minimum = item.exercise.categoria === 'isolation' ? 2 : 2;
      const reduction = Math.min(excess, Math.max(0, current - minimum));
      if (reduction > 0) {
        allocations.set(key, current - reduction);
        excess -= reduction;
      }
      if (excess <= 0) break;
    }
  }

  return allocations;
}

function parseRepRange(range: string): number {
  const match = range.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return 10;
  return Math.round((Number(match[1]) + Number(match[2])) / 2);
}

function estimateSessionMinutes(items: WorkoutItem[]): number {
  const transitionSeconds = Math.max(0, items.length - 1) * 60;
  const workSeconds = items.reduce((sum, item) => sum + item.targetSets * clamp(parseRepRange(item.targetReps) * 3.5, 20, 60), 0);
  const restSeconds = items.reduce((sum, item) => sum + Math.max(0, item.targetSets - 1) * item.targetRestSec, 0);
  const warmupSeconds = items.length > 0 ? 300 : 0;
  return Math.max(0, Math.ceil((workSeconds + restSeconds + transitionSeconds + warmupSeconds) / 60));
}

function calculateSystemicFatigue(items: WorkoutItem[]): number {
  if (items.length === 0) return 0;
  const weighted = items.reduce((sum, item) => sum + item.exercise.fatigueIndex * item.targetSets, 0);
  const max = items.reduce((sum, item) => sum + 5 * item.targetSets, 0);
  return clamp(Math.round((weighted / Math.max(1, max)) * 100), 0, 100);
}

function calculateIndirectFactor(exercise: Exercise, secondary: MuscleGroup): number {
  if (!exercise.musculosSecundarios.includes(secondary)) return 0;
  if (exercise.categoria === 'isolation') return 0;
  return ['biceps', 'triceps'].includes(secondary) ? 0.5 : 0.35;
}

function buildWarnings(profile: UserProfile, target: Record<MuscleGroup, number>, actual: Record<MuscleGroup, number>, limitationsPresent: boolean): string[] {
  const warnings: string[] = [];
  if (limitationsPresent) warnings.push('As limitações foram interpretadas por palavras-chave conservadoras; qualquer dor/lesão ativa exige validação profissional antes de treinar.');
  if (profile.environment === 'home' || profile.environment === 'minimal') warnings.push('Ambiente doméstico foi restrito a peso corporal, halteres e elásticos para evitar assumir máquinas/cabos inexistentes.');

  const underfilled = MUSCLES.filter((muscle) => actual[muscle] < Math.floor(target[muscle] * 0.75));
  if (underfilled.length > 0) {
    warnings.push(`O tempo/equipamento disponível impediu atingir 75% do alvo teórico para: ${underfilled.join(', ')}.`);
  }
  return warnings;
}

export function generateOrderRationale(index: number, exercise: Exercise, previous?: Exercise): string {
  if (index === 0) return `Padrão ${exercise.padraoMotor.toUpperCase()} colocado no início para preservar qualidade técnica e capacidade de produção.`;
  if (previous && exercise.fatigueIndex >= 4 && previous.fatigueIndex >= 4) return 'Ordenação ajustada para evitar dois exercícios de alta fadiga sistêmica em sequência.';
  if (exercise.categoria === 'isolation') return 'Isolamento colocado após os padrões compostos para concentrar o estímulo local com menor custo sistêmico.';
  return 'Movimento composto secundário posicionado para distribuir estímulo e fadiga ao longo da sessão.';
}

export function generateFullBodyWorkout(rawProfile: UserProfile): FullBodyProgram {
  const profile = sanitizeProfile(rawProfile);
  const targetWeeklyVolume = calculateWeeklyTargetVolume(profile);
  const days = (profile.availableDays === 2 ? ['A', 'B'] : profile.availableDays === 3 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']) as Array<'A' | 'B' | 'C' | 'D'>;
  const maxExercises = profile.timePerSessionMin <= 30 ? 3 : profile.timePerSessionMin <= 45 ? 4 : profile.timePerSessionMin <= 60 ? 5 : profile.timePerSessionMin <= 75 ? 6 : 7;
  const usedIds = new Set<string>();
  const generationWarnings: string[] = [];
  const intermediate: Array<{ dayId: 'A' | 'B' | 'C' | 'D'; exercise: Exercise; originalExercise?: Exercise; isReplaced: boolean; replacementNotes: string }[]> = [];

  days.forEach((dayId) => {
    const patterns = PATTERNS_BY_DAY[dayId].slice(0, maxExercises);
    const selected = patterns.map((pattern) => {
      const result = selectExerciseForPattern(pattern, profile, usedIds);
      usedIds.add(result.selectedExercise.id);
      return {
        exercise: result.selectedExercise,
        originalExercise: result.originalExercise,
        isReplaced: result.isReplaced,
        replacementNotes: result.replacementNotes,
      };
    });
    intermediate.push(selected.map((item) => ({ dayId, ...item })));
  });

  const selectedFlat = intermediate.flat();
  const allocationInput = selectedFlat.map((item) => ({ dayId: item.dayId, exercise: item.exercise }));
  const allocations = allocateSessionSets(allocationInput, targetWeeklyVolume, profile.priorities, calculateSessionSetBudget(profile.timePerSessionMin));

  const actualVolume = emptyMuscleMap();
  const frequencyMap = emptyMuscleMap();
  const splitDays: WorkoutDay[] = [];

  intermediate.forEach((dayItems) => {
    const items: WorkoutItem[] = dayItems.map((item, index) => {
      const key = `${item.dayId}_${index}_${item.exercise.id}`;
      const params = determinePrescriptionParameters(item.exercise, profile.experience, profile.objective);
      const targetSets = allocations.get(key) || 2;
      const previous = index > 0 ? dayItems[index - 1].exercise : undefined;

      actualVolume[item.exercise.grupoMuscular] += targetSets;
      frequencyMap[item.exercise.grupoMuscular] += 1;
      item.exercise.musculosSecundarios.forEach((secondary) => {
        actualVolume[secondary] += Math.round(targetSets * calculateIndirectFactor(item.exercise, secondary) * 10) / 10;
        frequencyMap[secondary] += calculateIndirectFactor(item.exercise, secondary);
      });

      return {
        id: `item_${item.dayId}_${index}_${item.exercise.id}`,
        exercise: item.exercise,
        originalExercise: item.originalExercise,
        targetSets,
        targetReps: params.targetReps,
        targetRIR: params.targetRIR,
        targetRPE: params.targetRPE,
        targetRestSec: params.targetRestSec,
        cadence: params.cadence,
        orderRationale: generateOrderRationale(index, item.exercise, previous),
        isReplaced: item.isReplaced,
        replacementNotes: item.replacementNotes,
      };
    });

    const estimatedTimeMin = estimateSessionMinutes(items);
    if (estimatedTimeMin > profile.timePerSessionMin + 10) {
      generationWarnings.push(`Sessão ${dayItems[0].dayId} estimada em ${estimatedTimeMin} min, acima da janela de ${profile.timePerSessionMin} min.`);
    }

    splitDays.push({
      id: dayItems[0].dayId,
      title: DAY_TITLES[dayItems[0].dayId],
      description: DAY_DESCRIPTIONS[dayItems[0].dayId],
      focusMuscles: Array.from(new Set(items.map((item) => item.exercise.grupoMuscular))),
      items,
      estimatedTimeMin,
      systemicFatigueScore: calculateSystemicFatigue(items),
    });
  });

  generationWarnings.push(...buildWarnings(profile, targetWeeklyVolume, actualVolume, profile.limitations.length > 0));

  return {
    id: `program_${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile,
    methodology: 'FULL_BODY',
    splitDays,
    targetWeeklyVolumeMap: targetWeeklyVolume,
    weeklyVolumeMap: actualVolume,
    frequencyMap,
    prescriptionRationale: [
      `Gerador adaptativo Full Body com ${days.length} sessões, baseado em padrões motores e restrições do perfil.`,
      `Seleção ponderada por objetivo, experiência, prioridades musculares, ambiente e diversidade de exercícios.`,
      `Volume real separado do alvo teórico; o plano não declara ter atingido um volume que a duração da sessão não comporta.`,
      `Séries limitadas por exercício e por orçamento de tempo para reduzir risco de sessões impraticáveis.`,
      `Volume indireto ponderado por tipo de exercício em vez de contar toda musculatura secundária como série completa.`,
    ],
    generationWarnings: Array.from(new Set(generationWarnings)),
  };
}
