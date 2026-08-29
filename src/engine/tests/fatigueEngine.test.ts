import { MultifactorialFatigueEngine } from '../../services/fatigueEngine';
import { UserProfile, WorkoutLog } from '../../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

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

  {
    const recentLogsWithHighVolume: WorkoutLog[] = [
      {
        id: 'log1', date: '2026-08-18', dayId: 'A', durationMin: 60, sessionRPE: 8, notes: '',
        exerciseLogs: [{ exerciseId: 'ex1', exerciseName: 'Supino', sets: [{ setNumber: 1, repsDone: 10, weightKg: 80, actualRIR: 2, completed: true }] }],
      },
      {
        id: 'log2', date: '2026-08-16', dayId: 'B', durationMin: 60, sessionRPE: 8, notes: '',
        exerciseLogs: [{ exerciseId: 'ex2', exerciseName: 'Agachamento', sets: [{ setNumber: 1, repsDone: 10, weightKg: 100, actualRIR: 2, completed: true }] }],
      },
    ];

    const result = MultifactorialFatigueEngine.evaluate({
      profile: baseProfile,
      recentLogs: recentLogsWithHighVolume,
      subjectiveDOMS: 1,
      performanceDrop: false,
    });

    assert(result.deloadLevel !== 'deload_recommended', 'ACWR isolado não pode disparar deload forçado');
    assert(result.explanation.length > 0, 'Decisão deve possuir explicação multifatorial transparente');
    console.log('✓ Teste 1: ACWR isolado atua apenas como métrica auxiliar sem forçar deload');
  }

  {
    const fatiguedProfile: UserProfile = { ...baseProfile, sleepHours: 5, stressLevel: 'high' };
    const intenseLogs: WorkoutLog[] = [{
      id: 'l1', date: '2026-08-18', dayId: 'A', durationMin: 70, sessionRPE: 9.5, notes: '',
      exerciseLogs: [{
        exerciseId: 'ex1', exerciseName: 'Agachamento',
        sets: [
          { setNumber: 1, repsDone: 6, weightKg: 120, actualRIR: 0, completed: true },
          { setNumber: 2, repsDone: 5, weightKg: 120, actualRIR: 0, completed: true },
        ],
      }],
    }];

    const result = MultifactorialFatigueEngine.evaluate({
      profile: fatiguedProfile,
      recentLogs: intenseLogs,
      subjectiveDOMS: 4,
      performanceDrop: true,
    });

    assert(result.status === 'deload_recommended', 'Sinais convergentes devem indicar deload_recommended');
    assert(result.primaryDrivers.length >= 2, 'Múltiplos fatores devem ser identificados como causadores');
    assert(result.actionGuidance.includes('Reduza temporariamente o volume'), 'Ação de deload deve orientar redução temporária de volume');
    console.log('✓ Teste 2: Sinais convergentes geram recomendação de deload com orientação clara');
  }

  {
    const result = MultifactorialFatigueEngine.evaluate({
      profile: baseProfile,
      recentLogs: [],
      reportedPainAreas: ['Ombro direito', 'Joelho esquerdo'],
      reportedPainSeverity: 4,
    });

    assert(result.professionalReferralRequired === true, 'Dor severidade 4 requer orientação profissional');
    assert(result.professionalReferralReason?.includes('avaliação presencial de profissional habilitado'), 'Dor relevante deve gerar orientação para avaliação presencial');
    assert(!/tendinite|bursite/i.test(result.actionGuidance), 'O sistema não deve inventar diagnóstico de patologia');
    console.log('✓ Teste 3: Dor relevante não diagnostica e orienta avaliação profissional');
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DE FADIGA MULTIFATORIAL PASSARAM COM 100% DE SUCESSO!');
}

runMultifactorialFatigueTests().catch((err) => {
  console.error('Falha nos testes de fadiga multifatorial:', err);
  process.exit(1);
});
