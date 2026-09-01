import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onIdTokenChanged,
  User,
  signOut,
  getRedirectResult,
  signInWithRedirect,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.addScope('openid');
googleProvider.setCustomParameters({ prompt: 'select_account' });
auth.useDeviceLanguage();

let persistenceReady: Promise<void> | null = null;
const ensurePersistence = async (): Promise<void> => {
  if (!persistenceReady) {
    persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => {
      // Embedded/Preview browsers may reject persistent storage. Firebase can
      // still authenticate for the current session, so do not block startup.
    });
  }
  await persistenceReady;
};
void ensurePersistence();

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthenticatedAthlete {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  idToken: string;
  emailVerified: boolean;
  createdAt?: string;
  profile: UserProfile;
  /** True only for local/demo sessions; never use its idToken as a Firebase credential. */
  isGuest?: boolean;
}

const DEFAULT_ATHLETE_PROFILE: UserProfile = {
  name: 'Atleta', gender: 'male', age: 26, heightCm: 175, weightKg: 75,
  experience: 'intermediate', availableDays: 4, timePerSessionMin: 60,
  objective: 'hypertrophy', environment: 'full_gym',
  priorities: ['peitoral', 'costas', 'quadriceps'], limitations: [],
  forbiddenExercises: [], sleepHours: 8, stressLevel: 'moderate',
};

let currentIdToken: string | null = null;
let currentAthlete: AuthenticatedAthlete | null = null;

export const getIdToken = (): string | null => currentAthlete?.isGuest ? null : currentIdToken;
export const getAuthenticatedAthlete = (): AuthenticatedAthlete | null => currentAthlete;

export const getFreshIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user || currentAthlete?.isGuest) return null;
  const token = await user.getIdToken(true);
  currentIdToken = token;
  return token;
};

const buildProfileFromFirebaseUser = (user: User): UserProfile => ({
  ...DEFAULT_ATHLETE_PROFILE,
  name: user.displayName || 'Atleta Google',
});

export const buildAthleteFromFirebaseUser = async (user: User): Promise<AuthenticatedAthlete> => {
  const token = await user.getIdToken();
  currentIdToken = token;

  const athlete: AuthenticatedAthlete = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'Atleta Google',
    photoURL: user.photoURL || undefined,
    idToken: token,
    emailVerified: user.emailVerified,
    createdAt: user.metadata.creationTime || undefined,
    profile: buildProfileFromFirebaseUser(user),
    isGuest: false,
  };

  currentAthlete = athlete;
  return athlete;
};

/** Local/demo-only session. Its mock token is intentionally never exposed by getIdToken(). */
export const createGuestAthlete = (guestName = 'Atleta Convidado'): AuthenticatedAthlete => {
  const guestUid = `guest_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)}`;
  const athlete: AuthenticatedAthlete = {
    uid: guestUid,
    email: '',
    displayName: guestName,
    photoURL: undefined,
    idToken: '',
    emailVerified: false,
    createdAt: new Date().toISOString(),
    profile: { ...DEFAULT_ATHLETE_PROFILE, name: guestName },
    isGuest: true,
  };
  currentAthlete = athlete;
  currentIdToken = null;
  return athlete;
};

export const signInWithGoogle = async (): Promise<AuthenticatedAthlete> => {
  await ensurePersistence();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return buildAthleteFromFirebaseUser(result.user);
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

    // Only a browser-blocked popup warrants redirect. Closing the popup is a
    // user cancellation and must not trigger a second authentication flow.
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, googleProvider);
      throw new Error('REDIRECT_AUTH_STARTED');
    }

    throw error;
  }
};

export const resolveGoogleRedirect = async (): Promise<AuthenticatedAthlete | null> => {
  await ensurePersistence();
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  return buildAthleteFromFirebaseUser(result.user);
};

export const signInWithEmailPassword = async (email: string, password: string): Promise<AuthenticatedAthlete> => {
  await ensurePersistence();
  const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return buildAthleteFromFirebaseUser(userCred.user);
};

export const registerWithEmailPassword = async (email: string, password: string): Promise<AuthenticatedAthlete> => {
  await ensurePersistence();
  const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (!userCred.user.emailVerified) await sendEmailVerification(userCred.user);
  return buildAthleteFromFirebaseUser(userCred.user);
};

export const sendCurrentUserEmailVerification = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário autenticado.');
  if (!user.emailVerified) await sendEmailVerification(user);
};

export const refreshCurrentUser = async (): Promise<AuthenticatedAthlete | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  await user.reload();
  return buildAthleteFromFirebaseUser(user);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim());
};

export const signOutFromFirebase = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    currentIdToken = null;
    currentAthlete = null;
  }
};

export const subscribeToAuthState = (
  onStateChange: (state: AuthState, athlete: AuthenticatedAthlete | null, error?: Error) => void
) => onIdTokenChanged(auth, async (firebaseUser) => {
  if (!firebaseUser) {
    currentIdToken = null;
    currentAthlete = null;
    onStateChange('unauthenticated', null);
    return;
  }

  try {
    onStateChange('authenticated', await buildAthleteFromFirebaseUser(firebaseUser));
  } catch (error: unknown) {
    currentIdToken = null;
    currentAthlete = null;
    onStateChange(
      'error',
      null,
      error instanceof Error ? error : new Error('Erro ao obter token do Firebase.')
    );
  }
}, (error) => {
  currentIdToken = null;
  currentAthlete = null;
  onStateChange('error', null, error);
});