import {
  UserProfile,
  FullBodyProgram,
  WorkoutLog,
  AthleteContext,
  MuscleGroup,
} from '../types';
import { validateAndSanitizeProfile } from '../engine/workoutEngine';
import { MultifactorialFatigueEngine } from './fatigueEngine';
import { BodyCompositionService } from './bodyCompositionService';
import { ProgressionEngine } from './progressionEngine';
import { OneRepMaxCalculator } from './oneRepMaxService';

export class AthleteContextService {
  /**
   * Centralizes and sanitizes all athlete dimensions into a cohesive,
   * structured AthleteContext for the AI layer and deterministic engines.
   */
  static buildAthleteContext(
    rawProfile?: UserProfile | null,
    activeProgram?: FullBodyProgram | null,
    workoutLogs: WorkoutLog[] = []
  ): AthleteContext | null {
    if (!rawProfile) return null;

    const profile = validateAndSanitizeProfile(rawProfile);
    const safeLogs = Array.isArray(workoutLogs) ? workoutLogs.filter(Boolean) : [];

    // 1. Fatigue & Recovery Assessment
    const fatigueAnalysis = MultifactorialFatigueEngine.evaluate({
      profile,
      recentLogs: safeLogs,
    });

    // 2. Body Composition & Metabolic Nutrition Target
    const bodyCompTarget = BodyCompositionService.evaluateBodyCompositionTarget(profile);

    // 3. Periodization & 1RM Estimation
    const periodization = ProgressionEngine.analyzePeriodization(safeLogs);

    // 4. Distinct training days
    const distinctTrainingDates = new Set(
      safeLogs
        .map((l) => l.date)
        .filter((d): d is string => typeof d === 'string' && d.length > 0)
    ).size;

    // 5. Structure Program Data if available
    let programData: AthleteContext['programaPeriodizado'] = undefined;
    if (activeProgram && Array.isArray(activeProgram.splitDays)) {
      programData = {
        id: activeProgram.id,
        metodologia: activeProgram.methodology || 'FULL_BODY',
        diasTotais: activeProgram.splitDays.length,
        distribuicao: activeProgram.splitDays.map((d) => ({
          dia: d.id,
          titulo: d.title,
          foco: d.focusMuscles || [],
          tempoMin: d.estimatedTimeMin || profile.timePerSessionMin,
          exerciciosPrescritos: (d.items || []).map((i) => ({
            exercicio: i.exercise.nome,
            padraoMotor: i.exercise.padraoMotor,
            grupoMuscular: i.exercise.grupoMuscular,
            series: i.targetSets,
            reps: i.targetReps,
            rir: i.targetRIR,
            rpe: i.targetRPE,
            descansoSec: i.targetRestSec,
            cadencia: i.cadence,
          })),
        })),
        volumeSemanalPorGrupo: activeProgram.weeklyVolumeMap,
      };
    }

    return {
      atleta: {
        nome: profile.name,
        genero: profile.gender,
        idade: profile.age,
        pesoKg: profile.weightKg,
        alturaCm: profile.heightCm,
        experiencia: profile.experience,
        diasDisponiveis: profile.availableDays,
        tempoPorSessaoMin: profile.timePerSessionMin,
        objetivo: profile.objective,
        ambiente: profile.environment,
        prioridades: profile.priorities || [],
        limitacoesFisicas: profile.limitations || [],
        exerciciosProibidos: profile.forbiddenExercises || [],
        horasSono: profile.sleepHours,
        nivelEstresse: profile.stressLevel,
      },
      programaPeriodizado: programData,
      fadigaERecuperacao: {
        scoreFadiga: fatigueAnalysis.fatigueScore,
        status: fatigueAnalysis.status,
        nivelDeload: fatigueAnalysis.deloadLevel,
        driversPrincipais: fatigueAnalysis.primaryDrivers,
        rpeMedioRecente: fatigueAnalysis.metrics.intensityRpeFactor / 10,
        totalSeriesRecentes: Math.round((fatigueAnalysis.metrics.volumeFactor / 100) * 60),
        tendenciaDesempenho: fatigueAnalysis.metrics.performanceTrend,
        orientacaoAcao: fatigueAnalysis.actionGuidance,
        alertaDorOuLimitacao: fatigueAnalysis.professionalReferralReason,
      },
      metasEComposicaoCorporal: {
        metaPesoKg: profile.objective === 'hypertrophy'
          ? Math.round((profile.weightKg + 3) * 10) / 10
          : profile.objective === 'fat_loss'
            ? Math.max(0, Math.round((profile.weightKg - 4) * 10) / 10)
            : profile.weightKg,
        semanasEstimadas: profile.objective === 'hypertrophy' ? 12 : profile.objective === 'fat_loss' ? 10 : 8,
        caloriasDiariasRecomendadas: bodyCompTarget.nutritionalRecommendation.recommendedDailyCalories,
        macrosG: {
          proteinas: bodyCompTarget.nutritionalRecommendation.macroRatio.proteinGrams,
          carboidratos: bodyCompTarget.nutritionalRecommendation.macroRatio.carbsGrams,
          gorduras: bodyCompTarget.nutritionalRecommendation.macroRatio.fatsGrams,
        },
        focoTreino: bodyCompTarget.trainingFocus,
      },
      progressaoEHistoricoRecente: {
        totalSessoesRegistradas: safeLogs.length,
        diasConsecutivosTreinados: distinctTrainingDates,
        estimativa1RM: {
          agachamento: periodization.estimated1RM.squat.valueKg || undefined,
          supino: periodization.estimated1RM.bench.valueKg || undefined,
          terra: periodization.estimated1RM.deadlift.valueKg || undefined,
          desenvolvimento: periodization.estimated1RM.overhead.valueKg || undefined,
        },
        statusPeriodizacao: periodization.overallFatigueStatus,
        necessitaDeload: periodization.isDeloadNeeded,
      },
    };
  }
}
