import React, { useState, useEffect } from 'react';
import { UserProfile, FullBodyProgram } from '../types';
import { 
  DietGoal, 
  DietPreference, 
  generateMealPlan, 
  FOOD_SUBSTITUTIONS_DATABASE, 
  Meal, 
  FoodItem,
  StructuredDietPlan 
} from '../engine/dietEngine';
import { generateFullBodyWorkout } from '../engine/workoutEngine';
import { askAICoach } from '../engine/aiCoachEngine';
import { exportPlanToPDF } from '../services/pdfExporter';
import { 
  Apple, 
  Flame, 
  Sparkles, 
  CheckCircle, 
  Droplet, 
  Clock, 
  Search, 
  RefreshCw, 
  Utensils, 
  Bot, 
  Info, 
  ChevronRight, 
  MessageSquare, 
  Send, 
  ListCheck, 
  Zap,
  Check,
  Coins,
  PiggyBank,
  UserCheck,
  Dumbbell,
  ShieldAlert,
  FileDown
} from 'lucide-react';

interface FlexibleDietViewProps {
  userProfile: UserProfile;
  program?: FullBodyProgram;
}

export const FlexibleDietView: React.FC<FlexibleDietViewProps> = ({ userProfile, program }) => {
  const [goal, setGoal] = useState<DietGoal>(
    userProfile.objective === 'fat_loss' ? 'cutting' : 'hypertrophy'
  );
  const [preference, setPreference] = useState<DietPreference>('traditional');
  const [activeTab, setActiveTab] = useState<'menu' | 'substitutions' | 'tracker' | 'low_cost_guide' | 'ai_nutri'>('menu');

  // Search filter for food substitution table
  const [searchTerm, setSearchTerm] = useState('');

  // Daily Meal Check-in Tracker State
  const [completedMeals, setCompletedMeals] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('athleta_completed_meals');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Water Tracker State
  const [waterGlasses, setWaterGlasses] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('athleta_water_glasses');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // AI Nutri Chat
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Selected food substitution modal
  const [selectedFoodModal, setSelectedFoodModal] = useState<FoodItem | null>(null);

  useEffect(() => {
    localStorage.setItem('athleta_completed_meals', JSON.stringify(completedMeals));
  }, [completedMeals]);

  useEffect(() => {
    localStorage.setItem('athleta_water_glasses', waterGlasses.toString());
  }, [waterGlasses]);

  // Generate Plan from Engine based on current profile, goal and preference
  const plan: StructuredDietPlan = generateMealPlan(userProfile, goal, preference);
  const { metrics, meals } = plan;

  const toggleMealCompleted = (mealId: string) => {
    setCompletedMeals((prev) => ({
      ...prev,
      [mealId]: !prev[mealId],
    }));
  };

  const completedCount = meals.filter((m) => completedMeals[m.id]).length;
  const progressPercent = Math.round((completedCount / meals.length) * 100);

  const totalTargetGlasses = Math.ceil((metrics.waterLiters * 1000) / 350); // ~350ml per glass

  const handleAskAiCoach = async (questionPrompt?: string) => {
    const promptToSend = questionPrompt || aiQuery;
    if (!promptToSend.trim()) return;

    setIsLoadingAi(true);
    setAiResponse(null);

    try {
      const responseText = await askAICoach(
        `${promptToSend} (Contexto Dieta Flexível: Meta=${goal}, Preferência=${preference}, MetaCalorias=${metrics.targetCalories}kcal, Proteína=${metrics.proteinGrams}g, Carboidrato=${metrics.carbGrams}g, Gordura=${metrics.fatGrams}g)`,
        userProfile
      );
      setAiResponse(responseText || 'Não foi possível gerar uma resposta no momento. Tente novamente.');
    } catch {
      setAiResponse('Erro ao conectar com o AI Nutri-Coach. Verifique sua conexão.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
              <Apple className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  NutriFlux Engine — Engenharia Metabólica
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                  NUTRIFLUX IIFYM
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Plano de Nutrição para <strong className="text-white">{userProfile.name}</strong> • {userProfile.weightKg}kg • {userProfile.heightCm}cm
              </p>
            </div>
          </div>

          {/* Actions & Goal Selector */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              onClick={() => {
                const activeProgram = program || generateFullBodyWorkout(userProfile);
                exportPlanToPDF({
                  program: activeProgram,
                  userProfile,
                  dietPlan: plan
                });
              }}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              title="Baixar Relatório Completo em PDF"
            >
              <FileDown className="h-4 w-4" />
              <span>Exportar PDF</span>
            </button>

            <div className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1">
              <button
                onClick={() => setGoal('hypertrophy')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  goal === 'hypertrophy'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hipertrofia (+350 kcal)
              </button>
              <button
                onClick={() => setGoal('cutting')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  goal === 'cutting'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Emagrecimento (-450 kcal)
              </button>
              <button
                onClick={() => setGoal('maintenance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  goal === 'maintenance'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Manutenção (TDEE)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Target Macros Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Calories */}
        <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold mb-1">
            <span>META DIÁRIA</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">{metrics.targetCalories} <span className="text-xs text-slate-400 font-sans font-normal">kcal</span></div>
          <p className="text-[10px] text-slate-400 mt-1">
            TMB: {metrics.bmr} | GET: {metrics.tdee} kcal
          </p>
        </div>

        {/* Protein */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold mb-1">
            <span>PROTEÍNA</span>
            <span className="text-emerald-400 font-mono text-[11px]">{metrics.proteinPerKg}g/kg</span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{metrics.proteinGrams}g</div>
          <p className="text-[10px] text-slate-400 mt-1">{metrics.proteinCalories} kcal (40%)</p>
        </div>

        {/* Carbs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold mb-1">
            <span>CARBOIDRATOS</span>
            <span className="text-cyan-400 font-mono text-[11px]">{metrics.carbPerKg}g/kg</span>
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">{metrics.carbGrams}g</div>
          <p className="text-[10px] text-slate-400 mt-1">{metrics.carbCalories} kcal (45%)</p>
        </div>

        {/* Fats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold mb-1">
            <span>GORDURAS</span>
            <span className="text-amber-400 font-mono text-[11px]">{metrics.fatPerKg}g/kg</span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{metrics.fatGrams}g</div>
          <p className="text-[10px] text-slate-400 mt-1">{metrics.fatCalories} kcal (15%)</p>
        </div>

        {/* Water */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold mb-1">
            <span>HIDRATAÇÃO</span>
            <Droplet className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">{metrics.waterLiters}L</div>
          <p className="text-[10px] text-slate-400 mt-1">Fibras: {metrics.fiberGrams}g/dia</p>
        </div>
      </div>

      {/* Main Tab Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Utensils className="h-4 w-4" />
            <span>Cardápio & Refeições</span>
          </button>

          <button
            onClick={() => setActiveTab('substitutions')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'substitutions'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Tabela de Substituições</span>
          </button>

          <button
            onClick={() => setActiveTab('low_cost_guide')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'low_cost_guide'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Coins className="h-4 w-4 text-amber-400" />
            <span>Guia Baixo Custo</span>
          </button>

          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'tracker'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <ListCheck className="h-4 w-4" />
            <span>Check-in & Hidratação</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_nutri')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'ai_nutri'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Bot className="h-4 w-4 text-emerald-400" />
            <span>AI Nutri-Coach</span>
          </button>
        </div>

        {/* Dietary Preference Selector */}
        {activeTab === 'menu' && (
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <span className="text-[11px] font-bold text-slate-400 pl-2 hidden sm:inline">Estilo:</span>
            <button
              onClick={() => setPreference('traditional')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                preference === 'traditional'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🥩 Tradicional
            </button>
            <button
              onClick={() => setPreference('vegetarian')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                preference === 'vegetarian'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🥗 Vegetariana
            </button>
            <button
              onClick={() => setPreference('low_carb')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                preference === 'low_carb'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🥑 Low Carb
            </button>
            <button
              onClick={() => setPreference('practical')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                preference === 'practical'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡ Prática
            </button>
            <button
              onClick={() => setPreference('low_cost')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                preference === 'low_cost'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💰 Baixo Custo
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: CARDÁPIO COMPLETO E REFEIÇÕES */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {/* Progress overview */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                {completedCount}/{meals.length}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Progresso de Alimentação do Dia</h4>
                <p className="text-[11px] text-slate-400">{progressPercent}% das refeições marcadas como concluídas</p>
              </div>
            </div>

            <div className="w-full sm:w-64 bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Meals List */}
          <div className="space-y-4">
            {meals.map((meal) => {
              const isDone = !!completedMeals[meal.id];

              return (
                <div
                  key={meal.id}
                  className={`bg-slate-900 border rounded-3xl p-5 sm:p-6 transition-all shadow-lg relative overflow-hidden ${
                    isDone
                      ? 'border-emerald-500/40 bg-slate-900/60'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleMealCompleted(meal.id)}
                        className={`h-7 w-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isDone
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                        }`}
                        title={isDone ? 'Desmarcar' : 'Marcar como concluída'}
                      >
                        {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : <Clock className="h-3.5 w-3.5" />}
                      </button>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {meal.time}
                          </span>
                          <h3 className={`text-base font-bold text-white ${isDone ? 'line-through text-slate-400' : ''}`}>
                            {meal.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Meal Macro Badge */}
                    <div className="flex items-center space-x-3 text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto font-mono">
                      <span className="text-white font-bold">{meal.calories} kcal</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-emerald-400">P: {meal.protein}g</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-cyan-400">C: {meal.carbs}g</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-400">G: {meal.fat}g</span>
                    </div>
                  </div>

                  {/* Meal Foods List */}
                  <div className="mt-4 space-y-2.5">
                    {meal.foods.map((food, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-950/60 hover:bg-slate-950 p-3 rounded-2xl border border-slate-800/80 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              food.category === 'protein'
                                ? 'bg-emerald-400'
                                : food.category === 'carb'
                                ? 'bg-cyan-400'
                                : food.category === 'fat'
                                ? 'bg-amber-400'
                                : 'bg-purple-400'
                            }`}
                          ></span>

                          <div>
                            <span className="text-xs font-bold text-slate-200">{food.name}</span>
                            <span className="text-[11px] text-emerald-400 ml-2 font-mono font-semibold">
                              ({food.amount})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="text-[10px] text-slate-400 font-mono hidden sm:block">
                            {food.calories} kcal | P: {food.protein}g | C: {food.carbs}g | G: {food.fat}g
                          </div>

                          <button
                            onClick={() => setSelectedFoodModal(food)}
                            className="text-[11px] text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded-lg border border-slate-800 transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Substituir</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Meal Tip */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-start space-x-2 text-[11px] text-slate-400">
                    <Info className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Dica do Nutri: {meal.tips}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TABELA DE SUBSTITUIÇÕES EQUIVALENTES */}
      {activeTab === 'substitutions' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-emerald-400" />
                  Guia Rápido de Substituições Isocalóricas
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Troque alimentos da sua refeição mantendo exatamente os mesmos macronutrientes da sua meta diária.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar alimento (ex: Batata, Frango, Ovo)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-6">
              {FOOD_SUBSTITUTIONS_DATABASE.map((group, groupIdx) => {
                const filteredEquivalents = group.equivalents.filter(
                  (item) =>
                    item.foodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    group.baseFood.toLowerCase().includes(searchTerm.toLowerCase())
                );

                if (searchTerm && filteredEquivalents.length === 0) return null;

                return (
                  <div key={groupIdx} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            group.category === 'protein'
                              ? 'bg-emerald-400'
                              : group.category === 'carb'
                              ? 'bg-cyan-400'
                              : group.category === 'fat'
                              ? 'bg-amber-400'
                              : 'bg-purple-400'
                          }`}
                        ></span>
                        {group.title}
                      </h4>
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        Padrão: {group.baseFood}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredEquivalents.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="bg-slate-900/90 hover:bg-slate-900 p-3.5 rounded-xl border border-slate-800/80 flex items-start justify-between space-x-3 transition-all"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-100">{item.foodName}</div>
                            {item.notes && <p className="text-[11px] text-slate-400 mt-0.5">{item.notes}</p>}
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                            {item.portion}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHECK-IN & HIDRATAÇÃO */}
      {activeTab === 'tracker' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Water Counter Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Droplet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registro de Ingestão de Água</h3>
                  <p className="text-xs text-slate-400">Meta: {metrics.waterLiters}L (40ml por kg corporal)</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20">
                {((waterGlasses * 350) / 1000).toFixed(1)}L / {metrics.waterLiters}L
              </span>
            </div>

            {/* Glass Visual Buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
              {Array.from({ length: totalTargetGlasses }).map((_, idx) => {
                const isFilled = idx < waterGlasses;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isFilled && idx === waterGlasses - 1) {
                        setWaterGlasses(idx);
                      } else {
                        setWaterGlasses(idx + 1);
                      }
                    }}
                    className={`py-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                      isFilled
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-md shadow-blue-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700'
                    }`}
                  >
                    <Droplet className={`h-5 w-5 ${isFilled ? 'fill-blue-400' : ''}`} />
                    <span className="text-[10px] font-mono mt-1 font-bold">350ml</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setWaterGlasses((prev) => Math.max(0, prev - 1))}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl border border-slate-800 cursor-pointer"
              >
                - 1 Copo
              </button>
              <button
                onClick={() => setWaterGlasses((prev) => Math.min(totalTargetGlasses + 4, prev + 1))}
                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                + 1 Copo (350ml)
              </button>
            </div>
          </div>

          {/* Daily Nutrition Checklist Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              Checklist de Hábitos Nutricionais
            </h3>

            <div className="space-y-3">
              {meals.map((meal) => {
                const isDone = !!completedMeals[meal.id];
                return (
                  <div
                    key={meal.id}
                    onClick={() => toggleMealCompleted(meal.id)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isDone
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`h-5 w-5 rounded-md flex items-center justify-center border ${
                          isDone ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700'
                        }`}
                      >
                        {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold">{meal.name} ({meal.time})</span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">{meal.calories} kcal</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GUIA DE ALIMENTAÇÃO DE BAIXO CUSTO */}
      {activeTab === 'low_cost_guide' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-[#0b1329] border border-amber-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <PiggyBank className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Guia de Alimentação Saudável de Baixo Custo</h3>
                <p className="text-xs text-slate-400">
                  Comida de verdade, resultados de alto nível e economia no bolso sem gastar dinheiro com suplementos caros.
                </p>
              </div>
            </div>
          </div>

          {/* Core Principles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center space-x-3 text-emerald-400 font-bold text-sm">
                <Apple className="h-5 w-5" />
                <span>1. Base Fundamental da Alimentação</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">🍚 Carboidratos:</span> Fornecem energia limpa para treinos e tarefas diárias.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">💪 Proteínas:</span> Constroem, reparam músculos e promovem saciedade.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">🥜 Gorduras Boas:</span> Essenciais para regulação hormonal e absorção de vitaminas.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">💧 Água:</span> O suplemento universal e gratuito mais potente do seu corpo.
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center space-x-3 text-amber-400 font-bold text-sm">
                <Coins className="h-5 w-5" />
                <span>2. Comida de Verdade {'>'} Suplementos Caros</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Você <strong className="text-white">NÃO precisa</strong> de whey protein de marca, cápsulas caros ou produtos com rótulo "fitness". 
                Os mesmos macronutrientes estão presentes em alimentos tradicionais por uma fração do preço.
              </p>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-[11px] text-amber-300/90 font-medium">
                💡 Dica Ouro: 3 ovos inteiros + 200ml de leite entregam cerca de 24g de proteína com o mesmo valor biológico do Whey, custando bem menos.
              </div>
            </div>
          </div>

          {/* Athletes vs Regular People Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Athletes Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">🏃‍♂️ Dieta Baixo Custo para ATLETAS</h4>
                    <p className="text-[11px] text-slate-400">Mais calorias, alta proteína e recuperação muscular</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  Performance
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <h5 className="font-bold text-emerald-400 mb-1.5 flex items-center gap-1">
                    💪 Proteínas Baratas & Eficientes:
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                    <span className="bg-slate-950 p-2 rounded-xl border border-slate-800">✅ Ovos (Custo-benefício #1)</span>
                    <span className="bg-slate-950 p-2 rounded-xl border border-slate-800">✅ Sardinha em Lata (Ômega-3)</span>
                    <span className="bg-slate-950 p-2 rounded-xl border border-slate-800">✅ Coxa / Sobrecoxa de Frango</span>
                    <span className="bg-slate-950 p-2 rounded-xl border border-slate-800">✅ Proteína de Soja (PTS)</span>
                    <span className="bg-slate-950 p-2 rounded-xl border border-slate-800">✅ Feijão e Lentilha</span>
                    <span className="bg-slate-950 p-2 rounded-xl border border-slate-800">✅ Leite Integral/Desnatado</span>
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-cyan-400 mb-1.5 flex items-center gap-1">
                    🍚 Carboidratos Baratos (Energia):
                  </h5>
                  <p className="text-slate-300 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    Arroz branco/integral, Macarrão, Batata doce/inglesa, Mandioca/Aipim, Aveia em flocos e Banana prata.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-amber-400 mb-1.5 flex items-center gap-1">
                    🥜 Gorduras Boas Acessíveis:
                  </h5>
                  <p className="text-slate-300 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    Amendoim torrado sem sal, Pasta de amendoim caseira, Gemas de ovos e Óleo de soja/girassol.
                  </p>
                </div>
              </div>
            </div>

            {/* Regular People Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">🧍 Dieta Baixo Custo para PESSOA COMUM</h4>
                    <p className="text-[11px] text-slate-400">Manter peso, emagrecer com saúde e saciedade</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg border border-blue-500/20">
                  Saúde
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <span className="font-bold text-blue-400">🔑 Foco Principal:</span>
                  <p className="text-[11px] text-slate-300">
                    Comer menos produtos industrializados, controlar o tamanho das porções e aumentar o consumo de fibras (verduras e legumes).
                  </p>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-white text-xs">🍽 Modelo Simples de Prato Econômico:</h5>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between">
                      <span className="font-bold text-slate-200">Café da Manhã:</span>
                      <span className="text-slate-400">Café + 2 Ovos ou Pão + Fruta da época</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between">
                      <span className="font-bold text-slate-200">Almoço:</span>
                      <span className="text-slate-400">50% Prato de Verduras + Arroz + Feijão + Ovos/Frango</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between">
                      <span className="font-bold text-slate-200">Jantar:</span>
                      <span className="text-slate-400">Parecido com almoço em menor quantidade</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Tips & Mistakes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Dicas Práticas para Economizar no Mercado
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">✅ Comprar legumes e frutas da época na feira livre</li>
                <li className="flex items-center gap-2">✅ Comprar grãos (arroz, feijão, aveia) e ovos em atacado</li>
                <li className="flex items-center gap-2">✅ Cozinhar em grande quantidade no fim de semana (marmita)</li>
                <li className="flex items-center gap-2">✅ Evitar refrigerantes, doces e ultraprocessados</li>
                <li className="flex items-center gap-2">✅ Substituir Whey por ovos ou leite tradicional</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-rose-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Erros Comuns que Custam Caro
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">❌ Gastar dinheiro com suplementos sem necessidade básica</li>
                <li className="flex items-center gap-2">❌ Comer pouco demais achando que emagrece (prejudica a saúde)</li>
                <li className="flex items-center gap-2">❌ Cortar completamente o carboidrato (certo para falhar no treino)</li>
                <li className="flex items-center gap-2">❌ Comprar produtos fit industrializados com preços inflados</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AI NUTRI-COACH CHAT */}
      {activeTab === 'ai_nutri' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Nutri-Coach Esportivo Gemini</h3>
              <p className="text-xs text-slate-400">
                Tire dúvidas sobre dietas, substituição de alimentos, alimentação de baixo custo e suplementação
              </p>
            </div>
          </div>

          {/* Quick Preset Prompt Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAskAiCoach('Monte um plano alimentar de baixo custo para atletas focado em ovos, frango e banana.')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs rounded-xl border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1"
            >
              💰 Plano Baixo Custo para Atleta
            </button>
            <button
              onClick={() => handleAskAiCoach('Como substituir o Whey Protein por ovos e leite mantendo as proteínas?')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs rounded-xl border border-slate-800 transition-colors cursor-pointer"
            >
              🥚 Como trocar Whey por Ovos/Leite?
            </button>
            <button
              onClick={() => handleAskAiCoach('Quais são os melhores pratos econômicos com Sardinha em lata e Proteína de Soja (PTS)?')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs rounded-xl border border-slate-800 transition-colors cursor-pointer"
            >
              🐟 Receitas com Sardinha e Soja (PTS)
            </button>
            <button
              onClick={() => handleAskAiCoach('Como montar marmitas econômicas para a semana inteira gastando pouco?')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs rounded-xl border border-slate-800 transition-colors cursor-pointer"
            >
              📦 Marmitas Baratas para a Semana
            </button>
          </div>

          {/* Prompt Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAiCoach()}
              placeholder="Pergunte ao AI Nutri-Coach (ex: Posso trocar arroz por tapioca no pré-treino?)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => handleAskAiCoach()}
              disabled={isLoadingAi}
              className="px-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition-all cursor-pointer shrink-0"
            >
              {isLoadingAi ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Perguntar</span>
            </button>
          </div>

          {/* AI Response Display */}
          {aiResponse && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2 animate-fadeIn">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                <Sparkles className="h-4 w-4" />
                <span>Resposta do AI Nutri-Coach:</span>
              </div>
              <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                {aiResponse}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Substitution Modal */}
      {selectedFoodModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-emerald-400" />
                Opções de Substituição
              </h3>
              <button
                onClick={() => setSelectedFoodModal(null)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-300">
                Alimento atual: <strong className="text-emerald-400">{selectedFoodModal.name}</strong> ({selectedFoodModal.amount})
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Substitutos Equivalentes Recomendados:</p>
              {FOOD_SUBSTITUTIONS_DATABASE.find((g) => g.category === selectedFoodModal.category)?.equivalents.map((item, idx) => (
                <div key={idx} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-200 font-semibold">{item.foodName}</span>
                  <span className="text-emerald-400 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {item.portion}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedFoodModal(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
