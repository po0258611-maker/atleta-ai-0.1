import {
  FullBodyProgram,
  MuscleGroup,
  UserProfile,
  WorkoutLog,
} from '../types';
import { generateFullBodyWorkout as generateV2Adaptive } from './workoutEngineAdaptive';
import { generateFullBodyWorkout as generateV1Legacy } from './workoutEngine';
import {
  validateWorkoutPrescription,
  PrescriptionValidationResult,
  parseRange,
} from './workoutPrescriptionValidator';
import { EXERCISE_DATABASE } from './exerciseData';

const MUSCLES: MuscleGroup[] = [
  'peitoral', 'costas', 'ombros', 'biceps', 'triceps',
  'quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'core',
];

function getSessionBudget(timeMin: number): number {
  if (timeMin <= 30) return 7;
  if (timeMin <= 45) return 10;
  if (timeMin <= 60) return 14;
  if (timeMin <= 75) return 18;
  return 22;
}

export function repairWorkoutPrescription(rawProgram: FullBodyProgram): FullBodyProgram {
  const program: FullBodyProgram = JSON.parse(JSON.stringify(rawProgram));
  const profile = program.profile;
  const budget = getSessionBudget(profile.timePerSessionMin);
  const allowedEquipment = new Set(
    profile.environment === 'full_gym'
      ? ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'smith']
      : profile.environment === 'small_gym'
        ? ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band']
        : ['dumbbell', 'bodyweight', 'band'],
  );
  const forbidden = new Set(
    (profile.forbiddenExercises || []).map((value) =>
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(),
    ),
  );

  for (const day of program.splitDays) {
    for (const item of day.items) {
      // 1. Clamp targetSets
      if (!Number.isInteger(item.targetSets) || item.targetSets < 2 || item.targetSets > 5) {
        item.targetSets = Math.min(5, Math.max(2, Math.round(item.targetSets || 3)));
      }
      // 2. Validate and fix targetReps according to physiological limits & objective
      if (!/^\s*(\d+)\s*-\s*(\d+)\s*$/.test(item.targetReps || '')) {
        item.targetReps = '8-12';
      }
      const rangeMatch = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(item.targetReps);
      const minR = rangeMatch ? Number(rangeMatch[1]) : 8;
      const maxR = rangeMatch ? Number(rangeMatch[2]) : 12;
      const isPhysiological = minR >= 1 && maxR <= 35 && maxR >= minR && (maxR - minR) <= 8;
      if (!isPhysiological) {
        item.targetReps = '8-12';
      }
      if (profile?.objective === 'strength' && item.exercise?.categoria === 'compound') {
        const [rMin, rMax] = parseRange(item.targetReps) || [8, 12];
        if (rMin > 8 || rMax > 10) {
          item.targetReps = '4-6';
        }
      }

      // 3. Clamp RIR & enforce RIR ↔ RPE coherence
      if (!Number.isFinite(item.targetRIR) || item.targetRIR < 0 || item.targetRIR > 5) {
        item.targetRIR = Math.min(5, Math.max(0, Math.round(item.targetRIR ?? 2)));
      }
      const expectedRPE = Math.max(5, Math.min(10, 10 - item.targetRIR));
      if (!Number.isFinite(item.targetRPE) || Math.abs((item.targetRPE + item.targetRIR) - 10) > 1) {
        item.targetRPE = expectedRPE;
      }

      // 4. Clamp RestSec & Objective Coherence
      if (!Number.isFinite(item.targetRestSec) || item.targetRestSec < 0 || item.targetRestSec > 600) {
        item.targetRestSec = Math.min(600, Math.max(0, Math.round(item.targetRestSec ?? 90)));
      }
      if (profile.objective === 'strength' && item.exercise?.categoria === 'compound' && item.targetRestSec < 90) {
        item.targetRestSec = Math.max(120, item.exercise.descanso || 120);
      }

      // 5. Cadence and order rationale fallback
      if (typeof item.cadence !== 'string' || !item.cadence.trim()) {
        item.cadence = item.exercise?.cadencia || (item.exercise?.categoria === 'compound' ? '3-0-1-0' : '2-0-1-1');
      }
      if (typeof item.orderRationale !== 'string' || !item.orderRationale.trim()) {
        item.orderRationale = 'Posicionamento biomecânico calibrado para segurança articular e curva de fadiga ótima.';
      }
      // 6. Grupo muscular sanitization
      if (item.exercise?.grupoMuscular) {
        item.exercise.grupoMuscular = item.exercise.grupoMuscular.trim() as MuscleGroup;
      }
      // 7. Forbidden exercise replacement
      const normId = item.exercise.id.trim().toLowerCase();
      const normName = item.exercise.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
      if (forbidden.has(normId) || forbidden.has(normName)) {
        const replacement = EXERCISE_DATABASE.find(
          (ex) =>
            ex.padraoMotor === item.exercise.padraoMotor &&
            !forbidden.has(ex.id.trim().toLowerCase()) &&
            !forbidden.has(
              ex.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(),
            ) &&
            allowedEquipment.has(ex.equipamento),
        );
        if (replacement) {
          item.originalExercise = item.exercise;
          item.exercise = replacement;
          item.isReplaced = true;
          item.replacementNotes = `Substituído automaticamente na reparação: exercício proibido detectado.`;
        }
      }
      // 8. Incompatible equipment replacement
      if (!allowedEquipment.has(item.exercise.equipamento)) {
        const replacement = EXERCISE_DATABASE.find(
          (ex) =>
            ex.padraoMotor === item.exercise.padraoMotor &&
            allowedEquipment.has(ex.equipamento) &&
            !forbidden.has(ex.id.trim().toLowerCase()),
        );
        if (replacement) {
          item.originalExercise = item.exercise;
          item.exercise = replacement;
          item.isReplaced = true;
          item.replacementNotes = `Substituído automaticamente na reparação: equipamento incompatível com ${profile.environment}.`;
        }
      }
    }

    // 9. Day Budget Enforcement
    let currentTotal = day.items.reduce((sum, it) => sum + it.targetSets, 0);
    if (currentTotal > budget) {
      const reductionOrder = [...day.items].sort((a, b) => {
        const aPri = (profile.priorities || []).includes(a.exercise.grupoMuscular) ? 1 : 0;
        const bPri = (profile.priorities || []).includes(b.exercise.grupoMuscular) ? 1 : 0;
        const aIso = a.exercise.categoria === 'isolation' ? 0 : 1;
        const bIso = b.exercise.categoria === 'isolation' ? 0 : 1;
        return aPri - bPri || aIso - bIso;
      });

      for (const item of reductionOrder) {
        while (currentTotal > budget && item.targetSets > 2) {
          item.targetSets -= 1;
          currentTotal -= 1;
        }
        if (currentTotal <= budget) break;
      }
    }

    // 10. Recalculate estimatedTimeMin, systemicFatigueScore & focusMuscles
    day.focusMuscles = Array.from(new Set(day.items.map((item) => item.exercise.grupoMuscular)));
    const transition = Math.max(0, day.items.length - 1) * 60;
    const work = day.items.reduce((sum, item) => {
      const match = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(item.targetReps || '');
      const midpoint = match ? (Number(match[1]) + Number(match[2])) / 2 : 10;
      const workPerSet = Math.min(60, Math.max(20, midpoint * 3.5));
      return sum + item.targetSets * workPerSet;
    }, 0);
    const rest = day.items.reduce(
      (sum, item) => sum + Math.max(0, item.targetSets - 1) * item.targetRestSec,
      0,
    );
    day.estimatedTimeMin = Math.max(1, Math.ceil((transition + work + rest + 300) / 60));

    const weightedFatigue = day.items.reduce(
      (sum, item) => sum + item.exercise.fatigueIndex * item.targetSets,
      0,
    );
    const maxFatigue = day.items.reduce((sum, item) => sum + 5 * item.targetSets, 0);
    day.systemicFatigueScore = maxFatigue
      ? Math.min(100, Math.max(0, Math.round((weightedFatigue / maxFatigue) * 100)))
      : 0;
  }

  // 11. Recompute weeklyVolumeMap and frequencyMap
  const weekly = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<MuscleGroup, number>;
  const frequency = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<MuscleGroup, number>;
  for (const day of program.splitDays) {
    for (const item of day.items) {
      weekly[item.exercise.grupoMuscular] += item.targetSets;
      frequency[item.exercise.grupoMuscular] += 1;
      for (const sec of item.exercise.musculosSecundarios) {
        const factor =
          item.exercise.categoria === 'isolation'
            ? 0
            : sec === 'biceps' || sec === 'triceps'
              ? 0.5
              : 0.35;
        weekly[sec] += Math.round(item.targetSets * factor * 10) / 10;
        frequency[sec] += factor;
      }
    }
  }
  program.weeklyVolumeMap = weekly;
  program.frequencyMap = frequency;

  const warnings = new Set(program.generationWarnings || []);
  warnings.add('Prescrição reparada deterministicamente para conformidade com regras de segurança.');
  program.generationWarnings = Array.from(warnings);

  return program;
}

export interface PipelineOptions {
  forceV1Fallback?: boolean;
  simulateV2Failure?: boolean;
  bypassRepair?: boolean;
}

export interface PipelineExecutionResult {
  program: FullBodyProgram;
  source: 'V2_ADAPTIVE' | 'V2_REPAIRED' | 'V1_FALLBACK';
  validation: PrescriptionValidationResult;
  repaired: boolean;
}

export function executeWorkoutPipeline(
  profile: Partial<UserProfile>,
  recentContext: WorkoutLog[] | Set<string> = [],
  options?: PipelineOptions,
): PipelineExecutionResult {
  const sanitizedProfile: UserProfile = {
    name: profile.name || 'Atleta',
    gender: profile.gender === 'female' ? 'female' : 'male',
    age: profile.age || 26,
    heightCm: profile.heightCm || 175,
    weightKg: profile.weightKg || 75,
    experience: profile.experience || 'intermediate',
    availableDays: ([2, 3, 4, 5].includes(profile.availableDays as any)
      ? profile.availableDays
      : 4) as 2 | 3 | 4 | 5,
    timePerSessionMin: ([30, 45, 60, 75, 90].includes(profile.timePerSessionMin as any)
      ? profile.timePerSessionMin
      : 60) as 30 | 45 | 60 | 75 | 90,
    objective: profile.objective || 'hypertrophy',
    environment: profile.environment || 'full_gym',
    priorities: profile.priorities || ['peitoral', 'costas', 'quadriceps'],
    limitations: profile.limitations || [],
    forbiddenExercises: profile.forbiddenExercises || [],
    sleepHours: profile.sleepHours || 8,
    stressLevel: profile.stressLevel || 'moderate',
  };

  // If force fallback or simulated failure requested, jump directly to V1
  if (!options?.forceV1Fallback && !options?.simulateV2Failure) {
    try {
      // 1. GERAR COM V2 (Adaptive)
      const v2Program = generateV2Adaptive(sanitizedProfile, recentContext);

      // 2. VALIDAR
      const v2Validation = validateWorkoutPrescription(v2Program);
      if (v2Validation.valid) {
        return {
          program: v2Program,
          source: 'V2_ADAPTIVE',
          validation: v2Validation,
          repaired: false,
        };
      }

      // 3. REPARAR SE SEGURO
      if (!options?.bypassRepair) {
        const repaired = repairWorkoutPrescription(v2Program);

        // 4. VALIDAR NOVAMENTE
        const secondValidation = validateWorkoutPrescription(repaired);
        if (secondValidation.valid) {
          return {
            program: repaired,
            source: 'V2_REPAIRED',
            validation: secondValidation,
            repaired: true,
          };
        }
      }
    } catch (err) {
      console.warn('Falha durante execução do Engine V2, acionando fallback determinístico:', err);
    }
  }

  // 5. FALLBACK DETERMINÍSTICO PARA V1
  const v1Program = generateV1Legacy(sanitizedProfile);
  let v1Validation = validateWorkoutPrescription(v1Program);
  let finalV1 = v1Program;

  if (!v1Validation.valid && !options?.bypassRepair) {
    finalV1 = repairWorkoutPrescription(v1Program);
    v1Validation = validateWorkoutPrescription(finalV1);
  }

  const warnings = new Set(finalV1.generationWarnings || []);
  warnings.add('Fallback determinístico para Engine V1 ativado.');
  finalV1.generationWarnings = Array.from(warnings);

  return {
    program: finalV1,
    source: 'V1_FALLBACK',
    validation: v1Validation,
    repaired: finalV1 !== v1Program,
  };
}

export function generateWorkoutWithPipeline(
  profile: Partial<UserProfile>,
  recentContext: WorkoutLog[] | Set<string> = [],
  options?: PipelineOptions,
): FullBodyProgram {
  const result = executeWorkoutPipeline(profile, recentContext, options);
  if (!result.validation.valid) {
    console.error('Prescrição inválida gerada pelo pipeline:', result.validation.errors);
    throw new Error(
      `Prescrição inválida não pode ser retornada: ${result.validation.errors.join('; ')}`,
    );
  }
  return result.program;
}

export const generateFullBodyWorkout = generateWorkoutWithPipeline;
