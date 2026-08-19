import { Subscription, SubscriptionStatus } from '../domain/types';

class SubscriptionRepository {
  private subscriptions: Map<string, Subscription> = new Map(); // Key is userId

  constructor() {
    // Seed a demo pro athlete subscription
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    this.subscriptions.set('usr_atleta.demo', {
      id: 'sub_demo_pro',
      userId: 'usr_atleta.demo',
      planId: 'PREMIUM',
      status: 'ACTIVE',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: future.toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  async findByUserId(userId: string): Promise<Subscription | null> {
    return this.subscriptions.get(userId) || null;
  }

  async saveSubscription(sub: Subscription): Promise<Subscription> {
    this.subscriptions.set(sub.userId, sub);
    return sub;
  }

  async updateStatus(userId: string, status: SubscriptionStatus): Promise<void> {
    const sub = this.subscriptions.get(userId);
    if (sub) {
      sub.status = status;
      sub.updatedAt = new Date().toISOString();
      this.subscriptions.set(userId, sub);
    }
  }
}

export const subscriptionRepository = new SubscriptionRepository();
