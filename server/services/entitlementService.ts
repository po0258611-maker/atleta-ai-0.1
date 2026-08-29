import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';
import { usageRepository } from '../repositories/usageRepository';
import { PLAN_DEFINITIONS, FeatureKey, PlanDefinition, PlanSlug } from '../domain/planDefinitions';
import {
  ServerSubscription,
  CanonicalSubscriptionStatus,
  normalizeSubscriptionStatus,
} from '../domain/subscriptionModel';
import { logger } from '../middlewares/logger';

export interface AccessEvaluation {
  granted: boolean;
  reason?: 'GRANTED' | 'FEATURE_NOT_IN_PLAN' | 'MONTHLY_QUOTA_EXCEEDED' | 'SUBSCRIPTION_EXPIRED' | 'NO_SUBSCRIPTION';
  currentUsage: number;
  limit: number;
  remaining: number;
  planSlug: PlanSlug;
}

export interface UserPlanResolution {
  plan: PlanDefinition;
  isFallback: boolean;
  status: CanonicalSubscriptionStatus;
  isEntitled: boolean;
  subscription: ServerSubscription | null;
}

export class EntitlementService {
  async resolveUserPlan(userId: string): Promise<UserPlanResolution> {
    const sub = await subscriptionServerRepository.findByUserId(userId);

    if (!sub) {
      return { plan: PLAN_DEFINITIONS.FREE, isFallback: true, status: 'FREE', isEntitled: false, subscription: null };
    }

    const rawStatus = normalizeSubscriptionStatus(sub.status);
    const now = Date.now();
    const periodEnd = new Date(sub.currentPeriodEnd).getTime();
    const isExpired = Number.isNaN(periodEnd) ? true : periodEnd < now;

    if (rawStatus === 'EXPIRED' || (isExpired && rawStatus !== 'FREE')) {
      return { plan: PLAN_DEFINITIONS.FREE, isFallback: true, status: 'EXPIRED', isEntitled: false, subscription: sub };
    }

    if (rawStatus === 'PAST_DUE') {
      return { plan: PLAN_DEFINITIONS.FREE, isFallback: true, status: 'PAST_DUE', isEntitled: false, subscription: sub };
    }

    if (rawStatus === 'CANCELED') {
      if (sub.cancelAtPeriodEnd && !isExpired) {
        const activePlan = PLAN_DEFINITIONS[sub.planId] || PLAN_DEFINITIONS.FREE;
        return {
          plan: activePlan,
          isFallback: activePlan.slug === 'FREE',
          status: 'CANCELED',
          isEntitled: activePlan.slug !== 'FREE',
          subscription: sub,
        };
      }
      return { plan: PLAN_DEFINITIONS.FREE, isFallback: true, status: 'CANCELED', isEntitled: false, subscription: sub };
    }

    if (rawStatus === 'ACTIVE' || rawStatus === 'TRIAL') {
      const activePlan = PLAN_DEFINITIONS[sub.planId] || PLAN_DEFINITIONS.FREE;
      const isEntitled = activePlan.slug !== 'FREE' && !isExpired;
      return {
        plan: isEntitled ? activePlan : PLAN_DEFINITIONS.FREE,
        isFallback: !isEntitled,
        status: isExpired ? 'EXPIRED' : rawStatus,
        isEntitled,
        subscription: sub,
      };
    }

    return { plan: PLAN_DEFINITIONS.FREE, isFallback: true, status: 'FREE', isEntitled: false, subscription: sub };
  }

  async evaluateAccess(userId: string, feature: FeatureKey): Promise<AccessEvaluation> {
    const { plan, status } = await this.resolveUserPlan(userId);
    const featureRule = plan.features[feature];

    if (!featureRule || !featureRule.enabled) {
      return {
        granted: false,
        reason: status === 'EXPIRED' ? 'SUBSCRIPTION_EXPIRED' : 'FEATURE_NOT_IN_PLAN',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        planSlug: plan.slug,
      };
    }

    if (featureRule.monthlyLimit === -1) {
      const currentUsage = await usageRepository.getMonthlyUsage(userId, feature);
      return { granted: true, reason: 'GRANTED', currentUsage, limit: -1, remaining: -1, planSlug: plan.slug };
    }

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

  async consumeFeature(userId: string, feature: FeatureKey, delta: number = 1): Promise<AccessEvaluation> {
    if (!Number.isInteger(delta) || delta < 1) {
      throw new Error('INVALID_QUOTA_DELTA');
    }

    const { plan, status } = await this.resolveUserPlan(userId);
    const featureRule = plan.features[feature];

    if (!featureRule || !featureRule.enabled) {
      return {
        granted: false,
        reason: status === 'EXPIRED' ? 'SUBSCRIPTION_EXPIRED' : 'FEATURE_NOT_IN_PLAN',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        planSlug: plan.slug,
      };
    }

    const result = await usageRepository.consumeAtomic(userId, feature, featureRule.monthlyLimit, delta);
    if (!result.success) {
      return {
        granted: false,
        reason: 'MONTHLY_QUOTA_EXCEEDED',
        currentUsage: result.currentUsage,
        limit: result.limit,
        remaining: result.remaining,
        planSlug: plan.slug,
      };
    }

    return {
      granted: true,
      reason: 'GRANTED',
      currentUsage: result.currentUsage,
      limit: result.limit,
      remaining: result.remaining,
      planSlug: plan.slug,
    };
  }

  async getEntitlementsSummary(userId: string) {
    const { plan, status, isEntitled, subscription } = await this.resolveUserPlan(userId);
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

    const autoRenew = subscription ? !subscription.cancelAtPeriodEnd && (status === 'ACTIVE' || status === 'TRIAL') : false;
    const renewsAt = autoRenew && subscription ? subscription.currentPeriodEnd : null;

    return {
      userId,
      plan: plan.slug,
      planSlug: plan.slug,
      planName: plan.name,
      status,
      subscriptionStatus: status.toLowerCase(),
      canonicalStatus: status,
      isSubscribed: isEntitled,
      isPremium: isEntitled && (plan.slug === 'PRO' || plan.slug === 'APEX_ELITE'),
      startDate: subscription?.currentPeriodStart || null,
      currentPeriodStart: subscription?.currentPeriodStart || null,
      endDate: subscription?.currentPeriodEnd || null,
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      renewsAt,
      renewAt: renewsAt,
      autoRenew,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      canceledAt: subscription?.canceledAt || null,
      provider: subscription?.provider || null,
      priceBrl: subscription?.priceBrl ?? plan.priceCents / 100,
      quotas: featuresSummary,
      features: featuresSummary,
    };
  }

  async cancelSubscription(userId: string, immediate = false): Promise<ServerSubscription | null> {
    const sub = await subscriptionServerRepository.findByUserId(userId);
    if (!sub) return null;

    const nowIso = new Date().toISOString();
    const updatedSub: ServerSubscription = {
      ...sub,
      status: immediate ? 'CANCELED' : sub.status,
      cancelAtPeriodEnd: immediate ? false : true,
      canceledAt: nowIso,
      autoRenew: false,
      updatedAt: nowIso,
    };

    return subscriptionServerRepository.saveSubscription(updatedSub);
  }

  async reactivateSubscription(userId: string): Promise<ServerSubscription | null> {
    const sub = await subscriptionServerRepository.findByUserId(userId);
    if (!sub) return null;

    const nowIso = new Date().toISOString();
    return subscriptionServerRepository.saveSubscription({
      ...sub,
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      autoRenew: true,
      updatedAt: nowIso,
    });
  }

  async changePlan(userId: string, newPlanSlug: PlanSlug): Promise<ServerSubscription | null> {
    const sub = await subscriptionServerRepository.findByUserId(userId);
    const targetPlan = PLAN_DEFINITIONS[newPlanSlug];
    if (!targetPlan) throw new Error(`Plano inválido: ${newPlanSlug}`);

    // FREE means no paid entitlement. Do not create a synthetic payment/subscription
    // record for a user who never had one.
    if (newPlanSlug === 'FREE') {
      if (!sub) return null;
      const nowIso = new Date().toISOString();
      return subscriptionServerRepository.saveSubscription({
        ...sub,
        planId: 'FREE',
        status: 'FREE',
        cancelAtPeriodEnd: false,
        canceledAt: null,
        autoRenew: false,
        priceBrl: 0,
        updatedAt: nowIso,
      });
    }

    // Paid-plan activation remains payment/webhook controlled.
    throw new Error('PAYMENT_REQUIRED');
  }

  async renewSubscription(userId: string, durationDays = 30): Promise<ServerSubscription | null> {
    if (!Number.isInteger(durationDays) || durationDays <= 0) throw new Error('INVALID_DURATION_DAYS');
    const sub = await subscriptionServerRepository.findByUserId(userId);
    if (!sub) return null;

    const now = new Date();
    const currentEnd = new Date(sub.currentPeriodEnd);
    const baseDate = currentEnd.getTime() > now.getTime() ? currentEnd : now;
    const newPeriodEnd = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    return subscriptionServerRepository.saveSubscription({
      ...sub,
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      autoRenew: true,
      currentPeriodStart: nowIso,
      currentPeriodEnd: newPeriodEnd,
      lastPaymentDate: nowIso,
      updatedAt: nowIso,
    });
  }
}

export const entitlementService = new EntitlementService();
