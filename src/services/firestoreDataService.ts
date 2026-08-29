import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firestoreDb';
import { UserProfile, FullBodyProgram, WorkoutLog } from '../types';
import { BodyMeasurementRecord } from './bodyMeasurementsService';

export interface UserSettings {
  theme: 'dark' | 'light';
  notifications: boolean;
  soundEffects: boolean;
  hapticFeedback: boolean;
  language: string;
}

export interface UserProgressionData {
  uid: string;
  totalWorkouts: number;
  totalVolumeKg: number;
  currentStreakDays: number;
  lastWorkoutDate?: string;
  updatedAt: string;
}

export interface DeviceSessionRecord {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  location: string;
  lastActive: string;
  isCurrent: boolean;
  createdAt: string;
}

function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) result[key] = sanitizeForFirestore(value);
    }
    return result as T;
  }

  return data;
}

function getLogVolume(log: WorkoutLog): number {
  let volume = 0;
  for (const exercise of log.exerciseLogs || []) {
    for (const set of exercise.sets || []) {
      if (
        set.completed === true &&
        Number.isFinite(set.repsDone) &&
        Number.isFinite(set.weightKg) &&
        set.repsDone > 0 &&
        set.weightKg >= 0
      ) {
        volume += set.repsDone * set.weightKg;
      }
    }
  }
  return volume;
}

function calendarDay(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function calculateStreak(logs: WorkoutLog[]): number {
  const uniqueDays = Array.from(
    new Set(logs.map((log) => calendarDay(log.date)).filter((day): day is string => Boolean(day)))
  ).sort((a, b) => b.localeCompare(a));

  if (uniqueDays.length === 0) return 0;

  let streak = 1;
  for (let index = 1; index < uniqueDays.length; index += 1) {
    const previous = new Date(`${uniqueDays[index - 1]}T00:00:00.000Z`);
    const current = new Date(`${uniqueDays[index]}T00:00:00.000Z`);
    const differenceDays = Math.round((previous.getTime() - current.getTime()) / 86400000);
    if (differenceDays !== 1) break;
    streak += 1;
  }
  return streak;
}

export class FirestoreDataService {
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'profile', 'current'));
      return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch (err: any) {
      console.warn(`[Firestore] Falha ao carregar perfil para ${uid}:`, err?.message || err);
      return null;
    }
  }

  static async saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
    if (!uid || !profile) return;
    try {
      const sanitized = sanitizeForFirestore({ ...profile, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'users', uid, 'profile', 'current'), sanitized, { merge: true });
      await setDoc(
        doc(db, 'users', uid),
        { displayName: profile.name || 'Atleta', updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err: any) {
      console.error(`[Firestore] Falha ao salvar perfil para ${uid}:`, err?.message || err);
      throw err;
    }
  }

  static async getActiveWorkout(uid: string): Promise<FullBodyProgram | null> {
    if (!uid) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'workouts', 'active'));
      return snap.exists() ? (snap.data() as FullBodyProgram) : null;
    } catch (err: any) {
      console.warn(`[Firestore] Falha ao carregar treino ativo para ${uid}:`, err?.message || err);
      return null;
    }
  }

  static async saveActiveWorkout(uid: string, program: FullBodyProgram): Promise<void> {
    if (!uid || !program) return;
    try {
      await setDoc(
        doc(db, 'users', uid, 'workouts', 'active'),
        sanitizeForFirestore({ ...program, updatedAt: new Date().toISOString() }),
        { merge: true }
      );
    } catch (err: any) {
      console.error(`[Firestore] Falha ao salvar treino ativo para ${uid}:`, err?.message || err);
      throw err;
    }
  }

  static async getWorkoutLogs(uid: string): Promise<WorkoutLog[]> {
    if (!uid) return [];
    try {
      const snap = await getDocs(query(collection(db, 'users', uid, 'exerciseLogs'), orderBy('date', 'desc'), limit(100)));
      return snap.docs.map((docSnap) => docSnap.data() as WorkoutLog);
    } catch (err: any) {
      console.warn(`[Firestore] Falha ao carregar logs de treino para ${uid}:`, err?.message || err);
      return [];
    }
  }

  static async saveWorkoutLog(uid: string, log: WorkoutLog): Promise<void> {
    if (!uid || !log) return;

    const logId = log.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const logRef = doc(db, 'users', uid, 'exerciseLogs', logId);
    const progressionRef = doc(db, 'users', uid, 'progression', 'stats');
    const sanitizedLog = sanitizeForFirestore({ ...log, id: logId, updatedAt: new Date().toISOString() });
    const logVolume = getLogVolume(log);

    try {
      await runTransaction(db, async (transaction) => {
        const [existingLogSnap, progressionSnap] = await Promise.all([
          transaction.get(logRef),
          transaction.get(progressionRef),
        ]);

        transaction.set(logRef, sanitizedLog, { merge: true });

        // The progression counter changes only when this log is first created.
        // Re-saving an existing log is idempotent and does not double-count metrics.
        if (!existingLogSnap.exists()) {
          const current = progressionSnap.exists()
            ? (progressionSnap.data() as Partial<UserProgressionData>)
            : {};
          const existingLastDate = current.lastWorkoutDate;
          const lastDay = calendarDay(existingLastDate);
          const newDay = calendarDay(log.date) || calendarDay(new Date().toISOString());

          let streak = 1;
          if (lastDay && newDay) {
            const last = new Date(`${lastDay}T00:00:00.000Z`);
            const next = new Date(`${newDay}T00:00:00.000Z`);
            const differenceDays = Math.round((next.getTime() - last.getTime()) / 86400000);
            streak = differenceDays === 0 ? Number(current.currentStreakDays) || 1 : differenceDays === 1 ? (Number(current.currentStreakDays) || 0) + 1 : 1;
          }

          transaction.set(
            progressionRef,
            sanitizeForFirestore({
              uid,
              totalWorkouts: (Number(current.totalWorkouts) || 0) + 1,
              totalVolumeKg: (Number(current.totalVolumeKg) || 0) + logVolume,
              currentStreakDays: streak,
              lastWorkoutDate: log.date || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          );
        }
      });
    } catch (err: any) {
      console.error(`[Firestore] Falha ao salvar log/progressão para ${uid}:`, err?.message || err);
      throw err;
    }
  }

  static async deleteWorkoutLog(uid: string, logId: string): Promise<void> {
    if (!uid || !logId) return;
    try {
      const logRef = doc(db, 'users', uid, 'exerciseLogs', logId);
      const snap = await getDoc(logRef);
      if (!snap.exists()) return;

      await deleteDoc(logRef);
      await this.rebuildProgressionStats(uid);
    } catch (err: any) {
      console.error(`[Firestore] Falha ao excluir log ${logId} para ${uid}:`, err?.message || err);
      throw err;
    }
  }

  static async rebuildProgressionStats(uid: string): Promise<void> {
    if (!uid) return;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'exerciseLogs'));
      const logs = snap.docs.map((docSnap) => docSnap.data() as WorkoutLog);
      const uniqueWorkoutIds = new Set(logs.map((log) => log.id).filter(Boolean));
      const totalVolumeKg = logs.reduce((total, log) => total + getLogVolume(log), 0);
      const latestLog = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      const stats: UserProgressionData = {
        uid,
        totalWorkouts: uniqueWorkoutIds.size || logs.length,
        totalVolumeKg,
        currentStreakDays: calculateStreak(logs),
        lastWorkoutDate: latestLog?.date,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', uid, 'progression', 'stats'), sanitizeForFirestore(stats), { merge: true });
    } catch (err: any) {
      console.error(`[Firestore] Falha ao recalcular progressão para ${uid}:`, err?.message || err);
      throw err;
    }
  }

  static async getProgressionStats(uid: string): Promise<UserProgressionData | null> {
    if (!uid) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'progression', 'stats'));
      return snap.exists() ? (snap.data() as UserProgressionData) : null;
    } catch (err: any) {
      console.warn(`[Firestore] Falha ao carregar progressão para ${uid}:`, err?.message || err);
      return null;
    }
  }

  static async incrementProgressionStats(uid: string, newLog: WorkoutLog): Promise<void> {
    // Compatibility wrapper: new writes go through the idempotent transactional path.
    await this.saveWorkoutLog(uid, newLog);
  }

  static async getDeviceSessions(uid: string): Promise<DeviceSessionRecord[]> {
    if (!uid) return [];
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'sessions'));
      return snap.docs.map((docSnap) => docSnap.data() as DeviceSessionRecord);
    } catch (err: any) {
      console.warn(`[Firestore] Falha ao carregar sessões para ${uid}:`, err?.message || err);
      return [];
    }
  }

  static async saveDeviceSession(uid: string, session: DeviceSessionRecord): Promise<void> {
    if (!uid || !session) return;
    try {
      await setDoc(doc(db, 'users', uid, 'sessions', session.id), sanitizeForFirestore(session), { merge: true });
    } catch (err: any) {
      console.error(`[Firestore] Falha ao salvar sessão para ${uid}:`, err?.message || err);
      throw err;
    }
  }

  static async deleteDeviceSession(uid: string, sessionId: string): Promise<void> {
    if (!uid || !sessionId) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'sessions', sessionId));
    } catch (err: any) {
      console.error(`[Firestore] Falha ao excluir sessão ${sessionId}:`, err?.message || err);
      throw err;
    }
  }

  static async getSettings(uid: string): Promise<UserSettings> {
    const defaultSettings: UserSettings = {
      theme: 'dark',
      notifications: true,
      soundEffects: true,
      hapticFeedback: true,
      language: 'pt-BR',
    };

    if (!uid) return defaultSettings;
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'settings', 'preferences'));
      return snap.exists() ? { ...defaultSettings, ...(snap.data() as Partial<UserSettings>) } : defaultSettings;
    } catch (err: any) {
      console.warn(`[Firestore] Falha ao carregar preferências para ${uid}:`, err?.message || err);
      return defaultSettings;
    }
  }

  static async saveSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
    if (!uid) return;
    try {
      await setDoc(doc(db, 'users', uid, 'settings', 'preferences'), sanitizeForFirestore({ ...settings, updatedAt: new Date().toISOString() }), { merge: true });
    } catch (err: any) {
      console.error(`[Firestore] Falha ao salvar preferências para ${uid}:`, err?.message || err);
      throw err;
    }
  }

  static async getMeasurements(uid: string): Promise<BodyMeasurementRecord[]> {
    if (!uid) return [];
    try {
      const snap = await getDocs(query(collection(db, 'users', uid, 'measurements'), orderBy('date', 'desc'), limit(50)));
      return snap.docs.map((docSnap) => docSnap.data() as BodyMeasurementRecord);
    } catch (err: any) {
      console.warn(`[Firestore] Falha ao carregar medições para ${uid}:`, err?.message || err);
      return [];
    }
  }

  static async saveMeasurement(uid: string, record: BodyMeasurementRecord): Promise<void> {
    if (!uid || !record) return;
    try {
      await setDoc(doc(db, 'users', uid, 'measurements', record.id), sanitizeForFirestore(record), { merge: true });
    } catch (err: any) {
      console.error(`[Firestore] Falha ao salvar medição para ${uid}:`, err?.message || err);
      throw err;
    }
  }
}
