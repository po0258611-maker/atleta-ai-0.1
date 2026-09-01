import { UserProfile } from '../types';

export type DietGoal = 'hypertrophy' | 'cutting' | 'maintenance';
export type DietPreference = 'traditional' | 'vegetarian' | 'low_carb' | 'practical' | 'low_cost';

export interface FoodItem {
  name: string;
  amount: string;
  category: 'protein' | 'carb' | 'fat' | 'fiber' | 'supplement';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  type: 'breakfast' | 'lunch' | 'pre_workout' | 'post_workout' | 'dinner' | 'supper';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: FoodItem[];
  tips: string;
}

export interface SubstitutionGroup {
  category: 'protein' | 'carb' | 'fat' | 'fiber';
  title: string;
  baseFood: string;
  equivalents: {
    foodName: string;
    portion: string;
    notes?: string;
  }[];
}

export interface CalculatedDietMetrics {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinGrams: number;
  proteinCalories: number;
  proteinPerKg: number;
  carbGrams: number;
  carbCalories: number;
  carbPerKg: number;
  fatGrams: number;
  fatCalories: number;
  fatPerKg: number;
  fiberGrams: number;
  waterLiters: number;
}

export interface StructuredDietPlan {
  metrics: CalculatedDietMetrics;
  preference: DietPreference;
  goal: DietGoal;
  meals: Meal[];
}

// 1. Calculate Basal Metabolic Rate and Daily Macros
export function calculateDietMetrics(
  profile: UserProfile,
  goal: DietGoal
): CalculatedDietMetrics {
  const { weightKg, heightCm, age, gender, availableDays } = profile;

  // Mifflin-St Jeor Equation
  const bmr = Math.round(
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  );

  // Activity Factor based on training frequency
  const activityFactor = availableDays >= 5 ? 1.55 : availableDays >= 3 ? 1.375 : 1.25;
  const tdee = Math.round(bmr * activityFactor);

  // Caloric Surplus or Deficit
  let targetCalories = tdee;
  if (goal === 'hypertrophy') {
    targetCalories = Math.round(tdee + 350);
  } else if (goal === 'cutting') {
    targetCalories = Math.round(tdee - 450);
  }

  // Protein calculation
  const proteinPerKg = goal === 'cutting' ? 2.2 : goal === 'hypertrophy' ? 2.0 : 1.8;
  const proteinGrams = Math.round(weightKg * proteinPerKg);
  const proteinCalories = proteinGrams * 4;

  // Fat calculation (0.8 - 1.0g/kg)
  const fatPerKg = goal === 'cutting' ? 0.8 : 0.9;
  const fatGrams = Math.round(weightKg * fatPerKg);
  const fatCalories = fatGrams * 9;

  // Carbs calculation (Remaining calories)
  const carbCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
  const carbGrams = Math.round(carbCalories / 4);
  const carbPerKg = Number((carbGrams / weightKg).toFixed(1));

  // Fiber (14g per 1000kcal)
  const fiberGrams = Math.round((targetCalories / 1000) * 14);

  // Water (40ml/kg)
  const waterLiters = Number(((weightKg * 40) / 1000).toFixed(1));

  return {
    bmr,
    tdee,
    targetCalories,
    proteinGrams,
    proteinCalories,
    proteinPerKg,
    carbGrams,
    carbCalories,
    carbPerKg,
    fatGrams,
    fatCalories,
    fatPerKg,
    fiberGrams,
    waterLiters,
  };
}

// 2. Generate Structured Meal Plans
export function generateMealPlan(
  profile: UserProfile,
  goal: DietGoal,
  preference: DietPreference
): StructuredDietPlan {
  const metrics = calculateDietMetrics(profile, goal);
  const { targetCalories, proteinGrams, carbGrams, fatGrams } = metrics;

  let meals: Meal[] = [];

  if (preference === 'traditional') {
    meals = [
      {
        id: 'meal-1',
        name: 'Café da Manhã Anabólico',
        time: '07:30',
        type: 'breakfast',
        calories: Math.round(targetCalories * 0.22),
        protein: Math.round(proteinGrams * 0.22),
        carbs: Math.round(carbGrams * 0.22),
        fat: Math.round(fatGrams * 0.20),
        foods: [
          { name: 'Ovos Inteiros Mexidos', amount: '3 unidades médias', category: 'protein', calories: 210, protein: 18, carbs: 1, fat: 15 },
          { name: 'Pão Integral Fatiado', amount: '2 fatias (50g)', category: 'carb', calories: 120, protein: 4, carbs: 22, fat: 1 },
          { name: 'Mamão Papaia ou Banana', amount: '1 fatia média (100g)', category: 'carb', calories: 60, protein: 1, carbs: 15, fat: 0 },
          { name: 'Queijo Cotagge ou Minas Frescal', amount: '1 colher de sopa (30g)', category: 'protein', calories: 40, protein: 5, carbs: 1, fat: 1 },
        ],
        tips: 'Combine proteína e fibras de manhã para estabilizar a glicemia e manter saciedade prolongada.',
      },
      {
        id: 'meal-2',
        name: 'Almoço de Alta Performance',
        time: '12:30',
        type: 'lunch',
        calories: Math.round(targetCalories * 0.32),
        protein: Math.round(proteinGrams * 0.30),
        carbs: Math.round(carbGrams * 0.35),
        fat: Math.round(fatGrams * 0.30),
        foods: [
          { name: 'Peito de Frango Grelhado ou Patinho Mído', amount: `${Math.round(profile.weightKg * 2.2)}g pesado cozido`, category: 'protein', calories: 220, protein: 38, carbs: 0, fat: 5 },
          { name: 'Arroz Branco ou Integral Cozido', amount: `${Math.round(carbGrams * 0.8)}g`, category: 'carb', calories: 200, protein: 4, carbs: 44, fat: 1 },
          { name: 'Feijão Carioca ou Preto Cozido', amount: '1 concha média (100g)', category: 'carb', calories: 75, protein: 5, carbs: 13, fat: 1 },
          { name: 'Azeite de Oliva Extra Virgem', amount: '1 colher de sobremesa (8ml)', category: 'fat', calories: 70, protein: 0, carbs: 0, fat: 8 },
          { name: 'Salada Verde Foliácea (Alface, Rúcula, Espinafre)', amount: 'À vontade', category: 'fiber', calories: 15, protein: 1, carbs: 3, fat: 0 },
        ],
        tips: 'Principal refeição do dia para síntese proteica. Evite bebidas calóricas durante a refeição.',
      },
      {
        id: 'meal-3',
        name: 'Pré-Treino Energético',
        time: '16:00',
        type: 'pre_workout',
        calories: Math.round(targetCalories * 0.20),
        protein: Math.round(proteinGrams * 0.20),
        carbs: Math.round(carbGrams * 0.22),
        fat: Math.round(fatGrams * 0.15),
        foods: [
          { name: 'Banana Prata', amount: '1 a 2 unidades (120g)', category: 'carb', calories: 105, protein: 1, carbs: 27, fat: 0 },
          { name: 'Aveia em Flocos Finos', amount: '2 colheres de sopa (30g)', category: 'carb', calories: 110, protein: 4, carbs: 18, fat: 2 },
          { name: 'Whey Protein (Concentrado ou Isolado)', amount: '1 scoop (30g)', category: 'supplement', calories: 120, protein: 24, carbs: 2, fat: 1 },
          { name: 'Pasta de Amendoim Integral', amount: '1 colher de chá (10g)', category: 'fat', calories: 60, protein: 2, carbs: 2, fat: 5 },
        ],
        tips: 'Consuma de 60 a 90 minutos antes do treino de força para estoques cheios de glicogênio muscular.',
      },
      {
        id: 'meal-4',
        name: 'Jantar do Pós-Treino & Recuperação',
        time: '19:30',
        type: 'dinner',
        calories: Math.round(targetCalories * 0.20),
        protein: Math.round(proteinGrams * 0.22),
        carbs: Math.round(carbGrams * 0.18),
        fat: Math.round(fatGrams * 0.25),
        foods: [
          { name: 'Tilápia, Salmão ou Peito de Frango', amount: '160g grelhado', category: 'protein', calories: 190, protein: 35, carbs: 0, fat: 4 },
          { name: 'Batata Doce ou Inglesa Assada', amount: '150g', category: 'carb', calories: 130, protein: 2, carbs: 30, fat: 0 },
          { name: 'Brócolis ou Cenoura no Vapor', amount: '1 xícara (100g)', category: 'fiber', calories: 35, protein: 3, carbs: 7, fat: 0 },
          { name: 'Castanha do Pará ou Caju', amount: '2 unidades (10g)', category: 'fat', calories: 65, protein: 2, carbs: 2, fat: 6 },
        ],
        tips: 'Excelente densidade nutricional com minerais e gorduras saudáveis para regulação hormonal.',
      },
      {
        id: 'meal-5',
        name: 'Ceia Anti-Catabólica & Sono',
        time: '22:00',
        type: 'supper',
        calories: Math.round(targetCalories * 0.06),
        protein: Math.round(proteinGrams * 0.06),
        carbs: Math.round(carbGrams * 0.03),
        fat: Math.round(fatGrams * 0.10),
        foods: [
          { name: 'Iogurte Natural Proteico ou Abacate', amount: '150g ou 50g de abacate', category: 'protein', calories: 90, protein: 8, carbs: 5, fat: 3 },
          { name: 'Sementes de Chia ou Linhaça', amount: '1 colher de chá (5g)', category: 'fat', calories: 25, protein: 1, carbs: 2, fat: 2 },
        ],
        tips: 'Favorece o sono reparador e a liberação noturna de GH e síntese tecidual.',
      },
    ];
  } else if (preference === 'vegetarian') {
    meals = [
      {
        id: 'meal-1',
        name: 'Café da Manhã Veggie Anabólico',
        time: '07:30',
        type: 'breakfast',
        calories: Math.round(targetCalories * 0.22),
        protein: Math.round(proteinGrams * 0.22),
        carbs: Math.round(carbGrams * 0.22),
        fat: Math.round(fatGrams * 0.20),
        foods: [
          { name: 'Ovos ou Tofu Mexido Temperado', amount: '3 unidades ou 150g de tofu', category: 'protein', calories: 180, protein: 18, carbs: 2, fat: 12 },
          { name: 'Pão de Centeio ou Integral', amount: '2 fatias (50g)', category: 'carb', calories: 120, protein: 4, carbs: 22, fat: 1 },
          { name: 'Pasta de Húmus de Grão de Bico', amount: '1.5 colher de sopa (30g)', category: 'fat', calories: 70, protein: 3, carbs: 6, fat: 4 },
        ],
        tips: 'O Tofu e o Grão de Bico oferecem excelente densidade de aminoácidos com fibras.',
      },
      {
        id: 'meal-2',
        name: 'Almoço Proteico Vegetariano',
        time: '12:30',
        type: 'lunch',
        calories: Math.round(targetCalories * 0.32),
        protein: Math.round(proteinGrams * 0.30),
        carbs: Math.round(carbGrams * 0.35),
        fat: Math.round(fatGrams * 0.30),
        foods: [
          { name: 'Lentilha Cozida ou Grão de Bico', amount: '1 xícara grande (180g)', category: 'protein', calories: 210, protein: 16, carbs: 36, fat: 2 },
          { name: 'Proteína Texturizada de Soja (PTS) Refogada', amount: '100g pronta', category: 'protein', calories: 140, protein: 22, carbs: 8, fat: 1 },
          { name: 'Arroz Integral ou Quinoa Cozida', amount: '1 escumadeira (120g)', category: 'carb', calories: 150, protein: 4, carbs: 30, fat: 2 },
          { name: 'Azeite de Oliva Extra Virgem', amount: '1 colher de sopa (10ml)', category: 'fat', calories: 90, protein: 0, carbs: 0, fat: 10 },
          { name: 'Espinafre & Sementes de Abóbora', amount: '2 colheres de sopa', category: 'fiber', calories: 60, protein: 4, carbs: 2, fat: 5 },
        ],
        tips: 'A combinação Arroz + Lentilha/PTS garante todos os aminoácidos essenciais (Perfil Proteico Completo).',
      },
      {
        id: 'meal-3',
        name: 'Shake/Lanche Veggie Proteico',
        time: '16:00',
        type: 'pre_workout',
        calories: Math.round(targetCalories * 0.20),
        protein: Math.round(proteinGrams * 0.20),
        carbs: Math.round(carbGrams * 0.22),
        fat: Math.round(fatGrams * 0.15),
        foods: [
          { name: 'Proteína Vegetal em Pó (Ervilha + Arroz)', amount: '1 scoop (30g)', category: 'supplement', calories: 120, protein: 24, carbs: 2, fat: 1.5 },
          { name: 'Leite de Amêndoas ou Soja', amount: '200ml', category: 'carb', calories: 70, protein: 4, carbs: 4, fat: 3 },
          { name: 'Banana Prata + Frutas Vermelhas', amount: '150g', category: 'carb', calories: 90, protein: 1, carbs: 22, fat: 0 },
        ],
        tips: 'Excelente digestibilidade sem sobrecarregar o trato gastrointestinal pré-treino.',
      },
      {
        id: 'meal-4',
        name: 'Jantar Vegetariano Flexível',
        time: '19:30',
        type: 'dinner',
        calories: Math.round(targetCalories * 0.20),
        protein: Math.round(proteinGrams * 0.22),
        carbs: Math.round(carbGrams * 0.18),
        fat: Math.round(fatGrams * 0.25),
        foods: [
          { name: 'Omelete de 3 Ovos com Queijo Ricota/Cottage', amount: '200g', category: 'protein', calories: 230, protein: 22, carbs: 3, fat: 14 },
          { name: 'Mandioca ou Batata Doce Cozida', amount: '120g', category: 'carb', calories: 130, protein: 1, carbs: 30, fat: 0 },
          { name: 'Mix de Vegetais (Couve-Flor, Cenoura, Abobrinha)', amount: '1.5 xícara', category: 'fiber', calories: 45, protein: 3, carbs: 9, fat: 0 },
        ],
        tips: 'Rico em colina, minerais e antioxidantes.',
      },
      {
        id: 'meal-5',
        name: 'Ceia com Leite Vegetal & Sementes',
        time: '22:00',
        type: 'supper',
        calories: Math.round(targetCalories * 0.06),
        protein: Math.round(proteinGrams * 0.06),
        carbs: Math.round(carbGrams * 0.03),
        fat: Math.round(fatGrams * 0.10),
        foods: [
          { name: 'Pudim de Chia com Leite de Amêndoas', amount: '1 taça (120g)', category: 'fat', calories: 110, protein: 4, carbs: 6, fat: 7 },
        ],
        tips: 'Ótima fonte de ômega-3 vegetal (ALA) e fibras digestivas.',
      },
    ];
  } else if (preference === 'low_carb') {
    meals = [
      {
        id: 'meal-1',
        name: 'Café Low-Carb Anabólico',
        time: '07:30',
        type: 'breakfast',
        calories: Math.round(targetCalories * 0.22),
        protein: Math.round(proteinGrams * 0.24),
        carbs: Math.round(carbGrams * 0.15),
        fat: Math.round(fatGrams * 0.28),
        foods: [
          { name: 'Ovos com Queijo Parmesão ou Cura', amount: '3 ovos + 20g queijo', category: 'protein', calories: 260, protein: 22, carbs: 1, fat: 18 },
          { name: 'Abacate com Gotas de Limão', amount: '1/3 de unidade (80g)', category: 'fat', calories: 130, protein: 2, carbs: 6, fat: 12 },
          { name: 'Café Preto ou Chá Termogênico', amount: '200ml sem açúcar', category: 'supplement', calories: 5, protein: 0, carbs: 0, fat: 0 },
        ],
        tips: 'Estimula o estado de queima de gordura e mantém a sensibilidade à insulina afiada.',
      },
      {
        id: 'meal-2',
        name: 'Almoço Low-Carb Densidade Máxima',
        time: '12:30',
        type: 'lunch',
        calories: Math.round(targetCalories * 0.32),
        protein: Math.round(proteinGrams * 0.32),
        carbs: Math.round(carbGrams * 0.25),
        fat: Math.round(fatGrams * 0.35),
        foods: [
          { name: 'Corte Bovino Magro (Patinho, Mignon, Alcatra)', amount: '180g pesado pronto', category: 'protein', calories: 280, protein: 42, carbs: 0, fat: 11 },
          { name: 'Arroz de Couve-Flor ou Abobrinha Grelhada', amount: '200g', category: 'fiber', calories: 50, protein: 3, carbs: 8, fat: 0 },
          { name: 'Azeite de Oliva Extra Virgem', amount: '1.5 colher de sopa (15ml)', category: 'fat', calories: 130, protein: 0, carbs: 0, fat: 14 },
          { name: 'Salada de Folhas Escuras com Sementes', amount: 'À vontade', category: 'fiber', calories: 30, protein: 2, carbs: 3, fat: 1 },
        ],
        tips: 'Alta densidade de micronutrientes sem picos de glicemia.',
      },
      {
        id: 'meal-3',
        name: 'Pré-Treino Estratégico (Carboidrato Direcionado)',
        time: '16:00',
        type: 'pre_workout',
        calories: Math.round(targetCalories * 0.20),
        protein: Math.round(proteinGrams * 0.20),
        carbs: Math.round(carbGrams * 0.40),
        fat: Math.round(fatGrams * 0.15),
        foods: [
          { name: 'Morangos ou Frutas Vermelhas', amount: '150g', category: 'carb', calories: 50, protein: 1, carbs: 12, fat: 0 },
          { name: 'Whey Protein Isolado (Low Carb)', amount: '1 scoop (30g)', category: 'supplement', calories: 115, protein: 26, carbs: 1, fat: 0.5 },
          { name: 'Pasta de Amendoim', amount: '1 colher de sopa (15g)', category: 'fat', calories: 90, protein: 4, carbs: 3, fat: 7 },
        ],
        tips: 'Os carboidratos são posicionados estrategicamente ao redor da janela de treino (Targeted Low Carb).',
      },
      {
        id: 'meal-4',
        name: 'Jantar Proteína & Gordura Saudável',
        time: '19:30',
        type: 'dinner',
        calories: Math.round(targetCalories * 0.20),
        protein: Math.round(proteinGrams * 0.20),
        carbs: Math.round(carbGrams * 0.15),
        fat: Math.round(fatGrams * 0.20),
        foods: [
          { name: 'Salmão, Atum ou Frango Grelhado', amount: '170g', category: 'protein', calories: 240, protein: 38, carbs: 0, fat: 9 },
          { name: 'Brócolis Refogado no Alho e Azeite', amount: '1.5 xícara (150g)', category: 'fiber', calories: 80, protein: 4, carbs: 8, fat: 4 },
        ],
        tips: 'Rico em Ômega-3 para atenuar inflamações articulares pós-treino.',
      },
      {
        id: 'meal-5',
        name: 'Ceia com Oleaginosas',
        time: '22:00',
        type: 'supper',
        calories: Math.round(targetCalories * 0.06),
        protein: Math.round(proteinGrams * 0.04),
        carbs: Math.round(carbGrams * 0.05),
        fat: Math.round(fatGrams * 0.12),
        foods: [
          { name: 'Mix de Amêndoas e Castanhas de Caju', amount: '25g', category: 'fat', calories: 150, protein: 5, carbs: 5, fat: 13 },
        ],
        tips: 'Fornece magnésio natural para relaxamento muscular e indução ao sono profundo.',
      },
    ];
  } else if (preference === 'low_cost') {
    meals = [
      {
        id: 'meal-1',
        name: 'Café da Manhã Econômico (Alto Custo-Benefício)',
        time: '07:30',
        type: 'breakfast',
        calories: Math.round(targetCalories * 0.22),
        protein: Math.round(proteinGrams * 0.22),
        carbs: Math.round(carbGrams * 0.22),
        fat: Math.round(fatGrams * 0.20),
        foods: [
          { name: 'Ovos Inteiros Mexidos / Cozidos', amount: '3 unidades (150g)', category: 'protein', calories: 210, protein: 18, carbs: 1, fat: 15 },
          { name: 'Pão Francês ou Pão de Fôrma', amount: '1 pão francês (50g) ou 2 fatias', category: 'carb', calories: 135, protein: 4, carbs: 28, fat: 1 },
          { name: 'Banana Prata', amount: '1 unidade média (90g)', category: 'carb', calories: 80, protein: 1, carbs: 20, fat: 0 },
          { name: 'Leite Integral / Desnatado com Café', amount: '1 copo (200ml)', category: 'protein', calories: 90, protein: 6, carbs: 9, fat: 3 },
        ],
        tips: 'Ovos e leite fornecem proteína completa pelo menor preço do mercado. Sem necessidade de suplementos caros.',
      },
      {
        id: 'meal-2',
        name: 'Almoço Forte & Barato (Arroz + Feijão + Proteína Acessível)',
        time: '12:30',
        type: 'lunch',
        calories: Math.round(targetCalories * 0.32),
        protein: Math.round(proteinGrams * 0.32),
        carbs: Math.round(carbGrams * 0.35),
        fat: Math.round(fatGrams * 0.28),
        foods: [
          { name: 'Sobrecoxa/Coxa de Frango sem Pele ou Sardinha em Lata', amount: '180g cozido/assado ou 1 lata', category: 'protein', calories: 240, protein: 36, carbs: 0, fat: 10 },
          { name: 'Arroz Branco ou Integral', amount: '2 escumadeiras (150g)', category: 'carb', calories: 195, protein: 4, carbs: 42, fat: 1 },
          { name: 'Feijão Carioca ou Preto Cozido', amount: '1 concha cheia (130g)', category: 'carb', calories: 95, protein: 6, carbs: 17, fat: 1 },
          { name: 'Salada Simples da Época (Alface, Tomate, Repolho)', amount: 'À vontade com gotas de limão e 1 fio de óleo', category: 'fiber', calories: 40, protein: 1, carbs: 5, fat: 2 },
        ],
        tips: 'Arroz + Feijão formam aminoácidos completos. A sardinha traz ômega-3 por uma fração do preço do salmão.',
      },
      {
        id: 'meal-3',
        name: 'Lanche Energético de Baixo Custo',
        time: '16:00',
        type: 'pre_workout',
        calories: Math.round(targetCalories * 0.20),
        protein: Math.round(proteinGrams * 0.20),
        carbs: Math.round(carbGrams * 0.22),
        fat: Math.round(fatGrams * 0.18),
        foods: [
          { name: 'Banana Prata Amassada', amount: '1.5 unidade (120g)', category: 'carb', calories: 105, protein: 1, carbs: 27, fat: 0 },
          { name: 'Aveia em Flocos', amount: '2.5 colheres de sopa (35g)', category: 'carb', calories: 130, protein: 5, carbs: 21, fat: 2.5 },
          { name: 'Amendoim Torrado ou Pasta Caseira', amount: '1 colher de sopa (15g)', category: 'fat', calories: 85, protein: 4, carbs: 3, fat: 7 },
        ],
        tips: 'O amendoim e a aveia garantem densidade calórica e proteína vegetal super acessível.',
      },
      {
        id: 'meal-4',
        name: 'Jantar do Atleta Econômico',
        time: '19:30',
        type: 'dinner',
        calories: Math.round(targetCalories * 0.20),
        protein: Math.round(proteinGrams * 0.20),
        carbs: Math.round(carbGrams * 0.18),
        fat: Math.round(fatGrams * 0.24),
        foods: [
          { name: 'Ovos Cozidos / Mexidos ou Moela / Proteína de Soja (PTS)', amount: '3 ovos ou 120g de PTS hidratada', category: 'protein', calories: 210, protein: 22, carbs: 3, fat: 12 },
          { name: 'Mandioca / Aipim ou Batata Cozida', amount: '150g', category: 'carb', calories: 180, protein: 2, carbs: 42, fat: 0 },
          { name: 'Legumes da Estação (Cenoura, Chuchu, Abóbora)', amount: '1 xícara (100g)', category: 'fiber', calories: 35, protein: 1, carbs: 7, fat: 0 },
        ],
        tips: 'Mandioca e batata são carboidratos limpos e muito baratos. Varie os legumes da feira para economizar.',
      },
      {
        id: 'meal-5',
        name: 'Ceia Econômica Recuperadora',
        time: '22:00',
        type: 'supper',
        calories: Math.round(targetCalories * 0.06),
        protein: Math.round(proteinGrams * 0.06),
        carbs: Math.round(carbGrams * 0.03),
        fat: Math.round(fatGrams * 0.10),
        foods: [
          { name: 'Leite Morno com 1 colher de Aveia ou 1 Ovo Cozido', amount: '150ml + 10g aveia', category: 'protein', calories: 100, protein: 7, carbs: 10, fat: 3 },
        ],
        tips: 'Promove saciedade e sono profundo com baixo custo diário.',
      },
    ];
  } else {
    // Practical / Busy Routine
    meals = [
      {
        id: 'meal-1',
        name: 'Vitamina Anabólica Express (3 min)',
        time: '07:30',
        type: 'breakfast',
        calories: Math.round(targetCalories * 0.25),
        protein: Math.round(proteinGrams * 0.25),
        carbs: Math.round(carbGrams * 0.25),
        fat: Math.round(fatGrams * 0.20),
        foods: [
          { name: 'Whey Protein', amount: '1.5 scoop (45g)', category: 'supplement', calories: 180, protein: 36, carbs: 3, fat: 2 },
          { name: 'Leite Desnatado ou Vegetal', amount: '250ml', category: 'carb', calories: 90, protein: 8, carbs: 12, fat: 0 },
          { name: 'Banana Prata Congelada', amount: '1.5 unidade (120g)', category: 'carb', calories: 105, protein: 1, carbs: 27, fat: 0 },
          { name: 'Aveia Instantânea em Flocos', amount: '3 colheres de sopa (40g)', category: 'carb', calories: 150, protein: 5, carbs: 25, fat: 3 },
        ],
        tips: 'Bata tudo no liquidificador em 2 minutos. Perfeito para quem tem rotina corrida pela manhã.',
      },
      {
        id: 'meal-2',
        name: 'Marmita Prática Fitness',
        time: '12:30',
        type: 'lunch',
        calories: Math.round(targetCalories * 0.32),
        protein: Math.round(proteinGrams * 0.32),
        carbs: Math.round(carbGrams * 0.32),
        fat: Math.round(fatGrams * 0.30),
        foods: [
          { name: 'Peito de Frango Desfiado ou Carne Mída', amount: '160g pronto', category: 'protein', calories: 220, protein: 38, carbs: 0, fat: 6 },
          { name: 'Arroz com Seleta de Legumes', amount: '150g', category: 'carb', calories: 200, protein: 4, carbs: 42, fat: 1 },
          { name: 'Feijão Pronto', amount: '1 concha (100g)', category: 'carb', calories: 75, protein: 5, carbs: 13, fat: 1 },
          { name: 'Azeite de Oliva', amount: '1 colher de sobremesa (8ml)', category: 'fat', calories: 70, protein: 0, carbs: 0, fat: 8 },
        ],
        tips: 'Pode ser congelado em potes livre de BPA no domingo para a semana inteira.',
      },
      {
        id: 'meal-3',
        name: 'Sanduíche Proteico de Frango ou Ovos',
        time: '16:00',
        type: 'pre_workout',
        calories: Math.round(targetCalories * 0.20),
        protein: Math.round(proteinGrams * 0.20),
        carbs: Math.round(carbGrams * 0.22),
        fat: Math.round(fatGrams * 0.20),
        foods: [
          { name: 'Pão Integral', amount: '2 fatias (50g)', category: 'carb', calories: 120, protein: 4, carbs: 22, fat: 1 },
          { name: 'Atum em Lata ao Natural ou Frango Desfiado', amount: '1 lata ou 100g', category: 'protein', calories: 120, protein: 26, carbs: 0, fat: 1 },
          { name: 'Requeijão Light ou Cottage', amount: '1 colher de sopa (30g)', category: 'fat', calories: 45, protein: 3, carbs: 2, fat: 2.5 },
        ],
        tips: 'Fácil de levar na mochila para comer no trabalho ou faculdade antes do treino.',
      },
      {
        id: 'meal-4',
        name: 'Jantar Prático / Omeletão Rápido',
        time: '19:30',
        type: 'dinner',
        calories: Math.round(targetCalories * 0.18),
        protein: Math.round(proteinGrams * 0.18),
        carbs: Math.round(carbGrams * 0.18),
        fat: Math.round(fatGrams * 0.22),
        foods: [
          { name: 'Ovos Inteiros + Claras', amount: '3 ovos + 2 claras', category: 'protein', calories: 230, protein: 25, carbs: 2, fat: 14 },
          { name: 'Batata Inglesa / Doce em Cubos Airfryer', amount: '150g', category: 'carb', calories: 130, protein: 2, carbs: 29, fat: 0 },
          { name: 'Tomate, Orégano e Espinafre', amount: 'À vontade', category: 'fiber', calories: 25, protein: 1, carbs: 4, fat: 0 },
        ],
        tips: 'Preparo na frigideira antiaderente ou airfryer em 10 minutos.',
      },
      {
        id: 'meal-5',
        name: 'Ceia Instantânea',
        time: '22:00',
        type: 'supper',
        calories: Math.round(targetCalories * 0.05),
        protein: Math.round(proteinGrams * 0.05),
        carbs: Math.round(carbGrams * 0.03),
        fat: Math.round(fatGrams * 0.08),
        foods: [
          { name: 'Iogurte Grego Light ou Proteico', amount: '1 pote (140g)', category: 'protein', calories: 90, protein: 10, carbs: 6, fat: 2 },
        ],
        tips: 'Zero preparo e alta saciedade antes de dormir.',
      },
    ];
  }

  return {
    metrics,
    preference,
    goal,
    meals,
  };
}

// 3. Complete Database of Equivalents Food Substitutions
export const FOOD_SUBSTITUTIONS_DATABASE: SubstitutionGroup[] = [
  {
    category: 'carb',
    title: 'Fontes de Carboidratos (Base: 100g de Arroz Branco Cozido = ~28g Carb)',
    baseFood: '100g de Arroz Branco ou Integral Cozido',
    equivalents: [
      { foodName: 'Arroz Branco / Integral Cozido', portion: '100g', notes: '🏆 [Baixo Custo] Base clássica, digestão limpa e barata' },
      { foodName: 'Mandioca / Aipim Cozido', portion: '90g', notes: '🏆 [Baixo Custo] Excelente fonte de energia densa de feira' },
      { foodName: 'Batata Inglesa Cozida / Airfryer', portion: '160g', notes: '💰 [Baixo Custo] Maior volume de comida para mesma quantidade de carbo' },
      { foodName: 'Batata Doce Cozida / Assada', portion: '130g', notes: '💰 [Baixo Custo] Menor índice glicêmico e rica em fibras' },
      { foodName: 'Macarrão de Sêmola / Integral', portion: '90g', notes: '💰 [Baixo Custo] Muito barato e rápido de preparar' },
      { foodName: 'Aveia em Flocos', portion: '40g (3 colheres de sopa)', notes: '🏆 [Baixo Custo] Proteína + fibras com alto rendimento' },
      { foodName: 'Banana Prata / Caturra', portion: '1.5 unidade média (120g)', notes: '🏆 [Baixo Custo] Fruta mais barata e rica em potássio' },
      { foodName: 'Pão Francês ou Integral', portion: '1 pão (50g) ou 2 fatias', notes: '💰 Prático e muito acessível' },
    ],
  },
  {
    category: 'protein',
    title: 'Fontes de Proteínas de Alto Valor Biológico (Base: 100g Peito de Frango Cozido = ~31g Proteína)',
    baseFood: '100g de Peito de Frango Grelhado / Desfiado',
    equivalents: [
      { foodName: 'Ovos Inteiros de Galinha', portion: '3 unidades grandes', notes: '🏆 [Campeão de Economia] Proteína padrão ouro pelo menor valor/grama' },
      { foodName: 'Sardinha em Lata (em água/óleo)', portion: '1 lata (120g)', notes: '🏆 [Super Alimento Barato] Rica em Ômega-3 e Cálcio por ~1/4 do preço do salmão' },
      { foodName: 'Sobrecoxa / Coxa de Frango sem Pele', portion: '130g assada/cozida', notes: '💰 [Baixo Custo] Muito mais barata e suculenta que peito de frango' },
      { foodName: 'Proteína Texturizada de Soja (PTS)', portion: '60g seca (ou 150g hidratada)', notes: '🏆 [Mais Barata do Mercado] Proteína vegetal 100% completa' },
      { foodName: 'Leite Integral ou Desnatado', portion: '350ml (1.5 copo)', notes: '💰 Fonte barata de proteína e cálcio diário' },
      { foodName: 'Atum em Lata / Moela de Frango', portion: '100g', notes: '💰 Alta densidade proteica com orçamento controlado' },
      { foodName: 'Feijão + Arroz (Combinação)', portion: '1.5 concha de feijão + 100g arroz', notes: '🏆 Proteína vegetal completa e histórica' },
      { foodName: 'Patinho / Carne Bovino Magra', portion: '110g grelhado', notes: 'Opção de carne vermelha com ferro e creatina' },
      { foodName: 'Whey Protein Concentrado', portion: '32g (1 scoop)', notes: 'Prático, mas não indispensável se comer ovos e leite' },
    ],
  },
  {
    category: 'fat',
    title: 'Fontes de Gorduras Saudáveis (Base: 10ml de Azeite de Oliva = ~10g Gordura)',
    baseFood: '1 colher de sopa (10ml) de Azeite de Oliva Extra Virgem',
    equivalents: [
      { foodName: 'Amendoim Torrado Sem Sal', portion: '20g (pequeno punhado)', notes: '🏆 [Baixo Custo] Gorduras boas e proteína pelo menor custo' },
      { foodName: 'Pasta de Amendoim Caseira / Integral', portion: '20g (1 colher de sopa)', notes: '🏆 [Baixo Custo] Fácil de fazer em casa no multiprocessador' },
      { foodName: 'Gema de Ovo (nos Ovos Inteiros)', portion: '2 gemas', notes: '🏆 [Inclusa no Ovo] Nutrientes, colina e gorduras boas já inclusas' },
      { foodName: 'Óleo de Soja / Girassol com moderação', portion: '1 colher de sobremesa (8ml)', notes: '💰 Economia máxima para cozinhar' },
      { foodName: 'Abacate / Avocado', portion: '70g', notes: '💰 Comprar da época na feira livre' },
      { foodName: 'Castanha do Pará / Caju', portion: '2 a 3 unidades (15g)', notes: 'Comprar a granel para economizar' },
    ],
  },
  {
    category: 'fiber',
    title: 'Vegetais & Fibras de Baixa Caloria (Mínimo 300g/dia - Compre os da época!)',
    baseFood: 'Prato de Salada Foliácea e Legumes',
    equivalents: [
      { foodName: 'Repolho Verde / Roxo Ralado', portion: '150g', notes: '🏆 [Baixo Custo] Rende muito, dura semanas na geladeira' },
      { foodName: 'Cenoura Ralada', portion: '100g', notes: '🏆 [Baixo Custo] Rica em betacaroteno e super acessível' },
      { foodName: 'Alface Crespa / Americana', portion: 'À vontade', notes: '💰 Fonte clássica de hidratação e fibras' },
      { foodName: 'Chuchu / Abóbora / Beterraba', portion: '150g cozidos', notes: '💰 Legumes de feira muito econômicos' },
      { foodName: 'Brócolis / Couve-Flor', portion: '150g', notes: 'Ricos em sulforafano e fibras' },
    ],
  },
];
