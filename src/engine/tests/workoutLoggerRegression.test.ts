import {
  initializeWorkoutLoggerState,
  parseRepRange,
  parseInitialReps,
  getItemProgression,
  sanitizeReps,
  sanitizeWeight,
  sanitizeRIR,
  sanitizeRPE,
  formatWorkoutLogDate,
  buildWorkoutLog,
} from '../../components/WorkoutLoggerView';
import { WorkoutDay, WorkoutItem, SetLog, Exercise } from '../../types';

async function runWorkoutLoggerRegressionSuite() {
  console.log('===================================================================');
  console.log('   ATLETA AI — REGRESSION TEST SUITE: WORKOUT LOGGER INTEGRITY    ');
  console.log('===================================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition: boolean, description: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ [FAIL] Test ${totalTests}: ${description}`);
      throw new Error(`Regression test failed: ${description}`);
    }
    passedTests++;
    console.log(`✓ [${totalTests}] ${description}`);
  }

  const baseExercise: Exercise = {
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
  };

  const sampleWorkoutDay: WorkoutDay = {
    id: 'A',
    title: 'Treino A - Superior Força',
    description: 'Foco em peito e empurrar',
    focusMuscles: ['peitoral', 'triceps'],
    estimatedTimeMin: 60,
    systemicFatigueScore: 45,
    items: [
      {
        id: 'item_squat',
        exercise: { ...baseExercise, id: 'ex_squat', nome: 'Agachamento', grupoMuscular: 'quadriceps' },
        targetSets: 4,
        targetReps: '4-6',
        targetRIR: 2,
        targetRPE: 8,
        targetRestSec: 180,
        cadence: '3-1-1-0',
        orderRationale: 'Composto pernas',
      },
      {
        id: 'item_bench',
        exercise: baseExercise,
        targetSets: 3,
        targetReps: '6-10',
        targetRIR: 2,
        targetRPE: 8,
        targetRestSec: 120,
        cadence: '3-0-1-0',
        orderRationale: 'Composto peitoral',
      },
      {
        id: 'item_fly',
        exercise: { ...baseExercise, id: 'ex_fly', nome: 'Crucifixo', categoria: 'isolation' },
        targetSets: 3,
        targetReps: '10-15',
        targetRIR: 1,
        targetRPE: 9,
        targetRestSec: 60,
        cadence: '2-0-1-1',
        orderRationale: 'Isolamento',
      },
    ],
  };

  // -------------------------------------------------------------------------
  // 1. INICIALIZAÇÃO DAS SÉRIES
  // -------------------------------------------------------------------------
  console.log('\n--- 1. INICIALIZAÇÃO DAS SÉRIES ---');
  {
    const state = initializeWorkoutLoggerState(sampleWorkoutDay);

    assertTest(Object.keys(state).length === 3, 'Inicializa entradas para todos os exercícios da sessão');
    assertTest(state['item_squat'].length === 4, 'Aloca exatamente 4 séries para item com targetSets = 4');
    assertTest(state['item_bench'].length === 3, 'Aloca exatamente 3 séries para item com targetSets = 3');

    // Verifica integridade estrutural das séries
    const squatSets = state['item_squat'];
    assertTest(
      squatSets.every((s, i) => s.setNumber === i + 1),
      'Numeração das séries é estritamente sequencial (1, 2, 3...)'
    );
    assertTest(
      squatSets.every((s) => s.completed === false),
      'Todas as séries iniciam com status completed = false (não marcadas)'
    );
    assertTest(
      squatSets.every((s) => s.actualRIR === 2),
      'RIR inicial reflete o targetRIR prescrito para o exercício'
    );

    // Tratamento de estruturas vazias / nulas
    const nullState = initializeWorkoutLoggerState(null);
    assertTest(Object.keys(nullState).length === 0, 'initializeWorkoutLoggerState(null) retorna objeto vazio seguro');

    const emptyDayState = initializeWorkoutLoggerState({ id: 'E', title: 'Vazio', items: [] } as any);
    assertTest(Object.keys(emptyDayState).length === 0, 'Dia sem itens retorna estado vazio sem lançar exceção');
  }

  // -------------------------------------------------------------------------
  // 2. PARSING DE TARGET REPS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. PARSING DE TARGET REPS ---');
  {
    const p4_6 = parseRepRange('4-6');
    assertTest(p4_6.min === 4 && p4_6.max === 6 && p4_6.lower === 4 && p4_6.upper === 6, 'Parse correto de faixa canônica "4-6"');

    const p6_10 = parseRepRange('6 - 10');
    assertTest(p6_10.min === 6 && p6_10.max === 10, 'Parse correto de faixa com espaços "6 - 10"');

    const p8_12 = parseRepRange('8 – 12');
    assertTest(p8_12.min === 8 && p8_12.max === 12, 'Parse correto com travessão en-dash "8 – 12"');

    const p10_15 = parseRepRange('10 to 15');
    assertTest(p10_15.min === 10 && p10_15.max === 15, 'Parse correto com palavra "10 to 15"');

    const pSingle = parseRepRange('8');
    assertTest(pSingle.min === 8 && pSingle.max === 8 && pSingle.lower === 8, 'Parse de número único "8"');

    const pWithWords = parseRepRange('6-10 repetições');
    assertTest(pWithWords.min === 6 && pWithWords.max === 10, 'Parse com sufixo de texto "6-10 repetições"');

    const pInverted = parseRepRange('12-8');
    assertTest(pInverted.min === 8 && pInverted.max === 12, 'Inversão numérica "12-8" normalizada para min=8 e max=12');
  }

  // -------------------------------------------------------------------------
  // 3. PROGRESSÃO BASEADA NA FAIXA REAL
  // -------------------------------------------------------------------------
  console.log('\n--- 3. PROGRESSÃO BASEADA NA FAIXA REAL ---');
  {
    const squatItem = sampleWorkoutDay.items[0]; // targetReps: '4-6'
    const benchItem = sampleWorkoutDay.items[1]; // targetReps: '6-10'
    const flyItem = sampleWorkoutDay.items[2];   // targetReps: '10-15'

    // Squat: 6 reps (top of 4-6) -> increase_load
    const squatTopSets: SetLog[] = [
      { setNumber: 1, repsDone: 6, weightKg: 100, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 6, weightKg: 100, actualRIR: 2, completed: true },
      { setNumber: 3, repsDone: 6, weightKg: 100, actualRIR: 2, completed: true },
      { setNumber: 4, repsDone: 6, weightKg: 100, actualRIR: 2, completed: true },
    ];
    const squatProg = getItemProgression(squatItem, squatTopSets);
    assertTest(squatProg.currentReps === '4-6', 'Item "4-6" avaliado com sua faixa real no motor');
    assertTest(squatProg.action === 'increase_load', 'Ao bater 6 reps na faixa 4-6, recomenda aumento de carga');
    assertTest(squatProg.recommendedWeightKg > 100, 'Carga recomendada aumenta acima de 100kg');

    // Squat: 4 reps (floor of 4-6) -> increase_reps or maintain
    const squatFloorSets: SetLog[] = [
      { setNumber: 1, repsDone: 4, weightKg: 100, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 4, weightKg: 100, actualRIR: 2, completed: true },
      { setNumber: 3, repsDone: 4, weightKg: 100, actualRIR: 2, completed: true },
      { setNumber: 4, repsDone: 4, weightKg: 100, actualRIR: 2, completed: true },
    ];
    const squatFloorProg = getItemProgression(squatItem, squatFloorSets);
    assertTest(squatFloorProg.action === 'increase_reps' || squatFloorProg.action === 'maintain', 'Com 4 reps na faixa 4-6, recomenda progredir repetições');
    assertTest(squatFloorProg.recommendedWeightKg === 100, 'Carga permanece inalterada');

    // Fly: 10 reps (floor of 10-15) -> NÃO deve aumentar carga (diferente de 6-10)
    const flyFloorSets: SetLog[] = [
      { setNumber: 1, repsDone: 10, weightKg: 14, actualRIR: 1, completed: true },
      { setNumber: 2, repsDone: 10, weightKg: 14, actualRIR: 1, completed: true },
      { setNumber: 3, repsDone: 10, weightKg: 14, actualRIR: 1, completed: true },
    ];
    const flyFloorProg = getItemProgression(flyItem, flyFloorSets);
    assertTest(flyFloorProg.currentReps === '10-15', 'Item "10-15" avaliado com sua faixa real no motor');
    assertTest(flyFloorProg.action !== 'increase_load', '10 reps em faixa 10-15 NÃO aciona aumento prematuro de carga');

    // Fly: 15 reps (top of 10-15) -> aciona increase_load
    const flyTopSets: SetLog[] = [
      { setNumber: 1, repsDone: 15, weightKg: 14, actualRIR: 1, completed: true },
      { setNumber: 2, repsDone: 15, weightKg: 14, actualRIR: 1, completed: true },
      { setNumber: 3, repsDone: 15, weightKg: 14, actualRIR: 1, completed: true },
    ];
    const flyTopProg = getItemProgression(flyItem, flyTopSets);
    assertTest(flyTopProg.action === 'increase_load', '15 reps em faixa 10-15 aciona aumento de carga');
    assertTest(flyTopProg.recommendedWeightKg > 14, 'Carga recomendada para o voador aumenta');
  }

  // -------------------------------------------------------------------------
  // 4. VALIDAÇÃO DE REPS
  // -------------------------------------------------------------------------
  console.log('\n--- 4. VALIDAÇÃO DE REPS ---');
  {
    assertTest(sanitizeReps(-5) === 0, 'Repetição negativa (-5) é sanitizada para 0');
    assertTest(sanitizeReps(0) === 0, 'Repetição 0 é permitida');
    assertTest(sanitizeReps(12) === 12, 'Repetição inteira válida (12) é preservada');
    assertTest(sanitizeReps(8.7) === 8, 'Repetição fracionária (8.7) é truncada para inteiro (8)');
    assertTest(sanitizeReps(999) === 200, 'Repetição surreal (999) é limitada pelo teto de segurança (200)');
    assertTest(sanitizeReps(NaN, 5) === 5, 'NaN utiliza valor padrão seguro (5)');
    assertTest(sanitizeReps('10') === 10, 'String numérica "10" convertida para inteiro 10');
  }

  // -------------------------------------------------------------------------
  // 5. VALIDAÇÃO DE PESO
  // -------------------------------------------------------------------------
  console.log('\n--- 5. VALIDAÇÃO DE PESO ---');
  {
    assertTest(sanitizeWeight(-20) === 0, 'Carga negativa (-20kg) sanitizada para 0kg');
    assertTest(sanitizeWeight(0) === 0, 'Carga 0kg (peso corporal) é preservada');
    assertTest(sanitizeWeight(82.5) === 82.5, 'Carga decimal (82.5kg) é preservada com precisão');
    assertTest(sanitizeWeight(12.3456) === 12.35, 'Carga arredondada para 2 casas decimais (12.35kg)');
    assertTest(sanitizeWeight(5000) === 1000, 'Carga extrema (5000kg) limitada pelo teto de segurança (1000kg)');
    assertTest(sanitizeWeight(NaN, 0) === 0, 'NaN sanitizado para fallback seguro 0');
    assertTest(sanitizeWeight('45.5') === 45.5, 'String numérica "45.5" convertida para float');
  }

  // -------------------------------------------------------------------------
  // 6. VALIDAÇÃO DE RIR (Reps in Reserve)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. VALIDAÇÃO DE RIR ---');
  {
    assertTest(sanitizeRIR(0) === 0, 'RIR 0 (falha concêntrica) é preservado');
    assertTest(sanitizeRIR(2) === 2, 'RIR 2 (padrão) é preservado');
    assertTest(sanitizeRIR(-3) === 0, 'RIR negativo (-3) sanitizado para 0');
    assertTest(sanitizeRIR(15) === 10, 'RIR excessivo (15) limitado ao teto de 10');
    assertTest(sanitizeRIR(NaN, 2) === 2, 'NaN de RIR utiliza fallback seguro 2');
  }

  // -------------------------------------------------------------------------
  // 7. VALIDAÇÃO DE RPE
  // -------------------------------------------------------------------------
  console.log('\n--- 7. VALIDAÇÃO DE RPE ---');
  {
    assertTest(sanitizeRPE(8) === 8, 'RPE 8 (padrão de sessão) é preservado');
    assertTest(sanitizeRPE(10) === 10, 'RPE 10 (esforço máximo) é preservado');
    assertTest(sanitizeRPE(1) === 1, 'RPE 1 (mínimo da escala Borg modificada) é preservado');
    assertTest(sanitizeRPE(-4) === 1, 'RPE negativo (-4) ajustado para piso 1');
    assertTest(sanitizeRPE(14) === 10, 'RPE acima da escala (14) ajustado para teto 10');
    assertTest(sanitizeRPE(8.55) === 8.6, 'RPE decimal formatado com 1 casa de precisão (8.6)');
    assertTest(sanitizeRPE(NaN, 8) === 8, 'NaN de RPE utiliza fallback seguro 8');
  }

  // -------------------------------------------------------------------------
  // 8. PERSISTÊNCIA DE TIMESTAMP CANÔNICO
  // -------------------------------------------------------------------------
  console.log('\n--- 8. PERSISTÊNCIA DE TIMESTAMP CANÔNICO ---');
  {
    const state = initializeWorkoutLoggerState(sampleWorkoutDay);
    const log = buildWorkoutLog({
      workoutDay: sampleWorkoutDay,
      durationMin: 55,
      sessionRPE: 8,
      sessionNotes: 'Treino registrado com sucesso',
      exerciseLogsState: state,
    });

    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
    assertTest(isoRegex.test(log.date), 'Timestamp gerado em buildWorkoutLog é ISO 8601 canônico válido');
    assertTest(!log.date.includes('/'), 'Timestamp canônico não contém formatação localizada (sem barras "/")');

    const parsedDate = new Date(log.date);
    assertTest(!isNaN(parsedDate.getTime()), 'Timestamp canônico pode ser convertido de volta para objeto Date');
    assertTest(parsedDate.getUTCFullYear() >= 2024, 'Data possui ano válido no calendário universal');

    // Apresentação e compatibilidade retroativa
    const formattedIso = formatWorkoutLogDate(log.date);
    assertTest(formattedIso === parsedDate.toLocaleDateString('pt-BR'), 'formatWorkoutLogDate converte ISO para formato pt-BR na apresentação');

    const legacyDate = '02/09/2026';
    assertTest(formatWorkoutLogDate(legacyDate) === legacyDate, 'formatWorkoutLogDate preserva registros legados existentes intactos');
  }

  // -------------------------------------------------------------------------
  // 9. TRATAMENTO DE TARGET REPS INVÁLIDO
  // -------------------------------------------------------------------------
  console.log('\n--- 9. TRATAMENTO DE TARGET REPS INVÁLIDO ---');
  {
    const pNull = parseRepRange(null);
    assertTest(pNull.min === 8 && pNull.max === 12, 'parseRepRange(null) retorna fallback padrão 8-12');

    const pEmpty = parseRepRange('');
    assertTest(pEmpty.min === 8 && pEmpty.max === 12, 'parseRepRange("") retorna fallback padrão 8-12');

    const pGarbage = parseRepRange('invalid-range-text');
    assertTest(pGarbage.min === 8 && pGarbage.max === 12, 'parseRepRange("invalid-range-text") retorna fallback padrão 8-12');

    const initialRepsInvalid = parseInitialReps('invalid');
    assertTest(initialRepsInvalid === 10, 'parseInitialReps com string inválida retorna fallback seguro (10 reps)');

    // Item com targetReps corrompido não quebra o cálculo de progressão
    const corruptedItem: WorkoutItem = {
      id: 'item_corrupt',
      exercise: baseExercise,
      targetSets: 3,
      targetReps: 'corrupted-data',
      targetRIR: 2,
      targetRPE: 8,
      targetRestSec: 90,
      cadence: '2-0-1-0',
      orderRationale: 'Teste de resiliência',
    };
    const corruptedSets: SetLog[] = [
      { setNumber: 1, repsDone: 12, weightKg: 50, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 12, weightKg: 50, actualRIR: 2, completed: true },
      { setNumber: 3, repsDone: 12, weightKg: 50, actualRIR: 2, completed: true },
    ];
    const corruptedProg = getItemProgression(corruptedItem, corruptedSets);
    assertTest(corruptedProg.currentReps === '8-12', 'Item corrompido recebe fallback 8-12 e calcula progressão normalmente');
    assertTest(corruptedProg.action === 'increase_load', '12 reps no fallback 8-12 recomenda aumento de carga sem erros');
  }

  // -------------------------------------------------------------------------
  // 10. AUSÊNCIA DE VALORES ARTIFICIAIS
  // -------------------------------------------------------------------------
  console.log('\n--- 10. AUSÊNCIA DE VALORES ARTIFICIAIS ---');
  {
    const state = initializeWorkoutLoggerState(sampleWorkoutDay);

    // Carga inicial deve ser 0 (neutra), e não pesos inventados
    const allInitialWeights = Object.values(state).flatMap((sets) => sets.map((s) => s.weightKg));
    assertTest(
      allInitialWeights.every((w) => w === 0),
      'Todas as séries iniciam com 0kg (carga neutra) — nenhum peso arbitrário ou inventado é injetado'
    );

    // Repetições iniciais devem respeitar o piso da meta prescrita (ex: 4 para "4-6", 6 para "6-10", 10 para "10-15")
    const squatInitialReps = state['item_squat'].map((s) => s.repsDone);
    assertTest(
      squatInitialReps.every((r) => r === 4),
      'Séries do Agachamento ("4-6") iniciam com 4 reps (piso exato da prescrição, não valores arbitrários)'
    );

    const benchInitialReps = state['item_bench'].map((s) => s.repsDone);
    assertTest(
      benchInitialReps.every((r) => r === 6),
      'Séries do Supino ("6-10") iniciam com 6 reps (piso exato da prescrição)'
    );

    const flyInitialReps = state['item_fly'].map((s) => s.repsDone);
    assertTest(
      flyInitialReps.every((r) => r === 10),
      'Séries do Crucifixo ("10-15") iniciam com 10 reps (piso exato da prescrição)'
    );

    // Conclusão inicial deve ser false para não simular treinos concluídos fictícios
    const allInitialCompleted = Object.values(state).flatMap((sets) => sets.map((s) => s.completed));
    assertTest(
      allInitialCompleted.every((c) => c === false),
      'Nenhuma série é falsamente pré-concluída'
    );

    // buildWorkoutLog com dados corrompidos aplica sanitização sem injetar dados artificiais
    const rawDirtyState: Record<string, SetLog[]> = {
      item_bench: [
        { setNumber: 1, repsDone: -10, weightKg: -50, actualRIR: -2, completed: false },
        { setNumber: 2, repsDone: 8, weightKg: 80, actualRIR: 2, completed: true },
      ],
    };

    const cleanLog = buildWorkoutLog({
      workoutDay: sampleWorkoutDay,
      durationMin: -30,
      sessionRPE: 99,
      sessionNotes: '',
      exerciseLogsState: rawDirtyState,
    });

    const benchLog = cleanLog.exerciseLogs.find((e) => e.exerciseId === 'ex_bench');
    assertTest(benchLog !== undefined && benchLog.sets[0].repsDone === 0, 'Repetição negativa (-10) sanitizada para 0 no log final');
    assertTest(benchLog !== undefined && benchLog.sets[0].weightKg === 0, 'Carga negativa (-50) sanitizada para 0 no log final');
    assertTest(benchLog !== undefined && benchLog.sets[0].actualRIR === 0, 'RIR negativo (-2) sanitizado para 0 no log final');
    assertTest(cleanLog.sessionRPE === 10, 'Session RPE 99 sanitizado para teto 10 no log final');
    assertTest(cleanLog.durationMin === 60, 'Duração negativa sanitizada para fallback padrão seguro 60min');
  }

  console.log('===================================================================');
  console.log(`   RESULTADO: ${passedTests}/${totalTests} TESTES PASSARAM COM SUCESSO (100%) `);
  console.log('===================================================================');
}

runWorkoutLoggerRegressionSuite().catch((err) => {
  console.error('Falha na suíte de regressão do Workout Logger:', err);
  process.exit(1);
});
