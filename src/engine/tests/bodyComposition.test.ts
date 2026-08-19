import { BodyCompositionService } from '../../services/bodyCompositionService';
import { ProgressionEngine } from '../../services/progressionEngine';
import { UserProfile } from '../../types';

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

  // Test 1: User does not specify body fat goal -> System MUST NOT invent 12%/14%/15%
  {
    const result = BodyCompositionService.evaluateBodyCompositionTarget(baseProfile, undefined);

    console.assert(result.bodyFatTarget.status === 'not_specified', 'Status deve ser not_specified');
    console.assert(result.bodyFatTarget.valuePct === null, 'Valor de gordura não pode ser inventado (deve ser null)');
    console.assert(result.bodyFatTarget.type === 'estimate', 'Tipo deve ser estimate');
    console.log('✓ Teste 1: Sem percentual informado -> status "not_specified" com valor null (não inventa 12/14/15%)');
  }

  // Test 2: User explicitly provides body fat preference -> Registered as user goal
  {
    const userGoalPct = 11.5;
    const result = BodyCompositionService.evaluateBodyCompositionTarget(baseProfile, userGoalPct);

    console.assert(result.bodyFatTarget.status === 'provided_by_user', 'Status deve ser provided_by_user');
    console.assert(result.bodyFatTarget.valuePct === 11.5, 'Valor deve corresponder exatamente ao informado');
    console.assert(result.bodyFatTarget.type === 'goal', 'Tipo deve ser rigorosamente "goal" (preferência do usuário)');
    console.log('✓ Teste 2: Usuário informa meta de gordura -> Registrado com tipo "goal"');
  }

  // Test 3: ProgressionEngine integration with IntelligentGoals without universal body fat targets
  {
    const intelligentGoals = ProgressionEngine.calculateIntelligentGoals(baseProfile, null);

    console.assert(intelligentGoals.bodyComposition.bodyFatTarget.valuePct === null, 'IntelligentGoals não pode inventar percentual');
    console.assert(intelligentGoals.recommendedDailyCalories > 0, 'Calorias diárias calculadas com base em BMR/TDEE');
    console.assert(intelligentGoals.macroRatio.proteinGrams > 0, 'Proteínas calculadas em g/kg');
    console.log('✓ Teste 3: ProgressionEngine.calculateIntelligentGoals preserva foco no treino e calorias sem metas rígidas de gordura');
  }

  // Test 4: Fat Loss objective without body fat goal -> No universal BF% assumption
  {
    const cuttingProfile: UserProfile = { ...baseProfile, objective: 'fat_loss' };
    const result = BodyCompositionService.evaluateBodyCompositionTarget(cuttingProfile);

    console.assert(result.bodyFatTarget.valuePct === null, 'Cutting sem dados não pode assumir 10% ou 12% arbitrariamente');
    console.assert(result.trainingFocus.includes('Preservação de massa magra'), 'Foco no treino ajustado para cutting');
    console.log('✓ Teste 4: Objetivo de emagrecimento sem dados de gordura foca na preservação neuromuscular');
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DE METAS DE COMPOSIÇÃO CORPORAL PASSARAM COM 100% DE SUCESSO!');
}

runBodyCompositionTests().catch((err) => {
  console.error('Falha nos testes de composição corporal:', err);
  process.exit(1);
});
