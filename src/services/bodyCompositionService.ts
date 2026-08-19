import { UserProfile } from '../types';

/**
 * Body Composition Target Types:
 * - goal: User's explicitly chosen preference/goal
 * - target: Operational training target
 * - recommendation: Evidence-based suggestion
 * - estimate: Mathematical physiological estimate based on formulas
 */
export type BodyCompositionMetricType = 'goal' | 'target' | 'recommendation' | 'estimate';

export interface BodyFatTargetState {
  status: 'provided_by_user' | 'not_specified';
  valuePct: number | null;
  type: BodyCompositionMetricType;
  label: string;
  disclaimer: string;
}

export interface BodyCompositionTarget {
  userObjective: string;
  bodyFatTarget: BodyFatTargetState;
  nutritionalRecommendation: {
    recommendedDailyCalories: number;
    macroRatio: {
      proteinGrams: number;
      carbsGrams: number;
      fatsGrams: number;
    };
    disclaimer: string;
  };
  trainingFocus: string;
}

/**
 * Service to manage body composition targets without universal body fat prescriptions.
 *
 * Rules:
 * - Never invents 12%, 14%, 15% as universal goals.
 * - If user provides target: registered as user preference ('goal').
 * - If not provided: returned as 'not_specified' with null value.
 * - No medical diagnoses or result guarantees.
 * - Focus strictly maintained on progressive resistance training.
 */
export class BodyCompositionService {
  static evaluateBodyCompositionTarget(
    profile: UserProfile,
    userSpecifiedBodyFatGoal?: number | null
  ): BodyCompositionTarget {
    const isHypertrophy = profile.objective === 'hypertrophy' || profile.objective === 'strength';
    const isLoss = profile.objective === 'fat_loss';

    // 1. Body fat target evaluation
    let bodyFatTarget: BodyFatTargetState;

    if (typeof userSpecifiedBodyFatGoal === 'number' && userSpecifiedBodyFatGoal > 0 && userSpecifiedBodyFatGoal < 60) {
      bodyFatTarget = {
        status: 'provided_by_user',
        valuePct: userSpecifiedBodyFatGoal,
        type: 'goal',
        label: `Meta definida pelo usuário: ${userSpecifiedBodyFatGoal}%`,
        disclaimer: 'Objetivo individual informado pelo usuário. Acompanhe a evolução de força e aderência ao treinamento.',
      };
    } else {
      bodyFatTarget = {
        status: 'not_specified',
        valuePct: null,
        type: 'estimate',
        label: 'Percentual de gordura não informado (foco no desempenho de treino)',
        disclaimer: 'O sistema não prescreve percentuais de gordura universais arbitrários. O progresso é avaliado pela sobrecarga progressiva e composição corporal real.',
      };
    }

    // 2. Caloric and macronutrient nutritional recommendations (Mifflin-St Jeor)
    const bmr =
      10 * profile.weightKg +
      6.25 * profile.heightCm -
      5 * profile.age +
      (profile.gender === 'male' ? 5 : -161);

    const activityFactor = profile.availableDays >= 4 ? 1.55 : 1.375;
    const maintenanceCal = Math.round(bmr * activityFactor);

    const recommendedDailyCalories = isHypertrophy
      ? maintenanceCal + 300
      : isLoss
      ? maintenanceCal - 400
      : maintenanceCal;

    const proteinGrams = Math.round(profile.weightKg * (isLoss ? 2.2 : 2.0));
    const fatsGrams = Math.round(profile.weightKg * 0.9);
    const remainingCals = recommendedDailyCalories - (proteinGrams * 4 + fatsGrams * 9);
    const carbsGrams = Math.max(50, Math.round(remainingCals / 4));

    return {
      userObjective: profile.objective,
      bodyFatTarget,
      nutritionalRecommendation: {
        recommendedDailyCalories,
        macroRatio: {
          proteinGrams,
          carbsGrams,
          fatsGrams,
        },
        disclaimer: 'Estimativa nutricional de apoio. O aplicativo não faz diagnósticos médicos nem garante desfechos estéticos.',
      },
      trainingFocus: isHypertrophy
        ? 'Estímulo de hipertrofia com progressão de sobrecarga (RIR 1-2)'
        : isLoss
        ? 'Preservação de massa magra e volume neuromuscular de alta qualidade'
        : 'Desenvolvimento equilibrado de força e capacidades motoras',
    };
  }
}
