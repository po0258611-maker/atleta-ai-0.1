import { UserProfile } from '../types';
import { calculateDietMetrics, DietGoal } from '../engine/dietEngine';

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

export class BodyCompositionService {
  static evaluateBodyCompositionTarget(profile: UserProfile, userSpecifiedBodyFatGoal?: number | null): BodyCompositionTarget {
    const bodyFatTarget: BodyFatTargetState = typeof userSpecifiedBodyFatGoal === 'number' && Number.isFinite(userSpecifiedBodyFatGoal) && userSpecifiedBodyFatGoal > 0 && userSpecifiedBodyFatGoal < 60
      ? {
          status: 'provided_by_user',
          valuePct: userSpecifiedBodyFatGoal,
          type: 'goal',
          label: `Meta definida pelo usuário: ${userSpecifiedBodyFatGoal}%`,
          disclaimer: 'Objetivo individual informado pelo usuário; acompanhe evolução e aderência ao plano.',
        }
      : {
          status: 'not_specified',
          valuePct: null,
          type: 'estimate',
          label: 'Percentual de gordura não informado',
          disclaimer: 'O sistema não prescreve um percentual universal de gordura corporal.',
        };

    const dietGoal: DietGoal = profile.objective === 'fat_loss'
      ? 'cutting'
      : profile.objective === 'hypertrophy' || profile.objective === 'strength'
      ? 'hypertrophy'
      : 'maintenance';
    const metrics = calculateDietMetrics(profile, dietGoal);

    return {
      userObjective: profile.objective,
      bodyFatTarget,
      nutritionalRecommendation: {
        recommendedDailyCalories: metrics.targetCalories,
        macroRatio: {
          proteinGrams: metrics.proteinGrams,
          carbsGrams: metrics.carbGrams,
          fatsGrams: metrics.fatGrams,
        },
        disclaimer: 'Estimativa nutricional de apoio. O aplicativo não faz diagnósticos médicos nem garante desfechos estéticos.',
      },
      trainingFocus: profile.objective === 'fat_loss'
        ? 'Preservação de desempenho e massa magra durante a redução de gordura.'
        : profile.objective === 'hypertrophy' || profile.objective === 'strength'
        ? 'Progressão de força/hipertrofia com margem de recuperação adequada.'
        : 'Desenvolvimento equilibrado de força, condicionamento e capacidades motoras.',
    };
  }
}
