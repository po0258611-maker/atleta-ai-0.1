import {
  resolveActiveWorkoutHydration,
  INITIAL_PROFILE,
} from '../../hooks/useWorkout';
import { generateWorkoutWithPipeline } from '../workoutEngineBridge';
import { FullBodyProgram, UserProfile, WorkoutLog } from '../../types';

async function runFirestoreHydrationSafetySuite() {
  console.log('===================================================================');
  console.log('   ATLETA AI — STAGE 09.2: FIRESTORE HYDRATION SAFETY TEST SUITE   ');
  console.log('===================================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition: boolean, description: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ [FAIL] Teste ${totalTests}: ${description}`);
      throw new Error(`Hydration safety test failed: ${description}`);
    }
    passedTests++;
    console.log(`✓ [${totalTests}] ${description}`);
  }

  // Fixture base válida gerada pelo motor oficial
  const validBaseProgram = generateWorkoutWithPipeline(INITIAL_PROFILE);
  const emptyLogs: WorkoutLog[] = [];

  // Helper para simular o comportamento de estado do useWorkout
  function simulateHookHydration(
    remotePayload: any,
    effectiveProfile: UserProfile = INITIAL_PROFILE,
    logs: WorkoutLog[] = emptyLogs,
  ) {
    let activeProgramInState: FullBodyProgram | null = null;
    let savedToFirestore: FullBodyProgram | null = null;
    let acceptedRemoteFlag = false;

    const setProgram = (prog: FullBodyProgram) => {
      activeProgramInState = prog;
    };
    const saveActiveWorkout = (prog: FullBodyProgram) => {
      savedToFirestore = prog;
    };

    const hydration = resolveActiveWorkoutHydration(remotePayload, effectiveProfile, logs);

    if (hydration.acceptedRemote) {
      setProgram(remotePayload);
      acceptedRemoteFlag = true;
    } else {
      setProgram(hydration.program);
      saveActiveWorkout(hydration.program);
    }

    return {
      activeProgramInState,
      savedToFirestore,
      acceptedRemoteFlag,
      hydration,
    };
  }

  console.log('\n--- 1. TESTE A: REMOTE VÁLIDO ---');
  {
    const res = simulateHookHydration(validBaseProgram);
    assertTest(res.acceptedRemoteFlag === true, 'TESTE A: validator aprova programa válido');
    assertTest(res.activeProgramInState === validBaseProgram, 'TESTE A: setProgram recebe e aceita o remoteProgram');
    assertTest(res.savedToFirestore === null, 'TESTE A: remoteProgram não precisa ser regravado no Firestore');
  }

  console.log('\n--- 2. TESTE B: REMOTE NULL ---');
  {
    const res = simulateHookHydration(null);
    assertTest(res.acceptedRemoteFlag === false, 'TESTE B: remote null não é aceito como remoteProgram');
    assertTest(res.activeProgramInState !== null, 'TESTE B: estado ativo recebe programa gerado seguro');
    assertTest(res.savedToFirestore !== null, 'TESTE B: programa inicial seguro é persistido no Firestore');
  }

  console.log('\n--- 3. TESTE C: EXERCÍCIO FORJADO (ID INEXISTENTE) ---');
  {
    const tampered = JSON.parse(JSON.stringify(validBaseProgram));
    tampered.splitDays[0].items[0].exercise.id = 'ex_forged_unauthorized_9999';

    const res = simulateHookHydration(tampered);
    assertTest(res.acceptedRemoteFlag === false, 'TESTE C: ID forjado rejeitado pelo Safety Validator');
    assertTest(res.activeProgramInState !== tampered, 'TESTE C: setProgram NUNCA executa com programa forjado');
    assertTest(res.hydration.validationErrors?.some((e: string) => e.includes('inexistente ou desconhecido')) === true, 'TESTE C: Erro estrutural registrado no diagnóstico');
    assertTest(res.savedToFirestore !== null && res.savedToFirestore !== tampered, 'TESTE C: Firestore recebe fallback regenerado seguro');
  }

  console.log('\n--- 4. TESTE D: EXERCÍCIO PROIBIDO ---');
  {
    const forbiddenProgram = JSON.parse(JSON.stringify(validBaseProgram));
    const targetEx = forbiddenProgram.splitDays[0].items[0].exercise;
    forbiddenProgram.profile.forbiddenExercises = [targetEx.nome];

    const res = simulateHookHydration(forbiddenProgram);
    assertTest(res.acceptedRemoteFlag === false, 'TESTE D: exercício proibido barrado pelo Safety Validator');
    assertTest(res.activeProgramInState !== forbiddenProgram, 'TESTE D: setProgram NUNCA executa com exercício proibido');
    assertTest(res.hydration.validationErrors?.some((e: string) => e.includes('proibido')) === true, 'TESTE D: Diagnóstico aponta violação de exercício proibido');
  }

  console.log('\n--- 5. TESTE E: DUPLICAÇÃO INTRA-SESSÃO ---');
  {
    const duplicatedProgram = JSON.parse(JSON.stringify(validBaseProgram));
    const firstItem = duplicatedProgram.splitDays[0].items[0];
    // Injeta o mesmo exercício uma segunda vez na mesma sessão
    duplicatedProgram.splitDays[0].items.push({
      ...JSON.parse(JSON.stringify(firstItem)),
      itemOrder: duplicatedProgram.splitDays[0].items.length + 1,
    });

    const res = simulateHookHydration(duplicatedProgram);
    assertTest(res.acceptedRemoteFlag === false, 'TESTE E: duplicação intra-sessão rejeitada pelo Safety Validator');
    assertTest(res.activeProgramInState !== duplicatedProgram, 'TESTE E: setProgram NUNCA executa com duplicação');
    assertTest(res.hydration.validationErrors?.some((e: string) => e.includes('duplicado')) === true, 'TESTE E: Diagnóstico aponta erro de duplicação');
  }

  console.log('\n--- 6. TESTE F: LIMITAÇÃO FÍSICA ATIVA ---');
  {
    // Cenário 1: Limitação presente no perfil do programa remoto com exercício conflitante (agachamento com dor no joelho)
    const limitationProgram = JSON.parse(JSON.stringify(validBaseProgram));
    limitationProgram.profile.limitations = ['dor_joelho'];

    const res1 = simulateHookHydration(limitationProgram);
    assertTest(res1.acceptedRemoteFlag === false, 'TESTE F.1: conflito com limitação física rejeitado');
    assertTest(res1.activeProgramInState !== limitationProgram, 'TESTE F.1: setProgram NUNCA executa com exercício lesivo');

    // Cenário 2: Perfil do usuário atualizado no servidor com limitação ativa ('dor_cotovelo')
    const profileWithLimitation: UserProfile = {
      ...INITIAL_PROFILE,
      limitations: ['dor_cotovelo'],
    };
    const res2 = simulateHookHydration(validBaseProgram, profileWithLimitation);
    assertTest(res2.acceptedRemoteFlag === false, 'TESTE F.2: limitação ativa do perfil do usuário barra programa incompatível');
    assertTest(res2.activeProgramInState !== validBaseProgram, 'TESTE F.2: setProgram regenera programa respeitando dor no cotovelo');
  }

  console.log('\n--- 7. TESTE G: INPUT MALFORMADO (FAIL-CLOSED SEM TYPEERROR) ---');
  {
    const malformedCases = [
      { name: 'undefined', payload: undefined },
      { name: 'number', payload: 12345 },
      { name: 'string', payload: 'not-a-program' },
      { name: 'empty object', payload: {} },
      { name: 'profile null', payload: { profile: null, splitDays: [] } },
      { name: 'splitDays null', payload: { profile: INITIAL_PROFILE, splitDays: null } },
      { name: 'splitDays não-array', payload: { profile: INITIAL_PROFILE, splitDays: 'invalido' } },
      { name: 'day.items null', payload: { profile: INITIAL_PROFILE, splitDays: [{ dayId: 'A', items: null }] } },
      { name: 'item.exercise null', payload: { profile: INITIAL_PROFILE, splitDays: [{ dayId: 'A', items: [{ exercise: null }] }] } },
      { name: 'exercise.id ausente', payload: { profile: INITIAL_PROFILE, splitDays: [{ dayId: 'A', items: [{ exercise: { nome: 'Supino' } }] }] } },
      { name: 'exercise.id vazio', payload: { profile: INITIAL_PROFILE, splitDays: [{ dayId: 'A', items: [{ exercise: { id: '', nome: 'Supino' } }] }] } },
    ];

    for (const testCase of malformedCases) {
      let threwException = false;
      let res: any;
      try {
        res = simulateHookHydration(testCase.payload);
      } catch (_e) {
        threwException = true;
      }

      assertTest(!threwException, `TESTE G [${testCase.name}]: não lança TypeError nem outra exceção`);
      assertTest(res.acceptedRemoteFlag === false, `TESTE G [${testCase.name}]: acceptedRemoteFlag é false`);
      assertTest(res.activeProgramInState !== testCase.payload, `TESTE G [${testCase.name}]: setProgram NUNCA aceita payload malformado`);
      assertTest(res.activeProgramInState !== null, `TESTE G [${testCase.name}]: estado recebe programa regenerado seguro`);
    }
  }

  console.log('\n--- 8. TESTE H: PROGRAMA VÁLIDO COMPLETO (FULL BODY MULTI-FREQ) ---');
  {
    for (const days of [2, 3, 4, 5] as const) {
      const profile: UserProfile = { ...INITIAL_PROFILE, availableDays: days };
      const prog = generateWorkoutWithPipeline(profile);
      const res = simulateHookHydration(prog, profile);

      assertTest(res.acceptedRemoteFlag === true, `TESTE H: Full Body ${days}x válido é aceito na hidratação`);
      assertTest(res.activeProgramInState === prog, `TESTE H: setProgram executa com o programa íntegro de ${days} dias`);
    }
  }

  console.log('===================================================================');
  console.log(`   DIAGNÓSTICO: ${passedTests}/${totalTests} TESTES PASSARAM COM SUCESSO (100%)   `);
  console.log('===================================================================');
}

runFirestoreHydrationSafetySuite().catch((err) => {
  console.error('Falha nos testes de hidratação de segurança:', err);
  process.exit(1);
});
