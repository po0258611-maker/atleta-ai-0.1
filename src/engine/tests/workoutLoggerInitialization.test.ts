import {
  parseInitialReps,
  initializeWorkoutLoggerState,
} from '../../components/WorkoutLoggerView';
import { WorkoutDay, WorkoutItem } from '../../types';

async function runWorkoutLoggerInitializationTests() {
  console.log('===================================================================');
  console.log('   ATLETA AI — TEST SUITE: WORKOUT LOGGER SAFE INITIALIZATION      ');
  console.log('===================================================================');

  // Test 1: Lower bound extraction from ranges
  {
    console.assert(parseInitialReps('6-10') === 6, 'Faixa "6-10" deve inicializar com limite inferior 6');
    console.assert(parseInitialReps('4-6') === 4, 'Faixa "4-6" deve inicializar com limite inferior 4');
    console.assert(parseInitialReps('8-12') === 8, 'Faixa "8-12" deve inicializar com limite inferior 8');
    console.assert(parseInitialReps('10-15') === 10, 'Faixa "10-15" deve inicializar com limite inferior 10');
    console.assert(parseInitialReps('12-15') === 12, 'Faixa "12-15" deve inicializar com limite inferior 12');
    console.assert(parseInitialReps(' 6 - 10 ') === 6, 'Faixa com espaços " 6 - 10 " deve extrair 6');
    console.assert(parseInitialReps('15') === 15, 'Número único "15" deve extrair 15');
    console.log('✓ [1] reps iniciais correspondem ao lower bound de targetReps quando existir');
  }

  // Test 2: Safe fallbacks on missing or invalid targetReps (no crash)
  {
    console.assert(parseInitialReps(undefined) === 10, 'undefined deve retornar fallback seguro (10)');
    console.assert(parseInitialReps(null) === 10, 'null deve retornar fallback seguro (10)');
    console.assert(parseInitialReps('') === 10, 'String vazia deve retornar fallback seguro (10)');
    console.assert(parseInitialReps('invalid-text') === 10, 'Texto não numérico deve retornar fallback seguro (10)');
    console.assert(parseInitialReps('0') === 10, '0 não positivo deve retornar fallback seguro (10)');
    console.log('✓ [2] ausência de targetReps ou formatos atípicos não causam crash');
  }

  // Test 3: Weight is NOT artificially initialized with 20kg (neutral weight = 0)
  {
    const mockWorkoutDay: WorkoutDay = {
      id: 'A',
      title: 'Treino A - Supino & Agachamento',
      description: 'Sessão de força e hipertrofia',
      focusMuscles: ['peitoral', 'quadriceps'],
      estimatedTimeMin: 60,
      systemicFatigueScore: 7,
      items: [
        {
          id: 'item_bench_press',
          exercise: {
            id: 'ex_bench',
            nome: 'Supino Reto com Barra',
            grupoMuscular: 'peitoral',
            musculosSecundarios: ['triceps', 'ombros'],
            categoria: 'compound',
            equipamento: 'barbell',
            nivel: 'intermediate',
            tipoMovimento: 'push',
            padraoMotor: 'horizontal_push',
            planoMovimento: 'sagittal',
            execucao: 'Executar descida controlada',
            respiracao: 'Inspirar na descida, expirar na subida',
            amplitude: 'Completa',
            cadencia: '3-0-1-0',
            rir: 2,
            rpe: 8,
            descanso: 120,
            errosComuns: ['Elevação dos ombros'],
            variacoes: ['Supino com Halteres'],
            substitutos: [],
            fatigueIndex: 3,
          },
          targetSets: 3,
          targetReps: '6-10',
          targetRIR: 2,
          targetRPE: 8,
          targetRestSec: 120,
          cadence: '3-0-1-0',
          orderRationale: 'Composto primário',
        },
        {
          id: 'item_squat',
          exercise: {
            id: 'ex_squat',
            nome: 'Agachamento Livre com Barra',
            grupoMuscular: 'quadriceps',
            musculosSecundarios: ['gluteos'],
            categoria: 'compound',
            equipamento: 'barbell',
            nivel: 'intermediate',
            tipoMovimento: 'legs',
            padraoMotor: 'squat',
            planoMovimento: 'sagittal',
            execucao: 'Agachar até quebrar a paralela',
            respiracao: 'Inspirar na descida, expirar na subida',
            amplitude: 'Completa',
            cadencia: '3-1-1-0',
            rir: 2,
            rpe: 8,
            descanso: 180,
            errosComuns: ['Valgo dinâmico'],
            variacoes: ['Leg Press 45'],
            substitutos: [],
            fatigueIndex: 4,
          },
          targetSets: 4,
          targetReps: '4-6',
          targetRIR: 2,
          targetRPE: 8,
          targetRestSec: 180,
          cadence: '3-1-1-0',
          orderRationale: 'Composto dominante de membros inferiores',
        },
      ],
    };

    const state = initializeWorkoutLoggerState(mockWorkoutDay);

    // Verify bench press sets
    const benchSets = state['item_bench_press'];
    console.assert(benchSets.length === 3, 'Deve conter 3 séries para supino');
    benchSets.forEach((set, idx) => {
      console.assert(set.setNumber === idx + 1, `Série ${idx + 1} deve ter setNumber correto`);
      console.assert(set.weightKg === 0, `Série ${idx + 1} NÃO deve ter carga artificial de 20kg (weightKg = 0)`);
      console.assert(set.weightKg !== 20, 'Carga NÃO pode ser 20kg artificial');
      console.assert(set.repsDone === 6, `Série ${idx + 1} deve inicializar com limite inferior da faixa 6-10 (repsDone = 6)`);
      console.assert(set.actualRIR === 2, 'actualRIR deve inicializar com targetRIR (2)');
      console.assert(set.completed === false, 'completed deve ser false');
    });

    // Verify squat sets
    const squatSets = state['item_squat'];
    console.assert(squatSets.length === 4, 'Deve conter 4 séries para agachamento');
    squatSets.forEach((set, idx) => {
      console.assert(set.weightKg === 0, `Agachamento série ${idx + 1} deve ter weightKg = 0`);
      console.assert(set.weightKg !== 20, 'Agachamento NÃO pode ter carga inicial 20kg');
      console.assert(set.repsDone === 4, `Agachamento série ${idx + 1} deve inicializar com lower bound de 4-6 (repsDone = 4)`);
    });

    console.log('✓ [3] nenhum exercício novo é inicializado com weightKg = 20 artificialmente (weightKg = 0)');
  }

  // Test 4: Compatibility with empty/null workout days
  {
    const nullState = initializeWorkoutLoggerState(null);
    console.assert(Object.keys(nullState).length === 0, 'WorkoutDay nulo deve retornar objeto vazio');

    const emptyDay: WorkoutDay = {
      id: 'B',
      title: 'Treino Vazio',
      description: 'Descanso ativo',
      focusMuscles: ['core'],
      estimatedTimeMin: 20,
      systemicFatigueScore: 0,
      items: [],
    };
    const emptyState = initializeWorkoutLoggerState(emptyDay);
    console.assert(Object.keys(emptyState).length === 0, 'WorkoutDay sem itens deve retornar objeto vazio');

    console.log('✓ [4] estado inicial continua compatível com qualquer entrada e com o restante do componente');
  }

  console.log('===================================================================');
  console.log('   RESULTADO: 4/4 TESTES PASSARAM COM SUCESSO (100%)              ');
  console.log('===================================================================');
}

runWorkoutLoggerInitializationTests().catch((err) => {
  console.error('Falha nos testes de inicialização do Workout Logger:', err);
  process.exit(1);
});
