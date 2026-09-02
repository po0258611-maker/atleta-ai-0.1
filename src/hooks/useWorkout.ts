import { useState, useEffect } from 'react';
import { UserProfile, FullBodyProgram, WorkoutLog } from '../types';
import { generateFullBodyWorkout } from '../engine/workoutEngineV2';
import { FirestoreDataService } from '../services/firestoreDataService';

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

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      try {
        const remoteProfile = await FirestoreDataService.getUserProfile(userId);
        const effectiveProfile = remoteProfile || INITIAL_PROFILE;
        if (remoteProfile) setUserProfile(remoteProfile);

        const remoteProgram = await FirestoreDataService.getActiveWorkout(userId);
        if (remoteProgram) {
          setProgram(remoteProgram);
        } else {
          const initialProg = generateFullBodyWorkout(effectiveProfile);
          setProgram(initialProg);
          await FirestoreDataService.saveActiveWorkout(userId, initialProg);
        }

        const remoteLogs = await FirestoreDataService.getWorkoutLogs(userId);
        setWorkoutLogs(remoteLogs);
      } catch (err) {
        console.warn('Erro ao sincronizar dados de treino com Firestore:', err);
      }
    };

    void loadData();
  }, [userId]);

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    if (userId) await FirestoreDataService.saveUserProfile(userId, updatedProfile);

    const newProgram = generateFullBodyWorkout(updatedProfile);
    setProgram(newProgram);
    if (userId) await FirestoreDataService.saveActiveWorkout(userId, newProgram);
  };

  const handleRegenerateProgram = async () => {
    const newProgram = generateFullBodyWorkout(userProfile);
    setProgram(newProgram);
    if (userId) await FirestoreDataService.saveActiveWorkout(userId, newProgram);
  };

  const handleSaveWorkoutLog = async (newLog: WorkoutLog) => {
    setWorkoutLogs((prev) => [newLog, ...prev]);
    if (userId) await FirestoreDataService.saveWorkoutLog(userId, newLog);
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
  };
}
