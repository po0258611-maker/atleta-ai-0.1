import { BodyCompositionService } from '../../services/bodyCompositionService';
import { ProgressionEngine } from '../../services/progressionEngine';
import { UserProfile } from '../../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runBodyCompositionTests() {
  console.log('--- INICIANDO TESTES DO SISTEMA DE METAS DE COMPOSIÇÃO CORPORAL ---');

  const baseProfile: UserProfile = {
    name: 'Atleta Teste',
    gender: 'male',
    age: 26,
    heightCm: 178,
    weightKg: 80,
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
    const result = BodyCompositionService.evaluateBodyCompositionTarget(baseProfile, undefined);
    assert(result.bodyFatTarget.status === 'not_specified', 'Status deve ser not_specified');
    assert(result.bodyFatTarget.valuePct === null, 'Valor de gordura não pode ser inventado (deve ser null)');
    assert(result.bodyFatTarget.type === 'estimate', 'Tipo deve ser estimate');
    console.log('✓ Teste 1: Sem percentual informado -> status not_specified com valor null');
  }

  {
    const result = BodyCompositionService.evaluateBodyCompositionTarget(baseProfile, 11.5);
    assert(result.bodyFatTarget.status === 'provided_by_user', 'Status deve ser provided_by_user');
    assert(result.bodyFatTarget.valuePct === 11.5, 'Valor deve corresponder exatamente ao informado');
    assert(result.bodyFatTarget.type === 'goal', 'Tipo deve ser goal');
    console.log('✓ Teste 2: Meta de gordura informada pelo usuário preservada');
  }

  {
    const intelligentGoals = ProgressionEngine.calculateIntelligentGoals(baseProfile, null);
    assert(intelligentGoals.bodyComposition.bodyFatTarget.valuePct === null, 'IntelligentGoals não pode inventar percentual');
    assert(intelligentGoals.recommendedDailyCalories > 0, 'Calorias diárias calculadas devem ser positivas');
    assert(intelligentGoals.macroRatio.proteinGrams > 0, 'Proteínas calculadas devem ser positivas');
    console.log('✓ Teste 3: ProgressionEngine preserva metas sem percentual rígido');
  }

  {
    const cuttingProfile: UserProfile = { ...baseProfile, objective: 'fat_loss' };
    const result = BodyCompositionService.evaluateBodyCompositionTarget(cuttingProfile);
    assert(result.bodyFatTarget.valuePct === null, 'Cutting sem dados não pode assumir percentual arbitrário');
    assert(result.trainingFocus.toLowerCase().includes('preservação de desempenho e massa magra'), 'Foco do cutting deve priorizar preservação de desempenho e massa magra');
    console.log('✓ Teste 4: Cutting sem percentual informado prioriza preservação de desempenho e massa magra');
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DE METAS DE COMPOSIÇÃO CORPORAL PASSARAM COM 100% DE SUCESSO!');
}

runBodyCompositionTests().catch((err) => {
  console.error('Falha nos testes de composição corporal:', err);
  process.exit(1);
});
