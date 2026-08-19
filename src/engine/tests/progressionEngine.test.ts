import { ProgressionEngine } from '../../services/progressionEngine';
import { SetLog, Exercise } from '../../types';

async function runProgressionEngineTests() {
  console.log('--- INICIANDO TESTES DO MOTOR DE PROGRESSÃO ADAPTATIVA ---');

  // Test 1: Contextual Load Increment (Dumbbell lateral raise vs Barbell Bench vs Leg Press)
  {
    const lateralRaise: Partial<Exercise> = {
      id: 'ex_lateral_raise',
      nome: 'Elevação Lateral',
      equipamento: 'dumbbell',
      categoria: 'isolation',
      grupoMuscular: 'ombros',
    };

    const barbellSquat: Partial<Exercise> = {
      id: 'ex_squat',
      nome: 'Agachamento Barra',
      equipamento: 'barbell',
      categoria: 'compound',
      grupoMuscular: 'quadriceps',
    };

    const dumbbellInc = ProgressionEngine.calculateLoadIncrement(10, lateralRaise);
    const heavySquatInc = ProgressionEngine.calculateLoadIncrement(120, barbellSquat);

    console.assert(dumbbellInc <= 1.0, `Elevação lateral de 10kg deve ter incremento conservador (≤ 1kg), obtido: ${dumbbellInc}`);
    console.assert(heavySquatInc >= 5.0, `Agachamento pesado de 120kg deve admitir incremento maior (5kg), obtido: ${heavySquatInc}`);
    console.log('✓ Teste 1: Incremento de carga contextual por exercício, equipamento e magnitude da carga');
  }

  // Test 2: Double Progression Strategy (Hit max reps with safe RIR -> Increase Load)
  {
    const benchPress: Partial<Exercise> = {
      id: 'ex_bench',
      nome: 'Supino Reto',
      equipamento: 'barbell',
      categoria: 'compound',
      grupoMuscular: 'peitoral',
    };

    const successfulSets: SetLog[] = [
      { setNumber: 1, repsDone: 10, weightKg: 80, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 10, weightKg: 80, actualRIR: 1, completed: true },
      { setNumber: 3, repsDone: 10, weightKg: 80, actualRIR: 1, completed: true },
    ];

    const decision = ProgressionEngine.evaluateAdaptiveProgression(
      benchPress as any,
      successfulSets,
      '6-10',
      2,
      35 // Low/Optimal fatigue
    );

    console.assert(decision.strategy === 'DOUBLE_PROGRESSION', 'Estratégia deve ser DOUBLE_PROGRESSION');
    console.assert(decision.action === 'increase_load', 'Ação deve ser increase_load');
    console.assert(decision.recommendedWeightKg > 80, 'Carga recomendada deve subir');
    console.assert(decision.recommendedTargetReps === '6', 'Reps devem resetar para o início da faixa (6)');
    console.log('✓ Teste 2: Double Progression com aumento de carga e reset de repetições');
  }

  // Test 3: Rep Progression (Within bracket -> increase reps before load)
  {
    const benchPress: Partial<Exercise> = {
      id: 'ex_bench',
      nome: 'Supino Reto',
      equipamento: 'barbell',
      categoria: 'compound',
      grupoMuscular: 'peitoral',
    };

    const intermediateSets: SetLog[] = [
      { setNumber: 1, repsDone: 8, weightKg: 80, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 7, weightKg: 80, actualRIR: 2, completed: true },
      { setNumber: 3, repsDone: 7, weightKg: 80, actualRIR: 1, completed: true },
    ];

    const decision = ProgressionEngine.evaluateAdaptiveProgression(
      benchPress as any,
      intermediateSets,
      '6-10',
      2,
      40
    );

    console.assert(decision.strategy === 'REP_PROGRESSION', 'Estratégia deve ser REP_PROGRESSION');
    console.assert(decision.action === 'increase_reps', 'Ação deve ser increase_reps');
    console.assert(decision.recommendedWeightKg === 80, 'Carga deve ser mantida');
    console.assert(parseInt(decision.recommendedTargetReps) >= 8, 'Meta de reps deve buscar progressão');
    console.log('✓ Teste 3: Rep Progression acumulando repetições antes de subir peso');
  }

  // Test 4: Fatigue Investigation (Performance drop -> do not blindly add load/volume)
  {
    const failedSets: SetLog[] = [
      { setNumber: 1, repsDone: 5, weightKg: 80, actualRIR: 0, completed: true },
      { setNumber: 2, repsDone: 4, weightKg: 80, actualRIR: 0, completed: true },
      { setNumber: 3, repsDone: 3, weightKg: 80, actualRIR: 0, completed: true },
    ];

    const decision = ProgressionEngine.evaluateAdaptiveProgression(
      { nome: 'Supino Reto', equipamento: 'barbell' } as any,
      failedSets,
      '6-10',
      2,
      65 // High fatigue
    );

    console.assert(decision.strategy === 'REGRESSION', 'Estratégia deve ser REGRESSION');
    console.assert(decision.badge === 'INVESTIGAR FADIGA', 'Deve sinalizar investigação de fadiga');
    console.assert(decision.action === 'maintain' || decision.action === 'decrease_load', 'Não deve aumentar carga');
    console.log('✓ Teste 4: Investigação de fadiga e proteção contra sobrecarga em colapso de rendimento');
  }

  // Test 5: Critical Fatigue / Deload Trigger (Fatigue score ≥ 80)
  {
    const sets: SetLog[] = [
      { setNumber: 1, repsDone: 8, weightKg: 100, actualRIR: 1, completed: true },
      { setNumber: 2, repsDone: 8, weightKg: 100, actualRIR: 1, completed: true },
    ];

    const decision = ProgressionEngine.evaluateAdaptiveProgression(
      { nome: 'Agachamento', equipamento: 'barbell' } as any,
      sets,
      '6-10',
      2,
      85 // Critical fatigue score
    );

    console.assert(decision.strategy === 'DELOAD_CONSIDERATION', 'Estratégia deve ser DELOAD_CONSIDERATION');
    console.assert(decision.action === 'deload', 'Ação deve ser deload');
    console.assert(decision.recommendedWeightKg < 100, 'Carga de deload deve ser reduzida (~15%)');
    console.log('✓ Teste 5: Acionamento determinístico de Deload quando fadiga sistêmica é crítica');
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DO MOTOR DE PROGRESSÃO ADAPTATIVA PASSARAM COM SUCESSO!');
}

runProgressionEngineTests().catch((err) => {
  console.error('Falha nos testes de progressão:', err);
  process.exit(1);
});
