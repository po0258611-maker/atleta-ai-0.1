import { getFirestoreAdapter, IFirestoreAdapter } from './firestoreAdapter';
import { logger } from '../middlewares/logger';

export type PaymentTransactionRecord = {
  transactionId: string;
  provider: string;
  userId: string;
  userEmail: string;
  planSlug: 'PRO' | 'APEX_ELITE';
  amountCents: number;
  currency: string;
  paymentMethod: 'pix' | 'credit_card' | 'google_play' | 'boleto';
  status: 'pending' | 'approved' | 'failed' | 'expired' | 'refunded' | 'canceled';
  idempotencyKey: string;
  externalReference: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  providerStatus?: string;
};

export class PaymentTransactionRepository {
  private adapter?: IFirestoreAdapter;
  constructor(adapter?: IFirestoreAdapter) { this.adapter = adapter; }
  private get db(): IFirestoreAdapter { return this.adapter || getFirestoreAdapter(); }
  private get col() { return this.db.collection('payment_transactions'); }

  async findByIdempotencyKey(idempotencyKey: string): Promise<PaymentTransactionRecord | null> {
    const snapshot = await this.col.where('idempotencyKey', '==', idempotencyKey).limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].data() as PaymentTransactionRecord;
  }

  async findByTransactionId(transactionId: string): Promise<PaymentTransactionRecord | null> {
    const doc = await this.col.doc(transactionId).get();
    return doc.exists ? doc.data() as PaymentTransactionRecord : null;
  }

  async save(record: PaymentTransactionRecord): Promise<PaymentTransactionRecord> {
    try {
      const now = new Date().toISOString();
      const updated = { ...record, updatedAt: now };
      await this.col.doc(record.transactionId).set(updated, { merge: true });
      return updated;
    } catch (error: any) {
      logger.error('Erro ao persistir transação de pagamento', {
        transactionId: record.transactionId,
        provider: record.provider,
        error: error?.message || error,
      });
      throw error;
    }
  }

  async updateStatus(transactionId: string, status: PaymentTransactionRecord['status'], providerStatus?: string): Promise<void> {
    const existing = await this.findByTransactionId(transactionId);
    if (!existing) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
    await this.col.doc(transactionId).set({ status, providerStatus, updatedAt: new Date().toISOString() }, { merge: true });
  }
}

export const paymentTransactionRepository = new PaymentTransactionRepository();
