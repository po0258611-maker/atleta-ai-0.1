import assert from 'node:assert/strict';
import { generateFullBodyWorkout } from '../workoutEngineAdaptive';
import { validateWorkoutPrescription } from '../workoutPrescriptionValidator';
import { UserProfile } from '../../types';

const profile: UserProfile = {
  name: 'Validation Test',
  gender: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  experience: 'intermediate',
  availableDays: 4,
  timePerSessionMin: 60,
  objective: 'hypertrophy',
  environment: 'full_gym',
  priorities: ['peitoral', 'costas'],
  limitations: [],
  forbiddenExercises: [],
  sleepHours: 8,
  stressLevel: 'moderate',
};

const program = generateFullBodyWorkout(profile);
const result = validateWorkoutPrescription(program);
assert.equal(result.valid, true, result.errors.join('\n'));
assert.equal(result.errors.length, 0);
console.log('✓ Validador determinístico: programa gerado respeita contratos de séries, ambiente, volume, tempo e fadiga.');

const invalidProgram = structuredClone(program);
invalidProgram.splitDays[0].items[0].targetSets = 6;
const invalidResult = validateWorkoutPrescription(invalidProgram);
assert.equal(invalidResult.valid, false);
assert(invalidResult.errors.some((error) => error.includes('targetSets')));
console.log('✓ Validador detecta violação de série fora do limite.');
