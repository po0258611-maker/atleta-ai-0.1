import { generateFullBodyWorkout } from '../workoutEngineAdaptive';
import { selectExerciseForPattern } from '../workoutEngineV2';
import { EXERCISE_DATABASE } from '../exerciseData';
import { UserProfile, WorkoutLog } from '../../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    name: 'Test Athlete',
    gender: 'male',
    age: 28,
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
    ...overrides,
  };
}

function makeLog(exerciseIds: string[], date: string): WorkoutLog {
  return {
    id: `log_${date}`,
    date,
    dayId: 'A',
    durationMin: 55,
    sessionRPE: 8,
    notes: '',
    exerciseLogs: exerciseIds.map((exerciseId) => ({
      exerciseId,
      exerciseName: exerciseId,
      sets: [{
        setNumber: 1,
        repsDone: 10,
        weightKg: 50,
        actualRIR: 2,
        completed: true,
      }],
    })),
  };
}

function runWorkoutEngineV2Tests() {
  console.log('--- INICIANDO TESTES DO WORKOUT ENGINE ADAPTATIVO ---');

  {
    const profile = buildProfile({ environment: 'home', forbiddenExercises: ['ex_goblet_squat'] });
    const program = generateFullBodyWorkout(profile);
    assert(program.splitDays.length === 4, 'Deve gerar 4 sessões para 4 dias.');
    assert(program.splitDays.every((day) => day.items.length <= 5), 'Nenhuma sessão pode exceder o limite de exercícios para 60 min.');
    assert(program.splitDays.every((day) => day.items.every((item) => ['bodyweight', 'dumbbell', 'band'].includes(item.exercise.equipamento))), 'Ambiente doméstico não deve receber equipamento incompatível.');
    assert(program.splitDays.every((day) => day.items.every((item) => item.exercise.id !== 'ex_goblet_squat')), 'Exercício proibido nunca pode aparecer no programa.');
    assert(program.splitDays.every((day) => day.items.reduce((sum, item) => sum + item.targetSets, 0) <= 14), 'Sessões de 60 min devem respeitar o orçamento de séries por sessão.');
    console.log('✓ Restrições de ambiente, proibições e orçamento por sessão');
  }

  {
    const result = selectExerciseForPattern(
      'squat',
      buildProfile({ environment: 'home', forbiddenExercises: ['ex_goblet_squat'] }),
      new Set(),
    );
    assert(result.isReplaced, 'Quando o padrão principal não estiver disponível, o motor deve registrar substituição.');
    assert(result.selectedExercise.id !== 'ex_goblet_squat', 'Fallback nunca pode utilizar exercício proibido.');
    assert(['bodyweight', 'dumbbell', 'band'].includes(result.selectedExercise.equipamento), 'Fallback doméstico deve respeitar o equipamento disponível.');
    assert(result.replacementNotes.length > 0, 'Fallback deve explicar a substituição.');
    console.log('✓ Fallback seguro para padrão indisponível');
  }

  {
    const bench = EXERCISE_DATABASE.find((exercise) => exercise.id === 'ex_bench_press_barbell');
    assert(bench, 'Supino de referência precisa existir no catálogo.');
    const result = selectExerciseForPattern(
      'horizontal_push',
      buildProfile({ forbiddenExercises: ['ex_bench_press_barbell', 'Supino Reto com Halteres', 'ex_incline_dumbbell_press'] }),
      new Set(),
    );
    assert(result.selectedExercise.id !== 'ex_bench_press_barbell', 'Seleção não pode ignorar proibição.');
    assert(!result.selectedExercise.nome.toLowerCase().includes('supino reto com halteres'), 'Seleção não pode ignorar proibição por nome.');
    console.log('✓ Seleção respeita proibições por ID e nome');
  }

  {
    const program = generateFullBodyWorkout(buildProfile({ timePerSessionMin: 30, availableDays: 2 }));
    assert(program.splitDays.length === 2, 'Deve respeitar frequência de 2 dias.');
    assert(program.splitDays.every((day) => day.items.length <= 3), 'Sessão de 30 min deve ter no máximo 3 exercícios.');
    assert(program.splitDays.every((day) => day.estimatedTimeMin > 0), 'Estimativa de duração precisa ser calculada.');
    assert(program.splitDays.every((day) => day.items.reduce((sum, item) => sum + item.targetSets, 0) <= 7), 'Sessão de 30 min deve respeitar o orçamento máximo de séries.');
    console.log('✓ Orçamento de tempo e frequência');
  }

  {
    const program = generateFullBodyWorkout(buildProfile({ sleepHours: 5, stressLevel: 'high' }));
    assert(program.targetWeeklyVolumeMap, 'Programa deve expor alvo teórico de volume.');
    assert(program.weeklyVolumeMap, 'Programa deve expor volume efetivamente prescrito.');
    assert(Array.isArray(program.generationWarnings), 'Programa deve expor warnings de geração.');
    assert(program.splitDays.every((day) => day.systemicFatigueScore >= 0 && day.systemicFatigueScore <= 100), 'Fadiga sistêmica deve permanecer em 0–100.');
    console.log('✓ Volume real, alvo teórico, fadiga e alertas');
  }

  {
    const baseline = generateFullBodyWorkout(buildProfile());
    const repeatedIds = baseline.splitDays[0].items.slice(0, 2).map((item) => item.exercise.id);
    const logs = [
      makeLog(repeatedIds, '2026-09-02T10:00:00.000Z'),
      makeLog(repeatedIds, '2026-09-01T10:00:00.000Z'),
      makeLog(repeatedIds, '2026-08-31T10:00:00.000Z'),
      makeLog(repeatedIds, '2026-08-30T10:00:00.000Z'),
    ];
    const adapted = generateFullBodyWorkout(buildProfile(), logs);
    const adaptedItems = adapted.splitDays.flatMap((day) => day.items);
    const adaptedIds = new Set(adaptedItems.map((item) => item.exercise.id));
    const actualRotation = adaptedItems.filter((item) => item.isReplaced).length;
    const hasRotationEvidence = adapted.generationWarnings?.some((warning) =>
      warning.includes('rotacionado') || warning.includes('Rotação histórica limitada'),
    );

    assert(adapted.splitDays.every((day) => day.items.every((item) => item.targetSets >= 2)), 'Rotação histórica não pode criar prescrição sem séries.');
    assert(hasRotationEvidence, 'Histórico repetido deve gerar evidência de rotação ou de limitação segura do catálogo.');
    assert(adaptedIds.size === adaptedItems.length, 'A rotação deve preservar unicidade de exercícios no programa sempre que o catálogo permitir.');

    if (actualRotation === 0) {
      assert(
        adapted.generationWarnings?.some((warning) => warning.includes('Rotação histórica limitada')),
        'Sem alternativa segura disponível, o programa deve declarar explicitamente a limitação da rotação histórica.',
      );
    }

    console.log(`✓ Histórico recente processado com ${actualRotation} rotação(ões) e fallback seguro quando necessário`);
  }

  console.log('✓ TODOS OS TESTES DO WORKOUT ENGINE ADAPTATIVO PASSARAM');
}

try {
  runWorkoutEngineV2Tests();
} catch (error) {
  console.error('Falha nos testes do Workout Engine Adaptativo:', error);
  process.exit(1);
}
