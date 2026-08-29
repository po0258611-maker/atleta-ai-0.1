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

const MUSCLE_GROUPS: MuscleGroup[] = [
  'peitoral', 'costas', 'ombros', 'biceps', 'triceps',
  'quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'core',
];

function emptyMuscleMap(): Record<MuscleGroup, number> {
  return Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as Record<MuscleGroup, number>;
}

export function validateAndSanitizeProfile(profile: Partial<UserProfile>): UserProfile {
  const sanitizedAvailableDays = ([2, 3, 4, 5].includes(profile.availableDays as any) ? profile.availableDays : 4) as 2 | 3 | 4 | 5;
  const sanitizedTime = ([30, 45, 60, 75, 90].includes(profile.timePerSessionMin as any) ? profile.timePerSessionMin : 60) as 30 | 45 | 60 | 75 | 90;
  const sanitizedExperience: ExperienceLevel = profile.experience === 'beginner' || profile.experience === 'intermediate' || profile.experience === 'advanced' ? profile.experience : 'intermediate';
  const sanitizedObjective: WorkoutGoal = profile.objective === 'hypertrophy' || profile.objective === 'strength' || profile.objective === 'fat_loss' || profile.objective === 'recomposition' || profile.objective === 'conditioning' || profile.objective === 'health' ? profile.objective : 'hypertrophy';
  const sanitizedEnvironment: GymEnvironment = profile.environment === 'full_gym' || profile.environment === 'small_gym' || profile.environment === 'home' || profile.environment === 'minimal' ? profile.environment : 'full_gym';

  const priorities = Array.isArray(profile.priorities) ? profile.priorities.filter((m): m is MuscleGroup => MUSCLE_GROUPS.includes(m)) : ['peitoral', 'costas', 'quadriceps'];
  const limitations = Array.isArray(profile.limitations) ? profile.limitations.filter((x): x is string => typeof x === 'string').slice(0, 20) : [];
  const forbiddenExercises = Array.isArray(profile.forbiddenExercises) ? profile.forbiddenExercises.filter((x): x is string => typeof x === 'string').slice(0, 200) : [];

  return {
    name: profile.name?.trim().slice(0, 80) || 'Atleta',
    gender: profile.gender === 'female' ? 'female' : 'male',
    age: typeof profile.age === 'number' && Number.isFinite(profile.age) ? Math.min(100, Math.max(13, profile.age)) : 26,
    heightCm: typeof profile.heightCm === 'number' && Number.isFinite(profile.heightCm) ? Math.min(250, Math.max(100, profile.heightCm)) : 175,
    weightKg: typeof profile.weightKg === 'number' && Number.isFinite(profile.weightKg) ? Math.min(350, Math.max(25, profile.weightKg)) : 75,
    experience: sanitizedExperience,
    availableDays: sanitizedAvailableDays,
    timePerSessionMin: sanitizedTime,
    objective: sanitizedObjective,
    environment: sanitizedEnvironment,
    priorities,
    limitations,
    forbiddenExercises,
    sleepHours: typeof profile.sleepHours === 'number' && Number.isFinite(profile.sleepHours) ? Math.min(14, Math.max(3, profile.sleepHours)) : 8,
    stressLevel: profile.stressLevel === 'high' || profile.stressLevel === 'low' ? profile.stressLevel : 'moderate',
  };
}

export function calculateWeeklyTargetVolume(profile: UserProfile): Record<MuscleGroup, number> {
  const validProfile = validateAndSanitizeProfile(profile);
  let baseVolumeSets = validProfile.experience === 'beginner' ? 10 : validProfile.experience === 'intermediate' ? 14 : 18;
  if (validProfile.objective === 'hypertrophy') baseVolumeSets += 2;
  if (validProfile.objective === 'strength') baseVolumeSets -= 2;
  if (validProfile.sleepHours < 7 || validProfile.stressLevel === 'high') baseVolumeSets = Math.max(8, baseVolumeSets - 2);
  baseVolumeSets = Math.max(6, Math.min(22, baseVolumeSets));

  const volumeMap: Record<MuscleGroup, number> = {
    peitoral: baseVolumeSets,
    costas: Math.min(22, baseVolumeSets + 2),
    ombros: baseVolumeSets,
    biceps: Math.max(6, Math.round(baseVolumeSets * 0.75)),
    triceps: Math.max(6, Math.round(baseVolumeSets * 0.75)),
    quadriceps: baseVolumeSets,
    posteriores: baseVolumeSets,
    gluteos: baseVolumeSets,
    panturrilhas: Math.max(6, Math.round(baseVolumeSets * 0.7)),
    core: 8,
  };

  validProfile.priorities.forEach((m) => {
    volumeMap[m] = Math.min(22, volumeMap[m] + 3);
  });
  return volumeMap;
}

export interface PrescribedParameters {
  targetReps: string;
  targetRIR: number;
  targetRPE: number;
  targetRestSec: number;
  cadence: string;
}

export function determinePrescriptionParameters(exercise: Exercise, experience: ExperienceLevel, objective: WorkoutGoal): PrescribedParameters {
  const isCompound = exercise.categoria === 'compound';
  let targetReps = '8-12';
  if (objective === 'strength') targetReps = isCompound ? '4-6' : '6-8';
  else if (objective === 'hypertrophy') targetReps = isCompound ? '6-10' : '10-15';
  else if (objective === 'conditioning' || objective === 'health') targetReps = isCompound ? '8-12' : '12-15';

  // Avoid making failure the default prescription. Advanced lifters may train close to failure,
  // but routine failure on every isolation set is not a safe universal default.
  let targetRIR = 2;
  if (experience === 'intermediate') targetRIR = isCompound ? 2 : 1;
  if (experience === 'advanced') targetRIR = isCompound ? 1 : 1;
  const targetRPE = 10 - targetRIR;
  let targetRestSec = exercise.descanso || (isCompound ? 120 : 75);
  if (objective === 'strength' && isCompound) targetRestSec = Math.max(targetRestSec, 150);

  return {
    targetReps,
    targetRIR,
    targetRPE,
    targetRestSec,
    cadence: exercise.cadencia || (isCompound ? '3-0-1-0' : '2-0-1-1'),
  };
}

export function generateOrderRationale(index: number, exercise: Exercise, prevExercise?: Exercise): string {
  if (index === 0) return `Exercício primário (${exercise.padraoMotor.toUpperCase()}) priorizado no início da sessão.`;
  if (prevExercise && exercise.fatigueIndex >= 4 && prevExercise.fatigueIndex >= 4) return 'Gestão de fadiga: dois movimentos de alta demanda sistêmica não devem ser encadeados quando houver alternativa biomecânica equivalente.';
  if (exercise.categoria === 'isolation') return `Exercício de isolamento (${exercise.grupoMuscular.toUpperCase()}) posicionado após movimentos multiarticulares.`;
  return 'Movimento secundário alocado para complementar a sessão e distribuir o estímulo.';
}

export function selectExerciseForPattern(pattern: MovementPattern | 'isolation_upper' | 'isolation_lower', profile: UserProfile, usedIds: Set<string>): { selectedExercise: Exercise; originalExercise?: Exercise; isReplaced: boolean; replacementNotes: string } {
  let candidates = EXERCISE_DATABASE.filter((e) => {
    if (pattern === 'squat') return e.padraoMotor === 'squat';
    if (pattern === 'hinge') return e.padraoMotor === 'hinge';
    if (pattern === 'horizontal_push') return e.padraoMotor === 'horizontal_push';
    if (pattern === 'horizontal_pull') return e.padraoMotor === 'horizontal_pull';
    if (pattern === 'vertical_push') return e.padraoMotor === 'vertical_push';
    if (pattern === 'vertical_pull') return e.padraoMotor === 'vertical_pull';
    if (pattern === 'isolation_upper') return e.grupoMuscular === 'biceps' || e.grupoMuscular === 'triceps' || e.grupoMuscular === 'ombros';
    if (pattern === 'isolation_lower') return e.grupoMuscular === 'panturrilhas' || e.grupoMuscular === 'posteriores' || e.grupoMuscular === 'gluteos';
    if (pattern === 'core') return e.padraoMotor === 'core';
    return false;
  });
  if (profile.forbiddenExercises.length) candidates = candidates.filter((c) => !profile.forbiddenExercises.includes(c.id) && !profile.forbiddenExercises.includes(c.nome));

  let selected = candidates.find((c) => !usedIds.has(c.id)) || candidates[0] || EXERCISE_DATABASE[0];
  let isReplaced = false;
  let originalExercise: Exercise | undefined;
  let replacementNotes = '';
  if (profile.environment !== 'full_gym') {
    const replacements = getSmartReplacements(selected, profile.environment, profile.forbiddenExercises);
    if (replacements.length && selected.equipamento === 'machine') {
      originalExercise = selected;
      selected = replacements[0];
      isReplaced = true;
      replacementNotes = `Adaptado para o ambiente "${profile.environment.toUpperCase()}" preservando o padrão motor (${originalExercise.padraoMotor.toUpperCase()}).`;
    }
  }
  return { selectedExercise: selected, originalExercise, isReplaced, replacementNotes };
}

export function allocateExerciseSets(splitPatternsMap: { dayId: 'A' | 'B' | 'C' | 'D'; exercises: Exercise[] }[], targetWeeklyVolume: Record<MuscleGroup, number>, priorities: MuscleGroup[], experience: ExperienceLevel): Map<string, number> {
  const setsMap = new Map<string, number>();
  const occurrences = new Map<MuscleGroup, { key: string; compound: boolean; priority: boolean }[]>();

  splitPatternsMap.forEach(({ dayId, exercises }) => {
    exercises.forEach((ex, idx) => {
      const key = `${dayId}_${idx}_${ex.id}`;
      const list = occurrences.get(ex.grupoMuscular) || [];
      list.push({ key, compound: ex.categoria === 'compound', priority: priorities.includes(ex.grupoMuscular) });
      occurrences.set(ex.grupoMuscular, list);
    });
  });

  // Distribute each muscle's weekly target across its actual exercise occurrences.
  // The previous cumulative remainder algorithm could overshoot targets because every
  // exercise was clamped to a minimum of 2 sets after the remainder was calculated.
  occurrences.forEach((items, muscle) => {
    const target = Math.max(0, Math.round(targetWeeklyVolume[muscle] || 0));
    if (!items.length) return;

    const baseMin = experience === 'beginner' ? 1 : 2;
    const maxPerExercise = 5;
    const floorSets = Math.floor(target / items.length);
    const remainder = Math.max(0, target - floorSets * items.length);
    const canHitTargetExactly = floorSets >= baseMin && floorSets <= maxPerExercise;

    if (canHitTargetExactly) {
      items.forEach((item, i) => setsMap.set(item.key, Math.min(maxPerExercise, floorSets + (i < remainder ? 1 : 0))));
      return;
    }

    // When the theoretical target cannot fit into the number of available exercises,
    // prioritize safe, time-feasible prescriptions rather than inventing extra sets.
    const safeAverage = Math.max(baseMin, Math.min(maxPerExercise, Math.round(target / items.length)));
    items.forEach((item) => {
      let sets = safeAverage;
      if (experience === 'beginner') sets = Math.min(3, sets);
      if (item.compound) sets = Math.min(maxPerExercise, Math.max(2, sets));
      if (item.priority && sets < maxPerExercise && target >= items.length * 2) sets += 1;
      setsMap.set(item.key, Math.min(maxPerExercise, sets));
    });
  });

  return setsMap;
}

export function generateFullBodyWorkout(rawProfile: UserProfile): FullBodyProgram {
  const profile = validateAndSanitizeProfile(rawProfile);
  const weeklyVolume = calculateWeeklyTargetVolume(profile);
  const numDays = profile.availableDays;
  let maxExercisesPerSession = 5;
  if (profile.timePerSessionMin <= 30) maxExercisesPerSession = 3;
  else if (profile.timePerSessionMin <= 45) maxExercisesPerSession = 4;
  else if (profile.timePerSessionMin <= 60) maxExercisesPerSession = 5;
  else if (profile.timePerSessionMin <= 75) maxExercisesPerSession = 6;
  else if (profile.timePerSessionMin <= 90) maxExercisesPerSession = 7;

  const splitLetterIds: ('A' | 'B' | 'C' | 'D')[] = numDays === 2 ? ['A', 'B'] : numDays === 3 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
  const usedExerciseIdsInProgram = new Set<string>();
  const intermediateDays: { dayId: 'A' | 'B' | 'C' | 'D'; selectedItems: { selectedExercise: Exercise; originalExercise?: Exercise; isReplaced: boolean; replacementNotes: string }[] }[] = [];

  splitLetterIds.forEach((dayId) => {
    let patterns: (MovementPattern | 'isolation_upper' | 'isolation_lower')[] = ['squat', 'horizontal_push', 'horizontal_pull', 'isolation_upper', 'core'];
    if (dayId === 'B') patterns = ['hinge', 'vertical_pull', 'vertical_push', 'isolation_lower', 'isolation_upper'];
    else if (dayId === 'C') patterns = ['squat', 'horizontal_push', 'horizontal_pull', 'hinge', 'isolation_upper'];
    else if (dayId === 'D') patterns = ['hinge', 'vertical_pull', 'vertical_push', 'isolation_lower', 'core'];

    const sessionPatterns = patterns.slice(0, maxExercisesPerSession);
    const selectedItems = sessionPatterns.map((pattern) => {
      const sel = selectExerciseForPattern(pattern, profile, usedExerciseIdsInProgram);
      usedExerciseIdsInProgram.add(sel.selectedExercise.id);
      return sel;
    });
    intermediateDays.push({ dayId, selectedItems });
  });

  const splitPatternsMap = intermediateDays.map((d) => ({ dayId: d.dayId, exercises: d.selectedItems.map((item) => item.selectedExercise) }));
  const exerciseSetsMap = allocateExerciseSets(splitPatternsMap, weeklyVolume, profile.priorities, profile.experience);
  const splitDays: WorkoutDay[] = [];
  const actualPrescribedVolume = emptyMuscleMap();
  const frequencyMap = emptyMuscleMap();

  intermediateDays.forEach(({ dayId, selectedItems }) => {
    const dayItems: WorkoutItem[] = [];
    let currentSystemicFatigue = 0;
    selectedItems.forEach((item, patIdx) => {
      const { selectedExercise, originalExercise, isReplaced, replacementNotes } = item;
      const key = `${dayId}_${patIdx}_${selectedExercise.id}`;
      const targetSets = exerciseSetsMap.get(key) || 1;
      actualPrescribedVolume[selectedExercise.grupoMuscular] += targetSets;
      frequencyMap[selectedExercise.grupoMuscular] += 1;
      selectedExercise.musculosSecundarios?.forEach((sec) => {
        actualPrescribedVolume[sec] += Math.round(targetSets * 0.5);
        frequencyMap[sec] += 0.5;
      });

      const params = determinePrescriptionParameters(selectedExercise, profile.experience, profile.objective);
      const prevItem = dayItems[dayItems.length - 1];
      const orderRationale = generateOrderRationale(patIdx, selectedExercise, prevItem ? prevItem.exercise : undefined);
      currentSystemicFatigue += selectedExercise.fatigueIndex || 2;
      dayItems.push({
        id: `item_${dayId}_${patIdx}_${selectedExercise.id}`,
        exercise: selectedExercise,
        originalExercise,
        targetSets,
        targetReps: params.targetReps,
        targetRIR: params.targetRIR,
        targetRPE: params.targetRPE,
        targetRestSec: params.targetRestSec,
        cadence: params.cadence,
        orderRationale,
        isReplaced,
        replacementNotes,
      });
    });

    const dayTitleMap: Record<'A' | 'B' | 'C' | 'D', string> = {
      A: 'Full Body A - Cadeia Anterior & Tração Horizontal',
      B: 'Full Body B - Cadeia Posterior & Empurre Vertical',
      C: 'Full Body C - Hipertrofia Global & Variação Angular',
      D: 'Full Body D - Força Relativa & Estabilidade Central',
    };
    const dayFocusMuscles: MuscleGroup[] = Array.from(new Set(dayItems.map((i) => i.exercise.grupoMuscular)));
    splitDays.push({
      id: dayId,
      title: dayTitleMap[dayId],
      description: `Sessão Full Body calibrada deterministicamente para ${profile.timePerSessionMin} minutos.`,
      focusMuscles: dayFocusMuscles,
      items: dayItems,
      estimatedTimeMin: profile.timePerSessionMin,
      systemicFatigueScore: Math.min(100, Math.round((currentSystemicFatigue / Math.max(1, dayItems.length * 5)) * 100)),
    });
  });

  return {
    id: `program_${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile,
    methodology: 'FULL_BODY',
    splitDays,
    weeklyVolumeMap: actualPrescribedVolume,
    frequencyMap,
    prescriptionRationale: [
      `Metodologia: FULL BODY de alta frequência (${numDays} sessões semanais).`,
      `Volume-alvo: metas semanais distribuídas apenas entre exercícios realmente presentes no plano.`,
      `Progressão: RIR/RPE conservadores e compatíveis com experiência e objetivo.`,
      `Ambiente: substituições aplicadas quando necessárias para o equipamento disponível.`,
    ],
  };
}
