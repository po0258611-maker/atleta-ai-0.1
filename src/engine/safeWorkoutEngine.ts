import { Exercise, FullBodyProgram, GymEnvironment, UserProfile } from '../types';
import { EXERCISE_DATABASE, getSmartReplacements } from './exerciseData';
import { generateFullBodyWorkout, validateAndSanitizeProfile } from './workoutEngine';

const ALLOWED_EQUIPMENT: Record<GymEnvironment, Exercise['equipamento'][]> = {
  full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'smith'],
  small_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'smith'],
  home: ['dumbbell', 'bodyweight', 'band'],
  minimal: ['bodyweight', 'band', 'dumbbell'],
};

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function isForbidden(exercise: Exercise, forbidden: string[]): boolean {
  const id = normalize(exercise.id);
  const name = normalize(exercise.nome);
  return forbidden.some((item) => {
    const token = normalize(item);
    return token === id || token === name;
  });
}

function isAllowedEnvironment(exercise: Exercise, environment: GymEnvironment): boolean {
  return ALLOWED_EQUIPMENT[environment].includes(exercise.equipamento);
}

function replacementFor(item: { exercise: Exercise }, profile: UserProfile, used: Set<string>): Exercise | null {
  const direct = EXERCISE_DATABASE.filter((e) =>
    e.padraoMotor === item.exercise.padraoMotor &&
    !isForbidden(e, profile.forbiddenExercises) &&
    isAllowedEnvironment(e, profile.environment) &&
    !used.has(e.id)
  );

  if (direct.length) return direct[0];

  const smart = getSmartReplacements(item.exercise, profile.environment, profile.forbiddenExercises)
    .map((r) => EXERCISE_DATABASE.find((e) => e.id === r.id || e.nome === r.nome))
    .filter((e): e is Exercise => Boolean(e))
    .filter((e) => isAllowedEnvironment(e, profile.environment) && !isForbidden(e, profile.forbiddenExercises) && !used.has(e.id));

  return smart[0] || null;
}

/**
 * Safety wrapper around the deterministic workout engine.
 * It does not change payment/subscription behavior and preserves the existing program contract.
 */
export function generateSafeFullBodyWorkout(rawProfile: UserProfile): FullBodyProgram {
  const profile = validateAndSanitizeProfile(rawProfile);
  const base = generateFullBodyWorkout(profile);
  const used = new Set<string>();
  const safetyNotes: string[] = [];

  const splitDays = base.splitDays.map((day) => {
    const items = day.items.map((item) => {
      let exercise = item.exercise;
      let originalExercise = item.originalExercise;
      let isReplaced = item.isReplaced;
      let replacementNotes = item.replacementNotes || '';

      const unsafe = isForbidden(exercise, profile.forbiddenExercises) || !isAllowedEnvironment(exercise, profile.environment);
      if (unsafe) {
        const replacement = replacementFor(item, profile, used);
        if (replacement) {
          originalExercise = originalExercise || exercise;
          exercise = replacement;
          isReplaced = true;
          replacementNotes = `${replacementNotes ? `${replacementNotes} ` : ''}Substituição de segurança aplicada para respeitar ambiente e exercícios proibidos.`.trim();
          safetyNotes.push(`${item.exercise.nome} foi substituído por ${replacement.nome}.`);
        }
      }

      used.add(exercise.id);
      return { ...item, exercise, originalExercise, isReplaced, replacementNotes };
    });

    const systemicFatigueScore = Math.min(
      100,
      Math.round((items.reduce((sum, item) => sum + Math.max(1, Math.min(5, item.exercise.fatigueIndex || 2)), 0) / Math.max(1, items.length * 5)) * 100)
    );

    return { ...day, items, systemicFatigueScore };
  });

  const hasLimitations = profile.limitations.length > 0;
  const limitationsNote = hasLimitations
    ? 'Limitações físicas declaradas exigem confirmação profissional quando houver dor, restrição médica ou dúvida sobre segurança do movimento; o texto livre não é tratado como diagnóstico.'
    : '';

  return {
    ...base,
    splitDays,
    profile,
    prescriptionRationale: [
      ...base.prescriptionRationale,
      'Filtro de segurança: ambiente e exercícios proibidos são verificados após a geração e não podem ser ignorados por fallback.',
      ...(limitationsNote ? [limitationsNote] : []),
      ...(safetyNotes.length ? [`Substituições de segurança: ${safetyNotes.join(' ')}`] : []),
    ],
  };
}
