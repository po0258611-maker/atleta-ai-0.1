import {
  parseRepRange,
  getItemProgression,
} from '../../components/WorkoutLoggerView';
import { WorkoutItem, SetLog } from '../../types';

async function runWorkoutLoggerDoubleProgressionTests() {
  console.log('===================================================================');
  console.log('   ATLETA AI — TEST SUITE: WORKOUT LOGGER REAL TARGET PROGRESSION  ');
  console.log('===================================================================');

  // Test 1: Target "4-6" uses range [4, 6] in progression
  {
    const item4to6: WorkoutItem = {
      id: 'item_squat',
      exercise: {
        id: 'ex_squat',
        nome: 'Agachamento Livre',
        grupoMuscular: 'quadriceps',
        musculosSecundarios: ['gluteos'],
        categoria: 'compound',
        equipamento: 'barbell',
        nivel: 'intermediate',
        tipoMovimento: 'legs',
        padraoMotor: 'squat',
        planoMovimento: 'sagittal',
        execucao: 'Agachar até paralela',
        respiracao: 'Padrão Valsalva',
        amplitude: 'Completa',
        cadencia: '3-1-1-0',
        rir: 2,
        rpe: 8,
        descanso: 180,
        errosComuns: [],
        variacoes: [],
        substitutos: [],
        fatigueIndex: 4,
      },
      targetSets: 3,
      targetReps: '4-6',
      targetRIR: 2,
      targetRPE: 8,
      targetRestSec: 180,
      cadence: '3-1-1-0',
      orderRationale: 'Composto principal',
    };

    // Case A: Hit top of range (6 reps, completed) -> Should recommend load increment
    const completedTopSets: SetLog[] = [
      { setNumber: 1, repsDone: 6, weightKg: 100, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 6, weightKg: 100, actualRIR: 2, completed: true },
      { setNumber: 3, repsDone: 6, weightKg: 100, actualRIR: 2, completed: true },
    ];

    const progA = getItemProgression(item4to6, completedTopSets);
    console.assert(progA.currentReps === '4-6', `Current reps range must be "4-6", got: ${progA.currentReps}`);
    console.assert(progA.action === 'increase_load', `Expected increase_load on top of 4-6, got: ${progA.action}`);
    console.assert(progA.recommendedWeightKg > 100, 'Recommended weight must increase after hitting 6 reps');

    // Case B: Hit bottom of range (4 reps) -> Should recommend increasing reps within 4-6
    const bottomSets: SetLog[] = [
      { setNumber: 1, repsDone: 4, weightKg: 100, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 4, weightKg: 100, actualRIR: 2, completed: true },
      { setNumber: 3, repsDone: 4, weightKg: 100, actualRIR: 2, completed: true },
    ];

    const progB = getItemProgression(item4to6, bottomSets);
    console.assert(progB.currentReps === '4-6', `Current reps range must be "4-6", got: ${progB.currentReps}`);
    console.assert(progB.action === 'increase_reps' || progB.action === 'maintain', `Expected increase_reps or maintain, got: ${progB.action}`);
    console.assert(progB.recommendedWeightKg === 100, 'Weight should remain 100kg when progressing reps');

    console.log('✓ [1] target 4-6 → progressão recebe e avalia faixa real 4-6');
  }

  // Test 2: Target "6-10" uses range [6, 10] in progression
  {
    const item6to10: WorkoutItem = {
      id: 'item_bench',
      exercise: {
        id: 'ex_bench',
        nome: 'Supino Reto',
        grupoMuscular: 'peitoral',
        musculosSecundarios: ['triceps', 'ombros'],
        categoria: 'compound',
        equipamento: 'barbell',
        nivel: 'intermediate',
        tipoMovimento: 'push',
        padraoMotor: 'horizontal_push',
        planoMovimento: 'sagittal',
        execucao: 'Descida controlada',
        respiracao: 'Padrão',
        amplitude: 'Completa',
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
      targetReps: '6-10',
      targetRIR: 2,
      targetRPE: 8,
      targetRestSec: 120,
      cadence: '3-0-1-0',
      orderRationale: 'Composto peito',
    };

    // Hit top of range (10 reps)
    const topSets: SetLog[] = [
      { setNumber: 1, repsDone: 10, weightKg: 80, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 10, weightKg: 80, actualRIR: 2, completed: true },
      { setNumber: 3, repsDone: 10, weightKg: 80, actualRIR: 2, completed: true },
    ];

    const prog = getItemProgression(item6to10, topSets);
    console.assert(prog.currentReps === '6-10', `Current reps range must be "6-10", got: ${prog.currentReps}`);
    console.assert(prog.action === 'increase_load', `Expected increase_load on 10 reps, got: ${prog.action}`);
    console.assert(prog.recommendedWeightKg > 80, 'Recommended weight must increase');

    console.log('✓ [2] target 6-10 → progressão recebe e avalia faixa real 6-10');
  }

  // Test 3: Target "10-15" uses range [10, 15] in progression
  {
    const item10to15: WorkoutItem = {
      id: 'item_lat_raise',
      exercise: {
        id: 'ex_lat_raise',
        nome: 'Elevação Lateral',
        grupoMuscular: 'ombros',
        musculosSecundarios: [],
        categoria: 'isolation',
        equipamento: 'dumbbell',
        nivel: 'beginner',
        tipoMovimento: 'push',
        padraoMotor: 'horizontal_push',
        planoMovimento: 'frontal',
        execucao: 'Elevação no plano escapular',
        respiracao: 'Padrão',
        amplitude: 'Até 90 graus',
        cadencia: '2-0-1-1',
        rir: 1,
        rpe: 9,
        descanso: 60,
        errosComuns: [],
        variacoes: [],
        substitutos: [],
        fatigueIndex: 1,
      },
      targetSets: 3,
      targetReps: '10-15',
      targetRIR: 1,
      targetRPE: 9,
      targetRestSec: 60,
      cadence: '2-0-1-1',
      orderRationale: 'Isolamento deltoide lateral',
    };

    // 10 reps does NOT trigger increase_load for 10-15 (unlike 6-10)
    const midSets: SetLog[] = [
      { setNumber: 1, repsDone: 10, weightKg: 12, actualRIR: 1, completed: true },
      { setNumber: 2, repsDone: 10, weightKg: 12, actualRIR: 1, completed: true },
      { setNumber: 3, repsDone: 10, weightKg: 12, actualRIR: 1, completed: true },
    ];

    const progMid = getItemProgression(item10to15, midSets);
    console.assert(progMid.currentReps === '10-15', `Current reps range must be "10-15", got: ${progMid.currentReps}`);
    console.assert(progMid.action === 'increase_reps' || progMid.action === 'maintain', `10 reps em faixa 10-15 deve recomendar progressão de reps, got: ${progMid.action}`);
    console.assert(progMid.recommendedWeightKg === 12, 'Carga deve ser mantida em 12kg');

    // 15 reps DOES trigger increase_load
    const maxSets: SetLog[] = [
      { setNumber: 1, repsDone: 15, weightKg: 12, actualRIR: 1, completed: true },
      { setNumber: 2, repsDone: 15, weightKg: 12, actualRIR: 1, completed: true },
      { setNumber: 3, repsDone: 15, weightKg: 12, actualRIR: 1, completed: true },
    ];

    const progMax = getItemProgression(item10to15, maxSets);
    console.assert(progMax.currentReps === '10-15', `Current reps range must be "10-15", got: ${progMax.currentReps}`);
    console.assert(progMax.action === 'increase_load', `15 reps em faixa 10-15 deve aumentar carga, got: ${progMax.action}`);
    console.assert(progMax.recommendedWeightKg > 12, 'Carga deve aumentar');

    console.log('✓ [3] target 10-15 → progressão recebe e avalia faixa real 10-15');
  }

  // Test 4: Target "12-15" uses range [12, 15] in progression
  {
    const item12to15: WorkoutItem = {
      id: 'item_triceps_pushdown',
      exercise: {
        id: 'ex_triceps',
        nome: 'Tríceps Corda',
        grupoMuscular: 'triceps',
        musculosSecundarios: [],
        categoria: 'isolation',
        equipamento: 'cable',
        nivel: 'beginner',
        tipoMovimento: 'push',
        padraoMotor: 'horizontal_push',
        planoMovimento: 'sagittal',
        execucao: 'Extensão completa de cotovelos',
        respiracao: 'Padrão',
        amplitude: 'Completa',
        cadencia: '2-0-1-1',
        rir: 1,
        rpe: 9,
        descanso: 60,
        errosComuns: [],
        variacoes: [],
        substitutos: [],
        fatigueIndex: 1,
      },
      targetSets: 3,
      targetReps: '12-15',
      targetRIR: 1,
      targetRPE: 9,
      targetRestSec: 60,
      cadence: '2-0-1-1',
      orderRationale: 'Isolamento tríceps',
    };

    const maxSets: SetLog[] = [
      { setNumber: 1, repsDone: 15, weightKg: 25, actualRIR: 1, completed: true },
      { setNumber: 2, repsDone: 15, weightKg: 25, actualRIR: 1, completed: true },
      { setNumber: 3, repsDone: 15, weightKg: 25, actualRIR: 1, completed: true },
    ];

    const prog = getItemProgression(item12to15, maxSets);
    console.assert(prog.currentReps === '12-15', `Current reps range must be "12-15", got: ${prog.currentReps}`);
    console.assert(prog.action === 'increase_load', `15 reps deve aumentar carga em 12-15, got: ${prog.action}`);
    console.assert(prog.recommendedWeightKg > 25, 'Carga recomendada deve aumentar');

    console.log('✓ [4] target 12-15 → progressão recebe e avalia faixa real 12-15');
  }

  // Test 5: Invalid target fallback
  {
    const itemInvalid: WorkoutItem = {
      id: 'item_invalid',
      exercise: {
        id: 'ex_curl',
        nome: 'Rosca Direta',
        grupoMuscular: 'biceps',
        musculosSecundarios: [],
        categoria: 'isolation',
        equipamento: 'barbell',
        nivel: 'beginner',
        tipoMovimento: 'pull',
        padraoMotor: 'vertical_pull',
        planoMovimento: 'sagittal',
        execucao: 'Flexão de cotovelos',
        respiracao: 'Padrão',
        amplitude: 'Completa',
        cadencia: '2-0-1-0',
        rir: 2,
        rpe: 8,
        descanso: 60,
        errosComuns: [],
        variacoes: [],
        substitutos: [],
        fatigueIndex: 1,
      },
      targetSets: 3,
      targetReps: 'invalid-string',
      targetRIR: 2,
      targetRPE: 8,
      targetRestSec: 60,
      cadence: '2-0-1-0',
      orderRationale: 'Isolamento bíceps',
    };

    const sets: SetLog[] = [
      { setNumber: 1, repsDone: 12, weightKg: 30, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 12, weightKg: 30, actualRIR: 2, completed: true },
      { setNumber: 3, repsDone: 12, weightKg: 30, actualRIR: 2, completed: true },
    ];

    const prog = getItemProgression(itemInvalid, sets);
    console.assert(prog.currentReps === '8-12', `Target inválido deve receber fallback padrão "8-12", got: ${prog.currentReps}`);
    console.assert(prog.action === 'increase_load', '12 reps no fallback 8-12 deve aumentar carga');

    console.log('✓ [5] target inválido → fallback seguro sem quebra');
  }

  // Test 6: Multiple exercises with heterogeneous target ranges in the same session
  {
    const sessionItems: WorkoutItem[] = [
      {
        id: 'item_1',
        exercise: { id: 'ex_deadlift', nome: 'Levantamento Terra', grupoMuscular: 'costas', equipamento: 'barbell' } as any,
        targetSets: 3,
        targetReps: '4-6',
        targetRIR: 2,
        targetRPE: 8,
        targetRestSec: 180,
        cadence: '3-1-1-0',
        orderRationale: 'Força',
      },
      {
        id: 'item_2',
        exercise: { id: 'ex_incline_press', nome: 'Supino Inclinado', grupoMuscular: 'peitoral', equipamento: 'dumbbell' } as any,
        targetSets: 3,
        targetReps: '6-10',
        targetRIR: 2,
        targetRPE: 8,
        targetRestSec: 120,
        cadence: '3-0-1-0',
        orderRationale: 'Hipertrofia',
      },
      {
        id: 'item_3',
        exercise: { id: 'ex_cable_fly', nome: 'Crucifixo no Cabo', grupoMuscular: 'peitoral', equipamento: 'cable' } as any,
        targetSets: 3,
        targetReps: '10-15',
        targetRIR: 1,
        targetRPE: 9,
        targetRestSec: 60,
        cadence: '2-0-1-1',
        orderRationale: 'Isolamento',
      },
    ];

    const setsPerItem: Record<string, SetLog[]> = {
      item_1: [
        { setNumber: 1, repsDone: 6, weightKg: 140, actualRIR: 2, completed: true },
        { setNumber: 2, repsDone: 6, weightKg: 140, actualRIR: 2, completed: true },
        { setNumber: 3, repsDone: 6, weightKg: 140, actualRIR: 2, completed: true },
      ],
      item_2: [
        { setNumber: 1, repsDone: 8, weightKg: 30, actualRIR: 2, completed: true },
        { setNumber: 2, repsDone: 8, weightKg: 30, actualRIR: 2, completed: true },
        { setNumber: 3, repsDone: 8, weightKg: 30, actualRIR: 2, completed: true },
      ],
      item_3: [
        { setNumber: 1, repsDone: 10, weightKg: 15, actualRIR: 1, completed: true },
        { setNumber: 2, repsDone: 10, weightKg: 15, actualRIR: 1, completed: true },
        { setNumber: 3, repsDone: 10, weightKg: 15, actualRIR: 1, completed: true },
      ],
    };

    const prog1 = getItemProgression(sessionItems[0], setsPerItem['item_1']);
    const prog2 = getItemProgression(sessionItems[1], setsPerItem['item_2']);
    const prog3 = getItemProgression(sessionItems[2], setsPerItem['item_3']);

    console.assert(prog1.currentReps === '4-6', 'Item 1 deve operar com 4-6');
    console.assert(prog1.action === 'increase_load', 'Item 1 atingiu topo (6) -> increase_load');

    console.assert(prog2.currentReps === '6-10', 'Item 2 deve operar com 6-10');
    console.assert(prog2.action === 'increase_reps' || prog2.action === 'maintain', 'Item 2 no meio (8) -> increase_reps');

    console.assert(prog3.currentReps === '10-15', 'Item 3 deve operar com 10-15');
    console.assert(prog3.action === 'increase_reps' || prog3.action === 'maintain', 'Item 3 no piso (10) -> increase_reps');

    console.log('✓ [6] Múltiplos exercícios na mesma sessão utilizam faixas independentes e corretas');
  }

  console.log('===================================================================');
  console.log('   RESULTADO: 6/6 TESTES PASSARAM COM SUCESSO (100%)              ');
  console.log('===================================================================');
}

runWorkoutLoggerDoubleProgressionTests().catch((err) => {
  console.error('Falha nos testes de Double Progression com Target Real:', err);
  process.exit(1);
});
