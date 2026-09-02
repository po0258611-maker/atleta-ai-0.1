import { useState, useEffect } from 'react';
import { UserProfile, FullBodyProgram, WorkoutLog } from '../types';
import { generateFullBodyWorkout } from '../engine/workoutEngineAdaptive';
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
    generateFullBodyWorkout(INITIAL_PROFILE),
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

        const [remoteProgram, remoteLogs] = await Promise.all([
          FirestoreDataService.getActiveWorkout(userId),
          FirestoreDataService.getWorkoutLogs(userId),
        ]);

        setWorkoutLogs(remoteLogs);

        if (remoteProgram) {
          setProgram(remoteProgram);
        } else {
          const initialProg = generateFullBodyWorkout(effectiveProfile, remoteLogs);
          setProgram(initialProg);
          await FirestoreDataService.saveActiveWorkout(userId, initialProg);
        }
      } catch (err) {
        console.warn('Erro ao sincronizar dados de treino com Firestore:', err);
      }
    };

    void loadData();
  }, [userId]);

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    if (userId) await FirestoreDataService.saveUserProfile(userId, updatedProfile);

    const newProgram = generateFullBodyWorkout(updatedProfile, workoutLogs);
    setProgram(newProgram);
    if (userId) await FirestoreDataService.saveActiveWorkout(userId, newProgram);
  };

  const handleRegenerateProgram = async () => {
    const newProgram = generateFullBodyWorkout(userProfile, workoutLogs);
    setProgram(newProgram);
    if (userId) await FirestoreDataService.saveActiveWorkout(userId, newProgram);
  };

  const handleSaveWorkoutLog = async (newLog: WorkoutLog) => {
    const nextLogs = [newLog, ...workoutLogs];
    setWorkoutLogs(nextLogs);
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
