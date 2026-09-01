import { UserProfile, WorkoutLog, FatigueAssessment } from '../types';

export type DeloadRecommendationLevel = 'none' | 'consider_volume_reduction' | 'deload_recommended';

export interface MultifactorialFatigueAnalysis {
  fatigueScore: number;
  status: 'optimal' | 'moderate' | 'high_fatigue' | 'deload_recommended';
  deloadLevel: DeloadRecommendationLevel;
  primaryDrivers: string[];
  explanation: string;
  professionalReferralRequired: boolean;
  professionalReferralReason?: string;
  actionGuidance: string;
  metrics: {
    volumeFactor: number;
    intensityRpeFactor: number;
    performanceTrend: 'improving' | 'stable' | 'regressing';
    sleepImpactScore: number;
    stressImpactScore: number;
    reportedPainScore: number;
    auxiliaryAcwrRatio: number | null;
  };
}

export interface FatigueEvaluationInput {
  profile: UserProfile;
  recentLogs: WorkoutLog[];
  subjectiveDOMS?: number;
  performanceDrop?: boolean;
  reportedPainAreas?: string[];
  reportedPainSeverity?: number;
}

const clamp = (value: number, min: number, max: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

/**
 * Multifactorial Fatigue Engine
 *
 * Rules:
 * - Never uses ACWR alone to trigger deload/stop.
 * - Evaluates volume, performance, RPE, RIR, pain/limitations, sleep and stress.
 * - Normalizes malformed numeric input so NaN/Infinity cannot corrupt the score.
 * - Does not diagnose injuries or medical conditions.
 */
export class MultifactorialFatigueEngine {
  static evaluate(input: FatigueEvaluationInput): MultifactorialFatigueAnalysis {
    const {
      profile,
      recentLogs = [],
      subjectiveDOMS = 2,
      performanceDrop = false,
      reportedPainAreas = [],
      reportedPainSeverity = 1,
    } = input;

    const drivers: string[] = [];
    const sleepHours = clamp(profile.sleepHours, 0, 24, 8);
    const doms = clamp(subjectiveDOMS, 1, 5, 2);
    const painSeverity = clamp(reportedPainSeverity, 1, 5, 1);
    const safeLogs = Array.isArray(recentLogs) ? recentLogs.filter(Boolean) : [];

    // 1. Sleep
    let sleepImpact = 0;
    if (sleepHours < 5.5) {
      sleepImpact = 25;
      drivers.push(`Sono restritivo (< 5.5h: ${sleepHours}h) pode comprometer recuperação.`);
    } else if (sleepHours < 7) {
      sleepImpact = 12;
      drivers.push(`Sono ligeiramente abaixo do ideal (${sleepHours}h/noite).`);
    } else if (sleepHours >= 8) {
      sleepImpact = -8;
    }

    // 2. Psychological/systemic stress
    let stressImpact = 0;
    if (profile.stressLevel === 'high') {
      stressImpact = 18;
      drivers.push('Nível de estresse relatado elevado, associado a maior demanda de recuperação.');
    } else if (profile.stressLevel === 'moderate') {
      stressImpact = 8;
    }

    // 3. Workout volume & intensity
    let volumeImpact = 10;
    let intensityImpact = 10;
    let avgRPE = 8;
    let totalCompletedSets = 0;

    if (safeLogs.length > 0) {
      const rpeSum = safeLogs.reduce((sum, log) => sum + clamp(log.sessionRPE || 8, 0, 10, 8), 0);
      avgRPE = Math.round((rpeSum / safeLogs.length) * 10) / 10;

      safeLogs.forEach((log) => {
        log.exerciseLogs?.forEach((exercise) => {
          totalCompletedSets += exercise.sets?.filter((set) => set.completed).length || 0;
        });
      });

      if (avgRPE >= 9.2) {
        intensityImpact = 22;
        drivers.push(`Intensidade média das sessões muito alta (RPE ${avgRPE}).`);
      } else if (avgRPE >= 8.5) {
        intensityImpact = 12;
      }

      if (totalCompletedSets > 65) {
        volumeImpact = 20;
        drivers.push(`Volume recente elevado (${totalCompletedSets} séries efetivas).`);
      } else if (totalCompletedSets > 45) {
        volumeImpact = 10;
      }
    }

    // 4. Performance trend
    let performanceImpact = 0;
    let performanceTrend: 'improving' | 'stable' | 'regressing' = 'stable';
    if (performanceDrop) {
      performanceImpact = 20;
      performanceTrend = 'regressing';
      drivers.push('Queda documentada na capacidade de carga ou repetições.');
    } else if (safeLogs.length >= 3) {
      performanceTrend = 'stable';
    }

    // 5. DOMS
    let domsImpact = 0;
    if (doms >= 4) {
      domsImpact = 15;
      drivers.push(`DOMS relatada em nível ${doms}/5.`);
    } else if (doms === 3) {
      domsImpact = 6;
    }

    // 6. Pain/limitations: safety filter, never a diagnosis
    let painImpact = 0;
    let professionalReferralRequired = false;
    let professionalReferralReason: string | undefined;
    const hasActiveLimitations = Array.isArray(profile.limitations) && profile.limitations.length > 0;
    const hasReportedPain = reportedPainAreas.length > 0 || painSeverity >= 3;

    if (hasReportedPain || hasActiveLimitations) {
      if (painSeverity >= 4) {
        painImpact = 25;
        professionalReferralRequired = true;
        professionalReferralReason =
          'Relato de desconforto/dor articular persistente de intensidade moderada a alta. O sistema não fornece diagnóstico médico. Recomenda-se avaliação presencial com médico especialista ou fisioterapeuta.';
        drivers.push(`Desconforto articular relatado (${reportedPainAreas.join(', ') || 'articulações'}) severidade ${painSeverity}/5.`);
      } else if (painSeverity >= 3 || hasActiveLimitations) {
        painImpact = 12;
        drivers.push('Sensibilidade articular/limitação mecânica em monitoramento.');
      }
    }

    // 7. Auxiliary workload ratio. It is informational only and cannot trigger deload by itself.
    let auxiliaryAcwr: number | null = null;
    if (safeLogs.length >= 2) {
      const getLogVolume = (log: WorkoutLog) => {
        let volume = 0;
        log.exerciseLogs?.forEach((exercise) =>
          exercise.sets?.forEach((set) => {
            if (set.completed) volume += Math.max(0, set.repsDone || 0) * Math.max(0, set.weightKg || 0);
          })
        );
        return volume || 1000;
      };

      const acute = safeLogs.slice(0, 2).reduce((acc, log) => acc + getLogVolume(log), 0);
      const totalAll = safeLogs.reduce((acc, log) => acc + getLogVolume(log), 0);
      const chronic = (totalAll / safeLogs.length) * 2;
      auxiliaryAcwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 1;

      if (auxiliaryAcwr > 1.4) {
        drivers.push(`Razão Agudo:Crônico elevada (ACWR ${auxiliaryAcwr}, métrica auxiliar).`);
      }
    }

    let calculatedScore = 20 + sleepImpact + stressImpact + volumeImpact + intensityImpact + performanceImpact + domsImpact + painImpact;
    calculatedScore = Math.min(100, Math.max(0, Math.round(calculatedScore)));

    let status: FatigueAssessment['status'] = 'optimal';
    let deloadLevel: DeloadRecommendationLevel = 'none';
    let actionGuidance = 'Recuperação adequada. Mantenha a progressão planejada e monitore desempenho, sono e percepção de esforço.';

    const hasConvergentFatigue =
      (calculatedScore >= 80 && (performanceDrop || avgRPE >= 9.0)) ||
      (calculatedScore >= 85 && sleepImpact >= 15);

    if (hasConvergentFatigue) {
      status = 'deload_recommended';
      deloadLevel = 'deload_recommended';
      actionGuidance =
        'DELOAD MULTIFATORIAL RECOMENDADO: múltiplos indicadores convergentes apontam acúmulo elevado de fadiga. Considere reduzir o volume por cerca de 7 dias e aumentar a margem de RIR, acompanhando a resposta individual.';
    } else if (calculatedScore >= 70 || performanceDrop) {
      status = 'high_fatigue';
      deloadLevel = 'consider_volume_reduction';
      actionGuidance =
        'Fadiga acumulada considerável. Evite aumentar o volume imediatamente e priorize recuperação antes de progredir.';
    } else if (calculatedScore >= 45) {
      status = 'moderate';
      deloadLevel = 'none';
      actionGuidance = 'Fadiga moderada. Continue o plano conforme tolerância e monitore recuperação e desempenho.';
    }

    if (professionalReferralRequired && professionalReferralReason) {
      actionGuidance += ` AVISO DE SAÚDE: ${professionalReferralReason}`;
    }

    const explanation = drivers.length > 0
      ? `Análise Multifatorial: ${drivers.join(' ')}`
      : 'Marcadores de recuperação sem sinais relevantes de acúmulo de fadiga.';

    return {
      fatigueScore: calculatedScore,
      status,
      deloadLevel,
      primaryDrivers: drivers,
      explanation,
      professionalReferralRequired,
      professionalReferralReason,
      actionGuidance,
      metrics: {
        volumeFactor: Math.min(100, Math.round((totalCompletedSets / 60) * 100)),
        intensityRpeFactor: Math.min(100, Math.round((avgRPE / 10) * 100)),
        performanceTrend,
        sleepImpactScore: Math.min(100, Math.max(0, Math.round(100 - sleepHours * 10))),
        stressImpactScore: profile.stressLevel === 'high' ? 85 : profile.stressLevel === 'moderate' ? 50 : 20,
        reportedPainScore: Math.min(100, Math.round(painSeverity * 20)),
        auxiliaryAcwrRatio: auxiliaryAcwr,
      },
    };
  }
}
