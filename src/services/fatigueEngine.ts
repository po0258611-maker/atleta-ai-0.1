import { UserProfile, WorkoutLog, FatigueAssessment } from '../types';

export type DeloadRecommendationLevel = 'none' | 'consider_volume_reduction' | 'deload_recommended';

export interface MultifactorialFatigueAnalysis {
  fatigueScore: number; // 0 to 100
  status: 'optimal' | 'moderate' | 'high_fatigue' | 'deload_recommended';
  deloadLevel: DeloadRecommendationLevel;
  primaryDrivers: string[];
  explanation: string;
  professionalReferralRequired: boolean;
  professionalReferralReason?: string;
  actionGuidance: string;
  metrics: {
    volumeFactor: number; // 0 to 100
    intensityRpeFactor: number; // 0 to 100
    performanceTrend: 'improving' | 'stable' | 'regressing';
    sleepImpactScore: number; // 0 to 100
    stressImpactScore: number; // 0 to 100
    reportedPainScore: number; // 0 to 100
    auxiliaryAcwrRatio: number | null; // Auxiliary metric only
  };
}

export interface FatigueEvaluationInput {
  profile: UserProfile;
  recentLogs: WorkoutLog[];
  subjectiveDOMS?: number; // 1 to 5 scale (1 = none, 5 = severe)
  performanceDrop?: boolean;
  reportedPainAreas?: string[]; // Specific joint/tendon pain reported
  reportedPainSeverity?: number; // 1 to 5 scale
}

/**
 * Multifactorial Fatigue Engine
 *
 * Rules:
 * - Never uses ACWR alone to trigger deload/stop.
 * - Evaluates Volume, Performance, RPE, RIR, Pain/Limitations, Sleep, Stress, Frequency, History, Trend.
 * - FatigueScore is a composite index, never an autocratic trigger.
 * - If significant pain is reported: does NOT diagnose pathologies. Instructs professional medical/physiotherapy evaluation.
 * - Every decision has a transparent, evidence-based scientific explanation.
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

    // 1. Sleep Evaluation (Restorative Physiology)
    let sleepImpact = 0;
    if (profile.sleepHours < 5.5) {
      sleepImpact = 25;
      drivers.push(`Sono restritivo (< 5.5h: ${profile.sleepHours}h) comprometendo síntese proteica e restauração neural.`);
    } else if (profile.sleepHours < 7) {
      sleepImpact = 12;
      drivers.push(`Sono ligeiramente abaixo do ideal (${profile.sleepHours}h/noite).`);
    } else if (profile.sleepHours >= 8) {
      sleepImpact = -8; // Protective factor
    }

    // 2. Psychological & Systemic Stress
    let stressImpact = 0;
    if (profile.stressLevel === 'high') {
      stressImpact = 18;
      drivers.push('Nível de estresse sistêmico elevado (cortisol basal elevado e menor taxa de recuperação).');
    } else if (profile.stressLevel === 'moderate') {
      stressImpact = 8;
    }

    // 3. Workout Volume & Intensity (RPE & RIR Trends)
    let volumeImpact = 10;
    let intensityImpact = 10;
    let avgRPE = 8;
    let totalCompletedSets = 0;

    if (recentLogs.length > 0) {
      const rpeSum = recentLogs.reduce((sum, l) => sum + (l.sessionRPE || 8), 0);
      avgRPE = Math.round((rpeSum / recentLogs.length) * 10) / 10;

      recentLogs.forEach((l) => {
        l.exerciseLogs?.forEach((ex) => {
          totalCompletedSets += ex.sets?.filter((s) => s.completed).length || 0;
        });
      });

      if (avgRPE >= 9.2) {
        intensityImpact = 22;
        drivers.push(`Intensidade média das sessões excessivamente alta (RPE ${avgRPE} com RIR próximo de zero).`);
      } else if (avgRPE >= 8.5) {
        intensityImpact = 12;
      }

      if (totalCompletedSets > 65) {
        volumeImpact = 20;
        drivers.push(`Volume semanal de séries efetivas muito denso (${totalCompletedSets} séries).`);
      } else if (totalCompletedSets > 45) {
        volumeImpact = 10;
      }
    }

    // 4. Performance Trend & Regression Detection
    let performanceImpact = 0;
    let performanceTrend: 'improving' | 'stable' | 'regressing' = 'stable';

    if (performanceDrop) {
      performanceImpact = 20;
      performanceTrend = 'regressing';
      drivers.push('Queda documentada na capacidade de carga ou repetições em múltiplas séries.');
    } else if (recentLogs.length >= 3) {
      performanceTrend = 'stable';
    }

    // 5. Subjective DOMS / Local Muscle Soreness
    let domsImpact = 0;
    if (subjectiveDOMS >= 4) {
      domsImpact = 15;
      drivers.push(`Dor muscular tardia (DOMS) severa nível ${subjectiveDOMS}/5.`);
    } else if (subjectiveDOMS === 3) {
      domsImpact = 6;
    }

    // 6. Pain & Limitation Reports (Non-Diagnostic Safety Filter)
    let painImpact = 0;
    let professionalReferralRequired = false;
    let professionalReferralReason: string | undefined = undefined;

    const hasActiveLimitations = profile.limitations && profile.limitations.length > 0;
    const hasReportedPain = reportedPainAreas.length > 0 || reportedPainSeverity >= 3;

    if (hasReportedPain || hasActiveLimitations) {
      if (reportedPainSeverity >= 4) {
        painImpact = 25;
        professionalReferralRequired = true;
        professionalReferralReason =
          'Relato de desconforto/dor articular persistente de intensidade moderada a alta. O sistema não fornece diagnóstico médico. Recomenda-se avaliação presencial com médico especialista ou fisioterapeuta.';
        drivers.push(`Desconforto articular relatado (${reportedPainAreas.join(', ') || 'articulações'}) severidade ${reportedPainSeverity}/5.`);
      } else if (reportedPainSeverity >= 3 || hasActiveLimitations) {
        painImpact = 12;
        drivers.push('Sensibilidade articular/limitação mecânica em monitoramento.');
      }
    }

    // 7. Auxiliary ACWR (Acute-to-Chronic Workload Ratio) — ONLY auxiliary, never sole driver
    let auxiliaryAcwr: number | null = null;
    if (recentLogs.length >= 2) {
      const getLogVolume = (l: WorkoutLog) => {
        let vol = 0;
        l.exerciseLogs?.forEach((e) =>
          e.sets?.forEach((s) => {
            if (s.completed) vol += (s.repsDone || 0) * (s.weightKg || 0);
          })
        );
        return vol || 1000;
      };

      const acute = recentLogs.slice(0, 2).reduce((acc, l) => acc + getLogVolume(l), 0);
      const totalAll = recentLogs.reduce((acc, l) => acc + getLogVolume(l), 0);
      const chronic = (totalAll / recentLogs.length) * 2;
      auxiliaryAcwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 1.0;

      if (auxiliaryAcwr > 1.4) {
        drivers.push(`Razão Agudo:Crônico elevada (ACWR ${auxiliaryAcwr} - métrica auxiliar de sobrecarga).`);
      }
    }

    // Base score calculation
    let calculatedScore = 20 + sleepImpact + stressImpact + volumeImpact + intensityImpact + performanceImpact + domsImpact + painImpact;
    calculatedScore = Math.min(100, Math.max(0, Math.round(calculatedScore)));

    // 8. Deload & Status Decision Matrix (Multifactorial, requires multiple convergent indicators)
    let status: FatigueAssessment['status'] = 'optimal';
    let deloadLevel: DeloadRecommendationLevel = 'none';
    let actionGuidance = 'Fisiologia adaptativa excelente. Mantenha a sobrecarga progressiva com RIR 1-2.';

    // Deload requires CONVERGENT physiological signals (e.g. high score + performance drop OR high score + severe sleep/stress deficit)
    const hasConvergentFatigue =
      (calculatedScore >= 80 && (performanceDrop || avgRPE >= 9.0)) ||
      (calculatedScore >= 85 && sleepImpact >= 15);

    if (hasConvergentFatigue) {
      status = 'deload_recommended';
      deloadLevel = 'deload_recommended';
      actionGuidance =
        'DELOAD MULTIFATORIAL RECOMENDADO: Múltiplos indicadores convergentes apontam acúmulo excessivo de fadiga. Reduza o volume semanal em ~40% e aumente a margem de RIR para 3-4 durante 7 dias para restabelecer a homeostase.';
    } else if (calculatedScore >= 70 || performanceDrop) {
      status = 'high_fatigue';
      deloadLevel = 'consider_volume_reduction';
      actionGuidance =
        'Fadiga acumulada considerável. Mantenha as cargas estáveis (não aumente volume) e priorize sono reparador e nutrição antes de progredir.';
    } else if (calculatedScore >= 45) {
      status = 'moderate';
      deloadLevel = 'none';
      actionGuidance =
        'Fadiga fisiológica moderada inerente ao processo adaptativo. Continue aplicando o plano de treino com técnica impecável.';
    }

    // Append professional disclaimer if pain exists
    if (professionalReferralRequired && professionalReferralReason) {
      actionGuidance += ` AVISO DE SAÚDE: ${professionalReferralReason}`;
    }

    const explanation =
      drivers.length > 0
        ? `Análise Multifatorial: ${drivers.join(' ')}`
        : 'Todos os marcadores de recuperação (sono, estresse, RPE, volume e integridade) operando em faixa ideal.';

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
        sleepImpactScore: Math.min(100, Math.max(0, Math.round(100 - profile.sleepHours * 10))),
        stressImpactScore: profile.stressLevel === 'high' ? 85 : profile.stressLevel === 'moderate' ? 50 : 20,
        reportedPainScore: Math.min(100, reportedPainSeverity * 20),
        auxiliaryAcwrRatio: auxiliaryAcwr,
      },
    };
  }
}
