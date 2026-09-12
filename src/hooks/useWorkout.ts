import { useState, useEffect } from 'react';
import { UserProfile, FullBodyProgram, WorkoutLog } from '../types';
import { generateWorkoutWithPipeline } from '../engine/workoutEngineBridge';
import { FirestoreDataService } from '../services/firestoreDataService';
import { validateWorkoutPrescription } from '../engine/workoutPrescriptionValidator';

export interface HydrationResolution {
  program: FullBodyProgram;
  acceptedRemote: boolean;
  validationErrors?: string[];
}

export function resolveActiveWorkoutHydration(
  remoteProgram: unknown,
  effectiveProfile: UserProfile,
  workoutLogs: WorkoutLog[],
): HydrationResolution {
  if (!remoteProgram) {
    const initialProg = generateWorkoutWithPipeline(effectiveProfile, workoutLogs);
    return {
      program: initialProg,
      acceptedRemote: false,
    };
  }

  const validation = validateWorkoutPrescription(remoteProgram as FullBodyProgram);
  if (!validation.valid) {
    console.warn(
      'Programa remoto descartado por violar critérios de segurança (Safety Validator):',
      validation.errors,
    );
    const fallbackProg = generateWorkoutWithPipeline(effectiveProfile, workoutLogs);
    return {
      program: fallbackProg,
      acceptedRemote: false,
      validationErrors: validation.errors,
    };
  }

  // Validação complementar contra limitações físicas ativas do perfil do usuário
  if (effectiveProfile && Array.isArray(effectiveProfile.limitations) && effectiveProfile.limitations.length > 0) {
    const remoteFullBody = remoteProgram as FullBodyProgram;
    const validationAgainstEffective = validateWorkoutPrescription({
      ...remoteFullBody,
      profile: {
        ...(remoteFullBody.profile || effectiveProfile),
        limitations: effectiveProfile.limitations,
      } as UserProfile,
    });
    if (!validationAgainstEffective.valid) {
      console.warn(
        'Programa remoto descartado por violar limitações ativas do perfil do usuário:',
        validationAgainstEffective.errors,
      );
      const fallbackProg = generateWorkoutWithPipeline(effectiveProfile, workoutLogs);
      return {
        program: fallbackProg,
        acceptedRemote: false,
        validationErrors: validationAgainstEffective.errors,
      };
    }
  }

  return {
    program: remoteProgram as FullBodyProgram,
    acceptedRemote: true,
  };
}

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
    generateWorkoutWithPipeline(INITIAL_PROFILE)
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

        // 2. Workout Logs
        const remoteLogs = await FirestoreDataService.getWorkoutLogs(userId);
        setWorkoutLogs(remoteLogs);

        // 3. Active Workout Program (com barreira determinística do Safety Validator)
        const remoteProgram = await FirestoreDataService.getActiveWorkout(userId);
        const hydration = resolveActiveWorkoutHydration(remoteProgram, effectiveProfile, remoteLogs);

        if (hydration.acceptedRemote) {
          setProgram(remoteProgram);
        } else {
          setProgram(hydration.program);
          FirestoreDataService.saveActiveWorkout(userId, hydration.program);
        }
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
    const newProgram = generateWorkoutWithPipeline(updatedProfile, workoutLogs);
    setProgram(newProgram);
    if (userId) {
      await FirestoreDataService.saveActiveWorkout(userId, newProgram);
    }
  };

  const handleRegenerateProgram = async () => {
    const newProgram = generateWorkoutWithPipeline(userProfile, workoutLogs);
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
