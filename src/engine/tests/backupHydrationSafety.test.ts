import {
  resolveActiveWorkoutHydration,
  INITIAL_PROFILE,
} from '../../hooks/useWorkout';
import { generateWorkoutWithPipeline } from '../workoutEngineBridge';
import { FullBodyProgram, UserProfile, WorkoutLog } from '../../types';
import { DatabaseBackupPayload } from '../../services/databaseToolsService';

async function runBackupHydrationSafetySuite() {
  console.log('===================================================================');
  console.log('   ATLETA AI — STAGE 10.2: BACKUP RESTORE HYDRATION SAFETY SUITE   ');
  console.log('===================================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition: boolean, description: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ [FAIL] Teste ${totalTests}: ${description}`);
      throw new Error(`Backup hydration safety test failed: ${description}`);
    }
    passedTests++;
    console.log(`✓ [${totalTests}] ${description}`);
  }

  // Base fixtures
  const validBaseProgram = generateWorkoutWithPipeline(INITIAL_PROFILE);
  const sampleLogs: WorkoutLog[] = [
    {
      id: 'log_restore_1',
      date: new Date().toISOString(),
      dayId: 'A',
      exerciseLogs: [],
      sessionRPE: 8,
      durationMin: 45,
      notes: '',
    },
  ];

  function createPayload(data: Partial<DatabaseBackupPayload['data']>): DatabaseBackupPayload {
    return {
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      app: 'ATLETA AI',
      uid: 'user_test_123',
      data: {
        profile: null,
        workoutProgram: null,
        workoutLogs: [],
        measurements: [],
        exportMetadata: {
          totalLogs: 0,
          totalMeasurements: 0,
          checksum: 'abc',
        },
        ...data,
      },
    };
  }

  // Simula o fluxo exato implementado em App.tsx -> handleRestoreDatabaseBackup
  function simulateRestoreFlow(
    backupPayload: DatabaseBackupPayload,
    initialUserState: {
      userProfile: UserProfile;
      workoutLogs: WorkoutLog[];
      currentProgram: FullBodyProgram;
    } = {
      userProfile: INITIAL_PROFILE,
      workoutLogs: [],
      currentProgram: validBaseProgram,
    }
  ) {
    let stateProfile = initialUserState.userProfile;
    let stateLogs = initialUserState.workoutLogs;
    let stateProgram = initialUserState.currentProgram;
    let savedProfileToFirestore: UserProfile | null = null;
    const savedLogsToFirestore: WorkoutLog[] = [];
    let savedProgramToFirestore: FullBodyProgram | null = null;
    let setProgramDirectCallsWithRawPayload = 0;

    // Funções controladas que simulam a atualização de estado
    const setUserProfile = (p: UserProfile) => {
      stateProfile = p;
    };
    const setWorkoutLogs = (logs: WorkoutLog[]) => {
      stateLogs = logs;
    };
    const setProgram = (prog: FullBodyProgram) => {
      if (prog === backupPayload.data.workoutProgram && (prog as any)?.__isUnvalidatedRaw) {
        setProgramDirectCallsWithRawPayload++;
      }
      stateProgram = prog;
    };
    const saveUserProfile = async (_uid: string, p: UserProfile) => {
      savedProfileToFirestore = p;
    };
    const saveWorkoutLog = async (_uid: string, log: WorkoutLog) => {
      savedLogsToFirestore.push(log);
    };
    const saveActiveWorkout = async (_uid: string, prog: FullBodyProgram) => {
      savedProgramToFirestore = prog;
    };

    // --- Execução da lógica correspondente ao handleRestoreDatabaseBackup em App.tsx ---
    let effectiveProfile = stateProfile;
    if (backupPayload.data.profile) {
      effectiveProfile = backupPayload.data.profile;
      setUserProfile(backupPayload.data.profile);
      saveUserProfile('user_test_123', backupPayload.data.profile);
    }

    let effectiveLogs = stateLogs;
    if (Array.isArray(backupPayload.data.workoutLogs) && backupPayload.data.workoutLogs.length > 0) {
      effectiveLogs = backupPayload.data.workoutLogs;
      setWorkoutLogs(backupPayload.data.workoutLogs);
      for (const log of backupPayload.data.workoutLogs) {
        saveWorkoutLog('user_test_123', log);
      }
    }

    let hydrationResolution = null;
    if (backupPayload.data.workoutProgram) {
      hydrationResolution = resolveActiveWorkoutHydration(
        backupPayload.data.workoutProgram,
        effectiveProfile,
        effectiveLogs
      );
      setProgram(hydrationResolution.program);
      saveActiveWorkout('user_test_123', hydrationResolution.program);
    }

    return {
      stateProfile,
      stateLogs,
      stateProgram,
      savedProfileToFirestore,
      savedLogsToFirestore,
      savedProgramToFirestore,
      hydrationResolution,
      setProgramDirectCallsWithRawPayload,
    };
  }

  console.log('\n--- 1. TESTE A: BACKUP VÁLIDO ---');
  {
    const payload = createPayload({
      profile: { ...INITIAL_PROFILE, name: 'Atleta Restaurado' },
      workoutProgram: validBaseProgram,
      workoutLogs: sampleLogs,
    });

    const res = simulateRestoreFlow(payload);
    assertTest(res.hydrationResolution !== null && res.hydrationResolution.acceptedRemote === true, 'TESTE A: Backup com programa válido é aceito na resolução');
    assertTest(res.stateProgram === validBaseProgram, 'TESTE A: Programa seguro do backup aplicado ao estado ativo');
    assertTest(res.savedProgramToFirestore === validBaseProgram, 'TESTE A: Programa seguro persistido no Firestore');
    assertTest(res.stateProfile.name === 'Atleta Restaurado', 'TESTE A: Perfil do backup aplicado corretamente');
    assertTest(res.stateLogs.length === 1, 'TESTE A: Logs do backup aplicados corretamente');
  }

  console.log('\n--- 2. TESTE B: BACKUP COM EXERCISE.ID FORJADO ---');
  {
    const tamperedProgram = JSON.parse(JSON.stringify(validBaseProgram));
    tamperedProgram.__isUnvalidatedRaw = true;
    tamperedProgram.splitDays[0].items[0].exercise.id = 'ex_forged_unauthorized_backup_9999';

    const payload = createPayload({
      workoutProgram: tamperedProgram,
    });

    const res = simulateRestoreFlow(payload);
    assertTest(res.hydrationResolution !== null && res.hydrationResolution.acceptedRemote === false, 'TESTE B: Backup com ID forjado rejeitado pelo Safety Validator');
    assertTest(res.stateProgram !== tamperedProgram, 'TESTE B: Programa forjado NUNCA entra no estado ativo');
    assertTest(res.savedProgramToFirestore !== tamperedProgram, 'TESTE B: Firestore recebe fallback seguro, não o payload forjado');
    assertTest(res.stateProgram.splitDays[0].items[0].exercise.id !== 'ex_forged_unauthorized_backup_9999', 'TESTE B: Estado ativo possui exercício idôneo');
  }

  console.log('\n--- 3. TESTE C: BACKUP COM EXERCÍCIO PROIBIDO ---');
  {
    const forbiddenProfile: UserProfile = {
      ...INITIAL_PROFILE,
      forbiddenExercises: ['Leg Press 45°'],
    };
    const forbiddenProgram = JSON.parse(JSON.stringify(validBaseProgram));
    forbiddenProgram.__isUnvalidatedRaw = true;
    forbiddenProgram.profile = forbiddenProfile;
    forbiddenProgram.splitDays[0].items[0].exercise.name = 'Leg Press 45°';

    const payload = createPayload({
      profile: forbiddenProfile,
      workoutProgram: forbiddenProgram,
    });

    const res = simulateRestoreFlow(payload);
    assertTest(res.hydrationResolution !== null && res.hydrationResolution.acceptedRemote === false, 'TESTE C: Backup com exercício proibido rejeitado pelo Safety Validator');
    assertTest(res.stateProgram !== forbiddenProgram, 'TESTE C: Programa proibido NUNCA entra no estado ativo');
    const containsForbidden = res.stateProgram.splitDays.some((d: any) =>
      d.items.some((i: any) => i.exercise.name === 'Leg Press 45°')
    );
    assertTest(!containsForbidden, 'TESTE C: Estado ativo gerou fallback livre de exercício proibido');
  }

  console.log('\n--- 4. TESTE D: BACKUP COM DUPLICAÇÃO INTRA-SESSÃO ---');
  {
    const duplicatedProgram = JSON.parse(JSON.stringify(validBaseProgram));
    duplicatedProgram.__isUnvalidatedRaw = true;
    const firstItem = duplicatedProgram.splitDays[0].items[0];
    duplicatedProgram.splitDays[0].items.push({ ...firstItem, id: 'dup_item_backup' });

    const payload = createPayload({
      workoutProgram: duplicatedProgram,
    });

    const res = simulateRestoreFlow(payload);
    assertTest(res.hydrationResolution !== null && res.hydrationResolution.acceptedRemote === false, 'TESTE D: Backup com duplicação intra-sessão rejeitado');
    assertTest(res.stateProgram !== duplicatedProgram, 'TESTE D: Programa com duplicata não entra no estado ativo');
  }

  console.log('\n--- 5. TESTE E: BACKUP CONFLITANTE COM LIMITATION ---');
  {
    const kneeProfile: UserProfile = {
      ...INITIAL_PROFILE,
      limitations: ['dor no joelho'],
    };
    const kneeConflictProgram = JSON.parse(JSON.stringify(validBaseProgram));
    kneeConflictProgram.__isUnvalidatedRaw = true;
    kneeConflictProgram.profile = kneeProfile;
    kneeConflictProgram.splitDays[0].items[0].exercise.name = 'Leg Press 45°';

    const payload = createPayload({
      profile: kneeProfile,
      workoutProgram: kneeConflictProgram,
    });

    const res = simulateRestoreFlow(payload);
    assertTest(res.hydrationResolution !== null && res.hydrationResolution.acceptedRemote === false, 'TESTE E: Backup violando limitação física rejeitado');
    assertTest(res.stateProgram !== kneeConflictProgram, 'TESTE E: Exercício conflitante não entra no estado ativo');
  }

  console.log('\n--- 6. TESTE F: BACKUP ESTRUTURALMENTE INVÁLIDO (SEM TYPEERROR) ---');
  {
    const malformedCases: Array<{ name: string; malformed: any }> = [
      { name: 'string', malformed: 'not_a_program' },
      { name: 'number', malformed: 12345 },
      { name: 'empty object', malformed: {} },
      { name: 'null splitDays', malformed: { profile: INITIAL_PROFILE, splitDays: null } },
      { name: 'empty splitDays array', malformed: { profile: INITIAL_PROFILE, splitDays: [] } },
      { name: 'items null', malformed: { profile: INITIAL_PROFILE, splitDays: [{ id: 'A', items: null }] } },
    ];

    for (const testCase of malformedCases) {
      let threwException = false;
      let res: any = null;
      try {
        const payload = createPayload({
          workoutProgram: testCase.malformed,
        });
        res = simulateRestoreFlow(payload);
      } catch {
        threwException = true;
      }
      assertTest(!threwException, `TESTE F [${testCase.name}]: Não lança exceção em payload malformado`);
      assertTest(res !== null && res.hydrationResolution.acceptedRemote === false, `TESTE F [${testCase.name}]: Payload rejeitado e fallback ativado`);
      assertTest(res.stateProgram !== testCase.malformed, `TESTE F [${testCase.name}]: Estado recebe programa seguro`);
    }
  }

  console.log('\n--- 7. TESTE G: BACKUP VÁLIDO FULL BODY (2x, 3x, 4x, 5x) ---');
  {
    for (const days of [2, 3, 4, 5] as const) {
      const prof: UserProfile = { ...INITIAL_PROFILE, availableDays: days };
      const prog = generateWorkoutWithPipeline(prof);
      const payload = createPayload({
        profile: prof,
        workoutProgram: prog,
      });

      const res = simulateRestoreFlow(payload);
      assertTest(res.hydrationResolution.acceptedRemote === true, `TESTE G: Full Body ${days}x é aceito na restauração`);
      assertTest(res.stateProgram === prog, `TESTE G: Programa Full Body ${days}x aplicado ao estado`);
    }
  }

  console.log('\n--- 8. TESTE H: BYPASS CHECK — PROGRAMA NÃO VALIDADO NUNCA VAI PARA setProgram ---');
  {
    const rawTampered: any = {
      __isUnvalidatedRaw: true,
      splitDays: [{ id: 'A', name: 'Raw Injected Day', items: [] }],
    };
    const payload = createPayload({
      workoutProgram: rawTampered,
    });

    const res = simulateRestoreFlow(payload);
    assertTest(res.setProgramDirectCallsWithRawPayload === 0, 'TESTE H: setProgram NUNCA é chamado diretamente com o payload cru não validado');
    assertTest(res.stateProgram !== rawTampered, 'TESTE H: O estado ativo NUNCA contém o objeto injetado pelo backup');
  }

  console.log('===================================================================');
  console.log(`   DIAGNÓSTICO: ${passedTests}/${totalTests} TESTES PASSARAM COM SUCESSO (100%)   `);
  console.log('===================================================================');
}

runBackupHydrationSafetySuite().catch((err) => {
  console.error('Fatal error in backup hydration test suite:', err);
  process.exit(1);
});
