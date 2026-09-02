import React, { useState, useMemo } from 'react';
import { UserProfile, WorkoutLog, FatigueAssessment, MuscleGroup, SubscriptionState } from '../types';
import { calculateFatigueScore } from '../engine/progressEngine';
import { FeaturePermissions, PermissionService } from '../services/permissionService';
import { ProgressionEngine, PeriodizationAnalysis } from '../services/progressionEngine';
import { formatWorkoutLogDate } from './WorkoutLoggerView';
import {
  Flame,
  Moon,
  Activity,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Dumbbell,
  Zap,
  Target,
  Award,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Lock,
  Brain,
  ShieldAlert,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface FatigueProgressViewProps {
  profile: UserProfile;
  workoutLogs: WorkoutLog[];
  onUpdateProfile: (updated: UserProfile) => void;
  subscription?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

export const FatigueProgressView: React.FC<FatigueProgressViewProps> = ({
  profile,
  workoutLogs,
  onUpdateProfile,
  subscription,
  onOpenSubscriptionModal,
}) => {
  const permissions: FeaturePermissions = useMemo(() => {
    return PermissionService.getPermissions(subscription || null);
  }, [subscription]);

  const [domsLevel, setDomsLevel] = useState<number>(2); // 1 to 5
  const [performanceDrop, setPerformanceDrop] = useState<boolean>(false);
  const [activeChartTab, setActiveChartTab] = useState<'tonnage' | 'volume' | 'exercise' | 'fatigue' | 'radar'>('tonnage');
  const [selectedExercise, setSelectedExercise] = useState<string>('ex_squat');
  const [timeframe, setTimeframe] = useState<'4w' | '8w' | '12w'>('8w');

  const fatigue: FatigueAssessment = calculateFatigueScore(
    profile,
    workoutLogs,
    domsLevel,
    performanceDrop
  );

  // Periodization Analysis (ACWR & Deload)
  const periodization: PeriodizationAnalysis = useMemo(() => {
    return ProgressionEngine.analyzePeriodization(workoutLogs);
  }, [workoutLogs]);

  // Radar Data for NeuroFatigue
  const radarData = useMemo(() => {
    return [
      { metric: 'Recuperação SNC', value: permissions.hasApexPass ? 82 : 60, fullMark: 100 },
      { metric: 'Integridade Articular', value: permissions.hasApexPass ? 88 : 75, fullMark: 100 },
      { metric: 'Estresse Metabólico', value: permissions.hasApexPass ? 78 : 85, fullMark: 100 },
      { metric: 'Eficiência de Sono', value: Math.min(100, Math.round((profile.sleepHours / 8) * 100)), fullMark: 100 },
      { metric: 'Capacidade de Carga', value: periodization.acwrRatio > 1.3 ? 55 : 85, fullMark: 100 },
      { metric: 'Manutenção de RIR', value: 80, fullMark: 100 },
    ];
  }, [permissions.hasApexPass, profile.sleepHours, periodization.acwrRatio]);

  const getStatusColor = (status: FatigueAssessment['status']) => {
    switch (status) {
      case 'optimal':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'moderate':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'high_fatigue':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'deload_recommended':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
  };

  // Generate or merge progression timeline data (Weekly Tonnage & Volume)
  const chartDataWeekly = useMemo(() => {
    // Baseline 8-week history data for visualization
    const baselineWeeks = [
      {
        week: 'Semana 1',
        tonnageKg: 13800,
        totalReps: 620,
        avgRPE: 7.2,
        fatigueScore: 35,
        totalSets: 42,
        squatMax: 85,
        squat1RM: 102,
        benchMax: 68,
        bench1RM: 81,
        latMax: 58,
        lat1RM: 70,
        pressMax: 38,
        press1RM: 46,
      },
      {
        week: 'Semana 2',
        tonnageKg: 14950,
        totalReps: 650,
        avgRPE: 7.6,
        fatigueScore: 42,
        totalSets: 45,
        squatMax: 90,
        squat1RM: 108,
        benchMax: 70,
        bench1RM: 84,
        latMax: 60,
        lat1RM: 72,
        pressMax: 40,
        press1RM: 48,
      },
      {
        week: 'Semana 3',
        tonnageKg: 16200,
        totalReps: 680,
        avgRPE: 8.0,
        fatigueScore: 52,
        totalSets: 48,
        squatMax: 95,
        squat1RM: 114,
        benchMax: 72.5,
        bench1RM: 87,
        latMax: 62.5,
        lat1RM: 75,
        pressMax: 42.5,
        press1RM: 51,
      },
      {
        week: 'Semana 4',
        tonnageKg: 17400,
        totalReps: 710,
        avgRPE: 8.6,
        fatigueScore: 68,
        totalSets: 50,
        squatMax: 100,
        squat1RM: 120,
        benchMax: 75,
        bench1RM: 90,
        latMax: 65,
        lat1RM: 78,
        pressMax: 45,
        press1RM: 54,
      },
      {
        week: 'Semana 5 (Deload)',
        tonnageKg: 12100,
        totalReps: 510,
        avgRPE: 6.5,
        fatigueScore: 32,
        totalSets: 36,
        squatMax: 80,
        squat1RM: 96,
        benchMax: 60,
        bench1RM: 72,
        latMax: 50,
        lat1RM: 60,
        pressMax: 35,
        press1RM: 42,
      },
      {
        week: 'Semana 6',
        tonnageKg: 18100,
        totalReps: 730,
        avgRPE: 8.2,
        fatigueScore: 58,
        totalSets: 52,
        squatMax: 102.5,
        squat1RM: 123,
        benchMax: 77.5,
        bench1RM: 93,
        latMax: 67.5,
        lat1RM: 81,
        pressMax: 47.5,
        press1RM: 57,
      },
      {
        week: 'Semana 7',
        tonnageKg: 19350,
        totalReps: 760,
        avgRPE: 8.5,
        fatigueScore: 64,
        totalSets: 54,
        squatMax: 105,
        squat1RM: 126,
        benchMax: 80,
        bench1RM: 96,
        latMax: 70,
        lat1RM: 84,
        pressMax: 50,
        press1RM: 60,
      },
      {
        week: 'Semana 8 (Atual)',
        tonnageKg: 20200,
        totalReps: 780,
        avgRPE: 8.8,
        fatigueScore: fatigue.currentFatigueScore,
        totalSets: 56,
        squatMax: 107.5,
        squat1RM: 129,
        benchMax: 82.5,
        bench1RM: 99,
        latMax: 72.5,
        lat1RM: 87,
        pressMax: 52.5,
        press1RM: 63,
      },
    ];

    // If user has workout logs, recalculate current week tonnage and append/override
    if (workoutLogs.length > 0) {
      let loggedTonnage = 0;
      let loggedReps = 0;
      let loggedSets = 0;

      workoutLogs.forEach((log) => {
        log.exerciseLogs.forEach((exLog) => {
          exLog.sets.forEach((set) => {
            if (set.completed) {
              loggedTonnage += (set.weightKg || 0) * (set.repsDone || 0);
              loggedReps += set.repsDone || 0;
              loggedSets += 1;
            }
          });
        });
      });

      if (loggedTonnage > 0) {
        baselineWeeks[baselineWeeks.length - 1].tonnageKg = Math.max(
          baselineWeeks[baselineWeeks.length - 1].tonnageKg,
          loggedTonnage
        );
        baselineWeeks[baselineWeeks.length - 1].totalReps = Math.max(
          baselineWeeks[baselineWeeks.length - 1].totalReps,
          loggedReps
        );
        baselineWeeks[baselineWeeks.length - 1].totalSets = Math.max(
          baselineWeeks[baselineWeeks.length - 1].totalSets,
          loggedSets
        );
      }
    }

    if (timeframe === '4w') return baselineWeeks.slice(-4);
    if (timeframe === '8w') return baselineWeeks;
    return baselineWeeks;
  }, [workoutLogs, fatigue.currentFatigueScore, timeframe]);

  // Muscle Group Weekly Sets Distribution
  const muscleVolumeData = useMemo(() => {
    return [
      { muscle: 'Peitoral', sets: 16, targetMin: 12, targetMax: 20, color: '#06b6d4' },
      { muscle: 'Costas', sets: 18, targetMin: 12, targetMax: 22, color: '#3b82f6' },
      { muscle: 'Ombros', sets: 14, targetMin: 10, targetMax: 18, color: '#8b5cf6' },
      { muscle: 'Quadríceps', sets: 16, targetMin: 12, targetMax: 20, color: '#10b981' },
      { muscle: 'Posteriores', sets: 12, targetMin: 10, targetMax: 16, color: '#f59e0b' },
      { muscle: 'Glúteos', sets: 10, targetMin: 8, targetMax: 14, color: '#ec4899' },
      { muscle: 'Bíceps', sets: 12, targetMin: 8, targetMax: 16, color: '#0284c7' },
      { muscle: 'Tríceps', sets: 12, targetMin: 8, targetMax: 16, color: '#6366f1' },
      { muscle: 'Panturrilhas', sets: 8, targetMin: 6, targetMax: 12, color: '#a855f7' },
      { muscle: 'Core', sets: 8, targetMin: 6, targetMax: 12, color: '#14b8a6' },
    ];
  }, []);

  // Exercise 1RM / Max Weight Data Mapper
  const exerciseChartKeyMap: Record<string, { title: string; maxKey: string; oneRmKey: string; unit: string }> = {
    ex_squat: { title: 'Agachamento Livre (Barbell Squat)', maxKey: 'squatMax', oneRmKey: 'squat1RM', unit: 'kg' },
    ex_bench: { title: 'Supino Reto com Barra', maxKey: 'benchMax', oneRmKey: 'bench1RM', unit: 'kg' },
    ex_lat: { title: 'Puxada Frontal na Polia', maxKey: 'latMax', oneRmKey: 'lat1RM', unit: 'kg' },
    ex_press: { title: 'Desenvolvimento de Ombros', maxKey: 'pressMax', oneRmKey: 'press1RM', unit: 'kg' },
  };

  // Custom Glassmorphic Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 z-30">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
            <span>{label}</span>
            <span className="text-[10px] text-cyan-400 uppercase font-mono">Athleta Progress Engine</span>
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between space-x-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-slate-300 font-medium">{entry.name}:</span>
              </div>
              <span className="font-mono font-bold text-white">
                {typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR') : entry.value} {entry.unit || ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const currentTonnage = chartDataWeekly[chartDataWeekly.length - 1]?.tonnageKg || 0;
  const prevTonnage = chartDataWeekly[chartDataWeekly.length - 2]?.tonnageKg || currentTonnage;
  const tonnageGrowthPct = prevTonnage > 0 ? (((currentTonnage - prevTonnage) / prevTonnage) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Flame className="h-4 w-4" />
              <span>Engine Biomecânico • Recharts Analytics & Fadiga Sistêmica</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Análise de Sobrecarga Progressiva & Fadiga
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Visualização de tendências de tonelagem (kg), volume de séries semanais por grupo muscular, estimativa de 1RM e índice de fadiga sistêmica em tempo real.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
            <Calendar className="h-4 w-4 text-cyan-400 ml-2" />
            <span className="text-xs text-slate-400 font-medium mr-1">Período:</span>
            <button
              onClick={() => setTimeframe('4w')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === '4w' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              4 Semanas
            </button>
            <button
              onClick={() => setTimeframe('8w')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === '8w' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              8 Semanas
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tonnage Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Carga Semanal (Tonnage)</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Dumbbell className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {currentTonnage.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs font-bold text-slate-400">kg</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-bold">+{tonnageGrowthPct}%</span>
            <span className="text-slate-500">vs semana anterior</span>
          </div>
        </div>

        {/* Total Sets Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Volume de Séries</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white font-mono">56</span>
            <span className="text-xs font-bold text-slate-400">séries / semana</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Target className="h-3.5 w-3.5 text-blue-400" />
            <span>Zona Ótima Hypertrophy (12-20s/grupo)</span>
          </div>
        </div>

        {/* Avg RPE Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">RPE Médio das Sessões</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white font-mono">8.8</span>
            <span className="text-xs font-bold text-slate-400">/ 10 (RIR ~1.2)</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-semibold">
            <Activity className="h-3.5 w-3.5" />
            <span>Intensidade de Estimulo Efetivo</span>
          </div>
        </div>

        {/* Fatigue Score Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2 relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Índice de Fadiga</span>
            <div className={`h-8 w-8 rounded-xl border flex items-center justify-center font-bold ${getStatusColor(fatigue.status)}`}>
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white font-mono">{fatigue.currentFatigueScore}</span>
            <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>
          <div className="flex items-center space-x-1 text-xs">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${getStatusColor(fatigue.status)}`}>
              {fatigue.status.replace('_', ' ')}
            </span>
          </div>
        </div>

      </div>

      {/* Main Analytics Dashboard Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        
        {/* Navigation Tabs for Charts */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
            <button
              onClick={() => setActiveChartTab('tonnage')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                activeChartTab === 'tonnage'
                  ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-950/40'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Evolução de Carga (Tonnage)</span>
            </button>

            <button
              onClick={() => setActiveChartTab('volume')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                activeChartTab === 'volume'
                  ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-950/40'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Volume Semanal por Músculo</span>
            </button>

            <button
              onClick={() => setActiveChartTab('exercise')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                activeChartTab === 'exercise'
                  ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-950/40'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>Progressão de 1RM Estimado</span>
            </button>

            <button
              onClick={() => setActiveChartTab('fatigue')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                activeChartTab === 'fatigue'
                  ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-950/40'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              <Flame className="h-4 w-4" />
              <span>Fadiga vs. RPE</span>
            </button>

            <button
              onClick={() => setActiveChartTab('radar')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                activeChartTab === 'radar'
                  ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-950/40'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-zinc-400 border-slate-800'
              }`}
            >
              <Brain className="h-4 w-4 text-rose-400" />
              <span>Radar NeuroFatiga APEX</span>
              {!permissions.canAccessAdvancedGraphics && (
                <Lock className="h-3 w-3 text-amber-400 ml-1" />
              )}
            </button>
          </div>

          {/* Exercise Selector if active tab is 'exercise' */}
          {activeChartTab === 'exercise' && (
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-cyan-300 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer shrink-0"
            >
              <option value="ex_squat">Agachamento Livre (Barbell Squat)</option>
              <option value="ex_bench">Supino Reto com Barra</option>
              <option value="ex_lat">Puxada Frontal na Polia</option>
              <option value="ex_press">Desenvolvimento de Ombros</option>
            </select>
          )}
        </div>

        {/* CHART 1: TONNAGE & TOTAL REPS */}
        {activeChartTab === 'tonnage' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Tonelagem Total Levantada (kg) por Semana</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Soma do produto de todas as séries x repetições x peso (Carga acumulada de treino).
                </p>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataWeekly} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tonnageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="repsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#06b6d4" tick={{ fontSize: 11 }} tickFormatter={(val) => `${val / 1000}k`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="tonnageKg"
                    name="Tonelagem (kg)"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#tonnageGrad)"
                    unit="kg"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalReps"
                    name="Repetições Totais"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#repsGrad)"
                    unit="reps"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 2: MUSCLE GROUP WEEKLY SETS */}
        {activeChartTab === 'volume' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Distribuição de Volume Semanal por Grupo Muscular (Séries Diretas)
              </h3>
              <p className="text-xs text-slate-400">
                Comparativo de séries semanais atuais contra a faixa científica recomendada (10-20 séries/semana).
              </p>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={muscleVolumeData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="muscle" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 24]} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={12} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Mínimo Efetivo (12s)', fill: '#10b981', fontSize: 10, position: 'insideTopLeft' }} />
                  <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Teto de Recuperação (20s)', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} />
                  <Bar dataKey="sets" name="Séries Semanais" radius={[6, 6, 0, 0]} unit="séries">
                    {muscleVolumeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 3: EXERCISE 1RM / MAX LOAD PROGRESSION */}
        {activeChartTab === 'exercise' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Evolução de Carga Máxima & 1RM Estimado (Fórmula de Epley)
              </h3>
              <p className="text-xs text-slate-400">
                Acompanhe a progressão de força em: <strong className="text-cyan-300">{exerciseChartKeyMap[selectedExercise]?.title}</strong>
              </p>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataWeekly} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#06b6d4" tick={{ fontSize: 11 }} domain={['dataMin - 5', 'dataMax + 10']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey={exerciseChartKeyMap[selectedExercise]?.oneRmKey || 'squat1RM'}
                    name="1RM Estimado (kg)"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#06b6d4' }}
                    activeDot={{ r: 6 }}
                    unit="kg"
                  />
                  <Line
                    type="monotone"
                    dataKey={exerciseChartKeyMap[selectedExercise]?.maxKey || 'squatMax'}
                    name="Carga Máxima de Treino (kg)"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 3, fill: '#8b5cf6' }}
                    unit="kg"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 4: FATIGUE VS RPE */}
        {activeChartTab === 'fatigue' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Monitor de Fadiga Acumulada vs. Esforço Percebido (RPE)
              </h3>
              <p className="text-xs text-slate-400">
                Observe como o índice de fadiga eleva com a manutenção de RPE elevado ao longo das semanas.
              </p>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataWeekly} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#f43f5e" tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 11 }} domain={[5, 10]} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine yAxisId="left" y={75} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Zona Deload (>75)', fill: '#f43f5e', fontSize: 10 }} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="fatigueScore"
                    name="Índice de Fadiga (0-100)"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#fatigueGrad)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgRPE"
                    name="RPE Médio da Sessão"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 5: NEUROFATIGUE RADAR (APEX PASS FEATURE) */}
        {activeChartTab === 'radar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-rose-400" />
                  <span>Radar Multidimensional de Recuperação NeuroMuscular APEX</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Mapeamento em tempo real do desgaste articular, fadiga do SNC e capacidade adaptativa.
                </p>
              </div>
            </div>

            {permissions.canAccessAdvancedGraphics ? (
              <div className="h-80 w-full pt-2 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="metric" stroke="#cbd5e1" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" />
                    <Radar
                      name="Índice de Prontidão NeuroMuscular (%)"
                      dataKey="value"
                      stroke="#f43f5e"
                      fill="#f43f5e"
                      fillOpacity={0.4}
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 bg-zinc-950/80 border border-amber-500/30 rounded-3xl text-center space-y-4 relative overflow-hidden my-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl w-fit mx-auto text-amber-400">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Radar NeuroFatiga APEX Reservado</h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                    Ative o Passe APEX para visualizar a análise multidimensional em teia de radar (SNC, integridade articular, estresse metabólico e janelas de supercompensação).
                  </p>
                </div>
                <button
                  onClick={onOpenSubscriptionModal}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer inline-flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4 fill-white" />
                  <span>DESBLOQUEAR ANÁLISE COMPLETA COM PASSE APEX</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Main Grid: Fatigue Controls & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Interactive Recovery Variables */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <span>Ajustar Variáveis Fisiológicas de Recuperação</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Sleep Hours */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span>Horas de Sono por Noite</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={profile.sleepHours}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, sleepHours: parseFloat(e.target.value) || 7 })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  min={4}
                  max={12}
                />
              </div>

              {/* DOMS (Muscle Soreness) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nível de Dor Muscular Tardia (DOMS)
                </label>
                <select
                  value={domsLevel}
                  onChange={(e) => setDomsLevel(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value={1}>1 - Nenhuma dor (100% recuperado)</option>
                  <option value={2}>2 - Dor leve tolerável</option>
                  <option value={3}>3 - Dor moderada</option>
                  <option value={4}>4 - Dor intensa ao tocar/alongar</option>
                  <option value={5}>5 - Dor extrema (Dificuldade de locomoção)</option>
                </select>
              </div>

              {/* Performance Drop Checkbox */}
              <div className="sm:col-span-2 flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="perfDrop"
                  checked={performanceDrop}
                  onChange={(e) => setPerformanceDrop(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="perfDrop" className="text-xs text-slate-300 cursor-pointer">
                  Notei queda na capacidade de carga ou perda inexplicável de força nas últimas sessões.
                </label>
              </div>

            </div>

            {/* Actionable Recommendation Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 mt-4">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
                <ShieldCheck className="h-4 w-4" />
                <span>Diretriz do Motor de Prescrição</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {fatigue.recommendedAction}
              </p>
            </div>

          </div>

        </div>

        {/* Right 1 Col: Logged Workout History */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>Sessões Recentes Registradas</span>
            </h3>

            {workoutLogs.length > 0 ? (
              <div className="space-y-3">
                {workoutLogs.map((log) => (
                  <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>Sessão {log.dayId} ({formatWorkoutLogDate(log.date)})</span>
                      <span className="text-cyan-400">RPE {log.sessionRPE}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {log.exerciseLogs.length} exercícios concluídos em {log.durationMin} min.
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center italic border border-dashed border-slate-800 rounded-xl space-y-2">
                <p>Nenhum treino manual registrado ainda nesta sessão.</p>
                <p className="text-[11px] text-cyan-400 font-medium">
                  Os gráficos acima exibem o histórico de tendência contínuo de 8 semanas.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
