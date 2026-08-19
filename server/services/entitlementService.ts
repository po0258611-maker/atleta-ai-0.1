import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { usageRepository } from '../repositories/usageRepository';
import { PLAN_DEFINITIONS, FeatureKey, PlanDefinition } from '../domain/planDefinitions';
import { ServerSubscription, SubscriptionStatus } from '../domain/subscriptionModel';

export interface AccessEvaluation {
  granted: boolean;
  reason?: 'GRANTED' | 'FEATURE_NOT_IN_PLAN' | 'MONTHLY_QUOTA_EXCEEDED' | 'SUBSCRIPTION_EXPIRED' | 'NO_SUBSCRIPTION';
  currentUsage: number;
  limit: number;
  remaining: number;
  planSlug: string;
}

export class EntitlementService {
  /**
   * Resolves plan strictly based on server-side database status
   * Never trusts client headers or requests
   */
  async resolveUserPlan(userId: string): Promise<{
    plan: PlanDefinition;
    isFallback: boolean;
    status: SubscriptionStatus;
    subscription: ServerSubscription | null;
  }> {
    const sub = await subscriptionServerRepository.findByUserId(userId);

    if (!sub) {
      return {
        plan: PLAN_DEFINITIONS.FREE,
        isFallback: true,
        status: 'expired',
        subscription: null,
      };
    }

    const now = Date.now();
    const periodEnd = new Date(sub.currentPeriodEnd).getTime();
    const isExpired = periodEnd < now;

    // Only 'active' and 'trialing' grant premium entitlements
    const isEntitled = (sub.status === 'active' || sub.status === 'trialing') && !isExpired;

    if (!isEntitled) {
      const effectiveStatus: SubscriptionStatus = isExpired ? 'expired' : sub.status;
      return {
        plan: PLAN_DEFINITIONS.FREE,
        isFallback: true,
        status: effectiveStatus,
        subscription: sub,
      };
    }

    const planKey = sub.planId === 'PRO' || sub.planId === 'APEX_ELITE' ? 'PREMIUM' : 'FREE';
    const plan = PLAN_DEFINITIONS[planKey] || PLAN_DEFINITIONS.FREE;

    return {
      plan,
      isFallback: false,
      status: sub.status,
      subscription: sub,
    };
  }

  async evaluateAccess(userId: string, feature: FeatureKey): Promise<AccessEvaluation> {
    const { plan, status } = await this.resolveUserPlan(userId);
    const featureRule = plan.features[feature];

    if (!featureRule || !featureRule.enabled) {
      return {
        granted: false,
        reason: 'FEATURE_NOT_IN_PLAN',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        planSlug: plan.slug,
      };
    }

    // Unlimited check
    if (featureRule.monthlyLimit === -1) {
      return {
        granted: true,
        reason: 'GRANTED',
        currentUsage: await usageRepository.getMonthlyUsage(userId, feature),
        limit: -1,
        remaining: -1,
        planSlug: plan.slug,
      };
    }

    // Capped check
    const currentUsage = await usageRepository.getMonthlyUsage(userId, feature);
    if (currentUsage >= featureRule.monthlyLimit) {
      return {
        granted: false,
        reason: 'MONTHLY_QUOTA_EXCEEDED',
        currentUsage,
        limit: featureRule.monthlyLimit,
        remaining: 0,
        planSlug: plan.slug,
      };
    }

    return {
      granted: true,
      reason: 'GRANTED',
      currentUsage,
      limit: featureRule.monthlyLimit,
      remaining: featureRule.monthlyLimit - currentUsage,
      planSlug: plan.slug,
    };
  }

  async consumeFeature(userId: string, feature: FeatureKey): Promise<AccessEvaluation> {
    const evaluation = await this.evaluateAccess(userId, feature);
    if (!evaluation.granted) {
      return evaluation;
    }

    const updatedUsage = await usageRepository.incrementUsage(userId, feature, 1);
    const remaining = evaluation.limit === -1 ? -1 : Math.max(0, evaluation.limit - updatedUsage);

    return {
      ...evaluation,
      currentUsage: updatedUsage,
      remaining,
    };
  }

  async getEntitlementsSummary(userId: string) {
    const { plan, status, subscription } = await this.resolveUserPlan(userId);
    const featuresSummary: Record<string, unknown> = {};

    for (const [key, rule] of Object.entries(plan.features)) {
      const featureKey = key as FeatureKey;
      const usage = await usageRepository.getMonthlyUsage(userId, featureKey);
      featuresSummary[featureKey] = {
        enabled: rule.enabled,
        limit: rule.monthlyLimit,
        used: usage,
        remaining: rule.monthlyLimit === -1 ? -1 : Math.max(0, rule.monthlyLimit - usage),
      };
    }

    return {
      userId,
      planSlug: plan.slug,
      planName: plan.name,
      subscriptionStatus: status,
      isSubscribed: status === 'active' || status === 'trialing',
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      provider: subscription?.provider || null,
      features: featuresSummary,
    };
  }
}

export const entitlementService = new EntitlementService();
