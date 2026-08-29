import { EXERCISE_DATABASE } from '../exerciseData';
import { generateSafeFullBodyWorkout } from '../safeWorkoutEngine';
import { generateMealPlan, nutritionPlanIsInternallyConsistent } from '../dietEngine';
import { UserProfile, GymEnvironment } from '../../types';

const baseProfile: UserProfile = {
  name: 'Teste',
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

function allowedEquipment(environment: GymEnvironment): string[] {
  if (environment === 'home') return ['dumbbell', 'bodyweight', 'band'];
  if (environment === 'minimal') return ['bodyweight', 'band', 'dumbbell'];
  return ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'smith'];
}

function runTests() {
  for (const environment of ['home', 'minimal'] as GymEnvironment[]) {
    const program = generateSafeFullBodyWorkout({ ...baseProfile, environment });
    const allowed = allowedEquipment(environment);
    for (const day of program.splitDays) {
      for (const item of day.items) {
        console.assert(allowed.includes(item.exercise.equipamento), `Exercício incompatível com ${environment}: ${item.exercise.nome}`);
      }
    }
  }

  const forbiddenId = EXERCISE_DATABASE[0]?.id;
  if (forbiddenId) {
    const program = generateSafeFullBodyWorkout({ ...baseProfile, forbiddenExercises: [forbiddenId] });
    const forbiddenName = EXERCISE_DATABASE.find((e) => e.id === forbiddenId)?.nome;
    for (const day of program.splitDays) {
      for (const item of day.items) {
        console.assert(item.exercise.id !== forbiddenId, `Exercício proibido foi prescrito: ${forbiddenName}`);
      }
    }
  }

  const allForbidden = EXERCISE_DATABASE.map((e) => e.id);
  let threw = false;
  try {
    generateSafeFullBodyWorkout({ ...baseProfile, forbiddenExercises: allForbidden });
  } catch (error) {
    threw = error instanceof Error && error.message === 'NO_SAFE_EXERCISE_AVAILABLE';
  }
  console.assert(threw, 'O gerador deve falhar fechado quando não existir exercício seguro disponível.');

  const preferences = ['traditional', 'vegetarian', 'low_carb', 'practical', 'low_cost'] as const;
  for (const preference of preferences) {
    const plan = generateMealPlan(baseProfile, 'hypertrophy', preference);
    console.assert(nutritionPlanIsInternallyConsistent(plan), `Plano nutricional inconsistente: ${preference}`);
    plan.meals.forEach((meal) => {
      const summedCalories = meal.foods.reduce((sum, food) => sum + food.calories, 0);
      console.assert(Math.abs(summedCalories - meal.calories) <= 1, `Calorias da refeição não fecham: ${preference}/${meal.id}`);
    });
  }

  console.log('✓ Testes de segurança do treino e consistência nutricional concluídos.');
}

runTests();
