import { FullBodyProgram, MuscleGroup, WorkoutItem } from '../types';

export interface PrescriptionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const MUSCLES: MuscleGroup[] = [
  'peitoral', 'costas', 'ombros', 'biceps', 'triceps',
  'quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'core',
];

function parseRange(range: string): [number, number] | null {
  const match = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(range);
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2]);
  return min > 0 && max >= min ? [min, max] : null;
}

function validateItem(item: WorkoutItem, path: string, errors: string[]) {
  if (!Number.isInteger(item.targetSets) || item.targetSets < 2 || item.targetSets > 5) {
    errors.push(`${path}: targetSets deve permanecer entre 2 e 5.`);
  }

  const range = parseRange(item.targetReps);
  if (!range) errors.push(`${path}: targetReps inválido (${item.targetReps}).`);

  if (!Number.isFinite(item.targetRIR) || item.targetRIR < 0 || item.targetRIR > 5) {
    errors.push(`${path}: targetRIR deve permanecer entre 0 e 5.`);
  }

  if (!Number.isFinite(item.targetRPE) || item.targetRPE < 1 || item.targetRPE > 10) {
    errors.push(`${path}: targetRPE deve permanecer entre 1 e 10.`);
  }

  if (!Number.isFinite(item.targetRestSec) || item.targetRestSec < 0 || item.targetRestSec > 600) {
    errors.push(`${path}: descanso deve permanecer entre 0 e 600 segundos.`);
  }

  if (item.exercise.grupoMuscular !== item.exercise.grupoMuscular.trim()) {
    errors.push(`${path}: grupoMuscular inválido.`);
  }
}

export function validateWorkoutPrescription(program: FullBodyProgram): PrescriptionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!program || program.methodology !== 'FULL_BODY') {
    return { valid: false, errors: ['Programa ausente ou metodologia inválida.'], warnings };
  }

  if (![2, 3, 4, 5].includes(program.profile.availableDays)) {
    errors.push(`Frequência inválida: ${program.profile.availableDays}.`);
  }

  const expectedDays = program.profile.availableDays;
  if (program.splitDays.length !== expectedDays) {
    errors.push(`Quantidade de sessões divergente: esperado ${expectedDays}, recebido ${program.splitDays.length}.`);
  }

  const allowedEquipment = new Set(
    program.profile.environment === 'full_gym'
      ? ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'smith']
      : program.profile.environment === 'small_gym'
        ? ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band']
        : ['dumbbell', 'bodyweight', 'band'],
  );

  const forbidden = new Set(
    (program.profile.forbiddenExercises || []).map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()),
  );

  let directSetCount = 0;
  for (const day of program.splitDays) {
    const daySets = day.items.reduce((sum, item) => sum + item.targetSets, 0);
    const sessionBudget = program.profile.timePerSessionMin <= 30 ? 7
      : program.profile.timePerSessionMin <= 45 ? 10
        : program.profile.timePerSessionMin <= 60 ? 14
          : program.profile.timePerSessionMin <= 75 ? 18 : 22;

    if (daySets > sessionBudget) {
      errors.push(`Sessão ${day.id}: ${daySets} séries excedem o orçamento ${sessionBudget}.`);
    }

    if (!Number.isFinite(day.estimatedTimeMin) || day.estimatedTimeMin <= 0) {
      errors.push(`Sessão ${day.id}: estimatedTimeMin inválido.`);
    }

    if (!Number.isFinite(day.systemicFatigueScore) || day.systemicFatigueScore < 0 || day.systemicFatigueScore > 100) {
      errors.push(`Sessão ${day.id}: systemicFatigueScore deve permanecer entre 0 e 100.`);
    }

    for (const item of day.items) {
      const path = `${day.id}/${item.id}`;
      validateItem(item, path, errors);
      directSetCount += item.targetSets;

      const normalizedId = item.exercise.id.trim().toLowerCase();
      const normalizedName = item.exercise.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      if (forbidden.has(normalizedId) || forbidden.has(normalizedName)) {
        errors.push(`${path}: exercício proibido presente na prescrição.`);
      }

      if (!allowedEquipment.has(item.exercise.equipamento)) {
        errors.push(`${path}: equipamento ${item.exercise.equipamento} incompatível com ${program.profile.environment}.`);
      }
    }
  }

  for (const muscle of MUSCLES) {
    const volume = program.weeklyVolumeMap[muscle];
    if (!Number.isFinite(volume) || volume < 0) {
      errors.push(`weeklyVolumeMap.${muscle}: volume inválido.`);
    }
  }

  if (directSetCount === 0) warnings.push('Programa sem séries diretas prescritas.');
  if ((program.generationWarnings || []).length > 0) warnings.push(...program.generationWarnings!);

  return { valid: errors.length === 0, errors, warnings: Array.from(new Set(warnings)) };
}
