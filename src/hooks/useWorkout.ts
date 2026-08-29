import { useState, useEffect } from 'react';
import { UserProfile, FullBodyProgram, WorkoutLog } from '../types';
import { generateSafeFullBodyWorkout } from '../engine/safeWorkoutEngine';
import { validateAndSanitizeProfile } from '../engine/workoutEngine';
import { FirestoreDataService } from '../services/firestoreDataService';

export const INITIAL_PROFILE: UserProfile = {
  name: 'Atleta Google',
  gender: 'male',
  age: 26,
  heightCm: 175,
  weightKg: 75,
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
  const [program, setProgram] = useState<FullBodyProgram>(() => generateSafeFullBodyWorkout(INITIAL_PROFILE));
  const [activeDayId, setActiveDayId] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const loadData = async () => {
      try {
        const remoteProfile = await FirestoreDataService.getUserProfile(userId);
        const effectiveProfile = validateAndSanitizeProfile(remoteProfile || INITIAL_PROFILE);
        if (cancelled) return;
        setUserProfile(effectiveProfile);
        const remoteProgram = await FirestoreDataService.getActiveWorkout(userId);
        if (cancelled) return;
        if (remoteProgram) setProgram(remoteProgram);
        else {
          const initialProg = generateSafeFullBodyWorkout(effectiveProfile);
          setProgram(initialProg);
          await FirestoreDataService.saveActiveWorkout(userId, initialProg);
        }
        const remoteLogs = await FirestoreDataService.getWorkoutLogs(userId);
        if (!cancelled) setWorkoutLogs(remoteLogs);
      } catch (err) {
        if (!cancelled) console.warn('Erro ao sincronizar dados de treino com Firestore:', err);
      }
    };
    void loadData();
    return () => { cancelled = true; };
  }, [userId]);

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    const safeProfile = validateAndSanitizeProfile(updatedProfile);
    const newProgram = generateSafeFullBodyWorkout(safeProfile);
    setUserProfile(safeProfile);
    setProgram(newProgram);
    if (userId) {
      await FirestoreDataService.saveUserProfile(userId, safeProfile);
      await FirestoreDataService.saveActiveWorkout(userId, newProgram);
    }
  };

  const handleRegenerateProgram = async () => {
    const newProgram = generateSafeFullBodyWorkout(userProfile);
    setProgram(newProgram);
    if (userId) await FirestoreDataService.saveActiveWorkout(userId, newProgram);
  };

  const handleSaveWorkoutLog = async (newLog: WorkoutLog) => {
    setWorkoutLogs((prev) => [newLog, ...prev]);
    if (userId) await FirestoreDataService.saveWorkoutLog(userId, newLog);
  };

  return { userProfile, setUserProfile, program, setProgram, activeDayId, setActiveDayId, workoutLogs, setWorkoutLogs, handleSaveProfile, handleRegenerateProgram, handleSaveWorkoutLog };
}
