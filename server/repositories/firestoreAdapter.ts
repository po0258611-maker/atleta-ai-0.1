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

function isFirestoreUnavailableError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = err.code;
  return (
    code === 5 ||
    code === '5' ||
    code === 14 ||
    code === '14' ||
    code === 7 ||
    code === '7' ||
    code === 16 ||
    code === '16' ||
    msg.includes('5 not_found') ||
    msg.includes('not_found') ||
    msg.includes('not found') ||
    msg.includes('unavailable') ||
    msg.includes('permission_denied') ||
    msg.includes('deadline_exceeded') ||
    msg.includes('unauthenticated') ||
    msg.includes('econnrefused') ||
    msg.includes('does not exist') ||
    msg.includes('could not reach') ||
    msg.includes('default credentials') ||
    msg.includes('project')
  );
}

/**
 * Native Firebase Admin SDK Firestore Adapter with resilient memory fallback
 */
export class AdminFirestoreAdapter implements IFirestoreAdapter {
  private memoryFallback: MemoryFirestoreAdapter;

  constructor(memoryFallback?: MemoryFirestoreAdapter) {
    this.memoryFallback = memoryFallback || new MemoryFirestoreAdapter();
  }

  collection(name: string): IFirestoreCollection {
    const fallbackCol = this.memoryFallback.collection(name);

    let db: any;
    let colRef: any;
    try {
      db = getAdminFirestore();
      colRef = db.collection(name);
    } catch {
      return fallbackCol;
    }

    return {
      doc: (id: string) => {
        const docRef = colRef.doc(id);
        const fallbackDoc = fallbackCol.doc(id);

        return {
          get: async () => {
            try {
              const snap = await docRef.get();
              return {
                id: snap.id,
                exists: snap.exists,
                data: () => snap.data(),
              };
            } catch (err: any) {
              if (isFirestoreUnavailableError(err)) {
                return fallbackDoc.get();
              }
              throw err;
            }
          },
          set: async (data: any, options?: { merge?: boolean }) => {
            await fallbackDoc.set(data, options);
            try {
              await docRef.set(data, { merge: options?.merge ?? false });
            } catch (err: any) {
              if (isFirestoreUnavailableError(err)) {
                return;
              }
              throw err;
            }
          },
          delete: async () => {
            await fallbackDoc.delete();
            try {
              await docRef.delete();
            } catch (err: any) {
              if (isFirestoreUnavailableError(err)) {
                return;
              }
              throw err;
            }
          },
        };
      },
      where: (field: string, op: '==', value: any) => {
        return createAdminQuery(colRef.where(field, op, value), () => fallbackCol.where(field, op, value));
      },
      limit: (count: number) => {
        return createAdminQuery(colRef.limit(count), () => fallbackCol.limit(count));
      },
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
        } catch (err: any) {
          if (isFirestoreUnavailableError(err)) {
            return fallbackCol.get();
          }
          throw err;
        }
      },
    };
  }

  async runTransaction<T>(updateFunction: (transaction: IFirestoreTransaction) => Promise<T>): Promise<T> {
    let db: any;
    try {
      db = getAdminFirestore();
    } catch {
      return this.memoryFallback.runTransaction(updateFunction);
    }

    try {
      return await db.runTransaction(async (adminTx: any) => {
        const tx: IFirestoreTransaction = {
          get: async (collectionName: string, docId: string) => {
            const docRef = db.collection(collectionName).doc(docId);
            const snap = await adminTx.get(docRef);
            return {
              id: snap.id,
              exists: snap.exists,
              data: () => snap.data(),
            };
          },
          set: (collectionName: string, docId: string, data: any, options?: { merge?: boolean }) => {
            const docRef = db.collection(collectionName).doc(docId);
            adminTx.set(docRef, data, { merge: options?.merge ?? false });
          },
          delete: (collectionName: string, docId: string) => {
            const docRef = db.collection(collectionName).doc(docId);
            adminTx.delete(docRef);
          },
        };
        return await updateFunction(tx);
      });
    } catch (err: any) {
      if (isFirestoreUnavailableError(err)) {
        return this.memoryFallback.runTransaction(updateFunction);
      }
      throw err;
    }
  }
}

function createAdminQuery(queryRef: any, fallbackQueryGetter?: () => IFirestoreQuery): IFirestoreQuery {
  return {
    where: (field: string, op: '==', value: any) => {
      return createAdminQuery(
        queryRef.where(field, op, value),
        fallbackQueryGetter ? () => fallbackQueryGetter().where(field, op, value) : undefined
      );
    },
    limit: (count: number) => {
      return createAdminQuery(
        queryRef.limit(count),
        fallbackQueryGetter ? () => fallbackQueryGetter().limit(count) : undefined
      );
    },
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
      } catch (err: any) {
        if (isFirestoreUnavailableError(err) && fallbackQueryGetter) {
          return fallbackQueryGetter().get();
        }
        throw err;
      }
    },
  };
}

/**
 * In-Memory Firestore Emulator Store (Used for deterministic testing & offline validation)
 */
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
    if (!this.store.has(name)) {
      this.store.set(name, new Map());
    }
    return this.store.get(name)!;
  }

  collection(name: string): IFirestoreCollection {
    const colMap = this.getCollectionMap(name);

    return {
      doc: (id: string) => ({
        get: async () => {
          const docData = colMap.get(id);
          return {
            id,
            exists: docData !== undefined,
            data: () => (docData !== undefined ? JSON.parse(JSON.stringify(docData)) : undefined),
          };
        },
        set: async (data: any, options?: { merge?: boolean }) => {
          if (options?.merge && colMap.has(id)) {
            const current = colMap.get(id) || {};
            colMap.set(id, { ...current, ...JSON.parse(JSON.stringify(data)) });
          } else {
            colMap.set(id, JSON.parse(JSON.stringify(data)));
          }
        },
        delete: async () => {
          colMap.delete(id);
        },
      }),
      where: (field: string, op: '==', value: any) => {
        return createMemoryQuery(colMap, [{ field, op, value }]);
      },
      limit: (count: number) => {
        return createMemoryQuery(colMap, [], count);
      },
      get: async () => {
        const docs: FirestoreDocumentSnapshot[] = [];
        for (const [id, data] of colMap.entries()) {
          docs.push({
            id,
            exists: true,
            data: () => JSON.parse(JSON.stringify(data)),
          });
        }
        return {
          empty: docs.length === 0,
          docs,
        };
      },
    };
  }

  async runTransaction<T>(updateFunction: (transaction: IFirestoreTransaction) => Promise<T>): Promise<T> {
    let releaseLock: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const previousLock = this.transactionQueue;
    this.transactionQueue = currentLock;

    await previousLock;

    try {
      const stagedWrites: Array<() => void> = [];

      const tx: IFirestoreTransaction = {
        get: async (collectionName: string, docId: string) => {
          const colMap = this.getCollectionMap(collectionName);
          const docData = colMap.get(docId);
          return {
            id: docId,
            exists: docData !== undefined,
            data: () => (docData !== undefined ? JSON.parse(JSON.stringify(docData)) : undefined),
          };
        },
        set: (collectionName: string, docId: string, data: any, options?: { merge?: boolean }) => {
          stagedWrites.push(() => {
            const colMap = this.getCollectionMap(collectionName);
            if (options?.merge && colMap.has(docId)) {
              const current = colMap.get(docId) || {};
              colMap.set(docId, { ...current, ...JSON.parse(JSON.stringify(data)) });
            } else {
              colMap.set(docId, JSON.parse(JSON.stringify(data)));
            }
          });
        },
        delete: (collectionName: string, docId: string) => {
          stagedWrites.push(() => {
            const colMap = this.getCollectionMap(collectionName);
            colMap.delete(docId);
          });
        },
      };

      const result = await updateFunction(tx);

      // Apply staged writes atomically
      for (const write of stagedWrites) {
        write();
      }

      return result;
    } finally {
      releaseLock!();
    }
  }
}

function createMemoryQuery(
  colMap: Map<string, any>,
  filters: Array<{ field: string; op: '=='; value: any }> = [],
  limitCount?: number
): IFirestoreQuery {
  return {
    where: (field: string, op: '==', value: any) => {
      return createMemoryQuery(colMap, [...filters, { field, op, value }], limitCount);
    },
    limit: (count: number) => {
      return createMemoryQuery(colMap, filters, count);
    },
    get: async () => {
      let entries = Array.from(colMap.entries());

      for (const filter of filters) {
        entries = entries.filter(([, data]) => {
          return data && data[filter.field] === filter.value;
        });
      }

      if (limitCount !== undefined) {
        entries = entries.slice(0, limitCount);
      }

      const docs: FirestoreDocumentSnapshot[] = entries.map(([id, data]) => ({
        id,
        exists: true,
        data: () => JSON.parse(JSON.stringify(data)),
      }));

      return {
        empty: docs.length === 0,
        docs,
      };
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
