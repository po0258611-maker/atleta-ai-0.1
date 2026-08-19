import { FirestoreDataService } from './firestoreDataService';

export interface BodyMeasurementRecord {
  id: string;
  userId: string;
  date: string; // ISO 8601 YYYY-MM-DD
  weightKg: number;
  heightCm: number;
  bodyFatPercentage?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  notes?: string;
}

const STORAGE_KEY = 'athleta_ai_body_measurements';

export class BodyMeasurementsService {
  /**
   * Retrieves measurements from Firestore first with fallback to localStorage
   */
  static async getRecords(userId: string): Promise<BodyMeasurementRecord[]> {
    if (!userId) return [];
    
    // 1. Fetch from Firestore
    try {
      const firestoreRecords = await FirestoreDataService.getMeasurements(userId);
      if (firestoreRecords && firestoreRecords.length > 0) {
        return firestoreRecords;
      }
    } catch (e) {
      console.warn('Erro ao consultar medições do Firestore:', e);
    }

    // 2. Fallback to localStorage
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}_${userId}`) || localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const records: BodyMeasurementRecord[] = JSON.parse(data);
      return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch {
      return [];
    }
  }

  /**
   * Saves a new measurement to Firestore and caches in localStorage
   */
  static async addRecord(userId: string, record: Omit<BodyMeasurementRecord, 'id' | 'userId'>): Promise<BodyMeasurementRecord> {
    const newRecord: BodyMeasurementRecord = {
      ...record,
      id: `meas_${Date.now()}`,
      userId,
    };

    // Save to Firestore (isolated by UID)
    await FirestoreDataService.saveMeasurement(userId, newRecord);

    // Update local cache
    try {
      const localData = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      const existing: BodyMeasurementRecord[] = localData ? JSON.parse(localData) : [];
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify([newRecord, ...existing]));
    } catch (err) {
      console.error('Erro ao atualizar cache local de medições:', err);
    }

    return newRecord;
  }

  static async getLatestRecord(userId: string): Promise<BodyMeasurementRecord | null> {
    const records = await this.getRecords(userId);
    return records.length > 0 ? records[0] : null;
  }
}
