import {
  Exercise,
  FullBodyProgram,
  Gender,
  GymEnvironment,
  MuscleGroup,
  UserProfile,
  WorkoutDay,
  WorkoutItem,
} from '../types';
import { EXERCISE_DATABASE, getSmartReplacements } from './exerciseData';

// Default target volume per muscle group per week based on experience and goal
export function calculateWeeklyTargetVolume(profile: UserProfile): Record<MuscleGroup, number> {
  const isMale = profile.gender === 'male';

  // Base volume bounds (sets per muscle per week)
  let baseVolume = 10;
  if (profile.experience === 'beginner') baseVolume = 10;
  if (profile.experience === 'intermediate') baseVolume = 14;
  if (profile.experience === 'advanced') baseVolume = 18;

  // Objective multiplier
  if (profile.objective === 'hypertrophy') baseVolume += 2;
  if (profile.objective === 'strength') baseVolume -= 2; // Focus on higher intensity, lower set count

  const volumeMap: Record<MuscleGroup, number> = {
    peitoral: isMale ? baseVolume + 2 : baseVolume - 2,
    costas: baseVolume + 2,
    ombros: baseVolume,
    biceps: isMale ? baseVolume : baseVolume - 4,
    triceps: isMale ? baseVolume : baseVolume - 4,
    quadriceps: baseVolume + 1,
    posteriores: baseVolume,
    gluteos: isMale ? baseVolume - 2 : baseVolume + 4,
    panturrilhas: baseVolume - 2,
    core: 8,
  };

  // Adjust for user specific priority boosts (+3 sets for priority muscles)
  if (profile.priorities && profile.priorities.length > 0) {
    profile.priorities.forEach((m) => {
      if (volumeMap[m] !== undefined) {
        volumeMap[m] += 3;
      }
    });
  }

  return volumeMap;
}

// Order rationale generator
function getOrderRationale(index: number, exercise: Exercise, prevExercise?: Exercise): string {
  if (index === 0) {
    return `Exercício composto primário (${exercise.padraoMotor.toUpperCase()}) alocado no início da sessão com o Sistema Nervoso Central (SNC) descansado.`;
  }
  if (prevExercise && exercise.fatigueIndex >= 4 && prevExercise.fatigueIndex >= 4) {
    return `Alocação otimizada: alternando padrão motor para evitar acúmulo consecutivo de fadiga axial na coluna.`;
  }
  if (exercise.categoria === 'isolation') {
    return `Exercício monoarticular de isolamento (${exercise.grupoMuscular.toUpperCase()}) alocado ao final da sessão para máximo estresse metabólico local sem fadiga sistêmica.`;
  }
  return `Movimento multiarticular secundário alocado mantendo equilíbrio antagônico na sessão.`;
}

// Generate Full Body Workout Program
export function generateFullBodyWorkout(profile: UserProfile): FullBodyProgram {
  const weeklyVolume = calculateWeeklyTargetVolume(profile);
  const numDays = profile.availableDays;

  // Determine number of exercises per session based on time per session
  let maxExercisesPerSession = 5;
  if (profile.timePerSessionMin <= 30) maxExercisesPerSession = 3;
  else if (profile.timePerSessionMin <= 45) maxExercisesPerSession = 4;
  else if (profile.timePerSessionMin <= 60) maxExercisesPerSession = 5;
  else if (profile.timePerSessionMin <= 75) maxExercisesPerSession = 6;
  else if (profile.timePerSessionMin <= 90) maxExercisesPerSession = 7;

  // Define split structure A, B, C, D
  const splitLetterIds: ('A' | 'B' | 'C' | 'D')[] =
    numDays === 2 ? ['A', 'B'] : numDays === 3 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];

  const splitDays: WorkoutDay[] = [];
  const frequencyMap: Record<MuscleGroup, number> = {
    peitoral: 0, costas: 0, ombros: 0, biceps: 0, triceps: 0,
    quadriceps: 0, posteriores: 0, gluteos: 0, panturrilhas: 0, core: 0
  };

  // Helper to select exercises for a day
  const usedExerciseIdsInProgram = new Set<string>();

  splitLetterIds.forEach((dayId, dayIdx) => {
    const dayItems: WorkoutItem[] = [];
    let currentSystemicFatigue = 0;

    // Target movement patterns per Full Body Day to guarantee complete stimulation:
    // Day A: Squat + Horiz Push + Horiz Pull + Isolation Upper + Core
    // Day B: Hinge + Vert Pull + Vert Push + Isolation Lower + Biceps
    // Day C: Lunge/Squat + Horiz Push (Incline) + Horiz Pull + Glutes/Isol + Triceps
    // Day D: Hinge (RDL) + Vert Pull + Shoulder Isol + Quads Isol + Core
    let targetPatterns = [
      'squat', 'horizontal_push', 'horizontal_pull', 'isolation_upper', 'core'
    ];

    if (dayId === 'B') {
      targetPatterns = ['hinge', 'vertical_pull', 'vertical_push', 'isolation_lower', 'isolation_upper'];
    } else if (dayId === 'C') {
      targetPatterns = ['squat', 'horizontal_push', 'horizontal_pull', 'hinge', 'isolation_upper'];
    } else if (dayId === 'D') {
      targetPatterns = ['hinge', 'vertical_pull', 'vertical_push', 'isolation_lower', 'core'];
    }

    // Limit by time available
    targetPatterns = targetPatterns.slice(0, maxExercisesPerSession);

    targetPatterns.forEach((pattern, patIdx) => {
      // Find suitable exercise from database
      let candidates = EXERCISE_DATABASE.filter((e) => {
        // Match pattern or category
        if (pattern === 'squat') return e.padraoMotor === 'squat';
        if (pattern === 'hinge') return e.padraoMotor === 'hinge';
        if (pattern === 'horizontal_push') return e.padraoMotor === 'horizontal_push';
        if (pattern === 'horizontal_pull') return e.padraoMotor === 'horizontal_pull';
        if (pattern === 'vertical_push') return e.padraoMotor === 'vertical_push';
        if (pattern === 'vertical_pull') return e.padraoMotor === 'vertical_pull';
        if (pattern === 'isolation_upper') return e.grupoMuscular === 'biceps' || e.grupoMuscular === 'triceps' || e.grupoMuscular === 'ombros';
        if (pattern === 'isolation_lower') return e.grupoMuscular === 'panturrilhas' || e.grupoMuscular === 'posteriores';
        if (pattern === 'core') return e.padraoMotor === 'core';
        return false;
      });

      // Filter out forbidden exercises
      if (profile.forbiddenExercises && profile.forbiddenExercises.length > 0) {
        candidates = candidates.filter((c) => !profile.forbiddenExercises.includes(c.id) && !profile.forbiddenExercises.includes(c.nome));
      }

      // Select candidate that best fits level and wasn't overused
      let selectedEx = candidates.find((c) => !usedExerciseIdsInProgram.has(c.id)) || candidates[0] || EXERCISE_DATABASE[0];

      // Check environment replacement (e.g. Small Gym or Home)
      let isReplaced = false;
      let originalEx: Exercise | undefined = undefined;
      let replacementNotes = '';

      if (profile.environment === 'home' || profile.environment === 'small_gym' || profile.environment === 'minimal') {
        const replacements = getSmartReplacements(selectedEx, profile.environment, profile.forbiddenExercises);
        if (replacements.length > 0 && selectedEx.equipamento === 'machine') {
          originalEx = selectedEx;
          selectedEx = replacements[0];
          isReplaced = true;
          replacementNotes = `Substituído automaticamente para ambiente "${profile.environment.toUpperCase()}" mantendo o padrão motor ${originalEx.padraoMotor.toUpperCase()}.`;
        }
      }

      usedExerciseIdsInProgram.add(selectedEx.id);

      // Track muscle frequency
      frequencyMap[selectedEx.grupoMuscular] = (frequencyMap[selectedEx.grupoMuscular] || 0) + 1;
      selectedEx.musculosSecundarios.forEach((sec) => {
        frequencyMap[sec] = (frequencyMap[sec] || 0) + 0.5;
      });

      // Calculate target sets per session for this exercise
      const targetSets = selectedEx.categoria === 'compound' ? 3 : 3;
      const targetReps = selectedEx.categoria === 'compound' ? '6-8' : '10-12';
      const targetRIR = profile.experience === 'beginner' ? 2 : 1;
      const targetRPE = 10 - targetRIR;
      const targetRestSec = selectedEx.descanso || (selectedEx.categoria === 'compound' ? 120 : 75);

      const prevItem = dayItems[dayItems.length - 1];
      const orderRationale = getOrderRationale(patIdx, selectedEx, prevItem ? prevItem.exercise : undefined);

      currentSystemicFatigue += selectedEx.fatigueIndex;

      dayItems.push({
        id: `item_${dayId}_${patIdx}_${selectedEx.id}`,
        exercise: selectedEx,
        originalExercise: originalEx,
        targetSets,
        targetReps,
        targetRIR,
        targetRPE,
        targetRestSec,
        cadence: selectedEx.cadencia || '3-0-1-0',
        orderRationale,
        isReplaced,
        replacementNotes,
      });
    });

    const dayTitleMap = {
      A: 'Full Body A - Foco em Cadeia Anterior & Tração Horizontal',
      B: 'Full Body B - Foco em Cadeia Posterior & Empurre Vertical',
      C: 'Full Body C - Foco em Hipertrofia Global & Variação Angular',
      D: 'Full Body D - Foco em Força Relativa & Estabilidade de Core',
    };

    const dayFocusMuscles: MuscleGroup[] = Array.from(
      new Set(dayItems.map((i) => i.exercise.grupoMuscular))
    );

    splitDays.push({
      id: dayId,
      title: dayTitleMap[dayId],
      description: `Sessão Full Body de alta eficiência biomecânica projetada para durar aprox. ${profile.timePerSessionMin} minutos.`,
      focusMuscles: dayFocusMuscles,
      items: dayItems,
      estimatedTimeMin: profile.timePerSessionMin,
      systemicFatigueScore: Math.round((currentSystemicFatigue / (dayItems.length * 5)) * 100),
    });
  });

  const rationale = [
    `Metodologia Principal: FULL BODY selecionada com alta frequência semanal (${numDays}x/semana).`,
    `Frequência por Grupo Muscular: Estimulação de 2 a 4 vezes por semana para otimizar a síntese proteica muscular (MPS).`,
    `Volume Semanal Total: Calculado cientificamente para a experiência "${profile.experience.toUpperCase()}" (${profile.gender === 'male' ? 'Perfil Masculino' : 'Perfil Feminino'}).`,
    `Distribuição Biomecânica: Exercícios compostos alocados com precedência neurológica, alternando planos de movimento para gerenciar a fadiga axial.`,
    `Ambiente & Equipamento: Rotina adaptada dinamicamente para o cenário "${profile.environment.toUpperCase()}".`
  ];

  return {
    id: `program_${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile,
    methodology: 'FULL_BODY',
    splitDays,
    weeklyVolumeMap: weeklyVolume,
    frequencyMap,
    prescriptionRationale: rationale,
  };
}
