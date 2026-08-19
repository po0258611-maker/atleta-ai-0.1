import { useState, useEffect } from 'react';
import { UserProfile, FullBodyProgram, WorkoutLog } from '../types';
import { generateFullBodyWorkout } from '../engine/workoutEngine';
import { FirestoreDataService } from '../services/firestoreDataService';
import { AthletaBackupPayload } from '../services/googleDriveService';

export const INITIAL_PROFILE: UserProfile = {
  name: 'Atleta Google',
  gender: 'male',
  age: 27,
  heightCm: 176,
  weightKg: 78,
  experience: 'intermediate',
  availableDays: 4,
  timePerSessionMin: 60,
  objective: 'hypertrophy',
  environment: 'full_gym',
  priorities: ['peitoral', 'costas', 'quadriceps'],
  limitations: [],
  forbiddenExercises: [],
  sleepHours: 8,
  stressLevel: 'moderate',
};

export function useWorkout(userId?: string) {
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [program, setProgram] = useState<FullBodyProgram>(() =>
    generateFullBodyWorkout(INITIAL_PROFILE)
  );
  const [activeDayId, setActiveDayId] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  // Hydrate user workout profile, active program & logs from Firestore on login
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      try {
        // 1. Profile
        const remoteProfile = await FirestoreDataService.getUserProfile(userId);
        const effectiveProfile = remoteProfile || INITIAL_PROFILE;
        if (remoteProfile) {
          setUserProfile(remoteProfile);
        }

        // 2. Active Workout Program
        const remoteProgram = await FirestoreDataService.getActiveWorkout(userId);
        if (remoteProgram) {
          setProgram(remoteProgram);
        } else {
          const initialProg = generateFullBodyWorkout(effectiveProfile);
          setProgram(initialProg);
          FirestoreDataService.saveActiveWorkout(userId, initialProg);
        }

        // 3. Workout Logs
        const remoteLogs = await FirestoreDataService.getWorkoutLogs(userId);
        setWorkoutLogs(remoteLogs);
      } catch (err) {
        console.warn('Erro ao sincronizar dados de treino com Firestore:', err);
      }
    };

    loadData();
  }, [userId]);

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    if (userId) {
      await FirestoreDataService.saveUserProfile(userId, updatedProfile);
    }
    const newProgram = generateFullBodyWorkout(updatedProfile);
    setProgram(newProgram);
    if (userId) {
      await FirestoreDataService.saveActiveWorkout(userId, newProgram);
    }
  };

  const handleRegenerateProgram = async () => {
    const newProgram = generateFullBodyWorkout(userProfile);
    setProgram(newProgram);
    if (userId) {
      await FirestoreDataService.saveActiveWorkout(userId, newProgram);
    }
  };

  const handleSaveWorkoutLog = async (newLog: WorkoutLog) => {
    setWorkoutLogs((prev) => [newLog, ...prev]);
    if (userId) {
      await FirestoreDataService.saveWorkoutLog(userId, newLog);
    }
  };

  const handleApplyDriveBackup = async (backup: AthletaBackupPayload) => {
    if (backup.userProfile) {
      setUserProfile(backup.userProfile);
      if (userId) await FirestoreDataService.saveUserProfile(userId, backup.userProfile);
    }
    if (backup.program) {
      setProgram(backup.program);
      if (userId) await FirestoreDataService.saveActiveWorkout(userId, backup.program);
    }
    if (backup.workoutLogs && Array.isArray(backup.workoutLogs)) {
      setWorkoutLogs(backup.workoutLogs);
      if (userId) {
        for (const log of backup.workoutLogs) {
          await FirestoreDataService.saveWorkoutLog(userId, log);
        }
      }
    }
  };

  return {
    userProfile,
    setUserProfile,
    program,
    setProgram,
    activeDayId,
    setActiveDayId,
    workoutLogs,
    setWorkoutLogs,
    handleSaveProfile,
    handleRegenerateProgram,
    handleSaveWorkoutLog,
    handleApplyDriveBackup,
  };
}
