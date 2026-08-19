import { useState, useEffect } from 'react';
import {
  UserAccount,
  AuthState,
  subscribeToAuthState,
  logoutUserAccount,
  updateUserAccountProfile,
  convertAthleteToUserAccount,
} from '../services/authService';
import { UserProfile } from '../types';
import { FirestoreDataService } from '../services/firestoreDataService';
import { migrateLocalStorageToFirestore } from '../services/dataMigrationService';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [emailVerifySuccess, setEmailVerifySuccess] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (state, athlete) => {
      setAuthState(state);
      if (state === 'authenticated' && athlete) {
        const userAcc = convertAthleteToUserAccount(athlete);
        setCurrentUser(userAcc);

        // Run graceful local storage migration for this UID
        migrateLocalStorageToFirestore(athlete.uid).catch((err) =>
          console.warn('Erro durante migração para Firestore:', err)
        );
      } else if (state === 'unauthenticated') {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (account: UserAccount) => {
    setCurrentUser(account);
  };

  const handleLogout = async () => {
    try {
      await logoutUserAccount();
      setCurrentUser(null);
    } catch (err) {
      console.error('Erro ao realizar logout:', err);
    }
  };

  const handleVerifyEmail = () => {
    if (!currentUser) return;
    setEmailVerifySuccess(true);
    setTimeout(() => setEmailVerifySuccess(false), 4000);
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    if (!currentUser) return;
    const updatedUser = updateUserAccountProfile(currentUser, updatedProfile);
    setCurrentUser(updatedUser);
    await FirestoreDataService.saveUserProfile(currentUser.id, updatedProfile);
  };

  return {
    authState,
    currentUser,
    emailVerifySuccess,
    handleLoginSuccess,
    handleLogout,
    handleVerifyEmail,
    handleUpdateProfile,
  };
}
