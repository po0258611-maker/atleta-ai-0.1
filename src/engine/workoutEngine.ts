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

// =========================================================================
// 1. INPUT VALIDATION & CONSERVATIVE DEFAULTS
// =========================================================================

export function validateAndSanitizeProfile(profile: Partial<UserProfile>): UserProfile {
  const sanitizedAvailableDays = ([2, 3, 4, 5].includes(profile.availableDays as any)
    ? profile.availableDays
    : 4) as 2 | 3 | 4 | 5;

  const sanitizedTime = ([30, 45, 60, 75, 90].includes(profile.timePerSessionMin as any)
    ? profile.timePerSessionMin
    : 60) as 30 | 45 | 60 | 75 | 90;

  const sanitizedExperience: ExperienceLevel =
    profile.experience === 'beginner' ||
    profile.experience === 'intermediate' ||
    profile.experience === 'advanced'
      ? profile.experience
      : 'intermediate';

  const sanitizedObjective: WorkoutGoal =
    profile.objective === 'hypertrophy' ||
    profile.objective === 'strength' ||
    profile.objective === 'fat_loss' ||
    profile.objective === 'recomposition' ||
    profile.objective === 'conditioning' ||
    profile.objective === 'health'
      ? profile.objective
      : 'hypertrophy';

  const sanitizedEnvironment: GymEnvironment =
    profile.environment === 'full_gym' ||
    profile.environment === 'small_gym' ||
    profile.environment === 'home' ||
    profile.environment === 'minimal'
      ? profile.environment
      : 'full_gym';

  return {
    name: profile.name?.trim() || 'Atleta',
    gender: profile.gender === 'female' ? 'female' : 'male',
    age: typeof profile.age === 'number' && profile.age > 0 ? profile.age : 26,
    heightCm: typeof profile.heightCm === 'number' && profile.heightCm > 0 ? profile.heightCm : 175,
    weightKg: typeof profile.weightKg === 'number' && profile.weightKg > 0 ? profile.weightKg : 75,
    experience: sanitizedExperience,
    availableDays: sanitizedAvailableDays,
    timePerSessionMin: sanitizedTime,
    objective: sanitizedObjective,
    environment: sanitizedEnvironment,
    priorities: Array.isArray(profile.priorities) ? profile.priorities : ['peitoral', 'costas', 'quadriceps'],
    limitations: Array.isArray(profile.limitations) ? profile.limitations : [],
    forbiddenExercises: Array.isArray(profile.forbiddenExercises) ? profile.forbiddenExercises : [],
    sleepHours: typeof profile.sleepHours === 'number' && profile.sleepHours > 0 ? profile.sleepHours : 8,
    stressLevel: profile.stressLevel === 'high' || profile.stressLevel === 'low' ? profile.stressLevel : 'moderate',
  };
}

// =========================================================================
// 2. TARGET WEEKLY VOLUME (MEV -> MAV -> MRV BOUNDS)
// =========================================================================
// Scientific Basis: Schoenfeld et al. (2017), Helms et al. (2014) & Israetel (2019)
// Deterministic weekly target volume per muscle group (direct + fractional indirect)
export function calculateWeeklyTargetVolume(profile: UserProfile): Record<MuscleGroup, number> {
  const validProfile = validateAndSanitizeProfile(profile);

  // Base Volume per Major Muscle Group (Sets/week) based on Training Age (Experience)
  // Beginner: 8-12 sets (MEV/MAV)
  // Intermediate: 12-16 sets (MAV)
  // Advanced: 16-20 sets (MRV upper bounds)
  let baseVolumeSets = 10;
  if (validProfile.experience === 'beginner') baseVolumeSets = 10;
  if (validProfile.experience === 'intermediate') baseVolumeSets = 14;
  if (validProfile.experience === 'advanced') baseVolumeSets = 18;

  // Objective modifier
  if (validProfile.objective === 'hypertrophy') baseVolumeSets += 2;
  if (validProfile.objective === 'strength') baseVolumeSets -= 2;

  // Recovery & Stress modifier (Sleep & Lifestyle stress)
  if (validProfile.sleepHours < 7 || validProfile.stressLevel === 'high') {
    baseVolumeSets = Math.max(8, baseVolumeSets - 2);
  }

  // Clamping within conservative physiological bounds [6, 22]
  baseVolumeSets = Math.max(6, Math.min(22, baseVolumeSets));

  const volumeMap: Record<MuscleGroup, number> = {
    peitoral: baseVolumeSets,
    costas: baseVolumeSets + 2, // Large complex musculature
    ombros: baseVolumeSets,
    biceps: Math.max(6, Math.round(baseVolumeSets * 0.75)), // Gets indirect from pull compounds
    triceps: Math.max(6, Math.round(baseVolumeSets * 0.75)), // Gets indirect from push compounds
    quadriceps: baseVolumeSets,
    posteriores: baseVolumeSets,
    gluteos: baseVolumeSets,
    panturrilhas: Math.max(6, Math.round(baseVolumeSets * 0.7)),
    core: 8,
  };

  // Priority Muscle Groups: +3 to +4 sets/week periodized focus
  if (validProfile.priorities && validProfile.priorities.length > 0) {
    validProfile.priorities.forEach((m) => {
      if (volumeMap[m] !== undefined) {
        volumeMap[m] = Math.min(24, volumeMap[m] + 3);
      }
    });
  }

  return volumeMap;
}

// =========================================================================
// 3. INTENSITY, REP RANGE, RIR & REST PARAMETERS
// =========================================================================
export interface PrescribedParameters {
  targetReps: string;
  targetRIR: number;
  targetRPE: number;
  targetRestSec: number;
  cadence: string;
}

export function determinePrescriptionParameters(
  exercise: Exercise,
  experience: ExperienceLevel,
  objective: WorkoutGoal
): PrescribedParameters {
  const isCompound = exercise.categoria === 'compound';

  // Rep Range Allocation
  let targetReps = '8-12';
  if (objective === 'strength') {
    targetReps = isCompound ? '4-6' : '6-8';
  } else if (objective === 'hypertrophy') {
    targetReps = isCompound ? '6-10' : '10-15';
  } else if (objective === 'conditioning' || objective === 'health') {
    targetReps = isCompound ? '8-12' : '12-15';
  }

  // Proximity to Failure (RIR & RPE)
  let targetRIR = 2;
  if (experience === 'beginner') {
    targetRIR = 2;
  } else if (experience === 'intermediate') {
    targetRIR = isCompound ? 2 : 1;
  } else if (experience === 'advanced') {
    targetRIR = isCompound ? 1 : 0;
  }

  const targetRPE = Math.max(6, 10 - targetRIR);

  // Rest Intervals (ATP-CP restoration vs metabolic stress)
  let targetRestSec = exercise.descanso || (isCompound ? 120 : 75);
  if (objective === 'strength' && isCompound) {
    targetRestSec = Math.max(targetRestSec, 150);
  }

  // Cadence
  const cadence = exercise.cadencia || (isCompound ? '3-0-1-0' : '2-0-1-1');

  return {
    targetReps,
    targetRIR,
    targetRPE,
    targetRestSec,
    cadence,
  };
}

// =========================================================================
// 4. BIOMECHANICAL ORDERING & RATIONALE
// =========================================================================
export function generateOrderRationale(
  index: number,
  exercise: Exercise,
  prevExercise?: Exercise
): string {
  if (index === 0) {
    return `Exercício multiarticular primário (${exercise.padraoMotor.toUpperCase()}) alocado no início com o Sistema Nervoso Central descansado para máxima produção de torque.`;
  }
  if (prevExercise && exercise.fatigueIndex >= 4 && prevExercise.fatigueIndex >= 4) {
    return `Gestão de fadiga: alternância biomecânica para evitar sobrecarga axial consecutiva na coluna vertebral.`;
  }
  if (exercise.categoria === 'isolation') {
    return `Exercício monoarticular de isolamento (${exercise.grupoMuscular.toUpperCase()}) alocado no terço final para estresse metabólico e hipertrofia regional sem fadiga sistêmica.`;
  }
  return `Movimento multiarticular secundário alocado respeitando o equilíbrio estrutural e motor da sessão.`;
}

// =========================================================================
// 5. EXERCISE SELECTION & ENVIRONMENT ADAPTATION
// =========================================================================
export function selectExerciseForPattern(
  pattern: MovementPattern | 'isolation_upper' | 'isolation_lower',
  profile: UserProfile,
  usedIds: Set<string>
): {
  selectedExercise: Exercise;
  originalExercise?: Exercise;
  isReplaced: boolean;
  replacementNotes: string;
} {
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

  if (profile.forbiddenExercises && profile.forbiddenExercises.length > 0) {
    candidates = candidates.filter(
      (c) => !profile.forbiddenExercises.includes(c.id) && !profile.forbiddenExercises.includes(c.nome)
    );
  }

  let selected = candidates.find((c) => !usedIds.has(c.id)) || candidates[0] || EXERCISE_DATABASE[0];

  let isReplaced = false;
  let originalExercise: Exercise | undefined = undefined;
  let replacementNotes = '';

  if (profile.environment === 'home' || profile.environment === 'small_gym' || profile.environment === 'minimal') {
    const replacements = getSmartReplacements(selected, profile.environment, profile.forbiddenExercises);
    if (replacements.length > 0 && selected.equipamento === 'machine') {
      originalExercise = selected;
      selected = replacements[0];
      isReplaced = true;
      replacementNotes = `Adaptado para o ambiente "${profile.environment.toUpperCase()}" preservando o padrão motor (${originalExercise.padraoMotor.toUpperCase()}).`;
    }
  }

  return {
    selectedExercise: selected,
    originalExercise,
    isReplaced,
    replacementNotes,
  };
}

// =========================================================================
// 6. VOLUME ALLOCATION SYSTEM (WEEKLY TARGET -> SESSION SETS)
// =========================================================================
/**
 * Calculates context-driven target sets for each exercise in the program to match
 * the target weekly volume accurately across direct and indirect muscle stimulations.
 *
 * Enforces strict physiological bounds per session per exercise: [2, 5] sets.
 */
export function allocateExerciseSets(
  splitPatternsMap: { dayId: 'A' | 'B' | 'C' | 'D'; exercises: Exercise[] }[],
  targetWeeklyVolume: Record<MuscleGroup, number>,
  priorities: MuscleGroup[],
  experience: ExperienceLevel
): Map<string, number> {
  const setsMap = new Map<string, number>();

  // 1. Calculate how many times each primary muscle group appears across the weekly split
  const muscleFrequencyInPlan: Record<MuscleGroup, number> = {
    peitoral: 0, costas: 0, ombros: 0, biceps: 0, triceps: 0,
    quadriceps: 0, posteriores: 0, gluteos: 0, panturrilhas: 0, core: 0
  };

  splitPatternsMap.forEach(({ exercises }) => {
    exercises.forEach((ex) => {
      muscleFrequencyInPlan[ex.grupoMuscular] = (muscleFrequencyInPlan[ex.grupoMuscular] || 0) + 1;
    });
  });

  // 2. Track allocated direct volume to distribute remainder smoothly
  const currentAllocatedVolume: Record<MuscleGroup, number> = {
    peitoral: 0, costas: 0, ombros: 0, biceps: 0, triceps: 0,
    quadriceps: 0, posteriores: 0, gluteos: 0, panturrilhas: 0, core: 0
  };

  splitPatternsMap.forEach(({ dayId, exercises }) => {
    exercises.forEach((ex, idx) => {
      const key = `${dayId}_${idx}_${ex.id}`;
      const muscle = ex.grupoMuscular;
      const targetVol = targetWeeklyVolume[muscle] || 10;
      const freq = Math.max(1, muscleFrequencyInPlan[muscle] || 1);
      const isPriority = priorities.includes(muscle);
      const isCompound = ex.categoria === 'compound';

      // Desired sets per session = Target Weekly Volume / Frequency
      const targetPerSession = targetVol / freq;
      const remainingVolume = targetVol - (currentAllocatedVolume[muscle] || 0);
      const remainingSessions = Math.max(1, freq - Math.floor((currentAllocatedVolume[muscle] || 0) / Math.max(1, targetPerSession)));

      let calculatedSets = Math.round(remainingVolume / remainingSessions);

      // Contextual adjustments:
      // - Compounds get baseline preference (3-4 sets)
      // - Priority groups get +1 set if within bounds
      // - Beginners capped at 3 sets per exercise for recovery & motor quality
      if (isPriority && calculatedSets < 4) {
        calculatedSets += 1;
      }
      if (experience === 'beginner') {
        calculatedSets = Math.min(3, calculatedSets);
      }

      // Conservative Clamping Bounds: Min 2 sets, Max 5 sets per exercise
      const clampedSets = Math.max(2, Math.min(5, calculatedSets));

      currentAllocatedVolume[muscle] = (currentAllocatedVolume[muscle] || 0) + clampedSets;
      setsMap.set(key, clampedSets);
    });
  });

  return setsMap;
}

// =========================================================================
// 7. MAIN ENGINE: FULL BODY 2.5 PRESCRIPTION
// =========================================================================
export function generateFullBodyWorkout(rawProfile: UserProfile): FullBodyProgram {
  const profile = validateAndSanitizeProfile(rawProfile);
  const weeklyVolume = calculateWeeklyTargetVolume(profile);
  const numDays = profile.availableDays;

  // Exercise count per session based on available time
  let maxExercisesPerSession = 5;
  if (profile.timePerSessionMin <= 30) maxExercisesPerSession = 3;
  else if (profile.timePerSessionMin <= 45) maxExercisesPerSession = 4;
  else if (profile.timePerSessionMin <= 60) maxExercisesPerSession = 5;
  else if (profile.timePerSessionMin <= 75) maxExercisesPerSession = 6;
  else if (profile.timePerSessionMin <= 90) maxExercisesPerSession = 7;

  const splitLetterIds: ('A' | 'B' | 'C' | 'D')[] =
    numDays === 2 ? ['A', 'B'] : numDays === 3 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];

  const usedExerciseIdsInProgram = new Set<string>();

  // Pass 1: Select Exercises & Patterns for all days
  const intermediateDays: {
    dayId: 'A' | 'B' | 'C' | 'D';
    selectedItems: {
      selectedExercise: Exercise;
      originalExercise?: Exercise;
      isReplaced: boolean;
      replacementNotes: string;
    }[];
  }[] = [];

  splitLetterIds.forEach((dayId) => {
    let patterns: (MovementPattern | 'isolation_upper' | 'isolation_lower')[] = [
      'squat', 'horizontal_push', 'horizontal_pull', 'isolation_upper', 'core'
    ];

    if (dayId === 'B') {
      patterns = ['hinge', 'vertical_pull', 'vertical_push', 'isolation_lower', 'isolation_upper'];
    } else if (dayId === 'C') {
      patterns = ['squat', 'horizontal_push', 'horizontal_pull', 'hinge', 'isolation_upper'];
    } else if (dayId === 'D') {
      patterns = ['hinge', 'vertical_pull', 'vertical_push', 'isolation_lower', 'core'];
    }

    const sessionPatterns = patterns.slice(0, maxExercisesPerSession);
    const selectedItems = sessionPatterns.map((pattern) => {
      const sel = selectExerciseForPattern(pattern, profile, usedExerciseIdsInProgram);
      usedExerciseIdsInProgram.add(sel.selectedExercise.id);
      return sel;
    });

    intermediateDays.push({ dayId, selectedItems });
  });

  // Pass 2: Contextual Volume Allocation across Sessions
  const splitPatternsMap = intermediateDays.map((d) => ({
    dayId: d.dayId,
    exercises: d.selectedItems.map((item) => item.selectedExercise),
  }));

  const exerciseSetsMap = allocateExerciseSets(
    splitPatternsMap,
    weeklyVolume,
    profile.priorities || [],
    profile.experience
  );

  // Pass 3: Build Final WorkoutDays with precise sets & frequency calculation
  const splitDays: WorkoutDay[] = [];
  const actualPrescribedVolume: Record<MuscleGroup, number> = {
    peitoral: 0, costas: 0, ombros: 0, biceps: 0, triceps: 0,
    quadriceps: 0, posteriores: 0, gluteos: 0, panturrilhas: 0, core: 0
  };
  const frequencyMap: Record<MuscleGroup, number> = {
    peitoral: 0, costas: 0, ombros: 0, biceps: 0, triceps: 0,
    quadriceps: 0, posteriores: 0, gluteos: 0, panturrilhas: 0, core: 0
  };

  intermediateDays.forEach(({ dayId, selectedItems }) => {
    const dayItems: WorkoutItem[] = [];
    let currentSystemicFatigue = 0;

    selectedItems.forEach((item, patIdx) => {
      const { selectedExercise, originalExercise, isReplaced, replacementNotes } = item;
      const key = `${dayId}_${patIdx}_${selectedExercise.id}`;
      const targetSets = exerciseSetsMap.get(key) || 3;

      // Accumulate direct & indirect weekly prescribed volume
      actualPrescribedVolume[selectedExercise.grupoMuscular] =
        (actualPrescribedVolume[selectedExercise.grupoMuscular] || 0) + targetSets;

      // Track muscle frequency
      frequencyMap[selectedExercise.grupoMuscular] =
        (frequencyMap[selectedExercise.grupoMuscular] || 0) + 1;

      if (selectedExercise.musculosSecundarios) {
        selectedExercise.musculosSecundarios.forEach((sec) => {
          actualPrescribedVolume[sec] = (actualPrescribedVolume[sec] || 0) + Math.round(targetSets * 0.5);
          frequencyMap[sec] = (frequencyMap[sec] || 0) + 0.5;
        });
      }

      const params = determinePrescriptionParameters(
        selectedExercise,
        profile.experience,
        profile.objective
      );

      const prevItem = dayItems[dayItems.length - 1];
      const orderRationale = generateOrderRationale(
        patIdx,
        selectedExercise,
        prevItem ? prevItem.exercise : undefined
      );

      currentSystemicFatigue += (selectedExercise.fatigueIndex || 2);

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

    const dayFocusMuscles: MuscleGroup[] = Array.from(
      new Set(dayItems.map((i) => i.exercise.grupoMuscular))
    );

    splitDays.push({
      id: dayId,
      title: dayTitleMap[dayId],
      description: `Sessão Full Body calibrada deterministicamente para ${profile.timePerSessionMin} minutos.`,
      focusMuscles: dayFocusMuscles,
      items: dayItems,
      estimatedTimeMin: profile.timePerSessionMin,
      systemicFatigueScore: Math.min(100, Math.round((currentSystemicFatigue / (dayItems.length * 5)) * 100)),
    });
  });

  const rationale = [
    `Metodologia: FULL BODY 2.5 de alta frequência (${numDays} sessões semanais).`,
    `Distribuição de Volume: Séries prescritas contextualizadas com base no Target Volume (${weeklyVolume.peitoral} séries/sem peitoral, ${weeklyVolume.costas} costas).`,
    `Sobrecarga Proporcional: Séries diretas e sinergistas calibradas deterministicamente entre 2 a 5 séries por exercício.`,
    `Fadiga & RIR: Proximidade da falha calibrada (RIR 1-2 em compostos, RIR 0-1 em isolamentos).`,
    `Ambiente Adaptado: Prescrição adaptada dinamicamente para o ecossistema "${profile.environment.toUpperCase()}".`,
  ];

  return {
    id: `program_${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile,
    methodology: 'FULL_BODY',
    splitDays,
    weeklyVolumeMap: actualPrescribedVolume,
    frequencyMap,
    prescriptionRationale: rationale,
  };
}
