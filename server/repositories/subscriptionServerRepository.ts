import {
  ServerSubscription,
  SubscriptionHistoryRecord,
  SubscriptionStatus,
  PaymentProvider,
} from '../domain/subscriptionModel';
import { getFirestoreAdapter, IFirestoreAdapter } from './firestoreAdapter';
import { logger } from '../middlewares/logger';

export class SubscriptionServerRepository {
  private adapter?: IFirestoreAdapter;

  constructor(adapter?: IFirestoreAdapter) {
    this.adapter = adapter;
  }

  private get db(): IFirestoreAdapter {
    return this.adapter || getFirestoreAdapter();
  }

  private get subscriptionsCol() {
    return this.db.collection('subscriptions');
  }

  private get historyCol() {
    return this.db.collection('subscription_history');
  }

  private get webhookEventsCol() {
    return this.db.collection('webhook_events');
  }

  async findByUserId(userId: string): Promise<ServerSubscription | null> {
    try {
      const doc = await this.subscriptionsCol.doc(userId).get();
      if (!doc.exists) {
        return null;
      }
      return doc.data() as ServerSubscription;
    } catch (error: any) {
      logger.error('Erro ao buscar assinatura por userId no Firestore', { userId, error: error.message });
      throw error;
    }
  }

  async findBySubscriptionId(subscriptionId: string): Promise<ServerSubscription | null> {
    try {
      const snapshot = await this.subscriptionsCol
        .where('subscriptionId', '==', subscriptionId)
        .limit(1)
        .get();

      if (snapshot.empty || snapshot.docs.length === 0) {
        return null;
      }
      return snapshot.docs[0].data() as ServerSubscription;
    } catch (error: any) {
      logger.error('Erro ao buscar assinatura por subscriptionId no Firestore', { subscriptionId, error: error.message });
      throw error;
    }
  }

  async saveSubscription(sub: ServerSubscription): Promise<ServerSubscription> {
    try {
      const docRef = this.subscriptionsCol.doc(sub.userId);
      const existingSnap = await docRef.get();
      const existing = existingSnap.exists ? (existingSnap.data() as ServerSubscription) : null;
      const isNew = !existing;

      const updatedSub: ServerSubscription = {
        ...sub,
        updatedAt: new Date().toISOString(),
      };

      await docRef.set(updatedSub, { merge: true });

      // Record audit history
      const historyRecord: SubscriptionHistoryRecord = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        subscriptionId: sub.subscriptionId || sub.id,
        userId: sub.userId,
        eventType: isNew ? 'CREATED' : 'PLAN_CHANGED',
        statusBefore: existing ? existing.status : 'pending',
        statusAfter: sub.status,
        provider: sub.provider,
        timestamp: new Date().toISOString(),
      };

      await this.historyCol.doc(historyRecord.id).set(historyRecord);

      return updatedSub;
    } catch (error: any) {
      logger.error('Erro ao salvar assinatura no Firestore', { userId: sub.userId, error: error.message });
      throw error;
    }
  }

  async updateStatus(
    userId: string,
    newStatus: SubscriptionStatus,
    eventType: SubscriptionHistoryRecord['eventType'] = 'PLAN_CHANGED'
  ): Promise<ServerSubscription | null> {
    try {
      const docRef = this.subscriptionsCol.doc(userId);
      const snap = await docRef.get();
      if (!snap.exists) return null;

      const sub = snap.data() as ServerSubscription;
      const previousStatus = sub.status;
      sub.status = newStatus;
      sub.updatedAt = new Date().toISOString();

      await docRef.set(sub, { merge: true });

      const historyRecord: SubscriptionHistoryRecord = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        subscriptionId: sub.subscriptionId || sub.id,
        userId,
        eventType,
        statusBefore: previousStatus,
        statusAfter: newStatus,
        provider: sub.provider,
        timestamp: new Date().toISOString(),
      };

      await this.historyCol.doc(historyRecord.id).set(historyRecord);

      logger.info(`Status da assinatura atualizado: ${userId} (${previousStatus} -> ${newStatus})`);
      return sub;
    } catch (error: any) {
      logger.error('Erro ao atualizar status da assinatura no Firestore', { userId, error: error.message });
      throw error;
    }
  }

  async isWebhookProcessed(provider: PaymentProvider, eventId: string): Promise<boolean> {
    try {
      const key = `${provider}_${eventId}`;
      const doc = await this.webhookEventsCol.doc(key).get();
      return doc.exists;
    } catch (error: any) {
      logger.error('Erro ao verificar evento de webhook no Firestore', { provider, eventId, error: error.message });
      throw error;
    }
  }

  /**
   * Operação Transacional Atômica para reivindicação de evento de webhook:
   * Garante que entre requisições concorrentes idênticas (mesmo provider + eventId),
   * apenas uma prossiga com a execução, impedindo qualquer processamento duplicado concorrente.
   */
  async tryClaimWebhookEvent(
    provider: PaymentProvider,
    eventId: string,
    eventType: string = 'webhook'
  ): Promise<{ claimed: boolean; alreadyProcessed: boolean }> {
    const key = `${provider}_${eventId}`;
    try {
      return await this.db.runTransaction(async (tx) => {
        const snap = await tx.get('webhook_events', key);
        if (snap.exists) {
          return { claimed: false, alreadyProcessed: true };
        }
        const nowIso = new Date().toISOString();
        tx.set(
          'webhook_events',
          key,
          {
            provider,
            eventId,
            eventType,
            status: 'processing',
            receivedAt: nowIso,
            claimedAt: nowIso,
          },
          { merge: true }
        );
        return { claimed: true, alreadyProcessed: false };
      });
    } catch (error: any) {
      logger.error('Erro ao reivindicar atomicamente evento de webhook no Firestore', {
        provider,
        eventId,
        error: error.message,
      });
      throw error;
    }
  }

  async markWebhookProcessed(
    provider: PaymentProvider,
    eventId: string,
    eventType: string = 'webhook',
    status: string = 'processed'
  ): Promise<void> {
    try {
      const key = `${provider}_${eventId}`;
      await this.webhookEventsCol.doc(key).set(
        {
          provider,
          eventId,
          eventType,
          status,
          receivedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error: any) {
      logger.error('Erro ao registrar evento de webhook processado no Firestore', { provider, eventId, error: error.message });
      throw error;
    }
  }

  async markWebhookCompleted(
    provider: PaymentProvider,
    eventId: string,
    eventType: string = 'webhook',
    status: string = 'completed',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const key = `${provider}_${eventId}`;
      await this.webhookEventsCol.doc(key).set(
        {
          provider,
          eventId,
          eventType,
          status,
          processedAt: new Date().toISOString(),
          ...metadata,
        },
        { merge: true }
      );
    } catch (error: any) {
      logger.error('Erro ao marcar webhook como finalizado no Firestore', { provider, eventId, error: error.message });
      throw error;
    }
  }

  async releaseWebhookClaim(provider: PaymentProvider, eventId: string): Promise<void> {
    try {
      const key = `${provider}_${eventId}`;
      await this.webhookEventsCol.doc(key).delete();
    } catch (error: any) {
      logger.error('Erro ao liberar trava de webhook no Firestore', { provider, eventId, error: error.message });
    }
  }

  async getHistoryByUserId(userId: string): Promise<SubscriptionHistoryRecord[]> {
    try {
      const snapshot = await this.historyCol
        .where('userId', '==', userId)
        .get();

      const records = snapshot.docs.map((doc) => doc.data() as SubscriptionHistoryRecord);
      return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error: any) {
      logger.error('Erro ao buscar histórico de assinatura no Firestore', { userId, error: error.message });
      throw error;
    }
  }
}

export const subscriptionServerRepository = new SubscriptionServerRepository();

