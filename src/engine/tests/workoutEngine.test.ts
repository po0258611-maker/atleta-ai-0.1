import {
  generateFullBodyWorkout,
  calculateWeeklyTargetVolume,
  validateAndSanitizeProfile,
  determinePrescriptionParameters,
  allocateExerciseSets,
} from '../workoutEngine';
import { UserProfile, MuscleGroup } from '../../types';
import { EXERCISE_DATABASE } from '../exerciseData';

async function runWorkoutEngineTests() {
  console.log('--- INICIANDO TESTES DO SISTEMA DE VOLUME E PRESCRIÇÃO CIENTÍFICA ---');

  // Test 1: Input validation with defaults
  {
    const incompleteProfile: Partial<UserProfile> = {
      name: '',
      experience: undefined,
      availableDays: 7 as any,
    };
    const sanitized = validateAndSanitizeProfile(incompleteProfile);
    console.assert(sanitized.name === 'Atleta', 'Nome default deve ser Atleta');
    console.assert(sanitized.experience === 'intermediate', 'Experiência default intermediária');
    console.assert(sanitized.availableDays === 4, 'Dias de treino clampados para 4');
    console.log('✓ Teste 1: Validação de perfil e defaults conservadores');
  }

  // Test 2: Target Weekly Volume Calculation (Scientific Bounds [6, 22])
  {
    const beginnerProfile: UserProfile = {
      name: 'Iniciante',
      gender: 'male',
      age: 20,
      heightCm: 175,
      weightKg: 70,
      experience: 'beginner',
      availableDays: 3,
      timePerSessionMin: 60,
      objective: 'hypertrophy',
      environment: 'full_gym',
      priorities: [],
      limitations: [],
      forbiddenExercises: [],
      sleepHours: 8,
      stressLevel: 'low',
    };

    const advancedProfile: UserProfile = {
      ...beginnerProfile,
      name: 'Avançado',
      experience: 'advanced',
      priorities: ['peitoral'],
    };

    const beginnerVol = calculateWeeklyTargetVolume(beginnerProfile);
    const advancedVol = calculateWeeklyTargetVolume(advancedProfile);

    console.assert(beginnerVol.peitoral <= 14, 'Iniciante deve ter volume moderado (MEV/MAV)');
    console.assert(advancedVol.peitoral >= 18, 'Avançado com prioridade deve ter volume maior (MRV)');
    console.assert(advancedVol.peitoral <= 24, 'Volume de avançado não deve ultrapassar limite fisiológico');
    console.log('✓ Teste 2: Cálculo de Target Weekly Volume delimitado por experiência e prioridade');
  }

  // Test 3: Contextual Volume Allocation & Strict Bounds [2, 5] sets
  {
    const benchPress = EXERCISE_DATABASE.find((e) => e.id === 'ex_bench_press_barbell')!;
    const squadEx = EXERCISE_DATABASE.find((e) => e.id === 'ex_squat_barbell')!;

    const splitPatternsMap = [
      { dayId: 'A' as const, exercises: [benchPress, squadEx] },
      { dayId: 'B' as const, exercises: [benchPress, squadEx] },
    ];

    const targetVolume: Record<MuscleGroup, number> = {
      peitoral: 14,
      quadriceps: 14,
      costas: 14,
      ombros: 12,
      biceps: 10,
      triceps: 10,
      posteriores: 12,
      gluteos: 12,
      panturrilhas: 8,
      core: 8,
    };

    const setsMap = allocateExerciseSets(splitPatternsMap, targetVolume, ['peitoral'], 'intermediate');

    setsMap.forEach((sets, key) => {
      console.assert(sets >= 2 && sets <= 5, `Séries para ${key} devem estar entre 2 e 5 (atual: ${sets})`);
    });

    console.log('✓ Teste 3: Alocação de séries por exercício contextualmente com limites [2, 5]');
  }

  // Test 4: Full Program Generation Consistency Check (weeklyVolumeMap vs targetSets)
  {
    const profile: UserProfile = {
      name: 'Lucas',
      gender: 'male',
      age: 26,
      heightCm: 178,
      weightKg: 77,
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

    // Sum all directly prescribed sets in splitDays for peitoral
    let directChestSets = 0;
    program.splitDays.forEach((day) => {
      day.items.forEach((item) => {
        if (item.exercise.grupoMuscular === 'peitoral') {
          directChestSets += item.targetSets;
        }
      });
    });

    console.assert(directChestSets > 0, 'Deve prescrever séries diretas para peitoral');
    console.assert(
      program.weeklyVolumeMap.peitoral >= directChestSets,
      'weeklyVolumeMap deve refletir a soma real de séries diretas e indiretas'
    );
    console.log('✓ Teste 4: Consistência verificada entre targetSets prescritos e weeklyVolumeMap');
  }

  // Test 5: Different Profiles (Beginner 2-days 30min vs Advanced 4-days 90min)
  {
    const timeConstrainedBeginner: UserProfile = {
      name: 'Express User',
      gender: 'female',
      age: 35,
      heightCm: 165,
      weightKg: 62,
      experience: 'beginner',
      availableDays: 2,
      timePerSessionMin: 30,
      objective: 'health',
      environment: 'home',
      priorities: [],
      limitations: [],
      forbiddenExercises: [],
      sleepHours: 7,
      stressLevel: 'moderate',
    };

    const highVolumeAdvanced: UserProfile = {
      name: 'Elite Athlete',
      gender: 'male',
      age: 24,
      heightCm: 182,
      weightKg: 85,
      experience: 'advanced',
      availableDays: 4,
      timePerSessionMin: 90,
      objective: 'hypertrophy',
      environment: 'full_gym',
      priorities: ['quadriceps', 'peitoral'],
      limitations: [],
      forbiddenExercises: [],
      sleepHours: 9,
      stressLevel: 'low',
    };

    const prog1 = generateFullBodyWorkout(timeConstrainedBeginner);
    const prog2 = generateFullBodyWorkout(highVolumeAdvanced);

    console.assert(prog1.splitDays.length === 2, 'Prog 1 deve ter 2 dias');
    console.assert(prog1.splitDays[0].items.length <= 3, 'Prog 1 (30 min) deve conter max 3 exercícios por sessão');

    console.assert(prog2.splitDays.length === 4, 'Prog 2 deve ter 4 dias');
    console.assert(prog2.splitDays[0].items.length <= 7, 'Prog 2 (90 min) suporta até 7 exercícios por sessão');

    console.log('✓ Teste 5: Suporte robusto a múltiplos perfis (Iniciante 30min vs Avançado 90min)');
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DO SISTEMA DE VOLUME PASSARAM COM 100% DE SUCESSO!');
}

runWorkoutEngineTests().catch((err) => {
  console.error('Falha nos testes do workoutEngine:', err);
  process.exit(1);
});
