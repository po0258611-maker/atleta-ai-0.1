import React, { useState } from 'react';
import { 
  Sparkles, 
  User, 
  Dumbbell, 
  Building2, 
  ArrowRight, 
  ChevronLeft, 
  Check, 
  ShieldCheck 
} from 'lucide-react';
import { UserProfile, WorkoutGoal, GymEnvironment } from '../types';

interface OnboardingWizardProps {
  initialName?: string;
  onComplete: (profile: UserProfile, role: 'atleta' | 'personal' | 'academia') => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialName = '',
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<'atleta' | 'personal' | 'academia'>('atleta');

  // Form states
  const [name, setName] = useState(initialName || 'Atleta PRO');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [age, setAge] = useState(28);
  const [weight, setWeight] = useState(78);
  const [height, setHeight] = useState(175);
  const [goal, setGoal] = useState<WorkoutGoal>('hypertrophy');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [availableDays, setAvailableDays] = useState<3 | 4 | 5 | 6>(4);
  const [environment, setEnvironment] = useState<GymEnvironment>('full_gym');

  const handleFinish = () => {
    const newProfile: UserProfile = {
      name,
      gender: sex === 'M' ? 'male' : 'female',
      age,
      weightKg: weight,
      heightCm: height,
      objective: goal,
      experience: level,
      availableDays: (availableDays > 5 ? 5 : availableDays) as 2 | 3 | 4 | 5,
      environment,
      timePerSessionMin: 60,
      priorities: [],
      limitations: [],
      forbiddenExercises: [],
      sleepHours: 7.5,
      stressLevel: 'moderate',
    };
    onComplete(newProfile, selectedRole);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0f0f12] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Primeiro Acesso • Calibração Inicial
              </h2>
              <p className="text-xs text-zinc-400 font-medium">Passo {step} de 3</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-24 h-2 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-rose-600 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Profile Role & Basic Info */}
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">1. Qual a sua função principal no Athleta AI?</h3>
              <p className="text-xs text-zinc-400 font-medium">A plataforma vai se personalizar para o seu perfil.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('atleta')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 ${
                  selectedRole === 'atleta'
                    ? 'bg-rose-500/15 border-rose-500 text-white shadow-lg shadow-rose-600/15'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <User className="h-6 w-6 text-rose-400" />
                <div>
                  <div className="text-xs font-bold text-white">Aluno / Atleta</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-medium">Treinos individuais e dieta flexível</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('personal')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 ${
                  selectedRole === 'personal'
                    ? 'bg-rose-500/15 border-rose-500 text-white shadow-lg shadow-rose-600/15'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Dumbbell className="h-6 w-6 text-rose-400" />
                <div>
                  <div className="text-xs font-bold text-white">Personal Trainer</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-medium">Prescrição rápida para múltiplos alunos</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('academia')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 ${
                  selectedRole === 'academia'
                    ? 'bg-rose-500/15 border-rose-500 text-white shadow-lg shadow-rose-600/15'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Building2 className="h-6 w-6 text-rose-400" />
                <div>
                  <div className="text-xs font-bold text-white">Academia / Gestor</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-medium">Padronização e suporte aos instrutores</div>
                </div>
              </button>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-bold text-zinc-300">Seu Nome ou Apelido:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <span>Próximo Passo</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Biometrics & Anthropometrics */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">2. Dados Biométricos Iniciais</h3>
              <p className="text-xs text-zinc-400 font-medium">Usados pelo motor científico para calcular a Taxa Metabólica Basal (Harris-Benedict).</p>
            </div>

            {/* Sex Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Sexo Biométrico:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSex('M')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    sex === 'M'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Masculino
                </button>
                <button
                  type="button"
                  onClick={() => setSex('F')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    sex === 'F'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Feminino
                </button>
              </div>
            </div>

            {/* Age, Weight, Height */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Idade (anos):</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Peso (kg):</label>
                <input
                  type="number"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Altura (cm):</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <span>Próximo Passo</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Goals & Training Environment */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">3. Objetivos & Rotina de Treino</h3>
              <p className="text-xs text-zinc-400 font-medium">Define a distribuição de séries Fullbody e estímulo de hipertrofia.</p>
            </div>

            {/* Goal */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Objetivo Principal:</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as WorkoutGoal)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="hypertrophy">Hipertrofia Muscular (Ganho de Massa)</option>
                <option value="fat_loss">Perda de Gordura / Definição</option>
                <option value="recomposition">Recomposição Corporal</option>
                <option value="strength">Força Bruta & Tensão Mecânica</option>
                <option value="health">Saúde & Longevidade</option>
              </select>
            </div>

            {/* Experience Level & Available Days */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Nível de Experiência:</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="beginner">Iniciante (Menos de 1 ano)</option>
                  <option value="intermediate">Intermediário (1 a 3 anos)</option>
                  <option value="advanced">Avançado (Mais de 3 anos)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Frequência Semanal:</label>
                <select
                  value={availableDays}
                  onChange={(e) => setAvailableDays(Number(e.target.value) as any)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value={3}>3x por semana (Fullbody 3x)</option>
                  <option value={4}>4x por semana (Fullbody 4x)</option>
                  <option value={5}>5x por semana (Fullbody 5x)</option>
                  <option value={6}>6x por semana (Fullbody High-Volume)</option>
                </select>
              </div>
            </div>

            {/* Gym Environment */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Ambiente de Treino:</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as GymEnvironment)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="full_gym">Academia Comercial Completa (Máquinas + Halteres + Polias)</option>
                <option value="small_gym">Estúdio / Academia de Condomínio</option>
                <option value="home">Em Casa (Halteres / Calistenia)</option>
                <option value="minimal">Mínimo (Apenas Peso do Corpo)</option>
              </select>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-xl shadow-rose-600/20"
              >
                <Check className="h-4 w-4" />
                <span>GERAR MEU PROGRAMA FULLBODY</span>
              </button>
            </div>
          </div>
        )}

        {/* Security Note */}
        <div className="pt-2 text-center text-[10px] text-zinc-500 flex items-center justify-center space-x-1.5 border-t border-zinc-800 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
          <span>Configuração salva com criptografia no seu perfil individual</span>
        </div>
      </div>
    </div>
  );
};
