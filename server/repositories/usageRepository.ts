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
    return `${year}-${month}`; // YYYY-MM
  }

  async getMonthlyUsage(userId: string, metric: string, customPeriod?: string): Promise<number> {
    try {
      const period = customPeriod || this.getCurrentPeriod();
      const docId = `${userId}_${metric}_${period}`;
      const snap = await this.usageCol.doc(docId).get();
      if (!snap.exists) {
        return 0;
      }
      const data = snap.data();
      return typeof data?.count === 'number' ? data.count : 0;
    } catch (error: any) {
      logger.error('Erro ao buscar uso mensal no Firestore', { userId, metric, error: error.message });
      throw error;
    }
  }

  /**
   * Operação Transacional Atômica no Firestore:
   * 1. Localiza documento de usage no período;
   * 2. Lê valor atual dentro da transação isolada;
   * 3. Verifica limite (ou ilimitado se limit === -1);
   * 4. Incrementa exclusivamente se permitido;
   * 5. Confirma atomicamente;
   * 6. Retorna status de sucesso ou quota excedida com contadores precisos.
   */
  async consumeAtomic(
    userId: string,
    metric: string,
    limit: number,
    delta: number = 1,
    customPeriod?: string
  ): Promise<AtomicConsumptionResult> {
    const period = customPeriod || this.getCurrentPeriod();
    const docId = `${userId}_${metric}_${period}`;

    try {
      return await this.db.runTransaction(async (tx) => {
        const snap = await tx.get('usage', docId);
        const exists = snap.exists;
        const data = exists ? snap.data() : null;
        const currentCount = exists && typeof data?.count === 'number' ? data.count : 0;

        // Limite atingido/excedido: não autoriza nem incrementa
        if (limit !== -1 && currentCount + delta > limit) {
          logger.warn('Quota atômica bloqueada (limite excedido)', {
            userId,
            metric,
            period,
            currentCount,
            limit,
            delta,
          });

          return {
            success: false,
            currentUsage: currentCount,
            previousUsage: currentCount,
            limit,
            remaining: Math.max(0, limit - currentCount),
            period,
          };
        }

        // Incrementa atomicamente
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
          { merge: true }
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
