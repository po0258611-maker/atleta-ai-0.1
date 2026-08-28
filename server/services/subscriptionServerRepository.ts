import {
  ServerSubscription,
  SubscriptionHistoryRecord,
  WebhookEventRecord,
  SubscriptionStatus,
  PaymentProvider,
} from '../domain/subscriptionModel';
import { logger } from '../middlewares/logger';

/**
 * Temporary in-process repository used by the demo environment.
 * Production must use a persistent database repository so subscriptions,
 * audit history and webhook idempotency survive process restarts.
 */
class SubscriptionServerRepository {
  private subscriptions: Map<string, ServerSubscription> = new Map();
  private history: SubscriptionHistoryRecord[] = [];
  private processedWebhooks: Set<string> = new Set();

  async findByUserId(userId: string): Promise<ServerSubscription | null> {
    return this.subscriptions.get(userId) || null;
  }

  async findBySubscriptionId(subscriptionId: string): Promise<ServerSubscription | null> {
    for (const sub of this.subscriptions.values()) {
      if (sub.subscriptionId === subscriptionId) return sub;
    }
    return null;
  }

  async saveSubscription(sub: ServerSubscription): Promise<ServerSubscription> {
    const existing = this.subscriptions.get(sub.userId);
    const saved = { ...sub, updatedAt: new Date().toISOString() };
    this.subscriptions.set(sub.userId, saved);

    this.history.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      subscriptionId: saved.subscriptionId || saved.id,
      userId: saved.userId,
      eventType: existing ? 'PLAN_CHANGED' : 'CREATED',
      statusBefore: existing ? existing.status : 'pending',
      statusAfter: saved.status,
      provider: saved.provider,
      timestamp: new Date().toISOString(),
    });

    return saved;
  }

  async updateStatus(
    userId: string,
    newStatus: SubscriptionStatus,
    eventType: SubscriptionHistoryRecord['eventType'] = 'PLAN_CHANGED'
  ): Promise<ServerSubscription | null> {
    const sub = this.subscriptions.get(userId);
    if (!sub) return null;

    const previousStatus = sub.status;
    const updated = { ...sub, status: newStatus, updatedAt: new Date().toISOString() };
    this.subscriptions.set(userId, updated);

    this.history.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      subscriptionId: updated.subscriptionId,
      userId,
      eventType,
      statusBefore: previousStatus,
      statusAfter: newStatus,
      provider: updated.provider,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Subscription status updated: ${userId} (${previousStatus} -> ${newStatus})`);
    return updated;
  }

  async isWebhookProcessed(provider: PaymentProvider, eventId: string): Promise<boolean> {
    return this.processedWebhooks.has(`${provider}:${eventId}`);
  }

  async markWebhookProcessed(provider: PaymentProvider, eventId: string): Promise<void> {
    this.processedWebhooks.add(`${provider}:${eventId}`);
  }

  async getHistoryByUserId(userId: string): Promise<SubscriptionHistoryRecord[]> {
    return this.history.filter((h) => h.userId === userId);
  }
}

export const subscriptionServerRepository = new SubscriptionServerRepository();
