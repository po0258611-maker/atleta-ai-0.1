export type FeatureKey =
  | 'AI_COACH_MESSAGES'
  | 'VIDEO_BIOMECHANICS'
  | 'ADVANCED_PERIODIZATION'
  | 'PDF_EXPORT_UNLIMITED'
  | 'DRIVE_CLOUD_SYNC';

export interface FeatureRule {
  enabled: boolean;
  monthlyLimit: number; // -1 for unlimited, 0 for disabled, >0 for strictly capped
}

export interface PlanDefinition {
  id: string;
  slug: string;
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
    },
  },
  PREMIUM: {
    id: 'plan_premium',
    slug: 'PREMIUM',
    name: 'Plano Atleta PRO & APEX',
    priceCents: 2990,
    features: {
      AI_COACH_MESSAGES: { enabled: true, monthlyLimit: -1 }, // Unlimited
      VIDEO_BIOMECHANICS: { enabled: true, monthlyLimit: 30 },
      ADVANCED_PERIODIZATION: { enabled: true, monthlyLimit: -1 },
      PDF_EXPORT_UNLIMITED: { enabled: true, monthlyLimit: -1 },
      DRIVE_CLOUD_SYNC: { enabled: true, monthlyLimit: -1 },
    },
  },
};
