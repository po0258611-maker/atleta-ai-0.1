export type FeatureKey =
  | 'AI_COACH_MESSAGES'
  | 'VIDEO_BIOMECHANICS'
  | 'ADVANCED_PERIODIZATION'
  | 'PDF_EXPORT_UNLIMITED'
  | 'DRIVE_CLOUD_SYNC'
  | 'APEX_EXCLUSIVE_FEATURES';

export interface FeatureRule {
  enabled: boolean;
  monthlyLimit: number; // -1 for unlimited, 0 for disabled, >0 for strictly capped
}

export type PlanSlug = 'FREE' | 'PRO' | 'APEX_ELITE';

export interface PlanDefinition {
  id: string;
  slug: PlanSlug;
  name: string;
  priceCents: number;
  features: Record<FeatureKey, FeatureRule>;
}

export const PLAN_DEFINITIONS: Record<string, PlanDefinition> = {
  FREE: {
    id: 'plan_free',
    slug: 'FREE',
    name: 'Plano Gratuito Atleta AI',
    priceCents: 0,
    features: {
      AI_COACH_MESSAGES: { enabled: true, monthlyLimit: 10 },
      VIDEO_BIOMECHANICS: { enabled: true, monthlyLimit: 1 },
      ADVANCED_PERIODIZATION: { enabled: false, monthlyLimit: 0 },
      PDF_EXPORT_UNLIMITED: { enabled: true, monthlyLimit: 2 },
      DRIVE_CLOUD_SYNC: { enabled: true, monthlyLimit: 5 },
      APEX_EXCLUSIVE_FEATURES: { enabled: false, monthlyLimit: 0 },
    },
  },
  PRO: {
    id: 'plan_pro',
    slug: 'PRO',
    name: 'Plano Atleta PRO',
    priceCents: 1500, // R$ 15,00/mês
    features: {
      AI_COACH_MESSAGES: { enabled: true, monthlyLimit: -1 }, // Unlimited AI Coach
      VIDEO_BIOMECHANICS: { enabled: true, monthlyLimit: 30 },
      ADVANCED_PERIODIZATION: { enabled: true, monthlyLimit: -1 },
      PDF_EXPORT_UNLIMITED: { enabled: true, monthlyLimit: -1 },
      DRIVE_CLOUD_SYNC: { enabled: true, monthlyLimit: -1 },
      APEX_EXCLUSIVE_FEATURES: { enabled: false, monthlyLimit: 0 },
    },
  },
  APEX_ELITE: {
    id: 'plan_apex_elite',
    slug: 'APEX_ELITE',
    name: 'Plano Atleta APEX Elite',
    priceCents: 12000, // R$ 120,00/ano
    features: {
      AI_COACH_MESSAGES: { enabled: true, monthlyLimit: -1 }, // Unlimited Priority AI Coach
      VIDEO_BIOMECHANICS: { enabled: true, monthlyLimit: -1 }, // Unlimited Biomechanics
      ADVANCED_PERIODIZATION: { enabled: true, monthlyLimit: -1 },
      PDF_EXPORT_UNLIMITED: { enabled: true, monthlyLimit: -1 },
      DRIVE_CLOUD_SYNC: { enabled: true, monthlyLimit: -1 },
      APEX_EXCLUSIVE_FEATURES: { enabled: true, monthlyLimit: -1 }, // Exclusive APEX analytics and priority models
    },
  },
};

// Backward-compatible alias for any legacy references
PLAN_DEFINITIONS.PREMIUM = PLAN_DEFINITIONS.PRO;

