import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types';

// Initialize Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthenticatedAthlete {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  idToken: string;
  profile: UserProfile;
}

const DEFAULT_ATHLETE_PROFILE: UserProfile = {
  name: 'Atleta',
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

// In-memory token cache for request Authorization headers
let currentIdToken: string | null = null;
let currentAthlete: AuthenticatedAthlete | null = null;

export const getIdToken = (): string | null => currentIdToken;
export const getAuthenticatedAthlete = (): AuthenticatedAthlete | null => currentAthlete;

/**
 * Builds standard AuthenticatedAthlete from Firebase User & fresh ID Token
 */
export const buildAthleteFromFirebaseUser = async (user: User): Promise<AuthenticatedAthlete> => {
  const token = await user.getIdToken(true);
  currentIdToken = token;

  // Derive initial or personalized profile based on Firebase Google Account
  const profile: UserProfile = {
    ...DEFAULT_ATHLETE_PROFILE,
    name: user.displayName || 'Atleta Google',
  };

  const athlete: AuthenticatedAthlete = {
    uid: user.uid,
    email: user.email || 'atleta@google.com',
    displayName: user.displayName || 'Atleta Google',
    photoURL: user.photoURL || undefined,
    idToken: token,
    profile,
  };

  currentAthlete = athlete;
  return athlete;
};

/**
 * Firebase Real Google Sign-In with Popup
 */
export const signInWithGoogle = async (): Promise<AuthenticatedAthlete> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await buildAthleteFromFirebaseUser(result.user);
  } catch (error: any) {
    console.error('Erro na autenticação com Google (Firebase):', error);
    throw error;
  }
};

/**
 * Real Firebase Sign Out
 */
export const signOutFromFirebase = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erro ao desconectar do Firebase:', error);
  } finally {
    currentIdToken = null;
    currentAthlete = null;
  }
};

/**
 * Listens to Real-time Firebase Authentication state changes & auto-restores session
 */
export const subscribeToAuthState = (
  onStateChange: (state: AuthState, athlete: AuthenticatedAthlete | null, error?: Error) => void
) => {
  return onAuthStateChanged(
    auth,
    async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const athlete = await buildAthleteFromFirebaseUser(firebaseUser);
          onStateChange('authenticated', athlete);
        } catch (err: any) {
          console.error('Erro ao obter token do usuário Firebase:', err);
          onStateChange('error', null, err);
        }
      } else {
        currentIdToken = null;
        currentAthlete = null;
        onStateChange('unauthenticated', null);
      }
    },
    (error) => {
      console.error('Erro no observador de autenticação Firebase:', error);
      onStateChange('error', null, error);
    }
  );
};
