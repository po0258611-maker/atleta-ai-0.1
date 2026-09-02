import { generateFullBodyWorkout } from '../workoutEngineAdaptive';
import { UserProfile } from '../../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const profile: UserProfile = {
  name: 'Metric Test',
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

const program = generateFullBodyWorkout(profile);
assert(program.splitDays.length === 4, 'O programa deve manter quatro sessões.');
assert(program.splitDays.every((day) => day.estimatedTimeMin >= 5), 'Toda sessão precisa de estimativa real positiva.');
assert(program.splitDays.every((day) => day.systemicFatigueScore >= 0 && day.systemicFatigueScore <= 100), 'Fadiga sistêmica deve permanecer entre 0 e 100.');
assert(program.splitDays.every((day) => day.items.reduce((sum, item) => sum + item.targetSets, 0) <= 14), 'Nenhuma sessão pode ultrapassar o orçamento de séries de 60 min.');

console.log('✓ Métricas do programa adaptativo recalculadas após rebalanceamento.');
