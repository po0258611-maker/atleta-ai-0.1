export const PLAN_CATALOG = {
  PRO: {
    slug: 'PRO' as const,
    amountCents: 1500,
    priceBrl: 15,
  },
  APEX_ELITE: {
    slug: 'APEX_ELITE' as const,
    amountCents: 12000,
    priceBrl: 120,
  },
} as const;

export type PaidPlanSlug = keyof typeof PLAN_CATALOG;

export function getPaidPlan(slug: unknown) {
  if (typeof slug !== 'string' || !(slug in PLAN_CATALOG)) {
    return null;
  }
  return PLAN_CATALOG[slug as PaidPlanSlug];
}
