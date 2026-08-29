import { getAdminFirestore } from '../services/firebaseAdmin';
import { logger } from '../middlewares/logger';

export interface FirestoreDocumentSnapshot<T = any> {
  id: string;
  exists: boolean;
  data(): T | undefined;
}

export interface FirestoreQuerySnapshot<T = any> {
  empty: boolean;
  docs: Array<FirestoreDocumentSnapshot<T>>;
}

export interface IFirestoreDocument<T = any> {
  get(): Promise<FirestoreDocumentSnapshot<T>>;
  set(data: Partial<T>, options?: { merge?: boolean }): Promise<void>;
  delete(): Promise<void>;
}

export interface IFirestoreQuery<T = any> {
  where(field: string, op: '==', value: any): IFirestoreQuery<T>;
  limit(count: number): IFirestoreQuery<T>;
  get(): Promise<FirestoreQuerySnapshot<T>>;
}

export interface IFirestoreCollection<T = any> extends IFirestoreQuery<T> {
  doc(id: string): IFirestoreDocument<T>;
}

export interface IFirestoreTransaction {
  get(collectionName: string, docId: string): Promise<FirestoreDocumentSnapshot>;
  set(collectionName: string, docId: string, data: any, options?: { merge?: boolean }): Promise<void> | void;
  delete(collectionName: string, docId: string): Promise<void> | void;
}

export interface IFirestoreAdapter {
  collection(name: string): IFirestoreCollection;
  runTransaction<T>(updateFunction: (transaction: IFirestoreTransaction) => Promise<T>): Promise<T>;
}

const allowMemoryFallback =
  process.env.NODE_ENV !== 'production' &&
  process.env.FIRESTORE_ALLOW_MEMORY_FALLBACK === 'true';

function isFirestoreUnavailableError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = err.code;
  return (
    code === 5 || code === '5' ||
    code === 14 || code === '14' ||
    msg.includes('not found') ||
    msg.includes('unavailable') ||
    msg.includes('econnrefused') ||
    msg.includes('could not reach') ||
    msg.includes('default credentials')
  );
}

/**
 * Firebase Admin Firestore adapter.
 * Memory fallback is explicitly opt-in and is never used in production.
 */
export class AdminFirestoreAdapter implements IFirestoreAdapter {
  private memoryFallback: MemoryFirestoreAdapter;

  constructor(memoryFallback?: MemoryFirestoreAdapter) {
    this.memoryFallback = memoryFallback || new MemoryFirestoreAdapter();
  }

  private fallbackOrThrow<T>(fallbackFactory: () => Promise<T>, error: unknown): Promise<T> {
    if (allowMemoryFallback && isFirestoreUnavailableError(error)) {
      logger.warn('Firestore unavailable; using explicit development memory fallback.');
      return fallbackFactory();
    }
    return Promise.reject(error);
  }

  collection(name: string): IFirestoreCollection {
    const fallbackCol = this.memoryFallback.collection(name);
    let db: any;
    let colRef: any;

    try {
      db = getAdminFirestore();
      colRef = db.collection(name);
    } catch (error) {
      if (allowMemoryFallback) return fallbackCol;
      throw error;
    }

    return {
      doc: (id: string) => {
        const docRef = colRef.doc(id);
        const fallbackDoc = fallbackCol.doc(id);

        return {
          get: async () => {
            try {
              const snap = await docRef.get();
              return { id: snap.id, exists: snap.exists, data: () => snap.data() };
            } catch (error) {
              return this.fallbackOrThrow(() => fallbackDoc.get(), error);
            }
          },
          set: async (data: any, options?: { merge?: boolean }) => {
            try {
              await docRef.set(data, { merge: options?.merge ?? false });
            } catch (error) {
              if (allowMemoryFallback && isFirestoreUnavailableError(error)) {
                await fallbackDoc.set(data, options);
                return;
              }
              throw error;
            }
          },
          delete: async () => {
            try {
              await docRef.delete();
            } catch (error) {
              if (allowMemoryFallback && isFirestoreUnavailableError(error)) {
                await fallbackDoc.delete();
                return;
              }
              throw error;
            }
          },
        };
      },
      where: (field: string, op: '==', value: any) =>
        createAdminQuery(colRef.where(field, op, value), () => fallbackCol.where(field, op, value)),
      limit: (count: number) =>
        createAdminQuery(colRef.limit(count), () => fallbackCol.limit(count)),
      get: async () => {
        try {
          const snap = await colRef.get();
          return {
            empty: snap.empty,
            docs: snap.docs.map((d: any) => ({
              id: d.id,
              exists: d.exists,
              data: () => d.data(),
            })),
          };
        } catch (error) {
          return this.fallbackOrThrow(() => fallbackCol.get(), error);
        }
      },
    };
  }

  async runTransaction<T>(updateFunction: (transaction: IFirestoreTransaction) => Promise<T>): Promise<T> {
    let db: any;
    try {
      db = getAdminFirestore();
    } catch (error) {
      if (allowMemoryFallback) return this.memoryFallback.runTransaction(updateFunction);
      throw error;
    }

    try {
      return await db.runTransaction(async (adminTx: any) => {
        const tx: IFirestoreTransaction = {
          get: async (collectionName: string, docId: string) => {
            const snap = await adminTx.get(db.collection(collectionName).doc(docId));
            return {
              id: snap.id,
              exists: snap.exists,
              data: () => snap.data(),
            };
          },
          set: (collectionName: string, docId: string, data: any, options?: { merge?: boolean }) => {
            adminTx.set(db.collection(collectionName).doc(docId), data, { merge: options?.merge ?? false });
          },
          delete: (collectionName: string, docId: string) => {
            adminTx.delete(db.collection(collectionName).doc(docId));
          },
        };
        return updateFunction(tx);
      });
    } catch (error) {
      if (allowMemoryFallback && isFirestoreUnavailableError(error)) {
        logger.warn('Firestore transaction unavailable; using explicit development memory fallback.');
        return this.memoryFallback.runTransaction(updateFunction);
      }
      throw error;
    }
  }
}

function createAdminQuery(queryRef: any, fallbackQueryGetter?: () => IFirestoreQuery): IFirestoreQuery {
  return {
    where: (field: string, op: '==', value: any) =>
      createAdminQuery(
        queryRef.where(field, op, value),
        fallbackQueryGetter ? () => fallbackQueryGetter().where(field, op, value) : undefined
      ),
    limit: (count: number) =>
      createAdminQuery(
        queryRef.limit(count),
        fallbackQueryGetter ? () => fallbackQueryGetter().limit(count) : undefined
      ),
    get: async () => {
      try {
        const snap = await queryRef.get();
        return {
          empty: snap.empty,
          docs: snap.docs.map((d: any) => ({
            id: d.id,
            exists: d.exists,
            data: () => d.data(),
          })),
        };
      } catch (error) {
        if (allowMemoryFallback && fallbackQueryGetter && isFirestoreUnavailableError(error)) {
          return fallbackQueryGetter().get();
        }
        throw error;
      }
    },
  };
}

/** In-memory adapter used only by tests or explicit development fallback. */
export class MemoryFirestoreAdapter implements IFirestoreAdapter {
  private store: Map<string, Map<string, any>> = new Map();
  private transactionQueue: Promise<void> = Promise.resolve();

  constructor(initialData?: Record<string, Record<string, any>>) {
    if (initialData) {
      for (const [colName, docs] of Object.entries(initialData)) {
        const colMap = new Map<string, any>();
        for (const [docId, docData] of Object.entries(docs)) {
          colMap.set(docId, JSON.parse(JSON.stringify(docData)));
        }
        this.store.set(colName, colMap);
      }
    }
  }

  private getCollectionMap(name: string): Map<string, any> {
    if (!this.store.has(name)) this.store.set(name, new Map());
    return this.store.get(name)!;
  }

  collection(name: string): IFirestoreCollection {
    const colMap = this.getCollectionMap(name);
    return {
      doc: (id: string) => ({
        get: async () => {
          const docData = colMap.get(id);
          return { id, exists: docData !== undefined, data: () => (docData !== undefined ? JSON.parse(JSON.stringify(docData)) : undefined) };
        },
        set: async (data: any, options?: { merge?: boolean }) => {
          if (options?.merge && colMap.has(id)) {
            colMap.set(id, { ...(colMap.get(id) || {}), ...JSON.parse(JSON.stringify(data)) });
          } else {
            colMap.set(id, JSON.parse(JSON.stringify(data)));
          }
        },
        delete: async () => { colMap.delete(id); },
      }),
      where: (field: string, op: '==', value: any) => createMemoryQuery(colMap, [{ field, op, value }]),
      limit: (count: number) => createMemoryQuery(colMap, [], count),
      get: async () => {
        const docs = Array.from(colMap.entries()).map(([id, data]) => ({
          id,
          exists: true,
          data: () => JSON.parse(JSON.stringify(data)),
        }));
        return { empty: docs.length === 0, docs };
      },
    };
  }

  async runTransaction<T>(updateFunction: (transaction: IFirestoreTransaction) => Promise<T>): Promise<T> {
    let releaseLock!: () => void;
    const currentLock = new Promise<void>((resolve) => { releaseLock = resolve; });
    const previousLock = this.transactionQueue;
    this.transactionQueue = currentLock;
    await previousLock;

    try {
      const stagedWrites: Array<() => void> = [];
      const tx: IFirestoreTransaction = {
        get: async (collectionName, docId) => this.collection(collectionName).doc(docId).get(),
        set: (collectionName, docId, data, options) => {
          stagedWrites.push(() => { void this.collection(collectionName).doc(docId).set(data, options); });
        },
        delete: (collectionName, docId) => {
          stagedWrites.push(() => { void this.collection(collectionName).doc(docId).delete(); });
        },
      };
      const result = await updateFunction(tx);
      for (const write of stagedWrites) write();
      return result;
    } finally {
      releaseLock();
    }
  }
}

function createMemoryQuery(
  colMap: Map<string, any>,
  filters: Array<{ field: string; op: '=='; value: any }> = [],
  limitCount?: number
): IFirestoreQuery {
  return {
    where: (field: string, op: '==', value: any) => createMemoryQuery(colMap, [...filters, { field, op, value }], limitCount),
    limit: (count: number) => createMemoryQuery(colMap, filters, count),
    get: async () => {
      let entries = Array.from(colMap.entries());
      for (const filter of filters) entries = entries.filter(([, data]) => data && data[filter.field] === filter.value);
      if (limitCount !== undefined) entries = entries.slice(0, limitCount);
      const docs = entries.map(([id, data]) => ({ id, exists: true, data: () => JSON.parse(JSON.stringify(data)) }));
      return { empty: docs.length === 0, docs };
    },
  };
}

let activeAdapter: IFirestoreAdapter = new AdminFirestoreAdapter();

export function setFirestoreAdapter(adapter: IFirestoreAdapter): void {
  activeAdapter = adapter;
}

export function getFirestoreAdapter(): IFirestoreAdapter {
  return activeAdapter;
}
