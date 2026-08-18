import React, { useState } from 'react';
import { UserProfile, MuscleGroup, Gender, ExperienceLevel, WorkoutGoal, GymEnvironment } from '../types';
import { User, ShieldAlert, Sparkles, Sliders, Check } from 'lucide-react';

interface UserProfileFormProps {
  initialProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const UserProfileForm: React.FC<UserProfileFormProps> = ({ initialProfile, onSaveProfile }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  const allMuscles: { id: MuscleGroup; label: string }[] = [
    { id: 'peitoral', label: 'Peitoral' },
    { id: 'costas', label: 'Costas' },
    { id: 'ombros', label: 'Ombros (Deltóides)' },
    { id: 'biceps', label: 'Bíceps' },
    { id: 'triceps', label: 'Tríceps' },
    { id: 'quadriceps', label: 'Quadríceps' },
    { id: 'posteriores', label: 'Posteriores de Coxa' },
    { id: 'gluteos', label: 'Glúteos' },
    { id: 'panturrilhas', label: 'Panturrilhas' },
    { id: 'core', label: 'Core / Abdominais' },
  ];

  const handleGenderChange = (gender: Gender) => {
    // Apply scientific default muscle priorities based on SRS specification
    const defaultPriorities: MuscleGroup[] =
      gender === 'female'
        ? ['gluteos', 'posteriores', 'quadriceps', 'costas', 'core']
        : ['peitoral', 'costas', 'ombros', 'biceps', 'triceps', 'quadriceps'];

    setProfile({
      ...profile,
      gender,
      priorities: defaultPriorities,
    });
  };

  const togglePriority = (muscle: MuscleGroup) => {
    const exists = profile.priorities.includes(muscle);
    const updated = exists
      ? profile.priorities.filter((m) => m !== muscle)
      : [...profile.priorities, muscle];

    setProfile({ ...profile, priorities: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(profile);
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-100">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-900/60 via-slate-900 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <User className="h-4 w-4" />
            <span>BioProfile Studio • Gestão Biométrica</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">BioProfile Studio — Perfil Biométrico</h2>
          <p className="text-sm text-slate-400 mt-1">
            Preencha seus parâmetros para que o Workout Engine monte a sua rotina Full Body sob medida baseada em evidências.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        
        {/* Basic Biometrics */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <span>1. Biometria & Experiência</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Gender Selection */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Sexo Biológico (Prioridades Científicas Base)</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleGenderChange('male')}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
                    profile.gender === 'male'
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 font-semibold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>Homem</span>
                  {profile.gender === 'male' && <Check className="h-4 w-4 text-cyan-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleGenderChange('female')}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
                    profile.gender === 'female'
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 font-semibold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>Mulher</span>
                  {profile.gender === 'female' && <Check className="h-4 w-4 text-cyan-400" />}
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Atleta</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                placeholder="Seu nome"
                required
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Idade (Anos)</label>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 25 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                min={14}
                max={90}
              />
            </div>

            {/* Height */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Altura (cm)</label>
              <input
                type="number"
                value={profile.heightCm}
                onChange={(e) => setProfile({ ...profile, heightCm: parseInt(e.target.value) || 175 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Peso Atual (kg)</label>
              <input
                type="number"
                step="0.5"
                value={profile.weightKg}
                onChange={(e) => setProfile({ ...profile, weightKg: parseFloat(e.target.value) || 75 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Experience Level */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Nível de Experiência em Treino de Força</label>
              <select
                value={profile.experience}
                onChange={(e) => setProfile({ ...profile, experience: e.target.value as ExperienceLevel })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="beginner">Iniciante (&lt; 1 ano de treino consistente)</option>
                <option value="intermediate">Intermediário (1 a 3 anos de treino consistente)</option>
                <option value="advanced">Avançado (&gt; 3 anos com sobrecarga progressiva)</option>
              </select>
            </div>

          </div>
        </div>

        {/* Availability & Goal */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>2. Objetivos, Tempo & Ambiente de Treino</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            
            {/* Primary Goal */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Objetivo Principal</label>
              <select
                value={profile.objective}
                onChange={(e) => setProfile({ ...profile, objective: e.target.value as WorkoutGoal })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="hypertrophy">Hipertrofia Muscular (Ganho de Massa)</option>
                <option value="fat_loss">Emagrecimento & Definição</option>
                <option value="recomposition">Recomposição Corporal (Massa + Queima de Gordura)</option>
                <option value="strength">Força Bruta & Carga Máxima</option>
                <option value="conditioning">Condicionamento & Resistência</option>
                <option value="health">Saúde & Longevidade</option>
              </select>
            </div>

            {/* Available Days */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Frequência Semanal</label>
              <select
                value={profile.availableDays}
                onChange={(e) => setProfile({ ...profile, availableDays: parseInt(e.target.value) as any })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={2}>2 Dias por Semana (Full Body A / B)</option>
                <option value={3}>3 Dias por Semana (Full Body A / B / C)</option>
                <option value={4}>4 Dias por Semana (Full Body A / B / C / D)</option>
              </select>
            </div>

            {/* Time per session */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tempo Disponível por Sessão</label>
              <select
                value={profile.timePerSessionMin}
                onChange={(e) => setProfile({ ...profile, timePerSessionMin: parseInt(e.target.value) as any })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={30}>30 minutos (Express)</option>
                <option value={45}>45 minutos (Padrão Ágil)</option>
                <option value={60}>60 minutos (Recomendado)</option>
                <option value={75}>75 minutos (Amplo)</option>
                <option value={90}>90 minutos (Completo)</option>
              </select>
            </div>

            {/* Gym Environment */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">Estrutura de Equipamentos (Ambiente de Treino)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'full_gym', label: 'Academia Completa', desc: 'Máquinas, cabos, barras e halteres' },
                  { id: 'small_gym', label: 'Academia Pequena', desc: 'Pesos livres, sem máquinas específicas' },
                  { id: 'home', label: 'Treino em Casa', desc: 'Halteres, elásticos e barra de porta' },
                  { id: 'minimal', label: 'Calistenia / Corporal', desc: 'Peso do próprio corpo e barra' },
                ].map((env) => (
                  <button
                    key={env.id}
                    type="button"
                    onClick={() => setProfile({ ...profile, environment: env.id as GymEnvironment })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      profile.environment === env.id
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-200'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">{env.label}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{env.desc}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Priority Muscle Groups */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
            3. Grupos Musculares prioritários (+ Volume Semanal)
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            O algoritmo alocará +3 séries semanais de volume adicional aos músculos selecionados.
          </p>

          <div className="flex flex-wrap gap-2">
            {allMuscles.map((m) => {
              const selected = profile.priorities.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => togglePriority(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selected
                      ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {selected ? `✓ ${m.label}` : m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Injuries & Limitations */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>4. Lesões & Limitações Físicas</span>
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Descreva lesões recentes, dores articulares ou exercícios proibidos
            </label>
            <input
              type="text"
              value={profile.limitations.join(', ')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  limitations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              placeholder="Ex: Dor no joelho esquerdo em flexão profunda, hérnia de disco L5-S1, proibir agachamento livre"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
          >
            Gerar Prescrição Inteligente (Workout Engine)
          </button>
        </div>

      </form>
    </div>
  );
};
