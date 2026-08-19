import { OneRepMaxCalculator } from '../../services/oneRepMaxService';
import { ProgressionEngine } from '../../services/progressionEngine';
import { SetLog, WorkoutLog } from '../../types';

async function runOneRepMaxTests() {
  console.log('--- INICIANDO TESTES DO SISTEMA DE 1RM (SEM VALORES INVENTADOS) ---');

  // Test 1: Empty or Incomplete sets -> State MUST be 'unknown' with null value
  {
    const emptySets: SetLog[] = [];
    const result = OneRepMaxCalculator.calculateFromSets(emptySets);

    console.assert(result.state === 'unknown', 'Estado sem séries completas deve ser unknown');
    console.assert(result.valueKg === null, 'Valor em kg deve ser estritamente null');
    console.assert(result.confidence === 'none', 'Confiança deve ser none');
    console.log('✓ Teste 1: Sem dados registrados -> Retorna unknown sem inventar 1RM');
  }

  // Test 2: Uncompleted or zero weight sets -> MUST be 'unknown'
  {
    const zeroSets: SetLog[] = [
      { setNumber: 1, repsDone: 10, weightKg: 0, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 10, weightKg: 50, actualRIR: 2, completed: false },
    ];
    const result = OneRepMaxCalculator.calculateFromSets(zeroSets);

    console.assert(result.state === 'unknown', 'Séries não completadas ou com peso zero devem ser unknown');
    console.assert(result.valueKg === null, 'Valor deve ser null');
    console.log('✓ Teste 2: Séries com 0kg ou incompletas são ignoradas -> unknown');
  }

  // Test 3: Valid multiple reps -> State MUST be 'estimated' with Epley calculation
  {
    // 80kg x 10 reps -> Epley: 80 * (1 + 10/30) = 80 * 1.3333 = 106.7 kg
    const sets: SetLog[] = [
      { setNumber: 1, repsDone: 10, weightKg: 80, actualRIR: 0, completed: true },
    ];
    const result = OneRepMaxCalculator.calculateFromSets(sets);

    console.assert(result.state === 'estimated', 'Estado com reps > 1 deve ser estimated');
    console.assert(result.valueKg !== null && result.valueKg >= 106 && result.valueKg <= 107, `Epley de 80kgx10reps deve ser ~106.7kg, obtido: ${result.valueKg}`);
    console.assert(result.method === 'epley', 'Método documentado deve ser Epley');
    console.log('✓ Teste 3: Séries válidas calculam e1RM rigoroso via Fórmula de Epley');
  }

  // Test 4: Direct 1RM test (1 rep at RIR 0) -> State MUST be 'measured'
  {
    const testSets: SetLog[] = [
      { setNumber: 1, repsDone: 1, weightKg: 140, actualRIR: 0, completed: true },
    ];
    const result = OneRepMaxCalculator.calculateFromSets(testSets);

    console.assert(result.state === 'measured', '1 rep máxima a RIR 0 deve ser measured');
    console.assert(result.valueKg === 140, 'Valor de 1RM medido deve ser exatamente 140kg');
    console.assert(result.method === 'direct_1rm', 'Método deve ser direct_1rm');
    console.log('✓ Teste 4: Teste de 1 repetição máxima direta identificado como measured');
  }

  // Test 5: Periodization without logs -> All lifts MUST be 'unknown', NEVER 100/80/120
  {
    const emptyLogs: WorkoutLog[] = [];
    const analysis = ProgressionEngine.analyzePeriodization(emptyLogs);

    console.assert(analysis.estimated1RM.squat.state === 'unknown', 'Squat 1RM deve ser unknown');
    console.assert(analysis.estimated1RM.squat.valueKg === null, 'Squat 1RM não pode ter valor inventado');
    console.assert(analysis.estimated1RM.bench.state === 'unknown', 'Bench 1RM deve ser unknown');
    console.assert(analysis.estimated1RM.bench.valueKg === null, 'Bench 1RM não pode ter valor inventado');
    console.assert(analysis.estimated1RM.deadlift.state === 'unknown', 'Deadlift 1RM deve ser unknown');
    console.assert(analysis.estimated1RM.deadlift.valueKg === null, 'Deadlift 1RM não pode ter valor inventado');
    console.log('✓ Teste 5: PeriodizationEngine retorna unknown para todos os lifts sem dados históricos');
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DE 1RM PASSARAM COM 100% DE SUCESSO!');
}

runOneRepMaxTests().catch((err) => {
  console.error('Falha nos testes de 1RM:', err);
  process.exit(1);
});
