import React, { useState, useEffect } from 'react';
import { FullBodyProgram, SetLog, WorkoutDay, WorkoutItem, WorkoutLog, Exercise } from '../types';
import { calculateDoubleProgression } from '../engine/progressEngine';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { getExerciseImageUrl } from '../utils/exerciseImageHelper';
import { Play, Check, Clock, RotateCcw, Save, TrendingUp, Award, Dumbbell, BookOpen, Info, X, Activity } from 'lucide-react';

interface WorkoutLoggerViewProps {
  program: FullBodyProgram;
  activeDayId: 'A' | 'B' | 'C' | 'D';
  onSaveLog: (log: WorkoutLog) => void;
}

export interface RepRange {
  min: number;
  max: number;
  lower: number;
  upper: number;
}

export const DEFAULT_REP_RANGE: RepRange = {
  min: 8,
  max: 12,
  lower: 8,
  upper: 12,
};

/**
 * Robust and deterministic parser for exercise targetReps strings (e.g. "4-6", "6-10", "8-12", "8", "6 - 10").
 * Guarantees:
 * 1. Accepts range with spaces, dashes, or words ("6 - 10", "8-12")
 * 2. Accepts single numbers ("8" -> lower: 8, upper: 8)
 * 3. Never produces NaN
 * 4. Never produces negative numbers or zero
 * 5. Never produces inverted ranges (ensures lower <= upper)
 * 6. Returns deterministic fallback for invalid, empty, or missing inputs
 */
export function parseRepRange(
  targetReps?: string | null,
  fallback: RepRange = DEFAULT_REP_RANGE
): RepRange {
  if (!targetReps || typeof targetReps !== 'string') {
    return { ...fallback };
  }

  const trimmed = targetReps.trim();
  if (!trimmed) {
    return { ...fallback };
  }

  // Range match: "4-6", "6 - 10", "8 – 12", "10 to 15"
  const rangeMatch = trimmed.match(/^(\d+)\s*(?:-|–|—|\.\.|to)\s*(\d+)$/i);
  if (rangeMatch) {
    const rawLower = parseInt(rangeMatch[1], 10);
    const rawUpper = parseInt(rangeMatch[2], 10);

    if (Number.isFinite(rawLower) && Number.isFinite(rawUpper) && rawLower > 0 && rawUpper > 0) {
      const min = Math.min(rawLower, rawUpper);
      const max = Math.max(rawLower, rawUpper);
      return {
        min,
        max,
        lower: min,
        upper: max,
      };
    }
  }

  // Single number match: "8", " 12 "
  const singleMatch = trimmed.match(/^(\d+)$/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    if (Number.isFinite(val) && val > 0) {
      return {
        min: val,
        max: val,
        lower: val,
        upper: val,
      };
    }
  }

  // Loose range match if extra text is present (e.g. "6-10 reps")
  const looseRangeMatch = trimmed.match(/(\d+)\s*(?:-|–|—|\.\.|to)\s*(\d+)/i);
  if (looseRangeMatch) {
    const rawLower = parseInt(looseRangeMatch[1], 10);
    const rawUpper = parseInt(looseRangeMatch[2], 10);

    if (Number.isFinite(rawLower) && Number.isFinite(rawUpper) && rawLower > 0 && rawUpper > 0) {
      const min = Math.min(rawLower, rawUpper);
      const max = Math.max(rawLower, rawUpper);
      return {
        min,
        max,
        lower: min,
        upper: max,
      };
    }
  }

  // Loose single number match (e.g. "10 reps")
  const looseSingleMatch = trimmed.match(/(\d+)/);
  if (looseSingleMatch) {
    const val = parseInt(looseSingleMatch[1], 10);
    if (Number.isFinite(val) && val > 0) {
      return {
        min: val,
        max: val,
        lower: val,
        upper: val,
      };
    }
  }

  return { ...fallback };
}

export function parseInitialReps(targetReps?: string | null): number {
  return parseRepRange(targetReps, { min: 10, max: 10, lower: 10, upper: 10 }).lower;
}

export function initializeWorkoutLoggerState(workoutDay?: WorkoutDay | null): Record<string, SetLog[]> {
  const initialState: Record<string, SetLog[]> = {};
  if (!workoutDay || !workoutDay.items) {
    return initialState;
  }

  workoutDay.items.forEach((item) => {
    const sets: SetLog[] = [];
    const initialReps = parseInitialReps(item.targetReps);
    const targetSets = typeof item.targetSets === 'number' && item.targetSets > 0 ? item.targetSets : 3;

    for (let i = 1; i <= targetSets; i++) {
      sets.push({
        setNumber: i,
        repsDone: initialReps,
        weightKg: 0,
        actualRIR: typeof item.targetRIR === 'number' ? item.targetRIR : 2,
        completed: false,
      });
    }
    initialState[item.id] = sets;
  });

  return initialState;
}

export function getItemProgression(
  item: WorkoutItem,
  sets: SetLog[],
  fatigueScore: number = 40
) {
  const repRange = parseRepRange(item.targetReps);
  return calculateDoubleProgression(
    item.exercise.id,
    item.exercise.nome,
    sets,
    [repRange.min, repRange.max],
    item.exercise,
    fatigueScore
  );
}

/**
 * Sanitizes repetition inputs ensuring non-negative integers.
 */
export function sanitizeReps(val: any, defaultVal: number = 0): number {
  const num = typeof val === 'number' ? val : parseInt(String(val), 10);
  if (!Number.isFinite(num) || isNaN(num)) return defaultVal;
  return Math.max(0, Math.min(200, Math.floor(num)));
}

/**
 * Sanitizes weight inputs ensuring non-negative finite numeric values.
 */
export function sanitizeWeight(val: any, defaultVal: number = 0): number {
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (!Number.isFinite(num) || isNaN(num)) return defaultVal;
  return Math.max(0, Math.min(1000, Number(num.toFixed(2))));
}

/**
 * Sanitizes RIR (Reps in Reserve) ensuring valid integer range (0 to 10).
 */
export function sanitizeRIR(val: any, defaultVal: number = 2): number {
  const num = typeof val === 'number' ? val : parseInt(String(val), 10);
  if (!Number.isFinite(num) || isNaN(num)) return defaultVal;
  return Math.max(0, Math.min(10, Math.floor(num)));
}

/**
 * Sanitizes session RPE ensuring valid scale between 1 and 10.
 */
export function sanitizeRPE(val: any, defaultVal: number = 8): number {
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (!Number.isFinite(num) || isNaN(num)) return defaultVal;
  return Math.max(1, Math.min(10, Number(num.toFixed(1))));
}

/**
 * Formats a workout log date for presentation in pt-BR locale.
 * Backward compatible with legacy localized date strings (e.g. "02/09/2026")
 * and standard canonical ISO 8601 timestamps (e.g. "2026-09-02T14:50:00.000Z").
 */
export function formatWorkoutLogDate(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';

  const trimmed = dateStr.trim();
  // Preserve already formatted legacy strings (e.g. "02/09/2026")
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('pt-BR');
  }

  return trimmed;
}

/**
 * Builds a WorkoutLog with canonical ISO 8601 timestamp for persistent storage.
 */
export function buildWorkoutLog(params: {
  workoutDay: WorkoutDay;
  durationMin: number;
  sessionRPE: number;
  sessionNotes: string;
  exerciseLogsState: Record<string, SetLog[]>;
  timestamp?: string;
}): WorkoutLog {
  const cleanRPE = sanitizeRPE(params.sessionRPE, 8);
  const rawDuration = Number(params.durationMin);
  const cleanDuration = Number.isFinite(rawDuration) && rawDuration > 0
    ? Math.max(1, Math.min(360, Math.floor(rawDuration)))
    : 60;

  return {
    id: `log_${Date.now()}`,
    date: params.timestamp || new Date().toISOString(),
    dayId: params.workoutDay.id,
    durationMin: cleanDuration,
    sessionRPE: cleanRPE,
    notes: params.sessionNotes || '',
    exerciseLogs: (params.workoutDay.items || []).map((item) => {
      const rawSets = params.exerciseLogsState[item.id] || [];
      const cleanSets: SetLog[] = rawSets.map((s, idx) => ({
        setNumber: typeof s.setNumber === 'number' ? s.setNumber : idx + 1,
        repsDone: sanitizeReps(s.repsDone, 0),
        weightKg: sanitizeWeight(s.weightKg, 0),
        actualRIR: sanitizeRIR(s.actualRIR, typeof item.targetRIR === 'number' ? item.targetRIR : 2),
        completed: Boolean(s.completed),
      }));

      return {
        exerciseId: item.exercise.id,
        exerciseName: item.exercise.nome,
        sets: cleanSets,
      };
    }),
  };
}

export const WorkoutLoggerView: React.FC<WorkoutLoggerViewProps> = ({
  program,
  activeDayId,
  onSaveLog,
}) => {
  const [activeGuideExercise, setActiveGuideExercise] = useState<Exercise | null>(null);
  const [openBiomechanicsId, setOpenBiomechanicsId] = useState<string | null>(null);
  const workoutDay: WorkoutDay =
    program.splitDays.find((d) => d.id === activeDayId) || program.splitDays[0];

  // State to hold active set entries per exercise item with safe initialization (neutral weight, lower bound reps)
  const [exerciseLogsState, setExerciseLogsState] = useState<
    Record<string, SetLog[]>
  >(() => initializeWorkoutLoggerState(workoutDay));

  // Rest Timer State
  const [restTimerSec, setRestTimerSec] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [sessionRPE, setSessionRPE] = useState<number>(8);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [loggedSaved, setLoggedSaved] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning && restTimerSec > 0) {
      interval = setInterval(() => {
        setRestTimerSec((prev) => prev - 1);
      }, 1000);
    } else if (restTimerSec === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, restTimerSec]);

  const startRestTimer = (seconds: number) => {
    setRestTimerSec(seconds);
    setTimerRunning(true);
  };

  const handleSetToggle = (itemId: string, setIdx: number) => {
    const updated = { ...exerciseLogsState };
    const sets = [...updated[itemId]];
    sets[setIdx] = {
      ...sets[setIdx],
      completed: !sets[setIdx].completed,
    };
    updated[itemId] = sets;
    setExerciseLogsState(updated);

    // If marked as completed, trigger rest timer
    if (sets[setIdx].completed) {
      const item = workoutDay.items.find((i) => i.id === itemId);
      startRestTimer(item ? item.targetRestSec : 90);
    }
  };

  const handleValueChange = (
    itemId: string,
    setIdx: number,
    field: keyof SetLog,
    val: number
  ) => {
    const updated = { ...exerciseLogsState };
    const sets = [...(updated[itemId] || [])];
    if (!sets[setIdx]) return;

    let cleanVal: any = val;
    if (field === 'repsDone') cleanVal = sanitizeReps(val, 0);
    else if (field === 'weightKg') cleanVal = sanitizeWeight(val, 0);
    else if (field === 'actualRIR') cleanVal = sanitizeRIR(val, 2);

    sets[setIdx] = {
      ...sets[setIdx],
      [field]: cleanVal,
    };
    updated[itemId] = sets;
    setExerciseLogsState(updated);
  };

  const handleFinishWorkout = () => {
    const log: WorkoutLog = buildWorkoutLog({
      workoutDay,
      durationMin: program.profile.timePerSessionMin,
      sessionRPE,
      sessionNotes,
      exerciseLogsState,
    });

    onSaveLog(log);
    setLoggedSaved(true);
  };

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Play className="h-4 w-4" />
            <span>Execução de Treino Ao Vivo</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Registrador de Cargas • {workoutDay.title}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Marque as séries conforme concluídas. O timer de descanso iniciará automaticamente.
          </p>
        </div>

        {/* Floating Rest Timer Box */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center space-x-4">
          <Clock className={`h-7 w-7 ${timerRunning ? 'text-amber-400 animate-spin' : 'text-slate-400'}`} />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Timer de Descanso</div>
            <div className="text-2xl font-mono font-bold text-cyan-400">
              {Math.floor(restTimerSec / 60)}:{(restTimerSec % 60).toString().padStart(2, '0')}
            </div>
          </div>
          {timerRunning && (
            <button
              onClick={() => setTimerRunning(false)}
              className="bg-slate-800 text-slate-300 p-1.5 rounded-lg text-xs"
            >
              Pausar
            </button>
          )}
        </div>
      </div>

      {loggedSaved && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 p-4 rounded-xl flex items-center space-x-3 text-emerald-200 text-sm">
          <Award className="h-6 w-6 text-emerald-400" />
          <span>Sessão concluída com sucesso e registrada no Progress Engine!</span>
        </div>
      )}

      {/* Exercise Items List with Interactive Log Table */}
      <div className="space-y-6">
        {workoutDay.items.map((item, itemIdx) => {
          const sets = exerciseLogsState[item.id] || [];
          const doubleProg = getItemProgression(
            item,
            sets,
            program.systemicFatigueScore ?? 40
          );

          return (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div className="flex items-start space-x-3">
                  <div
                    onClick={() => setActiveGuideExercise(item.exercise)}
                    className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/60 overflow-hidden shrink-0 relative cursor-pointer group/thumb transition-all shadow-sm flex items-center justify-center mt-0.5"
                    title="Ver guia anatômico 3D"
                  >
                    <img
                      src={getExerciseImageUrl(item.exercise)}
                      alt={item.exercise.nome}
                      className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-0 left-0 bg-slate-950/85 px-1 rounded-br text-[9px] font-bold text-cyan-400">
                      #{itemIdx + 1}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h3 className="font-bold text-lg text-white">{item.exercise.nome}</h3>
                      
                      {/* Info 'i' Button */}
                      <button
                        onClick={() => setOpenBiomechanicsId(openBiomechanicsId === item.id ? null : item.id)}
                        className={`p-1.5 rounded-lg border text-xs transition-all flex items-center justify-center cursor-pointer ${
                          openBiomechanicsId === item.id
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700 hover:border-cyan-500/50'
                        }`}
                        title="Clique para dicas rápidas de biomecânica"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => setActiveGuideExercise(item.exercise)}
                        className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold px-2.5 py-1 rounded-lg text-[11px] flex items-center space-x-1 border border-slate-700 transition-all cursor-pointer ml-1"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>VER GUIA</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Meta: {item.targetSets} séries × {item.targetReps} reps • RIR Meta: {item.targetRIR}
                    </p>
                  </div>
                </div>

                {/* Double Progression Recommendation Card */}
                <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300">{doubleProg.explanation}</span>
                </div>
              </div>

              {/* Quick Biomechanics Card based on Prescription Engine */}
              {openBiomechanicsId === item.id && (
                <div className="p-4 bg-slate-950/90 border border-cyan-500/40 rounded-xl space-y-3 text-xs text-slate-200 shadow-xl animate-fadeIn">
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
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-cyan-400 font-semibold block mb-0.5">⚙️ Padrão & Cadência</span>
                      <span className="text-slate-300">
                        Padrão {item.exercise.padraoMotor.toUpperCase()} ({item.exercise.planoMovimento || 'sagital'}). Cadência: <strong>{item.cadence}</strong>.
                      </span>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-emerald-400 font-semibold block mb-0.5">🎯 Intensidade Alvo</span>
                      <span className="text-slate-300">
                        RIR {item.targetRIR} (RPE {item.targetRPE}) — Guardar <strong>{item.targetRIR} reps na reserva</strong> para máximo estímulo sem fadiga sistêmica excessiva.
                      </span>
                    </div>

                    <div className="sm:col-span-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-indigo-300 font-semibold block mb-0.5">🧠 Prescrição Científica do Motor</span>
                      <span className="text-slate-300">{item.orderRationale}</span>
                    </div>

                    {(item.exercise.dicaPrincipal || item.exercise.execucao) && (
                      <div className="sm:col-span-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
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

              {/* Set Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3">Série</th>
                      <th className="py-2 px-3">Carga (kg)</th>
                      <th className="py-2 px-3">Reps Feitas</th>
                      <th className="py-2 px-3">RIR Realizado</th>
                      <th className="py-2 px-3 text-right">Concluir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sets.map((set, setIdx) => (
                      <tr
                        key={setIdx}
                        className={set.completed ? 'bg-emerald-950/20' : ''}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-300">
                          Série {set.setNumber}
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            value={set.weightKg}
                            onChange={(e) =>
                              handleValueChange(
                                item.id,
                                setIdx,
                                'weightKg',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            value={set.repsDone}
                            onChange={(e) =>
                              handleValueChange(
                                item.id,
                                setIdx,
                                'repsDone',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            value={set.actualRIR}
                            onChange={(e) =>
                              handleValueChange(
                                item.id,
                                setIdx,
                                'actualRIR',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500"
                            min={0}
                            max={5}
                          />
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleSetToggle(item.id, setIdx)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              set.completed
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Finish Workout Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-base text-white">Finalizar Registro da Sessão</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Percepção Geral de Esforço da Sessão (RPE 1 a 10)
            </label>
            <input
              type="number"
              value={sessionRPE}
              onChange={(e) => setSessionRPE(parseFloat(e.target.value) || 8)}
              min={1}
              max={10}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Observações / Dores / Comentários
            </label>
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Ex: Ótimo bombeamento muscular, joelho sem dor"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <button
          onClick={handleFinishWorkout}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all cursor-pointer flex items-center justify-center space-x-2"
        >
          <Save className="h-5 w-5" />
          <span>Salvar Treino no Progress Engine</span>
        </button>
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
