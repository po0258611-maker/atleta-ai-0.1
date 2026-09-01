import { UserProfile } from '../types';
import {
  AuthenticatedAthlete,
  signInWithGoogle as firebaseSignInWithGoogle,
  signInWithEmailPassword as firebaseSignInWithEmail,
  registerWithEmailPassword as firebaseRegisterWithEmail,
  sendCurrentUserEmailVerification,
  sendPasswordReset,
  createGuestAthlete,
  signOutFromFirebase as firebaseSignOut,
  subscribeToAuthState,
  AuthState,
} from './firebaseAuthService';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  emailVerified: boolean;
  profile: UserProfile;
}

export type { AuthState, AuthenticatedAthlete };

export const convertAthleteToUserAccount = (athlete: AuthenticatedAthlete): UserAccount => ({
  id: athlete.uid,
  name: athlete.displayName,
  email: athlete.email,
  avatarUrl: athlete.photoURL,
  createdAt: athlete.createdAt || new Date().toISOString(),
  emailVerified: athlete.emailVerified,
  profile: athlete.profile,
});

export const loginWithGoogleAccount = async (): Promise<UserAccount> =>
  convertAthleteToUserAccount(await firebaseSignInWithGoogle());

export const loginWithEmailAccount = async (email: string, pass: string): Promise<UserAccount> =>
  convertAthleteToUserAccount(await firebaseSignInWithEmail(email, pass));

export const registerWithEmailAccount = async (email: string, pass: string): Promise<UserAccount> =>
  convertAthleteToUserAccount(await firebaseRegisterWithEmail(email, pass));

export const sendVerificationEmail = async (): Promise<void> => {
  await sendCurrentUserEmailVerification();
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordReset(email);
};

export const loginAsGuestAccount = (name = 'Atleta Convidado'): UserAccount =>
  convertAthleteToUserAccount(createGuestAthlete(name));

export const logoutUserAccount = async (): Promise<void> => {
  await firebaseSignOut();
};

export const updateUserAccountProfile = (
  currentUser: UserAccount,
  updatedProfile: UserProfile
): UserAccount => ({
  ...currentUser,
  name: updatedProfile.name,
  profile: updatedProfile,
});

export { subscribeToAuthState };
