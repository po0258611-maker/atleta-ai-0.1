import React, { useState } from 'react';
import { FullBodyProgram, WorkoutDay, UserProfile, MuscleGroup, Exercise } from '../types';
import { fetchPrescriptionExplanation } from '../engine/aiCoachEngine';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { getExerciseImageUrl } from '../utils/exerciseImageHelper';
import { Cpu, Sparkles, RefreshCw, Layers, ShieldCheck, ChevronRight, AlertCircle, Info, BookOpen, FileDown, X, HelpCircle, Activity, Cloud } from 'lucide-react';
import { exportPlanToPDF } from '../services/pdfExporter';

interface WorkoutEngineViewProps {
  program: FullBodyProgram;
  onRegenerate: () => void;
  onSelectDayForLogger: (dayId: 'A' | 'B' | 'C' | 'D') => void;
  userProfile: UserProfile;
  onOpenDriveTab?: () => void;
}

export const WorkoutEngineView: React.FC<WorkoutEngineViewProps> = ({
  program,
  onRegenerate,
  onSelectDayForLogger,
  userProfile,
  onOpenDriveTab,
}) => {
  const [selectedDayId, setSelectedDayId] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [aiExplanation, setAiExplanation] = useState<string | null>(program.aiAnalysis || null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [activeGuideExercise, setActiveGuideExercise] = useState<Exercise | null>(null);
  const [openBiomechanicsId, setOpenBiomechanicsId] = useState<string | null>(null);

  const selectedDay: WorkoutDay =
    program.splitDays.find((d) => d.id === selectedDayId) || program.splitDays[0];

  const handleFetchAiExplanation = async () => {
    setLoadingAi(true);
    const explanation = await fetchPrescriptionExplanation(userProfile, program);
    setAiExplanation(explanation);
    setLoadingAi(false);
  };

  const muscleLabels: Record<MuscleGroup, string> = {
    peitoral: 'Peitoral',
    costas: 'Costas (Latíssimo/Trapézio)',
    ombros: 'Ombros (Deltóides)',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    quadriceps: 'Quadríceps',
    posteriores: 'Posteriores (Isquiotibiais)',
    gluteos: 'Glúteos',
    panturrilhas: 'Panturrilhas',
    core: 'Core / Abdômen',
  };

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Engine Overview Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Cpu className="w-64 h-64 text-cyan-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Cpu className="h-4 w-4" />
              <span>Fullbody Matrix • Prescrição Biomecânica</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Matriz de Treino Fullbody Prescrita
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Prescrição de alta precisão em <strong>{program.splitDays.length} Sessões Matrix</strong> para {userProfile.name} ({userProfile.gender === 'male' ? 'Masculino' : 'Feminino'}, {userProfile.experience.toUpperCase()}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenDriveTab && (
              <button
                onClick={onOpenDriveTab}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="Backup e Sincronização no Google Drive"
              >
                <Cloud className="h-4 w-4 text-emerald-400" />
                <span>Nuvem Drive</span>
              </button>
            )}
            <button
              onClick={() => exportPlanToPDF({ program, userProfile })}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              title="Baixar PDF com Ficha de Treino e Nutrição"
            >
              <FileDown className="h-4 w-4" />
              <span>Exportar PDF</span>
            </button>
            <button
              onClick={onRegenerate}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-cyan-400" />
              <span>Recalcular Regras</span>
            </button>
            <button
              onClick={handleFetchAiExplanation}
              disabled={loadingAi}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <span>{loadingAi ? 'Analisando via Gemini...' : 'Parecer Técnico AI'}</span>
            </button>
          </div>
        </div>

        {/* Prescription Rationale Bullet List */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          {program.prescriptionRationale.map((rat, idx) => (
            <div key={idx} className="flex items-start space-x-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
              <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{rat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Explanation Banner (If generated) */}
      {aiExplanation && (
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-5 shadow-lg relative">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="h-4 w-4" />
            <span>Parecer Científico do AI Coach (Gemini API)</span>
          </div>
          <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {aiExplanation}
          </div>
        </div>
      )}

      {/* Main Grid: Split Days + Weekly Volume Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Workout Split View */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Day Tabs */}
          <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
            {program.splitDays.map((day) => (
              <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  selectedDayId === day.id
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>Sessão {day.id}</span>
                <span className="bg-slate-950/40 px-1.5 py-0.5 rounded text-[10px] text-cyan-200">
                  {day.items.length} ex.
                </span>
              </button>
            ))}
          </div>

          {/* Active Session Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>{selectedDay.title}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">{selectedDay.description}</p>
              </div>

              <button
                onClick={() => onSelectDayForLogger(selectedDay.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-900/30 transition-all self-start sm:self-auto cursor-pointer"
              >
                <span>Iniciar treino Sessão {selectedDay.id}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Exercise Prescription List */}
            <div className="space-y-4">
              {selectedDay.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    
                    <div className="flex items-start space-x-3">
                      <div
                        onClick={() => setActiveGuideExercise(item.exercise)}
                        className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 overflow-hidden shrink-0 relative cursor-pointer group/thumb transition-all shadow-sm flex items-center justify-center mt-0.5"
                        title="Ver guia anatômico 3D"
                      >
                        <img
                          src={getExerciseImageUrl(item.exercise)}
                          alt={item.exercise.nome}
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-0 left-0 bg-slate-950/85 px-1 rounded-br text-[9px] font-bold text-cyan-400">
                          #{idx + 1}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h4 className="font-bold text-slate-100 text-sm">{item.exercise.nome}</h4>
                          
                          {/* Biomechanics Quick Info Icon Button */}
                          <button
                            onClick={() => setOpenBiomechanicsId(openBiomechanicsId === item.id ? null : item.id)}
                            className={`p-1 rounded-md border text-xs transition-all flex items-center justify-center cursor-pointer ${
                              openBiomechanicsId === item.id
                                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/20'
                                : 'bg-slate-800/80 hover:bg-slate-700 text-cyan-400 border-slate-700 hover:border-cyan-500/50'
                            }`}
                            title="Clique para dicas rápidas de biomecânica"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>

                          <span className="text-[10px] uppercase font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {muscleLabels[item.exercise.grupoMuscular] || item.exercise.grupoMuscular}
                          </span>
                          {item.isReplaced && (
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded flex items-center space-x-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>Substituído (Ambiente)</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-0.5 italic">
                          Padrão Motor: <strong className="text-slate-300">{item.exercise.padraoMotor.toUpperCase()}</strong> • Cadência: <strong className="text-slate-300">{item.cadence}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Prescription Metrics Pills */}
                    <div className="flex items-center space-x-2 self-start sm:self-auto text-xs font-semibold">
                      <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200">
                        {item.targetSets} Séries × {item.targetReps} reps
                      </div>
                      <div className="bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 px-3 py-1.5 rounded-lg">
                        RIR {item.targetRIR} (RPE {item.targetRPE})
                      </div>
                      <div className="bg-slate-800 px-2.5 py-1.5 rounded-lg text-slate-400">
                        ⏱️ {item.targetRestSec}s
                      </div>
                    </div>

                  </div>

                  {/* Rationale & Execution guide */}
                  <div className="mt-3 pt-3 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-300 font-medium">Justificativa Biomecânica: </span>
                        {item.orderRationale}
                        {item.replacementNotes && (
                          <p className="text-amber-300/90 text-[11px] mt-1 font-medium">{item.replacementNotes}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveGuideExercise(item.exercise)}
                      className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer self-start sm:self-auto border border-slate-700"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>VER GUIA</span>
                    </button>
                  </div>

                  {/* Quick Biomechanics Card based on Prescription Engine */}
                  {openBiomechanicsId === item.id && (
                    <div className="mt-3.5 p-4 bg-slate-900/90 border border-cyan-500/40 rounded-xl space-y-3 text-xs text-slate-200 shadow-xl animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center space-x-2 font-bold text-cyan-300">
                          <Activity className="h-4 w-4 text-cyan-400 shrink-0" />
                          <span>Dicas Biomecânicas • Motor de Prescrição</span>
                        </div>
                        <button
                          onClick={() => setOpenBiomechanicsId(null)}
                          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-cyan-400 font-semibold block mb-0.5">⚙️ Padrão & Vetor de Força</span>
                          <span className="text-slate-300">
                            Padrão {item.exercise.padraoMotor.toUpperCase()} ({item.exercise.planoMovimento || 'sagital'}). Cadência alvo de <strong>{item.cadence}</strong>.
                          </span>
                        </div>

                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-emerald-400 font-semibold block mb-0.5">🎯 Intensidade & Reserva</span>
                          <span className="text-slate-300">
                            RIR {item.targetRIR} (RPE {item.targetRPE}) — Parar a série com exatas <strong>{item.targetRIR} repetições</strong> antes da falha total.
                          </span>
                        </div>

                        <div className="sm:col-span-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-indigo-300 font-semibold block mb-0.5">🧠 Prescrição Científica do Motor</span>
                          <span className="text-slate-300">{item.orderRationale}</span>
                        </div>

                        {(item.exercise.dicaPrincipal || item.exercise.execucao) && (
                          <div className="sm:col-span-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-amber-300 font-semibold block mb-0.5">💡 Dica Biomecânica de Execução</span>
                            <span className="text-slate-300">{item.exercise.dicaPrincipal || item.exercise.execucao}</span>
                          </div>
                        )}

                        {item.exercise.errosComuns && item.exercise.errosComuns.length > 0 && (
                          <div className="sm:col-span-2 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/40">
                            <span className="text-rose-300 font-semibold block mb-0.5">⚠️ Erro Biomecânico a Evitar</span>
                            <span className="text-rose-200">{item.exercise.errosComuns[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Right Column (1 Col): Weekly Muscle Volume Breakdown */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <span>Volume Semanal (Séries / Músculo)</span>
              </h3>
            </div>

            <div className="space-y-3">
              {(Object.keys(program.weeklyVolumeMap) as MuscleGroup[]).map((muscle) => {
                const targetSets = program.weeklyVolumeMap[muscle];
                const label = muscleLabels[muscle] || muscle;
                const maxBar = 24;
                const pct = Math.min(100, Math.round((targetSets / maxBar) * 100));

                return (
                  <div key={muscle} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{label}</span>
                      <span className="font-bold text-cyan-400">{targetSets} séries / sem</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              * O volume é ajustado automaticamente de acordo com o nível ({userProfile.experience.toUpperCase()}) e prioridades musculares indicadas no perfil.
            </div>
          </div>
        </div>

      </div>

      {/* Exercise Detail Modal ("GUIA DO EXERCÍCIO") */}
      {activeGuideExercise && (
        <ExerciseDetailModal
          exercise={activeGuideExercise}
          onClose={() => setActiveGuideExercise(null)}
          onSelectExercise={(selEx) => setActiveGuideExercise(selEx)}
        />
      )}

    </div>
  );
};
