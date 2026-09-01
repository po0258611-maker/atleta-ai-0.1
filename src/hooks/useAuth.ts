import { useState, useEffect } from 'react';
import {
  UserAccount,
  AuthState,
  subscribeToAuthState,
  logoutUserAccount,
  updateUserAccountProfile,
  convertAthleteToUserAccount,
  sendVerificationEmail,
} from '../services/authService';
import { UserProfile } from '../types';
import { FirestoreDataService } from '../services/firestoreDataService';
import { migrateLocalStorageToFirestore } from '../services/dataMigrationService';
import { refreshCurrentUser, resolveGoogleRedirect } from '../services/firebaseAuthService';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [emailVerifySuccess, setEmailVerifySuccess] = useState(false);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToAuthState(async (state, athlete) => {
      if (!active) return;
      setAuthState(state);
      if (state === 'authenticated' && athlete) {
        setCurrentUser(convertAthleteToUserAccount(athlete));
        migrateLocalStorageToFirestore(athlete.uid).catch((err) =>
          console.warn('Erro durante migração para Firestore:', err)
        );
      } else if (state === 'unauthenticated' || state === 'error') {
        setCurrentUser(null);
      }
    });

    // Finaliza um login Google iniciado por redirect. Em um carregamento
    // normal não existe resultado pendente e a função retorna null.
    void resolveGoogleRedirect()
      .then((athlete) => {
        if (!active || !athlete) return;
        setAuthState('authenticated');
        setCurrentUser(convertAthleteToUserAccount(athlete));
        setEmailVerifySuccess(false);
        migrateLocalStorageToFirestore(athlete.uid).catch((err) =>
          console.warn('Erro durante migração para Firestore:', err)
        );
      })
      .catch((err) => {
        if (!active) return;
        console.error('Erro ao finalizar login Google por redirect:', err);
        setAuthState('error');
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (account: UserAccount) => setCurrentUser(account);

  const handleLogout = async () => {
    try {
      await logoutUserAccount();
      setCurrentUser(null);
      setAuthState('unauthenticated');
    } catch (err) {
      console.error('Erro ao realizar logout:', err);
    }
  };

  const handleVerifyEmail = async () => {
    if (!currentUser) return;
    try {
      if (currentUser.emailVerified) return;
      await sendVerificationEmail();
      setEmailVerifySuccess(true);
      window.setTimeout(() => setEmailVerifySuccess(false), 4000);
    } catch (err) {
      console.error('Erro ao enviar verificação de e-mail:', err);
      setEmailVerifySuccess(false);
    }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    if (!currentUser) return;
    const updatedUser = updateUserAccountProfile(currentUser, updatedProfile);
    setCurrentUser(updatedUser);
    await FirestoreDataService.saveUserProfile(currentUser.id, updatedProfile);
  };

  const refreshAuthProfile = async () => {
    const athlete = await refreshCurrentUser();
    if (athlete) setCurrentUser(convertAthleteToUserAccount(athlete));
    return athlete;
  };

  return {
    authState,
    currentUser,
    emailVerifySuccess,
    handleLoginSuccess,
    handleLogout,
    handleVerifyEmail,
    handleUpdateProfile,
    refreshAuthProfile,
  };
}
