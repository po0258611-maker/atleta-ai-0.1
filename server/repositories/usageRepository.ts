import { getFirestoreAdapter, IFirestoreAdapter } from './firestoreAdapter';
import { logger } from '../middlewares/logger';

export interface AtomicConsumptionResult {
  success: boolean;
  currentUsage: number;
  previousUsage: number;
  limit: number;
  remaining: number;
  period: string;
}

export class UsageRepository {
  private adapter?: IFirestoreAdapter;

  constructor(adapter?: IFirestoreAdapter) {
    this.adapter = adapter;
  }

  private get db(): IFirestoreAdapter {
    return this.adapter || getFirestoreAdapter();
  }

  private get usageCol() {
    return this.db.collection('usage');
  }

  public getCurrentPeriod(): string {
    const d = new Date();
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  async getMonthlyUsage(userId: string, metric: string, customPeriod?: string): Promise<number> {
    try {
      const period = customPeriod || this.getCurrentPeriod();
      const docId = `${userId}_${metric}_${period}`;
      const snap = await this.usageCol.doc(docId).get();
      if (!snap.exists) return 0;
      const data = snap.data();
      return typeof data?.count === 'number' && Number.isFinite(data.count) ? Math.max(0, data.count) : 0;
    } catch (error: any) {
      logger.error('Erro ao buscar uso mensal no Firestore', { userId, metric, error: error.message });
      throw error;
    }
  }

  async consumeAtomic(
    userId: string,
    metric: string,
    limit: number,
    delta: number = 1,
    customPeriod?: string,
  ): Promise<AtomicConsumptionResult> {
    const period = customPeriod || this.getCurrentPeriod();
    const docId = `${userId}_${metric}_${period}`;

    if (!Number.isInteger(delta) || delta <= 0) {
      throw new Error('delta must be a positive integer');
    }
    if (!Number.isInteger(limit) || limit < -1) {
      throw new Error('limit must be -1 or a non-negative integer');
    }

    try {
      return await this.db.runTransaction(async (tx) => {
        const snap = await tx.get('usage', docId);
        const exists = snap.exists;
        const data = exists ? snap.data() : null;
        const currentCount = exists && typeof data?.count === 'number' && Number.isFinite(data.count)
          ? Math.max(0, Math.floor(data.count))
          : 0;

        if (limit !== -1 && currentCount + delta > limit) {
          return {
            success: false,
            currentUsage: currentCount,
            previousUsage: currentCount,
            limit,
            remaining: Math.max(0, limit - currentCount),
            period,
          };
        }

        const updatedCount = currentCount + delta;
        const nowIso = new Date().toISOString();
        tx.set(
          'usage',
          docId,
          {
            userId,
            metric,
            period,
            count: updatedCount,
            updatedAt: nowIso,
            createdAt: exists && data?.createdAt ? data.createdAt : nowIso,
          },
          { merge: true },
        );

        return {
          success: true,
          currentUsage: updatedCount,
          previousUsage: currentCount,
          limit,
          remaining: limit === -1 ? -1 : Math.max(0, limit - updatedCount),
          period,
        };
      });
    } catch (error: any) {
      logger.error('Erro transacional na operação atômica de quota no Firestore', {
        userId,
        metric,
        period,
        error: error.message,
      });
      throw error;
    }
  }

  async releaseAtomic(
    userId: string,
    metric: string,
    delta: number = 1,
    customPeriod?: string,
  ): Promise<AtomicConsumptionResult> {
    const period = customPeriod || this.getCurrentPeriod();
    const docId = `${userId}_${metric}_${period}`;

    if (!Number.isInteger(delta) || delta <= 0) {
      throw new Error('delta must be a positive integer');
    }

    try {
      return await this.db.runTransaction(async (tx) => {
        const snap = await tx.get('usage', docId);
        const exists = snap.exists;
        const data = exists ? snap.data() : null;
        const currentCount = exists && typeof data?.count === 'number' && Number.isFinite(data.count)
          ? Math.max(0, Math.floor(data.count))
          : 0;
        const updatedCount = Math.max(0, currentCount - delta);
        const nowIso = new Date().toISOString();

        if (exists || updatedCount > 0) {
          tx.set(
            'usage',
            docId,
            {
              userId,
              metric,
              period,
              count: updatedCount,
              updatedAt: nowIso,
              createdAt: data?.createdAt || nowIso,
            },
            { merge: true },
          );
        }

        return {
          success: updatedCount < currentCount,
          currentUsage: updatedCount,
          previousUsage: currentCount,
          limit: -1,
          remaining: -1,
          period,
        };
      });
    } catch (error: any) {
      logger.error('Erro transacional ao liberar quota no Firestore', {
        userId,
        metric,
        period,
        delta,
        error: error.message,
      });
      throw error;
    }
  }

  async incrementUsage(userId: string, metric: string, delta: number = 1, customPeriod?: string): Promise<number> {
    const result = await this.consumeAtomic(userId, metric, -1, delta, customPeriod);
    return result.currentUsage;
  }

  async resetUsage(userId: string, metric: string, customPeriod?: string): Promise<void> {
    try {
      const period = customPeriod || this.getCurrentPeriod();
      const docId = `${userId}_${metric}_${period}`;
      await this.usageCol.doc(docId).delete();
    } catch (error: any) {
      logger.error('Erro ao resetar uso no Firestore', { userId, metric, error: error.message });
      throw error;
    }
  }
}

export const usageRepository = new UsageRepository();
