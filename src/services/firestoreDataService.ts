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
} from 'firebase/firestore';
import { db } from './firestoreDb';
import { UserProfile, FullBodyProgram, WorkoutLog, SubscriptionState } from '../types';
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

/**
 * Sanitizes object by removing any `undefined` values before saving to Firestore.
 * Prevents "Unsupported field value: undefined" errors.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  return JSON.parse(JSON.stringify(data));
}

/**
 * Firestore Central Data Service for ATLETA AI
 * 
 * Schema:
 * users/{uid}
 * users/{uid}/profile/current
 * users/{uid}/workouts/active
 * users/{uid}/sessions/{sessionId}
 * users/{uid}/exerciseLogs/{logId}
 * users/{uid}/progression/stats
 * users/{uid}/settings/preferences
 * users/{uid}/subscription/current
 * users/{uid}/measurements/{recordId}
 */
export class FirestoreDataService {
  
  // =================== PROFILE ===================
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    try {
      const docRef = doc(db, 'users', uid, 'profile', 'current');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao carregar perfil para ${uid}:`, err.message || err);
      }
    }
    return null;
  }

  static async saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
    if (!uid) return;
    try {
      const sanitized = sanitizeForFirestore({ ...profile, updatedAt: new Date().toISOString() });
      const docRef = doc(db, 'users', uid, 'profile', 'current');
      await setDoc(docRef, sanitized, { merge: true });
      
      // Update top-level user doc for quick indexing
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        displayName: profile.name || 'Atleta',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao salvar perfil para ${uid}:`, err.message || err);
      }
    }
  }

  // =================== WORKOUTS (ACTIVE PROGRAM) ===================
  static async getActiveWorkout(uid: string): Promise<FullBodyProgram | null> {
    if (!uid) return null;
    try {
      const docRef = doc(db, 'users', uid, 'workouts', 'active');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as FullBodyProgram;
      }
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao carregar treino ativo para ${uid}:`, err.message || err);
      }
    }
    return null;
  }

  static async saveActiveWorkout(uid: string, program: FullBodyProgram): Promise<void> {
    if (!uid || !program) return;
    try {
      const sanitized = sanitizeForFirestore({ ...program, updatedAt: new Date().toISOString() });
      const docRef = doc(db, 'users', uid, 'workouts', 'active');
      await setDoc(docRef, sanitized, { merge: true });
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao salvar treino ativo para ${uid}:`, err.message || err);
      }
    }
  }

  // =================== EXERCISE / WORKOUT LOGS ===================
  static async getWorkoutLogs(uid: string): Promise<WorkoutLog[]> {
    if (!uid) return [];
    try {
      const colRef = collection(db, 'users', uid, 'exerciseLogs');
      const q = query(colRef, orderBy('date', 'desc'), limit(100));
      const querySnap = await getDocs(q);
      const logs: WorkoutLog[] = [];
      querySnap.forEach((docSnap) => {
        logs.push(docSnap.data() as WorkoutLog);
      });
      return logs;
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao carregar logs de treino para ${uid}:`, err.message || err);
      }
      return [];
    }
  }

  static async saveWorkoutLog(uid: string, log: WorkoutLog): Promise<void> {
    if (!uid || !log) return;
    try {
      const logId = log.id || `log_${Date.now()}`;
      const sanitized = sanitizeForFirestore({ ...log, id: logId, createdAt: new Date().toISOString() });
      const docRef = doc(db, 'users', uid, 'exerciseLogs', logId);
      await setDoc(docRef, sanitized, { merge: true });

      // Update progression stats atomically
      await this.incrementProgressionStats(uid, log);
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao salvar log de treino para ${uid}:`, err.message || err);
      }
    }
  }

  static async deleteWorkoutLog(uid: string, logId: string): Promise<void> {
    if (!uid || !logId) return;
    try {
      const docRef = doc(db, 'users', uid, 'exerciseLogs', logId);
      await deleteDoc(docRef);
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao excluir log ${logId} para ${uid}:`, err.message || err);
      }
    }
  }

  // =================== SESSIONS (ACTIVE DEVICES) ===================
  static async getDeviceSessions(uid: string): Promise<DeviceSessionRecord[]> {
    if (!uid) return [];
    try {
      const colRef = collection(db, 'users', uid, 'sessions');
      const snap = await getDocs(colRef);
      const sessions: DeviceSessionRecord[] = [];
      snap.forEach((docSnap) => {
        sessions.push(docSnap.data() as DeviceSessionRecord);
      });
      return sessions;
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao carregar sessões de dispositivos para ${uid}:`, err.message || err);
      }
      return [];
    }
  }

  static async saveDeviceSession(uid: string, session: DeviceSessionRecord): Promise<void> {
    if (!uid || !session) return;
    try {
      const sanitized = sanitizeForFirestore(session);
      const docRef = doc(db, 'users', uid, 'sessions', session.id);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao salvar sessão de dispositivo para ${uid}:`, err.message || err);
      }
    }
  }

  static async deleteDeviceSession(uid: string, sessionId: string): Promise<void> {
    if (!uid || !sessionId) return;
    try {
      const docRef = doc(db, 'users', uid, 'sessions', sessionId);
      await deleteDoc(docRef);
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao excluir sessão ${sessionId}:`, err.message || err);
      }
    }
  }

  // =================== PROGRESSION & STATS ===================
  static async getProgressionStats(uid: string): Promise<UserProgressionData | null> {
    if (!uid) return null;
    try {
      const docRef = doc(db, 'users', uid, 'progression', 'stats');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserProgressionData;
      }
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao carregar progressão para ${uid}:`, err.message || err);
      }
    }
    return null;
  }

  static async incrementProgressionStats(uid: string, newLog: WorkoutLog): Promise<void> {
    if (!uid) return;
    try {
      const current = await this.getProgressionStats(uid) || {
        uid,
        totalWorkouts: 0,
        totalVolumeKg: 0,
        currentStreakDays: 1,
        updatedAt: new Date().toISOString(),
      };

      let logVolume = 0;
      if (newLog.exerciseLogs && Array.isArray(newLog.exerciseLogs)) {
        for (const ex of newLog.exerciseLogs) {
          if (ex.sets && Array.isArray(ex.sets)) {
            for (const s of ex.sets) {
              if (s.completed && s.repsDone && s.weightKg) {
                logVolume += s.repsDone * s.weightKg;
              }
            }
          }
        }
      }
      const updated: UserProgressionData = {
        uid,
        totalWorkouts: current.totalWorkouts + 1,
        totalVolumeKg: current.totalVolumeKg + logVolume,
        currentStreakDays: current.currentStreakDays + 1,
        lastWorkoutDate: newLog.date || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const sanitized = sanitizeForFirestore(updated);
      const docRef = doc(db, 'users', uid, 'progression', 'stats');
      await setDoc(docRef, sanitized, { merge: true });
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao atualizar progressão para ${uid}:`, err.message || err);
      }
    }
  }

  // =================== SETTINGS ===================
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
      const docRef = doc(db, 'users', uid, 'settings', 'preferences');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...defaultSettings, ...snap.data() };
      }
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao obter preferências para ${uid}:`, err.message || err);
      }
    }
    return defaultSettings;
  }

  static async saveSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
    if (!uid) return;
    try {
      const sanitized = sanitizeForFirestore({ ...settings, updatedAt: new Date().toISOString() });
      const docRef = doc(db, 'users', uid, 'settings', 'preferences');
      await setDoc(docRef, sanitized, { merge: true });
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao salvar preferências para ${uid}:`, err.message || err);
      }
    }
  }

  // =================== SUBSCRIPTION ===================
  static async getSubscription(uid: string): Promise<SubscriptionState | null> {
    if (!uid) return null;
    try {
      const docRef = doc(db, 'users', uid, 'subscription', 'current');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as SubscriptionState;
      }
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao carregar assinatura para ${uid}:`, err.message || err);
      }
    }
    return null;
  }

  static async saveSubscription(uid: string, sub: SubscriptionState): Promise<void> {
    if (!uid || !sub) return;
    try {
      const sanitized = sanitizeForFirestore({ ...sub, updatedAt: new Date().toISOString() });
      const docRef = doc(db, 'users', uid, 'subscription', 'current');
      await setDoc(docRef, sanitized, { merge: true });
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao salvar assinatura para ${uid}:`, err.message || err);
      }
    }
  }

  // =================== MEASUREMENTS ===================
  static async getMeasurements(uid: string): Promise<BodyMeasurementRecord[]> {
    if (!uid) return [];
    try {
      const colRef = collection(db, 'users', uid, 'measurements');
      const q = query(colRef, orderBy('date', 'desc'), limit(50));
      const snap = await getDocs(q);
      const records: BodyMeasurementRecord[] = [];
      snap.forEach((docSnap) => {
        records.push(docSnap.data() as BodyMeasurementRecord);
      });
      return records;
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao carregar medições corporais para ${uid}:`, err.message || err);
      }
      return [];
    }
  }

  static async saveMeasurement(uid: string, record: BodyMeasurementRecord): Promise<void> {
    if (!uid || !record) return;
    try {
      const sanitized = sanitizeForFirestore(record);
      const docRef = doc(db, 'users', uid, 'measurements', record.id);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (err: any) {
      if (!err?.message?.includes('offline')) {
        console.warn(`[Firestore] Aviso ao salvar medição para ${uid}:`, err.message || err);
      }
    }
  }
}
