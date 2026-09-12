import assert from 'node:assert/strict';
import { analyzeNextWorkout } from '../nextWorkoutAdaptive';
import { FullBodyProgram, UserProfile, WorkoutLog } from '../../types';

const profile: UserProfile = {
  name: 'Integration Test',
  gender: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  experience: 'intermediate',
  availableDays: 4,
  timePerSessionMin: 60,
  objective: 'hypertrophy',
  environment: 'full_gym',
  priorities: ['peitoral'],
  limitations: [],
  forbiddenExercises: [],
  sleepHours: 8,
  stressLevel: 'moderate',
};

const program: FullBodyProgram = {
  id: 'program_test',
  createdAt: '2026-09-02T10:00:00.000Z',
  profile,
  methodology: 'FULL_BODY',
  splitDays: [
    {
      id: 'A',
      title: 'Teste',
      description: 'Teste',
      focusMuscles: ['peitoral'],
      estimatedTimeMin: 50,
      systemicFatigueScore: 30,
      items: [
        {
          id: 'item_1',
          exercise: {
            id: 'ex_test',
            nome: 'Supino Teste',
            nomeEnglish: 'Test Bench Press',
            grupoMuscular: 'peitoral',
            musculosSecundarios: ['triceps'],
            categoria: 'compound',
            equipamento: 'barbell',
            nivel: 'intermediate',
            tipoMovimento: 'push',
            padraoMotor: 'horizontal_push',
            planoMovimento: 'sagittal',
            execucao: 'Teste',
            passoAPasso: ['Teste'],
            objetivo: 'Teste',
            dicaPrincipal: 'Teste',
            respiracao: 'Teste',
            amplitude: 'Teste',
            cadencia: '3-0-1-0',
            rir: 2,
            rpe: 8,
            descanso: 120,
            errosComuns: [],
            variacoes: [],
            substitutos: [],
            fatigueIndex: 3,
          },
          targetSets: 3,
          targetReps: '8-12',
          targetRIR: 2,
          targetRPE: 8,
          targetRestSec: 120,
          cadence: '3-0-1-0',
          orderRationale: 'Teste',
        },
      ],
    },
  ],
  targetWeeklyVolumeMap: { peitoral: 12, costas: 12, ombros: 10, biceps: 8, triceps: 8, quadriceps: 10, posteriores: 10, gluteos: 10, panturrilhas: 6, core: 8 },
  weeklyVolumeMap: { peitoral: 3, costas: 0, ombros: 0, biceps: 0, triceps: 1.5, quadriceps: 0, posteriores: 0, gluteos: 0, panturrilhas: 0, core: 0 },
  frequencyMap: { peitoral: 1, costas: 0, ombros: 0, biceps: 0, triceps: 0.5, quadriceps: 0, posteriores: 0, gluteos: 0, panturrilhas: 0, core: 0 },
  prescriptionRationale: [],
};

const strongLog: WorkoutLog = {
  id: 'log_1',
  date: '2026-09-01T10:00:00.000Z',
  dayId: 'A',
  durationMin: 55,
  sessionRPE: 8,
  notes: '',
  exerciseLogs: [{
    exerciseId: 'ex_test',
    exerciseName: 'Supino Teste',
    sets: [
      { setNumber: 1, repsDone: 12, weightKg: 80, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 12, weightKg: 80, actualRIR: 2, completed: true },
      { setNumber: 3, repsDone: 12, weightKg: 80, actualRIR: 2, completed: true },
    ],
  }],
};

const analysis = analyzeNextWorkout(program, [strongLog], 'A');
assert.equal(analysis.recommendations[0].action, 'increase_load');
assert(analysis.recommendations[0].recommendedWeightKg > 80);
assert(analysis.fatigueScore >= 0 && analysis.fatigueScore <= 100);
console.log('✓ Próximo treino integra histórico, ProgressionEngine e FatigueEngine.');
