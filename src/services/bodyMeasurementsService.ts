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
  static getRecords(userId: string): BodyMeasurementRecord[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (!data) return [];
      const records: BodyMeasurementRecord[] = JSON.parse(data);
      return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch {
      return [];
    }
  }

  static addRecord(userId: string, record: Omit<BodyMeasurementRecord, 'id' | 'userId'>): BodyMeasurementRecord {
    const records = this.getRecords(userId);
    const newRecord: BodyMeasurementRecord = {
      ...record,
      id: `meas-${Date.now()}`,
      userId,
    };

    const updated = [newRecord, ...records];
    try {
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving body measurement:', err);
    }
    return newRecord;
  }

  static getLatestRecord(userId: string): BodyMeasurementRecord | null {
    const records = this.getRecords(userId);
    return records.length > 0 ? records[0] : null;
  }
}
