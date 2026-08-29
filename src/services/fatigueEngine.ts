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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class MultifactorialFatigueEngine {
  static evaluate(input: FatigueEvaluationInput): MultifactorialFatigueAnalysis {
    const profile = input.profile;
    const logs = [...(input.recentLogs || [])]
      .filter((log) => log && Number.isFinite(Date.parse(log.date)))
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const subjectiveDOMS = clamp(Number.isFinite(input.subjectiveDOMS) ? Number(input.subjectiveDOMS) : 2, 1, 5);
    const performanceDrop = input.performanceDrop === true;
    const reportedPainAreas = Array.isArray(input.reportedPainAreas) ? input.reportedPainAreas.filter(Boolean).slice(0, 20) : [];
    const reportedPainSeverity = clamp(Number.isFinite(input.reportedPainSeverity) ? Number(input.reportedPainSeverity) : 1, 1, 5);
    const drivers: string[] = [];

    let sleepImpact = 0;
    if (profile.sleepHours < 5.5) {
      sleepImpact = 25;
      drivers.push(`Sono muito reduzido (${profile.sleepHours}h).`);
    } else if (profile.sleepHours < 7) {
      sleepImpact = 12;
      drivers.push(`Sono abaixo de 7h (${profile.sleepHours}h).`);
    } else if (profile.sleepHours >= 8) {
      sleepImpact = -8;
    }

    let stressImpact = 0;
    if (profile.stressLevel === 'high') {
      stressImpact = 18;
      drivers.push('Estresse percebido elevado.');
    } else if (profile.stressLevel === 'moderate') {
      stressImpact = 8;
    }

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentWeekLogs = logs.filter((log) => Date.parse(log.date) >= weekAgo);
    let avgRPE = 8;
    let totalCompletedSets = 0;

    if (recentWeekLogs.length) {
      const validRpes = recentWeekLogs
        .map((l) => Number(l.sessionRPE))
        .filter((rpe) => Number.isFinite(rpe))
        .map((rpe) => clamp(rpe, 0, 10));
      if (validRpes.length) avgRPE = Math.round((validRpes.reduce((sum, rpe) => sum + rpe, 0) / validRpes.length) * 10) / 10;

      recentWeekLogs.forEach((log) => {
        log.exerciseLogs?.forEach((exerciseLog) => {
          totalCompletedSets += exerciseLog.sets?.filter((set) => set.completed && set.repsDone > 0).length || 0;
        });
      });
    }

    let volumeImpact = 0;
    if (totalCompletedSets > 65) {
      volumeImpact = 20;
      drivers.push(`Volume efetivo nos últimos 7 dias elevado (${totalCompletedSets} séries).`);
    } else if (totalCompletedSets > 45) {
      volumeImpact = 10;
    } else if (totalCompletedSets < 10 && recentWeekLogs.length >= 2) {
      volumeImpact = -4;
    }

    let intensityImpact = 0;
    if (avgRPE >= 9.2) {
      intensityImpact = 22;
      drivers.push(`RPE médio semanal elevado (${avgRPE}).`);
    } else if (avgRPE >= 8.5) {
      intensityImpact = 12;
    } else if (avgRPE <= 6.5 && recentWeekLogs.length >= 2) {
      intensityImpact = -3;
    }

    let performanceImpact = 0;
    let performanceTrend: 'improving' | 'stable' | 'regressing' = 'stable';
    if (performanceDrop) {
      performanceImpact = 20;
      performanceTrend = 'regressing';
      drivers.push('Queda de desempenho reportada.');
    } else if (logs.length >= 3) {
      const recent = logs.slice(0, 2).reduce((sum, log) => sum + (Number(log.sessionRPE) || 0), 0);
      const previous = logs.slice(2, 4).reduce((sum, log) => sum + (Number(log.sessionRPE) || 0), 0);
      if (previous > 0 && recent < previous) performanceTrend = 'improving';
    }

    let domsImpact = 0;
    if (subjectiveDOMS >= 4) {
      domsImpact = 15;
      drivers.push(`DOMS elevada (${subjectiveDOMS}/5).`);
    } else if (subjectiveDOMS === 3) {
      domsImpact = 6;
    }

    const hasActiveLimitations = profile.limitations.length > 0;
    const hasReportedPain = reportedPainAreas.length > 0 || reportedPainSeverity >= 3;
    let painImpact = 0;
    let professionalReferralRequired = false;
    let professionalReferralReason: string | undefined;

    if (hasReportedPain) {
      painImpact = reportedPainSeverity >= 4 ? 25 : 12;
      if (reportedPainSeverity >= 4 || reportedPainAreas.length > 0) {
        professionalReferralRequired = true;
        professionalReferralReason = 'Há relato de dor/desconforto que não deve ser diagnosticado pelo aplicativo. Procure avaliação presencial de profissional habilitado antes de insistir no movimento doloroso.';
      }
      drivers.push(`Dor/desconforto relatado${reportedPainAreas.length ? ` em ${reportedPainAreas.join(', ')}` : ''} (${reportedPainSeverity}/5).`);
    } else if (hasActiveLimitations) {
      painImpact = 6;
      drivers.push('Limitações físicas cadastradas; a seleção de exercícios deve permanecer conservadora.');
    }

    let auxiliaryAcwr: number | null = null;
    if (logs.length >= 4) {
      const getSessionLoad = (log: WorkoutLog) => log.exerciseLogs?.reduce((total, ex) => total + (ex.sets || []).reduce((sum, set) => set.completed ? sum + Math.max(0, set.repsDone || 0) * Math.max(0, set.weightKg || 0) : sum, 0), 0) || 0;
      const acuteLoad = logs.slice(0, 1).reduce((sum, log) => sum + getSessionLoad(log), 0);
      const chronicLogs = logs.slice(1, 5);
      const chronicAverage = chronicLogs.length ? chronicLogs.reduce((sum, log) => sum + getSessionLoad(log), 0) / chronicLogs.length : 0;
      auxiliaryAcwr = chronicAverage > 0 ? Math.round((acuteLoad / chronicAverage) * 100) / 100 : null;
      if (auxiliaryAcwr !== null && auxiliaryAcwr > 1.4) drivers.push(`ACWR auxiliar elevado (${auxiliaryAcwr}).`);
    }

    let calculatedScore = 20 + sleepImpact + stressImpact + volumeImpact + intensityImpact + performanceImpact + domsImpact + painImpact;
    calculatedScore = clamp(Math.round(calculatedScore), 0, 100);

    let status: FatigueAssessment['status'] = 'optimal';
    let deloadLevel: DeloadRecommendationLevel = 'none';
    let actionGuidance = 'Recuperação compatível com continuidade do plano. Mantenha técnica, registro de desempenho e progressão gradual.';

    const strongSignals = [
      performanceDrop,
      avgRPE >= 9.2,
      subjectiveDOMS >= 4,
      sleepImpact >= 25,
      reportedPainSeverity >= 4 && hasReportedPain,
      totalCompletedSets > 65,
    ].filter(Boolean).length;

    if (strongSignals >= 3 || (calculatedScore >= 80 && strongSignals >= 2)) {
      status = 'deload_recommended';
      deloadLevel = 'deload_recommended';
      actionGuidance = 'Reduza temporariamente o volume e mantenha maior margem de repetições em reserva. Se houver dor relevante, suspenda o movimento doloroso e procure avaliação profissional.';
    } else if (calculatedScore >= 70 || strongSignals >= 2) {
      status = 'high_fatigue';
      deloadLevel = 'consider_volume_reduction';
      actionGuidance = 'Não aumente volume nesta sessão. Priorize recuperação e use o desempenho das próximas sessões para decidir a progressão.';
    } else if (calculatedScore >= 45) {
      status = 'moderate';
      actionGuidance = 'Fadiga moderada. Mantenha o plano e ajuste apenas se o desempenho ou a recuperação continuarem a piorar.';
    }

    if (professionalReferralRequired && professionalReferralReason) actionGuidance += ` ${professionalReferralReason}`;

    return {
      fatigueScore: calculatedScore,
      status,
      deloadLevel,
      primaryDrivers: drivers,
      explanation: drivers.length ? `Análise multifatorial: ${drivers.join(' ')}` : 'Sem sinais relevantes de acúmulo excessivo de fadiga nos dados informados.',
      professionalReferralRequired,
      professionalReferralReason,
      actionGuidance,
      metrics: {
        volumeFactor: clamp(Math.round((totalCompletedSets / 60) * 100), 0, 100),
        intensityRpeFactor: clamp(Math.round((avgRPE / 10) * 100), 0, 100),
        performanceTrend,
        sleepImpactScore: clamp(Math.round(Math.max(0, 100 - profile.sleepHours * 10)), 0, 100),
        stressImpactScore: profile.stressLevel === 'high' ? 85 : profile.stressLevel === 'moderate' ? 50 : 20,
        reportedPainScore: hasReportedPain ? clamp(reportedPainSeverity * 20, 0, 100) : 0,
        auxiliaryAcwrRatio: auxiliaryAcwr,
      },
    };
  }
}
