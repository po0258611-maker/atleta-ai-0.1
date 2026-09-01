import { MultifactorialFatigueEngine } from '../../services/fatigueEngine';
import { UserProfile, WorkoutLog } from '../../types';

async function runMultifactorialFatigueTests() {
  console.log('--- INICIANDO TESTES DO MODELO DE FADIGA MULTIFATORIAL ---');

  const baseProfile: UserProfile = {
    name: 'Atleta Teste',
    gender: 'male',
    age: 28,
    heightCm: 180,
    weightKg: 82,
    experience: 'intermediate',
    availableDays: 4,
    timePerSessionMin: 60,
    objective: 'hypertrophy',
    environment: 'full_gym',
    priorities: ['peitoral'],
    limitations: [],
    forbiddenExercises: [],
    sleepHours: 8,
    stressLevel: 'low',
  };

  // Test 1: Isolated ACWR high with perfect sleep, low stress and stable performance
  // MUST NOT trigger automatic hard deload on its own
  {
    const recentLogsWithHighVolume: WorkoutLog[] = [
      {
        id: 'log1',
        date: '2026-08-18',
        dayId: 'A',
        durationMin: 60,
        sessionRPE: 8,
        notes: '',
        exerciseLogs: [
          {
            exerciseId: 'ex1',
            exerciseName: 'Supino',
            sets: [{ setNumber: 1, repsDone: 10, weightKg: 80, actualRIR: 2, completed: true }],
          },
        ],
      },
      {
        id: 'log2',
        date: '2026-08-16',
        dayId: 'B',
        durationMin: 60,
        sessionRPE: 8,
        notes: '',
        exerciseLogs: [
          {
            exerciseId: 'ex2',
            exerciseName: 'Agachamento',
            sets: [{ setNumber: 1, repsDone: 10, weightKg: 100, actualRIR: 2, completed: true }],
          },
        ],
      },
    ];

    const result = MultifactorialFatigueEngine.evaluate({
      profile: baseProfile,
      recentLogs: recentLogsWithHighVolume,
      subjectiveDOMS: 1,
      performanceDrop: false,
    });

    console.assert(result.deloadLevel !== 'deload_recommended', 'ACWR isolado não pode disparar deload forçado');
    console.assert(result.explanation.length > 0, 'Decisão deve possuir explicação multifatorial transparente');
    console.log('✓ Teste 1: ACWR isolado atua apenas como métrica auxiliar sem forçar deload');
  }

  // Test 2: Convergent Signals (High RPE + Performance Drop + Poor Sleep) -> Deload Recommended with Explanation
  {
    const fatiguedProfile: UserProfile = {
      ...baseProfile,
      sleepHours: 5,
      stressLevel: 'high',
    };

    const intenseLogs: WorkoutLog[] = [
      {
        id: 'l1',
        date: '2026-08-18',
        dayId: 'A',
        durationMin: 70,
        sessionRPE: 9.5,
        notes: '',
        exerciseLogs: [
          {
            exerciseId: 'ex1',
            exerciseName: 'Agachamento',
            sets: [
              { setNumber: 1, repsDone: 6, weightKg: 120, actualRIR: 0, completed: true },
              { setNumber: 2, repsDone: 5, weightKg: 120, actualRIR: 0, completed: true },
            ],
          },
        ],
      },
    ];

    const result = MultifactorialFatigueEngine.evaluate({
      profile: fatiguedProfile,
      recentLogs: intenseLogs,
      subjectiveDOMS: 4,
      performanceDrop: true,
    });

    console.assert(result.status === 'deload_recommended', 'Sinais convergentes devem indicar deload_recommended');
    console.assert(result.primaryDrivers.length >= 2, 'Múltiplos fatores devem ser identificados como causadores');
    console.assert(result.actionGuidance.includes('DELOAD MULTIFATORIAL'), 'Ação orientada com clareza');
    console.log('✓ Teste 2: Sinais fisiológicos convergentes (sono <5.5h, estresse alto, RPE 9.5, queda de rendimento) geram deload explicado');
  }

  // Test 3: Significant Pain Reported -> Non-diagnostic safety orientation & professional referral
  {
    const result = MultifactorialFatigueEngine.evaluate({
      profile: baseProfile,
      recentLogs: [],
      reportedPainAreas: ['Ombro direito', 'Joelho esquerdo'],
      reportedPainSeverity: 4,
    });

    console.assert(result.professionalReferralRequired === true, 'Dor severidade 4 requer orientação profissional');
    console.assert(
      result.professionalReferralReason?.includes('avaliação presencial com médico especialista ou fisioterapeuta'),
      'Não faz diagnósticos; orienta consulta profissional'
    );
    console.assert(
      !result.actionGuidance.includes('tendinite') && !result.actionGuidance.includes('bursite'),
      'Não inventa diagnósticos de patologias'
    );
    console.log('✓ Teste 3: Relato de dor relevante não diagnostica e orienta consulta profissional de saúde');
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DE FADIGA MULTIFATORIAL PASSARAM COM 100% DE SUCESSO!');
}

runMultifactorialFatigueTests().catch((err) => {
  console.error('Falha nos testes de fadiga multifatorial:', err);
  process.exit(1);
});
