import {
  ServerSubscription,
  SubscriptionHistoryRecord,
  WebhookEventRecord,
  SubscriptionStatus,
  PaymentProvider,
} from '../domain/subscriptionModel';
import { logger } from '../middlewares/logger';

class SubscriptionServerRepository {
  private subscriptions: Map<string, ServerSubscription> = new Map(); // Key is userId
  private history: SubscriptionHistoryRecord[] = [];
  private processedWebhooks: Set<string> = new Set(); // Key is provider + eventId

  constructor() {
    // Seed initial demo subscriptions
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    this.subscriptions.set('usr_atleta.demo', {
      id: 'sub_demo_apex',
      userId: 'usr_atleta.demo',
      planId: 'PRO',
      status: 'active',
      provider: 'stripe',
      customerId: 'cus_demo_123',
      subscriptionId: 'sub_demo_apex_123',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: future.toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      priceBrl: 15.00,
    });
  }

  async findByUserId(userId: string): Promise<ServerSubscription | null> {
    return this.subscriptions.get(userId) || null;
  }

  async findBySubscriptionId(subscriptionId: string): Promise<ServerSubscription | null> {
    for (const sub of this.subscriptions.values()) {
      if (sub.subscriptionId === subscriptionId) {
        return sub;
      }
    }
    return null;
  }

  async saveSubscription(sub: ServerSubscription): Promise<ServerSubscription> {
    const existing = this.subscriptions.get(sub.userId);
    const isNew = !existing;
    
    this.subscriptions.set(sub.userId, {
      ...sub,
      updatedAt: new Date().toISOString(),
    });

    // Record audit history
    this.history.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      subscriptionId: sub.subscriptionId || sub.id,
      userId: sub.userId,
      eventType: isNew ? 'CREATED' : 'PLAN_CHANGED',
      statusBefore: existing ? existing.status : 'pending',
      statusAfter: sub.status,
      provider: sub.provider,
      timestamp: new Date().toISOString(),
    });

    return sub;
  }

  async updateStatus(
    userId: string,
    newStatus: SubscriptionStatus,
    eventType: SubscriptionHistoryRecord['eventType'] = 'PLAN_CHANGED'
  ): Promise<ServerSubscription | null> {
    const sub = this.subscriptions.get(userId);
    if (!sub) return null;

    const previousStatus = sub.status;
    sub.status = newStatus;
    sub.updatedAt = new Date().toISOString();
    this.subscriptions.set(userId, sub);

    this.history.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      subscriptionId: sub.subscriptionId,
      userId,
      eventType,
      statusBefore: previousStatus,
      statusAfter: newStatus,
      provider: sub.provider,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Status da assinatura atualizado: ${userId} (${previousStatus} -> ${newStatus})`);
    return sub;
  }

  async isWebhookProcessed(provider: PaymentProvider, eventId: string): Promise<boolean> {
    const key = `${provider}:${eventId}`;
    return this.processedWebhooks.has(key);
  }

  async markWebhookProcessed(provider: PaymentProvider, eventId: string): Promise<void> {
    const key = `${provider}:${eventId}`;
    this.processedWebhooks.add(key);
  }

  async getHistoryByUserId(userId: string): Promise<SubscriptionHistoryRecord[]> {
    return this.history.filter((h) => h.userId === userId);
  }
}

export const subscriptionServerRepository = new SubscriptionServerRepository();
