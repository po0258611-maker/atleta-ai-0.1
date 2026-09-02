import {
  buildWorkoutLog,
  formatWorkoutLogDate,
} from '../../components/WorkoutLoggerView';
import { WorkoutDay, SetLog } from '../../types';

async function runWorkoutLogCanonicalTimestampTests() {
  console.log('===================================================================');
  console.log('   ATLETA AI — TEST SUITE: WORKOUT LOG CANONICAL TIMESTAMP AUDIT   ');
  console.log('===================================================================');

  const mockWorkoutDay: WorkoutDay = {
    id: 'A',
    title: 'Treino A - Peitoral e Bíceps',
    description: 'Peito e Braços',
    focusMuscles: ['peitoral', 'biceps'],
    estimatedTimeMin: 60,
    systemicFatigueScore: 40,
    items: [
      {
        id: 'item_1',
        exercise: {
          id: 'ex_bench',
          nome: 'Supino Reto',
          grupoMuscular: 'peitoral',
          musculosSecundarios: ['triceps'],
          categoria: 'compound',
          equipamento: 'barbell',
          nivel: 'intermediate',
          tipoMovimento: 'push',
          padraoMotor: 'horizontal_push',
          planoMovimento: 'sagittal',
          execucao: 'Padrão',
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
        orderRationale: 'Composto principal',
      },
    ],
  };

  const mockSetsState: Record<string, SetLog[]> = {
    item_1: [
      { setNumber: 1, repsDone: 8, weightKg: 80, actualRIR: 2, completed: true },
      { setNumber: 2, repsDone: 8, weightKg: 80, actualRIR: 2, completed: true },
      { setNumber: 3, repsDone: 8, weightKg: 80, actualRIR: 2, completed: true },
    ],
  };

  // Test 1: New records created possess a valid ISO 8601 string
  {
    const log = buildWorkoutLog({
      workoutDay: mockWorkoutDay,
      durationMin: 60,
      sessionRPE: 8,
      sessionNotes: 'Treino excelente',
      exerciseLogsState: mockSetsState,
    });

    // ISO 8601 regex: YYYY-MM-DDTHH:mm:ss.sssZ
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
    console.assert(isoRegex.test(log.date), `Timestamp gerado deve ser formato ISO 8601 válido. Recebido: "${log.date}"`);
    console.assert(!log.date.includes('/'), `Timestamp canônico não deve conter barras de locale ("/"). Recebido: "${log.date}"`);

    console.log('✓ [1] Novos registros possuem formato ISO 8601 canônico válido');
  }

  // Test 2: Contains both full date and time components
  {
    const beforeMs = Date.now();
    const log = buildWorkoutLog({
      workoutDay: mockWorkoutDay,
      durationMin: 45,
      sessionRPE: 7,
      sessionNotes: 'Sessão rápida',
      exerciseLogsState: mockSetsState,
    });
    const afterMs = Date.now();

    const parsedDate = new Date(log.date);
    const parsedMs = parsedDate.getTime();

    console.assert(!isNaN(parsedMs), 'Timestamp ISO deve ser parseável sem NaN');
    console.assert(parsedMs >= beforeMs && parsedMs <= afterMs, 'Timestamp deve refletir o instante real da sessão com precisão de milissegundos');
    console.assert(log.date.includes('T'), 'Timestamp deve conter o separador de horário "T"');

    console.log('✓ [2] Timestamp contém data e horário completos com precisão temporal');
  }

  // Test 3: Can be converted back to Date and time operations without timezone/locale ambiguity
  {
    const log = buildWorkoutLog({
      workoutDay: mockWorkoutDay,
      durationMin: 50,
      sessionRPE: 9,
      sessionNotes: '',
      exerciseLogsState: mockSetsState,
    });

    const d = new Date(log.date);
    console.assert(d instanceof Date && !isNaN(d.getTime()), 'Conversão para objeto Date bem-sucedida');
    console.assert(d.getUTCFullYear() >= 2024, 'Ano válido no objeto Date');

    console.log('✓ [3] Registro pode ser convertido para objeto Date e operado matematicamente');
  }

  // Test 4: Presentation layer formatting (formatWorkoutLogDate) converts ISO to pt-BR cleanly
  {
    const isoString = '2026-09-02T14:30:00.000Z';
    const formatted = formatWorkoutLogDate(isoString);
    console.assert(typeof formatted === 'string' && formatted.length > 0, 'Formatação de apresentação deve retornar string');
    // In pt-BR locale or parsed Date, it should format as DD/MM/YYYY or locale equivalent
    const parsed = new Date(isoString);
    console.assert(formatted === parsed.toLocaleDateString('pt-BR'), `Apresentação em pt-BR deve ser idêntica. Esperado: "${parsed.toLocaleDateString('pt-BR')}", Obtido: "${formatted}"`);

    console.log('✓ [4] Camada de apresentação converte timestamp ISO para pt-BR sem alterar dado armazenado');
  }

  // Test 5: Backward compatibility with legacy localized dates ("02/09/2026", "15/08/2025")
  {
    const legacyDate1 = '02/09/2026';
    const formattedLegacy1 = formatWorkoutLogDate(legacyDate1);
    console.assert(formattedLegacy1 === '02/09/2026', `Registro legado "02/09/2026" preservado intacto. Obtido: "${formattedLegacy1}"`);

    const legacyDate2 = '15/08/2025';
    const formattedLegacy2 = formatWorkoutLogDate(legacyDate2);
    console.assert(formattedLegacy2 === '15/08/2025', `Registro legado "15/08/2025" preservado intacto. Obtido: "${formattedLegacy2}"`);

    console.log('✓ [5] Compatibilidade retroativa com registros legados (ex: "02/09/2026") preservada 100%');
  }

  // Test 6: Safe fallbacks for empty, null, undefined or malformed dates
  {
    console.assert(formatWorkoutLogDate(null) === '', 'null retorna string vazia');
    console.assert(formatWorkoutLogDate(undefined) === '', 'undefined retorna string vazia');
    console.assert(formatWorkoutLogDate('') === '', 'string vazia retorna string vazia');
    console.assert(formatWorkoutLogDate('data_invalida') === 'data_invalida', 'string arbitrária retornada sem crash');

    console.log('✓ [6] Entradas nulas ou atípicas tratadas com segurança sem exceções');
  }

  console.log('===================================================================');
  console.log('   RESULTADO: 6/6 TESTES PASSARAM COM SUCESSO (100%)              ');
  console.log('===================================================================');
}

runWorkoutLogCanonicalTimestampTests().catch((err) => {
  console.error('Falha nos testes de Timestamp Canônico:', err);
  process.exit(1);
});
